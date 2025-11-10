from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )

    try:
        # 2. Paso de Recuperación (Retrieve)
        relevant_chunks = vector_store.search_similar_chunks(
            query=chat_request.query,
            workspace_id=workspace_id
        )
        
        if not relevant_chunks:
            # Si no hay chunks, no podemos contestar
            return schemas.ChatResponse(
                query=chat_request.query,
                llm_response="No encontré documentos relevantes para esta consulta. Intente subir un archivo primero.",
                relevant_chunks=[]
            )

        # 3. Paso de Generación (Generate)
        llm_response_text = llm_service.generate_response(
            query=chat_request.query,
            context_chunks=relevant_chunks
        )
        
        # 4. Devolver la respuesta completa
        return schemas.ChatResponse(
            query=chat_request.query,
            llm_response=llm_response_text,
            relevant_chunks=relevant_chunks
        )
        
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
        
    # Aquí también deberíamos eliminar documentos asociados y vectores en Qdrant
    # (Por simplicidad, por ahora solo borramos el workspace)
    # TODO: Implementar borrado en cascada (vectores y documentos)
    
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