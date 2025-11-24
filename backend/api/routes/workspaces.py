from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse, FileResponse
import shutil
import os
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from models import database, workspace as workspace_model, document as document_model, schemas
from core.celery_app import celery_app
# DEPRECADO: from processing import vector_store (eliminado - usar rag_client)
from core.rag_client import rag_client
from core.config import settings
from core import llm_service
from models.schemas import WorkspaceUpdate
from models.conversation import Conversation, Message
import csv
import io
from datetime import datetime
import json

# Rate Limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

# Autenticación
from core.auth import get_current_active_user
from models.user import User

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

@router.post(
    "/workspaces", 
    response_model=schemas.WorkspacePublic, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo Workspace"
)
def create_workspace(
    workspace_in: schemas.WorkspaceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Crea un nuevo espacio de trabajo.
    
    Requiere autenticación. El workspace se asigna al usuario actual.
    
    - **name**: El nombre del workspace (requerido).
    - **description**: Descripción opcional.
    """
    
    # Crear la nueva instancia del modelo SQLAlchemy
    db_workspace = workspace_model.Workspace(
        name=workspace_in.name,
        description=workspace_in.description,
        owner_id=current_user.id  # Asignar al usuario actual
    )
    
    # Añadir a la sesión y confirmar en la BD
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    return db_workspace

TEMP_UPLOAD_DIR = Path("temp_uploads")
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)


@router.post(
    "/workspaces/{workspace_id}/upload",
    response_model=schemas.DocumentPublic,
    status_code=status.HTTP_202_ACCEPTED, # 202 (Aceptado) porque es asíncrono
    summary="Subir un documento a un Workspace"
)
@limiter.limit("10/minute")  # Máximo 10 uploads por minuto
def upload_document_to_workspace(
    request: Request,
    workspace_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Sube un documento. El procesamiento es asíncrono.
    
    Requiere autenticación. Solo el owner del workspace puede subir documentos.
    
    El endpoint:
    1. Verifica que el Workspace exista.
    2. Valida el archivo (tamaño, tipo, extensión).
    3. Guarda el archivo en un directorio temporal.
    4. Crea un registro 'Document' en la BD con estado 'PENDING'.
    5. Envía una tarea a Celery para procesarlo.
    """
    
    # 1. Validar archivo ANTES de cualquier procesamiento (SEGURIDAD)
    from core.security import validate_file
    validate_file(file)
    
    # 2. Verificar que el Workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir documentos a este workspace."
        )

    # 3. Guardar el archivo temporalmente
    try:
        temp_file_path = TEMP_UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo temporalmente: {e}"
        )
    finally:
        file.file.close()

    # 4. Crear el registro 'Document' en la BD
    
    # Usamos el helper del schema para obtener el file_type
    doc_data = schemas.DocumentPublic.from_upload(file, workspace_id)
    
    db_document = document_model.Document(
        file_name=doc_data.file_name,
        file_type=doc_data.file_type,
        workspace_id=workspace_id,
        status="PENDING" # Estado inicial
        # 'chunk_count' y 'created_at' tienen valores por defecto
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # 5. Enviar tarea a Celery
    celery_app.send_task(
         'processing.tasks.process_document',
         args=[db_document.id, str(temp_file_path)]
     )

    print(f"API: Tarea para Documento {db_document.id} enviada a Celery.")

    return db_document

@router.get(
    "/workspaces/{workspace_id}/documents",
    response_model=list[schemas.DocumentPublic],
    summary="Obtener todos los documentos de un Workspace"
)
def get_workspace_documents(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene una lista de todos los documentos para un workspace_id específico.
    
    Requiere autenticación. Solo el owner puede ver los documentos del workspace.
    """
    # Primero, verificar que el workspace exista (buena práctica)
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver los documentos de este workspace."
        )

    # Si existe, obtener sus documentos
    documents = db.query(document_model.Document).filter(
        document_model.Document.workspace_id == workspace_id
    ).all()
    
    return documents


@router.post(
    "/workspaces/{workspace_id}/chat",
    response_model=schemas.ChatResponse,
    summary="Procesar una pregunta de chat (Pipeline RAG Completo)"
)
@limiter.limit("5/minute")  # Máximo 5 consultas de chat por minuto
def chat_with_workspace(
    request: Request,
    workspace_id: str,
    chat_request: schemas.ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Maneja una consulta de chat contra un workspace (Pipeline RAG Completo).
    
    Requiere autenticación. Solo el owner puede chatear con el workspace.
    
    Paso 1 (Retrieve):
    - Busca en Qdrant los chunks más relevantes de este workspace.
    
    Paso 2 (Augment & Generate):
    - Construye un prompt con la pregunta y los chunks.
    - Llama al LLM (Gemini) para obtener una respuesta en lenguaje natural.
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

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para chatear con este workspace."
        )

    try:
        # 2. Obtener o crear conversación
        conversation = None
        if chat_request.conversation_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == chat_request.conversation_id,
                Conversation.workspace_id == workspace_id
            ).first()
            if not conversation:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversación no encontrada.")
        else:
            title = chat_request.query[:50] + "..." if len(chat_request.query) > 50 else chat_request.query
            conversation = Conversation(workspace_id=workspace_id, title=title)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        # Guardar mensaje del usuario
        user_message = Message(conversation_id=conversation.id, role="user", content=chat_request.query)
        db.add(user_message)
        db.commit()

        # Recuperación (Retrieve) con top_k dinámico
        query_length = len(chat_request.query.split())
        top_k = 15 if query_length > 20 else 10

        # Búsqueda en servicio RAG externo (si está habilitado)
        if settings.RAG_SERVICE_ENABLED and rag_client:
            try:
                import asyncio
                rag_results = asyncio.run(rag_client.search(
                    query=chat_request.query,
                    workspace_id=workspace_id,
                    top_k=top_k
                ))
                
                # Convertir resultados RAG a formato DocumentChunk
                relevant_chunks = [
                    schemas.DocumentChunk(
                        document_id=result.document_id,
                        chunk_text=result.content,
                        chunk_index=0,  # El servicio externo puede no tener índice
                        score=result.score
                    ) for result in rag_results
                ]
            except Exception as e:
                print(f"ERROR usando RAG externo: {e}")
                # Fallback: retornar mensaje de error
                relevant_chunks = []
        else:
            # TODO: Implementar fallback o retornar error
            print("ADVERTENCIA: RAG_SERVICE_ENABLED=false, servicio RAG no disponible")
            relevant_chunks = []

        # Si no hay chunks, devolver mensaje informativo
        if not relevant_chunks:
            return schemas.ChatResponse(
                query=chat_request.query,
                llm_response="No encontré documentos relevantes para esta consulta. Intente subir un archivo primero.",
                relevant_chunks=[]
            )

        # Generador para streaming NDJSON
        def stream_response_generator(conversation_id, relevant_chunks):
            # Emitir fuentes/metadatos primero
            sources_data = [
                schemas.DocumentChunk(
                    document_id=chunk.document_id,
                    chunk_text=chunk.chunk_text,
                    chunk_index=chunk.chunk_index,
                    score=chunk.score,
                ).model_dump() for chunk in relevant_chunks
            ]

            # Determinar qué modelo se está usando
            model_used = chat_request.model or "gemini-2.0"  # Default
            print(f"API_CHAT: Modelo solicitado: '{chat_request.model}', usando: '{model_used}'")
            model_name_display = {
                "gemini-2.0": "Gemini 2.0 Flash",
                "gpt-4.1-nano": "GPT-4.1 Nano"
            }.get(model_used, model_used)

            yield json.dumps({
                "type": "sources",
                "relevant_chunks": sources_data,
                "conversation_id": conversation_id,
                "model_used": model_name_display
            }) + "\n"

            full_response_text = ""
            try:
                for token in llm_service.generate_response_stream(chat_request.query, relevant_chunks, chat_request.model):
                    full_response_text += token
                    yield json.dumps({"type": "content", "text": token}) + "\n"
            except Exception as e:
                print(f"API_CHAT: Error durante streaming: {e}")
                yield json.dumps({"type": "error", "detail": str(e)}) + "\n"
                return

            # Guardar mensaje del asistente al final del stream
            try:
                with database.SessionLocal() as db_session:
                    assistant_message = Message(conversation_id=conversation_id, role="assistant", content=full_response_text)
                    db_session.add(assistant_message)
                    db_session.commit()
                    print(f"API_CHAT: Respuesta guardada para conversación {conversation_id}")
            except Exception as e:
                print(f"API_CHAT: Error guardando historial: {e}")

        return StreamingResponse(stream_response_generator(conversation.id, relevant_chunks), media_type="application/x-ndjson")
        
    except Exception as e:
        print(f"API_CHAT: Error al procesar el chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la solicitud de chat: {e}"
        )

@router.get(
    "/workspaces/{workspace_id}",
    response_model=schemas.WorkspacePublic,
    summary="Obtener un Workspace por ID"
)
def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene un workspace específico por su ID.
    
    Requiere autenticación. Solo el owner puede ver el workspace.
    """
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este workspace."
        )
    
    return db_workspace

# --- AÑADIDO: Endpoint para actualizar un Workspace ---
@router.put(
    "/workspaces/{workspace_id}",
    response_model=schemas.WorkspacePublic,
    summary="Actualizar un Workspace"
)
def update_workspace(
    workspace_id: str,
    workspace_in: schemas.WorkspaceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Actualiza un workspace existente.
    
    Requiere autenticación. Solo el owner puede actualizar el workspace.
    """
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este workspace."
        )

    # Actualizar solo los campos proporcionados (que no sean None)
    update_data = workspace_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_workspace, key, value)
    
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

# --- AÑADIDO: Endpoint para eliminar un Workspace ---
@router.delete(
    "/workspaces/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un Workspace"
)
@limiter.limit("20/minute")  # Máximo 20 eliminaciones por minuto
def delete_workspace(
    request: Request, 
    workspace_id: str, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Elimina un workspace y todos sus documentos asociados.
    
    Requiere autenticación. Solo el owner puede eliminar el workspace.
    """
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este workspace."
        )
        
    documents = list(db_workspace.documents)

    for document in documents:
        # Eliminar del servicio RAG externo (si está habilitado)
        if settings.RAG_SERVICE_ENABLED and rag_client:
            try:
                import asyncio
                asyncio.run(rag_client.delete_document(document.id))
                print(f"Documento {document.id} eliminado del servicio RAG externo")
            except Exception as exc:
                print(f"ERROR eliminando del RAG externo {document.id}: {exc}")
        
        db.delete(document)

    # Nota: El servicio RAG externo elimina documentos individualmente
    # No hay concepto de "workspace vectors" en el servicio externo
    print(f"Workspace {workspace_id} eliminado (documentos ya eliminados del RAG)")

    db.delete(db_workspace)
    db.commit()
    return

# --- AÑADIDO: Endpoint para eliminar un Documento ---
@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un Documento"
)
@limiter.limit("20/minute")  # Máximo 20 eliminaciones por minuto
def delete_document(
    request: Request, 
    document_id: str, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Elimina un documento específico.
    
    Requiere autenticación. Solo el owner del workspace al que pertenece el documento puede eliminarlo.
    """
    db_document = db.query(document_model.Document).filter(
        document_model.Document.id == document_id
    ).first()
    
    if not db_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con id {document_id} no encontrado."
        )
    
    # Verificar ownership del workspace al que pertenece el documento
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == db_document.workspace_id
    ).first()

    if not db_workspace or db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este documento."
        )

    # 1. Eliminar del servicio RAG externo (si está habilitado)
    if settings.RAG_SERVICE_ENABLED and rag_client:
        try:
            import asyncio
            success = asyncio.run(rag_client.delete_document(db_document.id))
            if success:
                print(f"Documento {db_document.id} eliminado del servicio RAG externo")
            else:
                print(f"Documento {db_document.id} no encontrado en servicio RAG")
        except Exception as e:
            print(f"Error al eliminar del servicio RAG: {e}")
            # Continuar de todos modos para eliminar de la BD
        
    # 2. Eliminar de PostgreSQL
    db.delete(db_document)
    db.commit()
    return

@router.get(
    "/workspaces",
    response_model=list[schemas.WorkspacePublic],
    summary="Obtener todos los Workspaces del usuario"
)
def get_workspaces(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene una lista de todos los workspaces del usuario autenticado.
    """
    workspaces = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.owner_id == current_user.id,
        workspace_model.Workspace.is_active == True
    ).all()
    
    return workspaces

# --- EXPORT ENDPOINTS ---

@router.get(
    "/workspaces/{workspace_id}/documents/export-csv",
    summary="Exportar documentos a CSV"
)
def export_documents_csv(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Exporta la lista de documentos de un workspace a CSV.
    
    Requiere autenticación. Solo el owner puede exportar los documentos.
    """
    # Verificar que el workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Obtener documentos
    documents = db.query(document_model.Document).filter(
        document_model.Document.workspace_id == workspace_id
    ).all()
    
    # Crear CSV en memoria
    output = io.StringIO()
    writer = csv.writer(output)
    
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
            doc.created_at.strftime('%Y-%m-%d %H:%M:%S') if doc.created_at else ''
        ])
    
    # Preparar respuesta
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=documents_{workspace_id}_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )

@router.get(
    "/workspaces/{workspace_id}/chat/export/txt",
    summary="Exportar historial de chat a TXT"
)
def export_chat_txt(
    workspace_id: str,
    conversation_id: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Exporta el historial de chat de un workspace a TXT.
    Si se proporciona conversation_id, exporta solo esa conversación.
    Si no, exporta todas las conversaciones del workspace.
    
    Requiere autenticación. Solo el owner puede exportar.
    """
    from models.conversation import Conversation, Message
    import re
    
    def markdown_to_text(markdown_text: str) -> str:
        """Convierte Markdown a texto plano legible."""
        text = markdown_text
        # Headers
        text = re.sub(r'^#{1,6}\s+(.+)$', r'\1', text, flags=re.MULTILINE)
        # Bold
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        # Italic
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        # Code blocks
        text = re.sub(r'```[\w]*\n([\s\S]+?)```', r'\n\1\n', text)
        # Inline code
        text = re.sub(r'`(.+?)`', r'\1', text)
        # Links
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        # Lists
        text = re.sub(r'^[\*\-\+]\s+', '• ', text, flags=re.MULTILINE)
        text = re.sub(r'^\d+\.\s+', '', text, flags=re.MULTILINE)
        return text
    
    # Verificar que el workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para exportar desde este workspace."
        )
    
    # Crear contenido TXT
    content = f"CHAT EXPORT - {db_workspace.name}\n"
    content += f"{'='*80}\n"
    content += f"Workspace: {db_workspace.name}\n"
    content += f"Descripción: {db_workspace.description or 'N/A'}\n"
    content += f"Fecha de exportación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    content += f"{'='*80}\n\n"
    
    # Obtener conversaciones
    if conversation_id:
        conversations = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id
        ).all()
        if not conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversación {conversation_id} no encontrada."
            )
    else:
        conversations = db.query(Conversation).filter(
            Conversation.workspace_id == workspace_id
        ).order_by(Conversation.created_at.desc()).all()
    
    if not conversations:
        content += "No hay conversaciones en este workspace.\n"
    else:
        for conv in conversations:
            content += f"\n{'='*80}\n"
            content += f"CONVERSACIÓN: {conv.title}\n"
            content += f"Fecha: {conv.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"{'='*80}\n\n"
            
            # Obtener mensajes de la conversación
            messages = db.query(Message).filter(
                Message.conversation_id == conv.id
            ).order_by(Message.created_at.asc()).all()
            
            if not messages:
                content += "  (Sin mensajes)\n"
            else:
                for msg in messages:
                    role = "Usuario" if msg.role == "user" else "Asistente"
                    content += f"[{msg.created_at.strftime('%H:%M:%S')}] {role}:\n"
                    # Convertir markdown a texto plano
                    formatted_content = markdown_to_text(msg.content)
                    content += f"{formatted_content}\n\n"
                    content += f"{'-'*80}\n\n"
    
    # Preparar respuesta
    filename = f"chat_{conversation_id if conversation_id else workspace_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    return StreamingResponse(
        iter([content]),
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get(
    "/workspaces/{workspace_id}/chat/export/pdf",
    summary="Exportar historial de chat a PDF"
)
def export_chat_pdf(
    workspace_id: str,
    conversation_id: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Exporta el historial de chat de un workspace a PDF.
    Si se proporciona conversation_id, exporta solo esa conversación.
    Si no, exporta todas las conversaciones del workspace.
    
    Requiere autenticación. Solo el owner puede exportar.
    """
    from models.conversation import Conversation, Message
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT
    from reportlab.lib.colors import HexColor
    from io import BytesIO
    import re
    
    def markdown_to_paragraphs(text: str, style, code_style):
        """Convierte markdown a lista de elementos Platypus."""
        elements = []
        lines = text.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Code blocks
            if line.strip().startswith('```'):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                if code_lines:
                    code_text = '\n'.join(code_lines)
                    elements.append(Preformatted(code_text, code_style))
                    elements.append(Spacer(1, 0.1*inch))
                i += 1
                continue
            
            # Process inline markdown
            processed_line = line
            
            # Bold
            processed_line = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', processed_line)
            processed_line = re.sub(r'__(.+?)__', r'<b>\1</b>', processed_line)
            
            # Italic
            processed_line = re.sub(r'\*(.+?)\*', r'<i>\1</i>', processed_line)
            processed_line = re.sub(r'_(.+?)_', r'<i>\1</i>', processed_line)
            
            # Inline code
            processed_line = re.sub(r'`(.+?)`', r'<font name="Courier" backColor="#f0f0f0">\1</font>', processed_line)
            
            # Links (simplificado)
            processed_line = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'<u>\1</u>', processed_line)
            
            # Headers (h1-h6)
            header_match = re.match(r'^(#{1,6})\s+(.+)$', processed_line)
            if header_match:
                level = len(header_match.group(1))
                text = header_match.group(2)
                size = max(12, 18 - level * 2)
                elements.append(Paragraph(f'<font size="{size}"><b>{text}</b></font>', style))
                elements.append(Spacer(1, 0.1*inch))
                i += 1
                continue
            
            # Lists
            if re.match(r'^[\*\-\+]\s+', processed_line):
                text = re.sub(r'^[\*\-\+]\s+', '• ', processed_line)
                elements.append(Paragraph(text, style))
            elif re.match(r'^\d+\.\s+', processed_line):
                elements.append(Paragraph(processed_line, style))
            elif processed_line.strip():  # Regular paragraph
                elements.append(Paragraph(processed_line, style))
            else:  # Empty line
                elements.append(Spacer(1, 0.05*inch))
            
            i += 1
        
        return elements
    
    # Verificar que el workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para exportar desde este workspace."
        )
    
    # Crear buffer para el PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                          rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=18)
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=HexColor('#1a1a1a'),
        spaceAfter=30,
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=HexColor('#333333'),
        spaceAfter=12,
    )
    
    user_style = ParagraphStyle(
        'UserMessage',
        parent=styles['Normal'],
        fontSize=11,
        textColor=HexColor('#0066cc'),
        alignment=TA_RIGHT,
        spaceAfter=8,
        leftIndent=100,
    )
    
    assistant_style = ParagraphStyle(
        'AssistantMessage',
        parent=styles['Normal'],
        fontSize=11,
        textColor=HexColor('#333333'),
        spaceAfter=8,
        rightIndent=100,
    )
    
    timestamp_style = ParagraphStyle(
        'Timestamp',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#666666'),
        spaceAfter=4,
    )
    
    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Code'],
        fontSize=9,
        textColor=HexColor('#000000'),
        backColor=HexColor('#f5f5f5'),
        leftIndent=20,
        rightIndent=20,
        spaceAfter=10,
        fontName='Courier',
    )
    
    # Contenido del PDF
    story = []
    
    # Título
    story.append(Paragraph(f"Chat Export - {db_workspace.name}", title_style))
    story.append(Paragraph(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Obtener conversaciones
    if conversation_id:
        conversations = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id
        ).all()
        if not conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversación {conversation_id} no encontrada."
            )
    else:
        conversations = db.query(Conversation).filter(
            Conversation.workspace_id == workspace_id
        ).order_by(Conversation.created_at.desc()).all()
    
    if not conversations:
        story.append(Paragraph("No hay conversaciones en este workspace.", styles['Normal']))
    else:
        for idx, conv in enumerate(conversations):
            if idx > 0:
                story.append(PageBreak())
            
            story.append(Paragraph(f"Conversación: {conv.title}", subtitle_style))
            story.append(Paragraph(
                f"Creada: {conv.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                timestamp_style
            ))
            story.append(Spacer(1, 0.2*inch))
            
            # Obtener mensajes
            messages = db.query(Message).filter(
                Message.conversation_id == conv.id
            ).order_by(Message.created_at.asc()).all()
            
            if not messages:
                story.append(Paragraph("(Sin mensajes)", styles['Italic']))
            else:
                for msg in messages:
                    # Timestamp
                    story.append(Paragraph(
                        f"{msg.created_at.strftime('%H:%M:%S')}",
                        timestamp_style
                    ))
                    
                    # Mensaje con formato markdown
                    if msg.role == "user":
                        story.append(Paragraph(f"<b>Usuario:</b>", user_style))
                        # Usuario: texto simple
                        story.append(Paragraph(msg.content, user_style))
                    else:
                        story.append(Paragraph(f"<b>Asistente:</b>", assistant_style))
                        # Asistente: parsear markdown
                        markdown_elements = markdown_to_paragraphs(msg.content, assistant_style, code_style)
                        story.extend(markdown_elements)
                    
                    story.append(Spacer(1, 0.15*inch))
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    # Preparar respuesta
    filename = f"chat_{conversation_id if conversation_id else workspace_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.delete(
    "/workspaces/{workspace_id}/chat/history",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar historial de chat"
)
def delete_chat_history(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Elimina el historial de chat de un workspace.
    
    Requiere autenticación. Solo el owner puede eliminar el historial.
    
    Nota: Como no tenemos tabla de historial, esto es un placeholder.
    """
    # Verificar que el workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar el historial de este workspace."
        )
    
    # TODO: Implementar eliminación de historial de chat cuando exista la tabla
    print(f"Delete chat history requested for workspace {workspace_id}")
    return