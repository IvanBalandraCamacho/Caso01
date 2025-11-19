from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
import shutil
import os
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from models import database, workspace as workspace_model, document as document_model, schemas
from core.celery_app import celery_app
from processing import vector_store
from core import llm_service
from models.schemas import WorkspaceUpdate
from models.conversation import Conversation, Message
import csv
import io
from datetime import datetime
import json

router = APIRouter()

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
    
    # Crear la nueva instancia del modelo SQLAlchemy
    db_workspace = workspace_model.Workspace(
        name=workspace_in.name,
        description=workspace_in.description
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
def upload_document_to_workspace(
    workspace_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """
    Sube un documento. El procesamiento es asíncrono.
    
    El endpoint:
    1. Verifica que el Workspace exista.
    2. Guarda el archivo en un directorio temporal.
    3. Crea un registro 'Document' en la BD con estado 'PENDING'.
    4. (Próximamente) Envía una tarea a Celery para procesarlo.
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

    # 2. Guardar el archivo temporalmente
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

    # 3. Crear el registro 'Document' en la BD
    
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

    # 4. TODO: Enviar tarea a Celery
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
    db: Session = Depends(database.get_db)
):
    """
    Obtiene una lista de todos los documentos para un workspace_id específico.
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
def chat_with_workspace(
    workspace_id: str,
    chat_request: schemas.ChatRequest,
    db: Session = Depends(database.get_db)
):
    """
    Maneja una consulta de chat contra un workspace (Pipeline RAG Completo).
    
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

        relevant_chunks = vector_store.search_similar_chunks(
            query=chat_request.query,
            workspace_id=workspace_id,
            top_k=top_k
        )

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

            yield json.dumps({
                "type": "sources",
                "relevant_chunks": sources_data,
                "conversation_id": conversation_id
            }) + "\n"

            full_response_text = ""
            try:
                for token in llm_service.generate_response_stream(chat_request.query, relevant_chunks):
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
def get_workspace(workspace_id: str, db: Session = Depends(database.get_db)):
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
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
    db: Session = Depends(database.get_db)
):
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
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
def delete_workspace(workspace_id: str, db: Session = Depends(database.get_db)):
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
        
    documents = list(db_workspace.documents)

    for document in documents:
        try:
            vector_store.delete_document_vectors(
                workspace_id=document.workspace_id,
                document_id=document.id,
            )
        except Exception as exc:  # noqa: BLE001 - logging purpose only
            print(f"ERROR eliminando vectores del documento {document.id}: {exc}")

        db.delete(document)

    try:
        vector_store.delete_workspace_vectors(workspace_id)
    except Exception as exc:  # noqa: BLE001 - logging purpose only
        print(f"ERROR eliminando colección del workspace {workspace_id}: {exc}")

    db.delete(db_workspace)
    db.commit()
    return

# --- AÑADIDO: Endpoint para eliminar un Documento ---
@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un Documento"
)
def delete_document(document_id: str, db: Session = Depends(database.get_db)):
    db_document = db.query(document_model.Document).filter(
        document_model.Document.id == document_id
    ).first()
    
    if not db_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con id {document_id} no encontrado."
        )
    
    # 1. Eliminar vectores de Qdrant
    # (Necesitaremos una nueva función en vector_store.py)
    try:
        vector_store.delete_document_vectors(
            workspace_id=db_document.workspace_id,
            document_id=db_document.id
        )
    except Exception as e:
        print(f"Error al eliminar vectores de Qdrant: {e}")
        # Continuar de todos modos para eliminar de la BD
        
    # 2. Eliminar de PostgreSQL
    db.delete(db_document)
    db.commit()
    return

@router.get(
    "/workspaces",
    response_model=list[schemas.WorkspacePublic],
    summary="Obtener todos los Workspaces"
)
def get_workspaces(db: Session = Depends(database.get_db)):
    """
    Obtiene una lista de todos los workspaces activos.
    """
    workspaces = db.query(workspace_model.Workspace).filter(
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
    db: Session = Depends(database.get_db)
):
    """
    Exporta la lista de documentos de un workspace a CSV.
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
    db: Session = Depends(database.get_db)
):
    """
    Exporta el historial de chat de un workspace a TXT.
    Nota: Como no tenemos una tabla de historial de chat,
    esto devolverá información del workspace y sus documentos.
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
    
    # Crear contenido TXT
    content = f"CHAT EXPORT - {db_workspace.name}\n"
    content += f"{'='*60}\n"
    content += f"Workspace ID: {workspace_id}\n"
    content += f"Descripción: {db_workspace.description or 'N/A'}\n"
    content += f"Fecha de exportación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    content += f"{'='*60}\n\n"
    
    # Obtener documentos del workspace
    documents = db.query(document_model.Document).filter(
        document_model.Document.workspace_id == workspace_id
    ).all()
    
    content += f"DOCUMENTOS DEL WORKSPACE ({len(documents)} total):\n"
    content += f"{'-'*60}\n"
    for doc in documents:
        content += f"- {doc.file_name} ({doc.file_type}) - {doc.status} - {doc.chunk_count} chunks\n"
    
    content += f"\n{'-'*60}\n"
    content += "Nota: El historial completo de conversaciones estará disponible en futuras versiones.\n"
    
    # Preparar respuesta
    return StreamingResponse(
        iter([content]),
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename=chat_{workspace_id}_{datetime.now().strftime('%Y%m%d')}.txt"
        }
    )

@router.get(
    "/workspaces/{workspace_id}/chat/export/pdf",
    summary="Exportar historial de chat a PDF"
)
def export_chat_pdf(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Exporta el historial de chat de un workspace a PDF.
    Nota: Esta es una implementación básica. Para PDF real necesitarías
    una librería como reportlab o weasyprint.
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
    
    # Por ahora, devolver un mensaje de texto indicando que PDF no está implementado
    # En producción, aquí usarías una librería para generar PDF
    content = f"""EXPORT PDF - {db_workspace.name}
    
Workspace ID: {workspace_id}
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Nota: La exportación a PDF completa estará disponible próximamente.
Por ahora, usa la exportación a TXT o CSV.

Para implementar PDF completo, instala: pip install reportlab
"""
    
    return StreamingResponse(
        iter([content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=chat_{workspace_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

@router.delete(
    "/workspaces/{workspace_id}/chat/history",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar historial de chat"
)
def delete_chat_history(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Elimina el historial de chat de un workspace.
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
    
    # TODO: Implementar eliminación de historial de chat cuando exista la tabla
    print(f"Delete chat history requested for workspace {workspace_id}")
    return