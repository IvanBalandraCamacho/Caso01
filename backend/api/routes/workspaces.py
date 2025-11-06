from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import shutil 
import os
import uuid  
from pathlib import Path
from sqlalchemy.orm import Session
from models import database, workspace as workspace_model, document as document_model, schemas
from core.celery_app import celery_app

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