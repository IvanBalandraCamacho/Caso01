from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from typing import List
import shutil 
import os
import uuid
import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from models import database, workspace as workspace_model, document as document_model, schemas, chat_message as chat_model, user as user_model
from api.routes import auth
from core.celery_app import celery_app
from processing import vector_store
from core import llm_service
from core.config import settings
from core.rate_limit import limiter
from core.websocket_manager import ws_manager

router = APIRouter()
logger = logging.getLogger(__name__)

# Directorio temporal para uploads
TEMP_UPLOAD_DIR = Path("temp_uploads")
TEMP_UPLOAD_DIR.mkdir(exist_ok=True)


def validate_file(file: UploadFile) -> None:
    """Valida el archivo antes de subirlo"""
    # Validar nombre de archivo
    if not file.filename or file.filename.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe tener un nombre válido"
        )
    
    # Validar extensión
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión no permitida. Extensiones válidas: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Validar tamaño leyendo el contenido
    file.file.seek(0, 2)  # Ir al final del archivo
    file_size = file.file.tell()
    file.file.seek(0)  # Volver al inicio
    
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío"
        )
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo muy grande. Máximo permitido: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )
    
    # Validar magic bytes para archivos comunes (detección básica de corrupción)
    magic_bytes = file.file.read(8)
    file.file.seek(0)
    
    valid_signatures = {
        b'%PDF': '.pdf',
        b'PK\x03\x04': '.docx',  # ZIP-based files (docx, xlsx, pptx)
        b'PK\x05\x06': '.docx',
        b'PK\x07\x08': '.docx',
    }
    
    # Verificar que el archivo tenga una firma válida si es binario
    if file_ext in ['.pdf', '.docx', '.xlsx', '.pptx']:
        is_valid = any(magic_bytes.startswith(sig) for sig in valid_signatures.keys())
        if not is_valid and file_ext != '.txt':  # .txt no tiene magic bytes
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo parece estar corrupto o no corresponde a su extensión"
            )


@router.get(
    "/workspaces",
    response_model=List[schemas.WorkspacePublic],
    summary="Listar todos los Workspaces"
)
def list_workspaces(
    db: Session = Depends(database.get_db),
    current_user: user_model.User = Depends(auth.get_current_user)
):
    """Devuelve una lista de todos los workspaces."""
    return db.query(workspace_model.Workspace).all()


@router.post(
    "/workspaces", 
    response_model=schemas.WorkspacePublic, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo Workspace"
)
def create_workspace(
    workspace_in: schemas.WorkspaceCreate,
    db: Session = Depends(database.get_db)
):
    """
    Crea un nuevo espacio de trabajo.
    
    - **name**: El nombre del workspace (requerido).
    - **description**: Descripción opcional.
    """
    db_workspace = workspace_model.Workspace(
        name=workspace_in.name,
        description=workspace_in.description
    )
    
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    return db_workspace


@router.post(
    "/workspaces/{workspace_id}/upload",
    response_model=schemas.DocumentPublic,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Subir un documento a un Workspace"
)
@limiter.limit("10/minute")  # Límite específico para uploads
def upload_document_to_workspace(
    request: Request,
    workspace_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """
    Sube un documento para procesamiento asíncrono.
    
    1. Verifica que el Workspace exista.
    2. Valida el archivo.
    3. Verifica límite de documentos por workspace.
    4. Guarda el archivo temporalmente.
    5. Crea un registro 'Document' en la BD con estado 'PENDING'.
    6. Envía una tarea a Celery para procesarlo.
    """
    # 1. Verificar que el Workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # 2. Validar archivo
    validate_file(file)
    
    # 3. Verificar límite de documentos por workspace
    document_count = db.query(document_model.Document).filter(
        document_model.Document.workspace_id == workspace_id
    ).count()
    
    if document_count >= settings.MAX_DOCUMENTS_PER_WORKSPACE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Límite de {settings.MAX_DOCUMENTS_PER_WORKSPACE} documentos alcanzado para este workspace."
        )

    # 4. Guardar el archivo temporalmente
    temp_file_path = TEMP_UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {str(e)}"
        )
    finally:
        file.file.close()

    # 4. Crear el registro 'Document' en la BD
    doc_data = schemas.DocumentPublic.from_upload(file, workspace_id)
    
    db_document = document_model.Document(
        file_name=doc_data.file_name,
        file_type=doc_data.file_type,
        workspace_id=workspace_id,
        status="PENDING"
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # 5. Enviar tarea a Celery
    celery_app.send_task(
        'processing.tasks.process_document',
        args=[db_document.id, str(temp_file_path)]
    )

    print(f"API: Documento {db_document.id} enviado a procesamiento.")
    return db_document


@router.delete(
    "/workspaces/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un Workspace"
)
def delete_workspace(workspace_id: str, db: Session = Depends(database.get_db)):
    """Elimina un workspace y todos sus documentos asociados."""
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    db.delete(db_workspace)
    db.commit()
    
    return None


@router.put(
    "/workspaces/{workspace_id}",
    response_model=schemas.WorkspacePublic,
    summary="Actualizar un Workspace"
)
def update_workspace(
    workspace_id: str,
    workspace_in: schemas.WorkspaceCreate,
    db: Session = Depends(database.get_db)
):
    """Actualiza el nombre y la descripción de un workspace."""
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )

    db_workspace.name = workspace_in.name
    db_workspace.description = workspace_in.description

    db.commit()
    db.refresh(db_workspace)

    return db_workspace


@router.post(
    "/workspaces/{workspace_id}/chat",
    response_model=schemas.ChatResponse,
    summary="Procesar una pregunta de chat (Pipeline RAG Completo)"
)
@limiter.limit("20/minute")  # Límite para chat
def chat_with_workspace(
    request: Request,
    workspace_id: str,
    chat_request: schemas.ChatRequest,
    db: Session = Depends(database.get_db)
):
    """
    Maneja una consulta de chat contra un workspace (Pipeline RAG Completo).
    
    Paso 1 (Retrieve): Busca en Qdrant los chunks más relevantes.
    Paso 2 (Augment & Generate): Construye un prompt y llama al LLM.
    """
    # 1. Verificar que el Workspace exista
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )

    try:
        # Guardar pregunta del usuario en BD
        user_message = chat_model.ChatMessage(
            workspace_id=workspace_id,
            role="user",
            content=chat_request.query
        )
        db.add(user_message)
        db.commit()
        
        # 2. Recuperación (Retrieve)
        relevant_chunks = vector_store.search_similar_chunks(
            query=chat_request.query,
            workspace_id=workspace_id
        )
        
        if not relevant_chunks:
            response_text = "No encontré documentos relevantes. Por favor, sube un documento primero para poder responder tus preguntas."
            
            # Guardar respuesta en BD
            assistant_message = chat_model.ChatMessage(
                workspace_id=workspace_id,
                role="assistant",
                content=response_text
            )
            db.add(assistant_message)
            db.commit()
            
            return schemas.ChatResponse(
                query=chat_request.query,
                llm_response=response_text,
                relevant_chunks=[]
            )

        # 3. Generación (Generate)
        llm_response_text = llm_service.generate_response(
            query=chat_request.query,
            context_chunks=relevant_chunks
        )
        
        # Guardar respuesta del asistente en BD con sources
        sources_json = json.dumps([{
            "chunk_text": chunk.chunk_text,
            "score": chunk.score,
            "chunk_index": chunk.chunk_index
        } for chunk in relevant_chunks])
        
        assistant_message = chat_model.ChatMessage(
            workspace_id=workspace_id,
            role="assistant",
            content=llm_response_text,
            sources=sources_json
        )
        db.add(assistant_message)
        db.commit()
        
        return schemas.ChatResponse(
            query=chat_request.query,
            llm_response=llm_response_text,
            relevant_chunks=relevant_chunks
        )
        
    except Exception as e:
        print(f"ERROR en chat: {e}")
        # Si es un error de colección no encontrada, dar un mensaje amigable
        if "doesn't exist" in str(e) or "Not found: Collection" in str(e):
            response_text = "Este workspace aún no tiene documentos. Por favor, sube un documento primero para poder ayudarte."
            
            # Guardar respuesta en BD
            assistant_message = chat_model.ChatMessage(
                workspace_id=workspace_id,
                role="assistant",
                content=response_text
            )
            db.add(assistant_message)
            db.commit()
            
            return schemas.ChatResponse(
                query=chat_request.query,
                llm_response=response_text,
                relevant_chunks=[]
            )
        # Para otros errores, dar un mensaje genérico sin detalles técnicos
        response_text = "Lo siento, ocurrió un error al procesar tu pregunta. Por favor, intenta de nuevo o sube un documento si aún no lo has hecho."
        
        # Guardar respuesta en BD
        assistant_message = chat_model.ChatMessage(
            workspace_id=workspace_id,
            role="assistant",
            content=response_text
        )
        db.add(assistant_message)
        db.commit()
        
        return schemas.ChatResponse(
            query=chat_request.query,
            llm_response=response_text,
            relevant_chunks=[]
        )


@router.websocket("/ws/{workspace_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str):
    """
    WebSocket endpoint para notificaciones en tiempo real de un workspace
    """
    await ws_manager.connect(websocket, workspace_id)
    try:
        while True:
            # Mantener la conexión abierta y escuchar mensajes del cliente
            data = await websocket.receive_text()
            # Echo para mantener conexión viva (ping/pong)
            await ws_manager.send_personal_message(f"Mensaje recibido: {data}", websocket)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, workspace_id)


@router.get(
    "/workspaces/{workspace_id}/documents/search",
    response_model=List[schemas.DocumentPublic],
    summary="Buscar documentos con filtros"
)
def search_documents(
    workspace_id: str,
    query: str = None,
    file_type: str = None,
    status: str = None,
    date_from: str = None,
    date_to: str = None,
    db: Session = Depends(database.get_db)
):
    """
    Busca documentos con filtros avanzados
    
    - **query**: Búsqueda por nombre de archivo
    - **file_type**: Filtrar por tipo (pdf, docx, etc)
    - **status**: Filtrar por estado (PENDING, PROCESSING, COMPLETED, FAILED)
    - **date_from**: Fecha inicio (YYYY-MM-DD)
    - **date_to**: Fecha fin (YYYY-MM-DD)
    """
    from datetime import datetime
    
    # Iniciar query base
    db_query = db.query(document_model.Document).filter(
        document_model.Document.workspace_id == workspace_id
    )
    
    # Aplicar filtros
    if query:
        db_query = db_query.filter(
            document_model.Document.file_name.contains(query)
        )
    
    if file_type:
        db_query = db_query.filter(
            document_model.Document.file_type == file_type
        )
    
    if status:
        db_query = db_query.filter(
            document_model.Document.status == status
        )
    
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, "%Y-%m-%d")
            db_query = db_query.filter(
                document_model.Document.created_at >= date_from_obj
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha inválido. Use YYYY-MM-DD"
            )
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, "%Y-%m-%d")
            db_query = db_query.filter(
                document_model.Document.created_at <= date_to_obj
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha inválido. Use YYYY-MM-DD"
            )
    
    documents = db_query.order_by(document_model.Document.created_at.desc()).all()
    
    return documents


@router.get(
    "/workspaces/{workspace_id}/documents/export-csv",
    summary="Exportar lista de documentos a CSV"
)
def export_documents_list(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Exporta la lista de documentos de un workspace a CSV
    """
    import csv
    import tempfile
    from datetime import datetime
    
    documents = db.query(document_model.Document).filter(
        document_model.Document.workspace_id == workspace_id
    ).all()
    
    if not documents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay documentos en este workspace"
        )
    
    # Crear archivo temporal CSV
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Escribir encabezados
        writer.writerow(['ID', 'Nombre', 'Tipo', 'Estado', 'Chunks', 'Fecha Creación'])
        
        # Escribir datos
        for doc in documents:
            writer.writerow([
                doc.id,
                doc.file_name,
                doc.file_type,
                doc.status,
                doc.chunk_count,
                doc.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
        
        temp_path = f.name
    
    return FileResponse(
        temp_path,
        media_type='text/csv',
        filename=f'documents_{workspace_id}_{datetime.utcnow().strftime("%Y%m%d")}.csv'
    )


@router.get(
    "/workspaces/fulltext-search",
    summary="Búsqueda de texto completo en todos los workspaces"
)
def fulltext_search(
    query: str,
    workspace_id: str = None,
    limit: int = 10,
    db: Session = Depends(database.get_db)
):
    """
    Búsqueda de texto completo usando el vector store
    
    - **query**: Texto a buscar
    - **workspace_id**: Opcional, limitar a un workspace
    - **limit**: Número máximo de resultados
    """
    if not query or len(query.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consulta debe tener al menos 3 caracteres"
        )
    
    # Si hay workspace_id específico, buscar solo ahí
    if workspace_id:
        chunks = vector_store.search_similar_chunks(
            query=query,
            workspace_id=workspace_id,
            top_k=limit
        )
        
        return {
            "query": query,
            "workspace_id": workspace_id,
            "results": chunks
        }
    
    # Buscar en todos los workspaces
    workspaces = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.is_active == True
    ).all()
    
    all_results = []
    for ws in workspaces:
        try:
            chunks = vector_store.search_similar_chunks(
                query=query,
                workspace_id=ws.id,
                top_k=3  # Menos resultados por workspace
            )
            
            if chunks:
                all_results.append({
                    "workspace_id": ws.id,
                    "workspace_name": ws.name,
                    "chunks": chunks
                })
        except Exception as e:
            logger.warning(f"Error buscando en workspace {ws.id}: {e}")
            continue
    
    return {
        "query": query,
        "total_workspaces_searched": len(workspaces),
        "workspaces_with_results": len(all_results),
        "results": all_results[:limit]
    }
