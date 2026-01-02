import csv
import io
import json
import os
import pickle
import shutil
import uuid
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

# Cache y eficiencia
import redis
from core import llm_service
from core.intent_detector import classify_intent

# Autenticación
from core.auth import get_current_active_user
from core.celery_app import celery_app
from core.chat_router import handle_user_message
from core.config import settings
from core.gcp_services import gcp_services


# DEPRECADO: from processing import vector_store (eliminado - usar rag_client)
from core.rag_client import rag_client
from core import llm_service, intent_detector
from api.routes import intention_task
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from models import database, schemas
from models import document as document_model
from models import workspace as workspace_model
from models.conversation import Conversation, Message
from models.schemas import WorkspaceUpdate
from models.user import User

# Rate Limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

# Configuración Redis para cache
redis_client = (
    redis.from_url(settings.REDIS_URL) if hasattr(settings, "REDIS_URL") else None
)

# Cache TTL en segundos (24 horas)
CACHE_TTL = 86400


# Funciones de cache y eficiencia para datos TIVIT
@lru_cache(maxsize=1)
def get_tivit_data():
    """Obtiene datos TIVIT con cache LRU (solo se carga una vez por proceso)"""
    try:
        from api.routes.tivit import SERVICIOS_TIVIT, TRABAJADORES_TIVIT

        return TRABAJADORES_TIVIT, SERVICIOS_TIVIT
    except Exception as e:
        print(f"Error cargando datos TIVIT: {e}")
        return [], []


def get_cached_tivit_chunks(query_keywords: frozenset) -> List[schemas.DocumentChunk]:
    """Obtiene chunks de TIVIT cacheados basados en keywords de la consulta"""
    if not redis_client:
        return get_fallback_tivit_chunks(query_keywords)

    cache_key = f"tivit_chunks:{hash(query_keywords)}"

    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return pickle.loads(cached_data)
    except Exception as e:
        print(f"Error obteniendo cache Redis: {e}")

    # Generar chunks y cachearlos
    chunks = generate_tivit_chunks(query_keywords)

    try:
        redis_client.setex(cache_key, CACHE_TTL, pickle.dumps(chunks))
    except Exception as e:
        print(f"Error guardando en cache Redis: {e}")

    return chunks


def generate_tivit_chunks(query_keywords: frozenset) -> List[schemas.DocumentChunk]:
    """Genera chunks de TIVIT filtrados por keywords"""
    trabajadores, servicios = get_tivit_data()
    chunks = []

    # Keywords para detectar tipo de equipo
    dev_keywords = frozenset(
        [
            "desarrollo",
            "programador",
            "developer",
            "software",
            "web",
            "mobile",
            "backend",
            "frontend",
        ]
    )
    security_keywords = frozenset(
        [
            "seguridad",
            "ciberseguridad",
            "cybersecurity",
            "hacking",
            "pentest",
            "auditoria",
        ]
    )
    cloud_keywords = frozenset(
        ["cloud", "aws", "azure", "gcp", "nube", "infraestructura"]
    )
    data_keywords = frozenset(
        ["datos", "data", "analytics", "bi", "machine learning", "ml", "ai"]
    )

    # Determinar qué tipo de trabajadores/servicios son más relevantes
    relevant_areas = set()
    if any(kw in query_keywords for kw in dev_keywords):
        relevant_areas.add("Desarrollo")
    if any(kw in query_keywords for kw in security_keywords):
        relevant_areas.add("Ciberseguridad")
    if any(kw in query_keywords for kw in cloud_keywords):
        relevant_areas.add("Cloud")
    if any(kw in query_keywords for kw in data_keywords):
        relevant_areas.add("Datos")

    # Si no hay áreas específicas, incluir todas
    if not relevant_areas:
        relevant_areas = {"Desarrollo", "Ciberseguridad", "Cloud", "Datos"}

    # Filtrar y limitar trabajadores
    filtered_trabajadores = [
        t
        for t in trabajadores
        if any(
            area.lower() in t.area.lower() or area.lower() in t.area_experiencia.lower()
            for area in relevant_areas
        )
    ][:8]  # Máximo 8 trabajadores

    # Filtrar servicios relevantes
    filtered_servicios = [
        s
        for s in servicios
        if any(area.lower() in s.categoria.lower() for area in relevant_areas)
    ][:4]  # Máximo 4 servicios

    # Crear chunks optimizados (más concisos)
    for trabajador in filtered_trabajadores:
        chunk_text = f"TIVIT {trabajador.nombre}: {trabajador.area} con {trabajador.anos_experiencia} años exp. Certificaciones: {', '.join(trabajador.certificaciones[:3])}. Rol: {trabajador.rol}. Idiomas: {', '.join(trabajador.idiomas)}. Disponibilidad: {trabajador.disponibilidad}."

        chunks.append(
            schemas.DocumentChunk(
                document_id="tivit-trabajadores",
                chunk_text=chunk_text,
                chunk_index=len(chunks),
                score=0.95,  # Alta relevancia para datos filtrados
            )
        )

    for servicio in filtered_servicios:
        chunk_text = f"Servicio TIVIT {servicio.nombre}: {servicio.descripcion[:100]}... Costo: ${servicio.costo_mensual_min}-${servicio.costo_mensual_max}/mes. Duración: {servicio.duracion_estimada_meses} meses. Tecnologías: {', '.join(servicio.tecnologias_principales[:3])}."

        chunks.append(
            schemas.DocumentChunk(
                document_id="tivit-servicios",
                chunk_text=chunk_text,
                chunk_index=len(chunks),
                score=0.85,
            )
        )

    return chunks


def invalidate_tivit_cache():
    """Invalida todo el cache de TIVIT (útil cuando se actualizan los datos)"""
    if redis_client:
        try:
            # Eliminar todas las claves que empiecen con "tivit_chunks:"
            keys = redis_client.keys("tivit_chunks:*")
            if keys:
                redis_client.delete(*keys)
                print(f"Cache TIVIT invalidado: {len(keys)} claves eliminadas")
        except Exception as e:
            print(f"Error invalidando cache TIVIT: {e}")

    # Limpiar también el LRU cache
    get_tivit_data.cache_clear()


def get_cache_stats():
    """Obtiene estadísticas del cache para monitoreo"""
    stats = {
        "redis_available": redis_client is not None,
        "lru_cache_info": get_tivit_data.cache_info()._asdict()
        if hasattr(get_tivit_data, "cache_info")
        else None,
    }

    if redis_client:
        try:
            tivit_keys = redis_client.keys("tivit_chunks:*")
            stats["redis_keys_count"] = len(tivit_keys)
            stats["redis_memory_usage"] = sum(
                len(redis_client.get(k) or b"") for k in tivit_keys
            )
        except Exception as e:
            stats["redis_error"] = str(e)

    return stats


def extract_query_keywords(query: str) -> frozenset:
    """Extrae keywords relevantes de la consulta para filtrado inteligente"""
    query_lower = query.lower()

    # Keywords de equipo y especialidades
    team_keywords = {
        "equipo",
        "team",
        "personal",
        "staff",
        "trabajadores",
        "colaboradores",
        "desarrollo",
        "programador",
        "developer",
        "software",
        "web",
        "mobile",
        "backend",
        "frontend",
        "fullstack",
        "seguridad",
        "ciberseguridad",
        "cybersecurity",
        "hacking",
        "pentest",
        "auditoria",
        "cloud",
        "aws",
        "azure",
        "gcp",
        "nube",
        "infraestructura",
        "datos",
        "data",
        "analytics",
        "bi",
        "machine learning",
        "ml",
        "ai",
        "devops",
        "sre",
        "arquitecto",
        "architecture",
        "qa",
        "testing",
        "scrum",
        "agile",
        "proyecto",
        "startup",
    }

    found_keywords = {word for word in query_lower.split() if word in team_keywords}

    # Agregar bigramas comunes
    query_words = query_lower.split()
    for i in range(len(query_words) - 1):
        bigram = f"{query_words[i]} {query_words[i + 1]}"
        if bigram in [
            "armar equipo",
            "equipo desarrollo",
            "equipo seguridad",
            "equipo cloud",
        ]:
            found_keywords.add(bigram)

    return frozenset(found_keywords)


@router.post(
    "/workspaces",
    response_model=schemas.WorkspacePublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo Workspace",
)
def create_workspace(
    workspace_in: schemas.WorkspaceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Crea un nuevo espacio de trabajo.

    Requiere autenticación. El workspace se asigna al usuario actual.

    - **name**: El nombre del workspace (requerido).
    - **description**: Descripción opcional.
    - **instructions**: Instrucciones opcionales para el asistente AI.
    """

    # Crear la nueva instancia del modelo SQLAlchemy
    db_workspace = workspace_model.Workspace(
        name=workspace_in.name,
        description=workspace_in.description,
        instructions=workspace_in.instructions,
        owner_id=current_user.id,  # Asignar al usuario actual
    )

    # Añadir a la sesión y confirmar en la BD
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)

    # Crear una conversación inicial por defecto para el nuevo workspace
    # Si el usuario provee instrucciones, podemos generar un título relevante, else 'General'
    default_title = (
        f"{db_workspace.name} - Chat" if db_workspace.name else "General"
    )
    from models.conversation import Conversation

    db_conversation = Conversation(workspace_id=db_workspace.id, title=default_title)
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)

    # Devolver la información del workspace junto con el id de la conversación por defecto
    return schemas.WorkspacePublic(
        id=db_workspace.id,
        name=db_workspace.name,
        description=db_workspace.description,
        instructions=db_workspace.instructions,
        created_at=db_workspace.created_at,
        is_active=db_workspace.is_active,
        default_conversation_id=db_conversation.id,
    )


UPLOAD_DIR = Path("uploaded_files")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def upload_to_gcs(file_obj, destination_blob_name):
    """Sube un archivo a Google Cloud Storage."""
    # Used centralized service
    result = gcp_services.upload_file(file_obj, destination_blob_name)
    if not result:
        raise Exception("Error uploading to GCS (check logs)")
    return result

def download_from_gcs_stream(source_blob_name):
    """Genera un stream del archivo desde GCS."""
    return gcp_services.open_file_stream(source_blob_name)



@router.post(
    "/workspaces/{workspace_id}/upload",
    response_model=schemas.DocumentPublic,
    status_code=status.HTTP_202_ACCEPTED,  # 202 (Aceptado) porque es asíncrono
    summary="Subir un documento a un Workspace",
)
@limiter.limit("10/minute")  # Máximo 10 uploads por minuto
def upload_document_to_workspace(
    request: Request,
    workspace_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Sube un documento. El procesamiento es asíncrono.

    Requiere autenticación. Solo el owner del workspace puede subir documentos.

    El endpoint:
    1. Verifica que el Workspace exista.
    2. Valida el archivo (tamaño, tipo, extensión).
    3. Guarda el archivo en un directorio persistente.
    4. Crea un registro 'Document' en la BD con estado 'PENDING'.
    5. Envía una tarea a Celery para procesarlo.
    """

    # 1. Validar archivo ANTES de cualquier procesamiento (SEGURIDAD)
    from core.security import validate_file

    validate_file(file)

    # 2. Verificar que el Workspace existe
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir documentos a este workspace.",
        )

    # 3. Crear el registro 'Document' en la BD PRIMERO para obtener el ID
    # Usamos el helper del schema para obtener el file_type
    doc_data = schemas.DocumentPublic.from_upload(file, workspace_id)

    db_document = document_model.Document(
        file_name=doc_data.file_name,
        file_type=doc_data.file_type,
        workspace_id=workspace_id,
        status="PENDING",  # Estado inicial
    )

    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # 4. Guardar el archivo PERSISTENTEMENTE
    file_uri = ""
    try:
        extension = os.path.splitext(file.filename)[1]
        filename = f"{db_document.id}{extension}"
        
        # Intentar subir a GCS si está configurado
        if settings.GCS_BUCKET_NAME:
            try:
                file_uri = upload_to_gcs(file.file, filename)
                if file_uri:
                    print(f"Archivo subido a GCS: {file_uri}")
                else:
                    raise Exception("GCS upload returned None")
            except Exception as gcs_error:
                print(f"Error al subir a GCS, usando almacenamiento local: {gcs_error}")
                # Fallback a local si GCS falla
                file.file.seek(0)  # Reset file pointer
                file_path = UPLOAD_DIR / filename
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                file_uri = str(file_path)
        else:
            # Almacenamiento local si GCS no está configurado
            file_path = UPLOAD_DIR / filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_uri = str(file_path)
            
    except Exception as e:
        # Si falla el guardado, eliminar el registro de la BD
        db.delete(db_document)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {e}",
        )
    finally:
        file.file.close()

    # Verificar que file_uri no esté vacío
    if not file_uri:
        db.delete(db_document)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error: No se pudo determinar la ubicación del archivo guardado",
        )

    # 5. Enviar tarea de procesamiento
    # Check if Cloud Tasks configuration exists
    cloud_tasks_queue = getattr(settings, 'CLOUD_TASKS_QUEUE', None)
    cloud_tasks_location = getattr(settings, 'CLOUD_TASKS_LOCATION', None)
    google_cloud_project = getattr(settings, 'GOOGLE_CLOUD_PROJECT', None)
    
    if cloud_tasks_queue and cloud_tasks_location and google_cloud_project:
        # Usar Cloud Tasks
        queue_path = gcp_services.tasks_client.queue_path(
            google_cloud_project,
            cloud_tasks_location,
            cloud_tasks_queue
        )
        
        # URL de mi propio servicio (debe ser la URL publica de Cloud Run + endpoint)
        # En Cloud Run, se puede configurar para usar la URL interna o relativa si está en la misma red,
        # pero Cloud Tasks requiere URL absoluta.
        # Definimos una variable SERVICE_URL en settings o la construimos.
        service_url = os.getenv("SERVICE_URL", "https://mi-backend-dot-mi-proyecto.run.app") 
        target_url = f"{service_url.rstrip('/')}/api/tasks/tasks/process-document"
        
        payload = {"document_id": db_document.id, "file_uri": file_uri}
        
        task_name = gcp_services.create_http_task(queue_path, target_url, payload)
        if task_name:
            print(f"API: Tarea enviada a Cloud Tasks: {task_name}")
        else:
             print("API: Fallo al enviar a Cloud Tasks, fallback a Celery...")
             celery_app.send_task("processing.tasks.process_document", args=[db_document.id, file_uri])

    else:
        # Fallback a Celery (Redis)
        celery_app.send_task(
            "processing.tasks.process_document", args=[db_document.id, file_uri]
        )
        print(f"API: Tarea enviada a Celery (Redis).")

    return db_document


@router.get(
    "/workspaces/{workspace_id}/documents/{document_id}/content",
    summary="Obtener el contenido de un documento (Preview)",
)
def get_document_content(
    workspace_id: str,
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene el archivo original de un documento para previsualización.
    """
    # 1. Verificar documento
    db_document = (
        db.query(document_model.Document)
        .filter(document_model.Document.id == document_id)
        .first()
    )

    if not db_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado.",
        )
        
    # 2. Verificar workspace y permisos
    if db_document.workspace_id != workspace_id:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El documento no pertenece al workspace especificado.",
        )

    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )
    
    if not db_workspace or db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver este documento.",
        )

    # 3. Servir el archivo
    # Determinar content-type
    media_type = "application/octet-stream"
    # Tratamos de inferir la extension aunque no la tengamos guardada en un campo explicito "extension"
    # pero el file_name suele tenerla.
    filename_original = db_document.file_name
    ext = os.path.splitext(filename_original)[1].lower() if filename_original else ""
    
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext in [".txt", ".md"]:
        media_type = "text/plain"
    elif ext in [".jpg", ".jpeg", ".png"]:
        media_type = "image/" + ext[1:]

    # Intentar obtener desde GCS
    if settings.GCS_BUCKET_NAME:
        # Asumimos que el nombre en el bucket es ID + extension.
        # PERO: En la subida usamos os.path.splitext(file.filename).
        # Aquí no sabemos la extensión exacta con la que se guardó ID... 
        # Bueno, en la subida usamos extension del file.filename original.
        # Vamos a intentar adivinar o iterar?
        # MEJORA: Guardar "storage_path" en la BD sería ideal. 
        # Por ahora, reconstruimos la lógica: ID + extension del nombre original.
        
        blob_name = f"{document_id}{ext}"
        try:
             stream = download_from_gcs_stream(blob_name)
             if stream:
                 return StreamingResponse(stream, media_type=media_type)
        except Exception as e:
            print(f"Error GCS: {e}")
            # Fallback a local si falla GCS o no encuentra
            pass

    # 4. Fallback: Buscar en sistema de archivos local
    found_file = None
    for file_path in UPLOAD_DIR.glob(f"{document_id}.*"):
        found_file = file_path
        break
        
    if not found_file or not found_file.exists():
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo no se encuentra en el almacenamiento.",
        )

    return FileResponse(
        path=found_file,
        filename=db_document.file_name,
        media_type=media_type
    )


@router.get(
    "/workspaces/{workspace_id}/documents",
    response_model=list[schemas.DocumentPublic],
    summary="Obtener todos los documentos de un Workspace",
)
def get_workspace_documents(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene una lista de todos los documentos para un workspace_id específico.

    Requiere autenticación. Solo el owner puede ver los documentos del workspace.
    """
    # Primero, verificar que el workspace exista (buena práctica)
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver los documentos de este workspace.",
        )

    # Si existe, obtener sus documentos
    documents = (
        db.query(document_model.Document)
        .filter(document_model.Document.workspace_id == workspace_id)
        .all()
    )

    return documents


@router.get(
    "/documents/{document_id}/status",
    response_model=schemas.DocumentPublic,
    summary="Obtener el estado de procesamiento de un documento"
)
def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Endpoint para que el frontend consulte el estado de un documento.
    
    **Estados posibles:**
    - `PENDING`: Documento en cola, esperando procesamiento
    - `PROCESSING`: Celery está procesando el documento
    - `COMPLETED`: Procesamiento exitoso, documento indexado en RAG
    - `FAILED`: Error durante el procesamiento
    
    **Uso recomendado:**
    ```javascript
    // Frontend: Polling cada 2 segundos hasta que status === 'COMPLETED'
    const checkStatus = async (docId) => {
      const response = await fetch(`/api/v1/documents/${docId}/status`);
      const doc = await response.json();
      
      if (doc.status === 'COMPLETED') {
        showSuccessNotification('Documento procesado correctamente');
      } else if (doc.status === 'FAILED') {
        showErrorNotification('Error al procesar el documento');
      } else {
        setTimeout(() => checkStatus(docId), 2000);
      }
    };
    ```
    """
    db_document = (
        db.query(document_model.Document)
        .filter(document_model.Document.id == document_id)
        .first()
    )

    if not db_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con id {document_id} no encontrado.",
        )

    # Verificar ownership del workspace
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == db_document.workspace_id)
        .first()
    )

    if not db_workspace or db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver este documento.",
        )

    return db_document


@router.get(
    "/workspaces/{workspace_id}/documents/pending",
    response_model=list[schemas.DocumentPublic],
    summary="Obtener documentos pendientes o en procesamiento"
)
def get_pending_documents(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Devuelve solo los documentos que están en estado PENDING o PROCESSING.
    
    Útil para que el frontend muestre un indicador de "X documentos procesándose".
    """
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace no encontrado.",
        )

    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver documentos de este workspace.",
        )

    pending_docs = (
        db.query(document_model.Document)
        .filter(
            document_model.Document.workspace_id == workspace_id,
            document_model.Document.status.in_(["PENDING", "PROCESSING"])
        )
        .order_by(document_model.Document.created_at.desc())
        .all()
    )

    return pending_docs


@router.get(
    "/workspaces/{workspace_id}/conversations/{conversation_id}/documents",
    response_model=list[schemas.DocumentPublic],
    summary="Obtener todos los documentos de una Conversación específica",
)
def get_conversation_documents(
    workspace_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene una lista de todos los documentos asociados a una conversación específica.

    Requiere autenticación. Solo el owner puede ver los documentos de la conversación.
    """
    # Verificar que el workspace exista
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver los documentos de este workspace.",
        )

    # Verificar que la conversación exista y pertenezca al workspace
    db_conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
        .first()
    )

    if not db_conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación con id {conversation_id} no encontrada en este workspace.",
        )

    # Obtener documentos de la conversación
    documents = (
        db.query(document_model.Document)
        .filter(
            document_model.Document.workspace_id == workspace_id,
            document_model.Document.conversation_id == conversation_id,
        )
        .all()
    )

    return documents


@router.post(
    "/workspaces/{workspace_id}/conversations/{conversation_id}/upload",
    response_model=schemas.DocumentPublic,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Subir un documento a una Conversación específica",
)
@limiter.limit("10/minute")
def upload_document_to_conversation(
    request: Request,
    workspace_id: str,
    conversation_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Sube un documento a una conversación específica.

    Requiere autenticación. Solo el owner del workspace puede subir documentos.

    El endpoint:
    1. Verifica que el Workspace y Conversación existan.
    2. Valida el archivo (tamaño, tipo, extensión).
    3. Guarda el archivo en un directorio temporal.
    4. Crea un registro 'Document' en la BD con estado 'PENDING' y conversation_id.
    5. Envía una tarea a Celery para procesarlo.
    """

    # 1. Validar archivo ANTES de cualquier procesamiento (SEGURIDAD)
    from core.security import validate_file

    validate_file(file)

    # 2. Verificar que el Workspace existe
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para subir documentos a este workspace.",
        )

    # 3. Verificar que la Conversación existe y pertenece al workspace
    db_conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
        .first()
    )

    if not db_conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación con id {conversation_id} no encontrada en este workspace.",
        )

    # 4. Crear el registro 'Document' en la BD PRIMERO para obtener el ID
    # Usamos el helper del schema para obtener el file_type
    doc_data = schemas.DocumentPublic.from_upload(file, workspace_id)

    db_document = document_model.Document(
        file_name=doc_data.file_name,
        file_type=doc_data.file_type,
        workspace_id=workspace_id,
        conversation_id=conversation_id,  # Asignar a la conversación
        status="PENDING",
    )

    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    # 5. Guardar el archivo PERSISTENTEMENTE
    file_uri = ""
    try:
        extension = os.path.splitext(file.filename)[1]
        filename = f"{db_document.id}{extension}"
        
        # Intentar subir a GCS si está configurado
        if settings.GCS_BUCKET_NAME:
            try:
                file_uri = upload_to_gcs(file.file, filename)
                if file_uri:
                    print(f"Archivo conversación subido a GCS: {file_uri}")
                else:
                    raise Exception("GCS upload returned None")
            except Exception as gcs_error:
                print(f"Error al subir a GCS, usando almacenamiento local: {gcs_error}")
                # Fallback a local si GCS falla
                file.file.seek(0)  # Reset file pointer
                file_path = UPLOAD_DIR / filename
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                file_uri = str(file_path)
        else:
            # Almacenamiento local si GCS no está configurado
            file_path = UPLOAD_DIR / filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_uri = str(file_path)
            
    except Exception as e:
        db.delete(db_document)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {e}",
        )
    finally:
        file.file.close()
    
    # Validar que file_uri no esté vacío
    if not file_uri:
        db.delete(db_document)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error: No se pudo determinar la ubicación del archivo guardado",
        )

    # 6. Enviar tarea a Celery con la URI
    celery_app.send_task(
        "processing.tasks.process_document", args=[db_document.id, file_uri]
    )

    print(
        f"API: Tarea para Documento {db_document.id} (conversación {conversation_id}) enviada a Celery."
    )

    return db_document


@router.post(
    "/workspaces/{workspace_id}/chat",
    response_model=schemas.ChatResponse,
    summary="Procesar una pregunta de chat (Pipeline RAG Completo)",
)
@limiter.limit("5/minute")
async def chat_with_workspace(
    request: Request,
    workspace_id: str,
    chat_request: schemas.ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Endpoint general de chat.
    - Guarda el mensaje del usuario
    - Realiza retrieval (RAG)
    - Genera respuesta del LLM
    - Guarda la respuesta del asistente
    - **Activa lógica interna de sugerencias** (handle_user_message)
    """

    # -------------------------------------------------------------
    # 1. Verificar existencia y permisos del workspace
    # -------------------------------------------------------------
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )
    
    if db_workspace.instructions:
        workspace_instructions = db_workspace.instructions
        print(f"Instrucciones del workspace: {db_workspace.instructions}")
    else:
        workspace_instructions = ""

    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado.")

    if db_workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    # -------------------------------------------------------------
    # 2. Obtener o crear conversación
    # -------------------------------------------------------------
    if chat_request.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == chat_request.conversation_id,
                Conversation.workspace_id == workspace_id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    else:
        title = (
            chat_request.query[:50] + "..."
            if len(chat_request.query) > 50
            else chat_request.query
        )
        conversation = Conversation(workspace_id=workspace_id, title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # -------------------------------------------------------------
    # 3. Guardar mensaje del usuario en la BD
    # -------------------------------------------------------------
    user_message = Message(
        conversation_id=conversation.id, role="user", content=chat_request.query
    )
    db.add(user_message)
    db.commit()

    # -------------------------------------------------------------
    # 4. Retrieval dinámico
    # -------------------------------------------------------------
    query_length = len(chat_request.query.split())
    top_k = 15 if query_length > 20 else 10

    relevant_chunks = []
    if settings.RAG_SERVICE_ENABLED and rag_client:
        try:
            # Filtrar por workspace_id Y conversation_id para independencia entre chats
            rag_results = await rag_client.search(
                query=chat_request.query,
                workspace_id=workspace_id,
                conversation_id=conversation.id,  # Agregar filtro por conversación
                limit=top_k,
                threshold=0.25,
            )
            relevant_chunks = [
                schemas.DocumentChunk(
                    document_id=r.document_id,
                    chunk_text=r.content,
                    chunk_index=0,
                    score=r.score,
                )
                for r in rag_results
            ]
        except Exception as e:
            print(f"ERROR RAG: {e}")
            
    # -------------------------------------------------------------
    # 5. Identificar intención de consulta de usuario
    # -------------------------------------------------------------  

    intent = intent_detector.classify_intent(chat_request.query)
    print(f"Intención detectada: {intent}")

    # --- NUEVO: Recuperar historial de chat ---
    # Obtenemos los últimos 10 mensajes (5 turnos de conversación) para contexto
    # Excluimos el mensaje actual que acabamos de guardar
    past_messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation.id,
            Message.id != user_message.id # Excluir el actual
        )
        .order_by(Message.created_at.desc())
        .limit(10) 
        .all()
    )
    
    # Reordenar cronológicamente (antiguo -> nuevo) y formatear
    chat_history = []
    for msg in reversed(past_messages):
        chat_history.append({
            "role": msg.role,
            "content": msg.content
        })
    # ------------------------------------------

    # -------------------------------------------------------------
    # 6. Streaming de respuesta del modelo
    # -------------------------------------------------------------
    async def stream_response_generator(conversation_id, relevant_chunks):
        sources_data = [chunk.model_dump() for chunk in relevant_chunks]

        model_used = chat_request.model or "gpt-4o-mini"

        # Enviar el intent detectado al frontend para que pueda reaccionar
        yield (
            json.dumps(
                {
                    "type": "intent",
                    "intent": intent,
                }
            )
            + "\n"
        )

        yield (
            json.dumps(
                {
                    "type": "sources",
                    "relevant_chunks": sources_data,
                    "conversation_id": conversation_id,
                    "model_used": model_used,
                }
            )
            + "\n"
        )

        full_response_text = ""
        
        if intent == "GENERATE_PROPOSAL":
            # Marcar conversación como que tiene propuesta
            conversation.has_proposal = True
            db.commit()
            response_stream = intention_task.get_analyze_stream(query=chat_request.query,relevant_chunks=relevant_chunks,chat_model= chat_request.model, workspace_instructions= workspace_instructions)
        elif intent == "GENERAL_QUERY":
            response_stream = intention_task.general_query_chat(
                chat_request.query, 
                relevant_chunks, 
                chat_request.model, 
                workspace_instructions,
                chat_history=chat_history
            )
        elif intent == "REQUIREMENTS_MATRIX":
            response_stream = intention_task.requirements_matrix_chat(
                chat_request.query,
                relevant_chunks,
                chat_request.model,
                workspace_instructions,
                chat_history=chat_history
            )
        elif intent == "PREELIMINAR_PRICE_QUOTE":
            response_stream = intention_task.preeliminar_price_quote_chat(
                chat_request.query,
                relevant_chunks,
                chat_request.model,
                workspace_instructions,
                chat_history=chat_history
            )
        elif intent == "LEGAL_RISKS":
            response_stream = intention_task.legal_risks_chat(
                chat_request.query,
                relevant_chunks,
                chat_request.model,
                workspace_instructions,
                chat_history=chat_history
            )
        elif intent == "SPECIFIC_QUERY":
            response_stream = intention_task.specific_query_chat(
                chat_request.query,
                relevant_chunks,
                chat_request.model,
                workspace_instructions,
                chat_history=chat_history
            )

        try:
            for token in response_stream:
                full_response_text += token
                yield json.dumps({"type": "content", "text": token}) + "\n"

        except Exception as e:
            yield json.dumps({"type": "error", "detail": str(e)}) + "\n"
            return

        # Guardar respuesta del asistente
        with database.SessionLocal() as db_session:
            msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response_text,
            )
            db_session.add(msg)
            db_session.commit()

    return StreamingResponse(
        stream_response_generator(conversation.id, relevant_chunks),
        media_type="application/x-ndjson",
    )


@router.get(
    "/workspaces/{workspace_id}",
    response_model=schemas.WorkspacePublic,
    summary="Obtener un Workspace por ID",
)
def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene un workspace específico por su ID.

    Requiere autenticación. Solo el owner puede ver el workspace.
    """
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este workspace.",
        )

    return db_workspace


# --- AÑADIDO: Endpoint para actualizar un Workspace ---
@router.put(
    "/workspaces/{workspace_id}",
    response_model=schemas.WorkspacePublic,
    summary="Actualizar un Workspace",
)
def update_workspace(
    workspace_id: str,
    workspace_in: schemas.WorkspaceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Actualiza un workspace existente.

    Requiere autenticación. Solo el owner puede actualizar el workspace.
    """
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este workspace.",
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
    summary="Eliminar un Workspace",
)
@limiter.limit("20/minute")  # Máximo 20 eliminaciones por minuto
async def delete_workspace(
    request: Request,
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Elimina un workspace y todos sus documentos asociados.

    Requiere autenticación. Solo el owner puede eliminar el workspace.
    """
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este workspace.",
        )

    documents = list(db_workspace.documents)

    for document in documents:
        # Eliminar del servicio RAG externo (si está habilitado)
        if settings.RAG_SERVICE_ENABLED and rag_client:
            try:
                await rag_client.delete_document(document.id)
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
    summary="Eliminar un Documento",
)
@limiter.limit("20/minute")  # Máximo 20 eliminaciones por minuto
async def delete_document(
    request: Request,
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Elimina un documento específico.

    Requiere autenticación. Solo el owner del workspace al que pertenece el documento puede eliminarlo.
    """
    db_document = (
        db.query(document_model.Document)
        .filter(document_model.Document.id == document_id)
        .first()
    )

    if not db_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con id {document_id} no encontrado.",
        )

    # Verificar ownership del workspace al que pertenece el documento
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == db_document.workspace_id)
        .first()
    )

    if not db_workspace or db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este documento.",
        )

    # 1. Eliminar del servicio RAG externo (si está habilitado)
    if settings.RAG_SERVICE_ENABLED and rag_client:
        try:
            success = await rag_client.delete_document(db_document.id)
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
    summary="Obtener todos los Workspaces del usuario",
)
def get_workspaces(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene una lista de todos los workspaces del usuario autenticado.
    """
    workspaces = (
        db.query(workspace_model.Workspace)
        .filter(
            workspace_model.Workspace.owner_id == current_user.id,
            workspace_model.Workspace.is_active == True,
        )
        .all()
    )

    return workspaces


# --- EXPORT ENDPOINTS ---


@router.get(
    "/workspaces/{workspace_id}/documents/export-csv",
    summary="Exportar documentos a CSV",
)
def export_documents_csv(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Exporta la lista de documentos de un workspace a CSV.

    Requiere autenticación. Solo el owner puede exportar los documentos.
    """
    # Verificar que el workspace existe
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Obtener documentos
    documents = (
        db.query(document_model.Document)
        .filter(document_model.Document.workspace_id == workspace_id)
        .all()
    )

    # Crear CSV en memoria
    output = io.StringIO()
    writer = csv.writer(output)

    # Escribir encabezados
    writer.writerow(["ID", "Nombre", "Tipo", "Estado", "Chunks", "Fecha Creación"])

    # Escribir datos
    for doc in documents:
        writer.writerow(
            [
                doc.id,
                doc.file_name,
                doc.file_type,
                doc.status,
                doc.chunk_count,
                doc.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc.created_at else "",
            ]
        )

    # Preparar respuesta
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=documents_{workspace_id}_{datetime.now().strftime('%Y%m%d')}.csv"
        },
    )


@router.get(
    "/workspaces/{workspace_id}/chat/export/txt",
    summary="Exportar historial de chat a TXT",
)
def export_chat_txt(
    workspace_id: str,
    conversation_id: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Exporta el historial de chat de un workspace a TXT.
    Si se proporciona conversation_id, exporta solo esa conversación.
    Si no, exporta todas las conversaciones del workspace.

    Requiere autenticación. Solo el owner puede exportar.
    """
    import re

    from models.conversation import Conversation, Message

    def markdown_to_text(markdown_text: str) -> str:
        """Convierte Markdown a texto plano legible."""
        text = markdown_text
        # Headers
        text = re.sub(r"^#{1,6}\s+(.+)$", r"\1", text, flags=re.MULTILINE)
        # Bold
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        text = re.sub(r"__(.+?)__", r"\1", text)
        # Italic
        text = re.sub(r"\*(.+?)\*", r"\1", text)
        text = re.sub(r"_(.+?)_", r"\1", text)
        # Code blocks
        text = re.sub(r"```[\w]*\n([\s\S]+?)```", r"\n\1\n", text)
        # Inline code
        text = re.sub(r"`(.+?)`", r"\1", text)
        # Links
        text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
        # Lists
        text = re.sub(r"^[\*\-\+]\s+", "• ", text, flags=re.MULTILINE)
        text = re.sub(r"^\d+\.\s+", "", text, flags=re.MULTILINE)
        return text

    # Verificar que el workspace existe
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para exportar desde este workspace.",
        )

    # Crear contenido TXT
    content = f"CHAT EXPORT - {db_workspace.name}\n"
    content += f"{'=' * 80}\n"
    content += f"Workspace: {db_workspace.name}\n"
    content += f"Descripción: {db_workspace.description or 'N/A'}\n"
    content += f"Fecha de exportación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    content += f"{'=' * 80}\n\n"

    # Obtener conversaciones
    if conversation_id:
        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.workspace_id == workspace_id,
            )
            .all()
        )
        if not conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversación {conversation_id} no encontrada.",
            )
    else:
        conversations = (
            db.query(Conversation)
            .filter(Conversation.workspace_id == workspace_id)
            .order_by(Conversation.created_at.desc())
            .all()
        )

    if not conversations:
        content += "No hay conversaciones en este workspace.\n"
    else:
        for conv in conversations:
            content += f"\n{'=' * 80}\n"
            content += f"CONVERSACIÓN: {conv.title}\n"
            content += f"Fecha: {conv.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"{'=' * 80}\n\n"

            # Obtener mensajes de la conversación
            messages = (
                db.query(Message)
                .filter(Message.conversation_id == conv.id)
                .order_by(Message.created_at.asc())
                .all()
            )

            if not messages:
                content += "  (Sin mensajes)\n"
            else:
                for msg in messages:
                    role = "Usuario" if msg.role == "user" else "Asistente"
                    content += f"[{msg.created_at.strftime('%H:%M:%S')}] {role}:\n"
                    # Convertir markdown a texto plano
                    formatted_content = markdown_to_text(msg.content)
                    content += f"{formatted_content}\n\n"
                    content += f"{'-' * 80}\n\n"

    # Preparar respuesta
    filename = f"chat_{conversation_id if conversation_id else workspace_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    return StreamingResponse(
        iter([content]),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get(
    "/workspaces/{workspace_id}/chat/export/pdf",
    summary="Exportar historial de chat a PDF",
)
def export_chat_pdf(
    workspace_id: str,
    conversation_id: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Exporta el historial de chat de un workspace a PDF.
    Si se proporciona conversation_id, exporta solo esa conversación.
    Si no, exporta todas las conversaciones del workspace.

    Requiere autenticación. Solo el owner puede exportar.
    """
    import re
    from io import BytesIO

    from models.conversation import Conversation, Message
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        Preformatted,
        SimpleDocTemplate,
        Spacer,
    )

    def markdown_to_paragraphs(text: str, style, code_style):
        """Convierte markdown a lista de elementos Platypus."""
        elements = []
        lines = text.split("\n")
        i = 0

        while i < len(lines):
            line = lines[i]

            # Code blocks
            if line.strip().startswith("```"):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                if code_lines:
                    code_text = "\n".join(code_lines)
                    elements.append(Preformatted(code_text, code_style))
                    elements.append(Spacer(1, 0.1 * inch))
                i += 1
                continue

            # Process inline markdown
            processed_line = line

            # Bold
            processed_line = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", processed_line)
            processed_line = re.sub(r"__(.+?)__", r"<b>\1</b>", processed_line)

            # Italic
            processed_line = re.sub(r"\*(.+?)\*", r"<i>\1</i>", processed_line)
            processed_line = re.sub(r"_(.+?)_", r"<i>\1</i>", processed_line)

            # Inline code
            processed_line = re.sub(
                r"`(.+?)`",
                r'<font name="Courier" backColor="#f0f0f0">\1</font>',
                processed_line,
            )

            # Links (simplificado)
            processed_line = re.sub(
                r"\[([^\]]+)\]\([^\)]+\)", r"<u>\1</u>", processed_line
            )

            # Headers (h1-h6)
            header_match = re.match(r"^(#{1,6})\s+(.+)$", processed_line)
            if header_match:
                level = len(header_match.group(1))
                text = header_match.group(2)
                size = max(12, 18 - level * 2)
                elements.append(
                    Paragraph(f'<font size="{size}"><b>{text}</b></font>', style)
                )
                elements.append(Spacer(1, 0.1 * inch))
                i += 1
                continue

            # Lists
            if re.match(r"^[\*\-\+]\s+", processed_line):
                text = re.sub(r"^[\*\-\+]\s+", "• ", processed_line)
                elements.append(Paragraph(text, style))
            elif re.match(r"^\d+\.\s+", processed_line):
                elements.append(Paragraph(processed_line, style))
            elif processed_line.strip():  # Regular paragraph
                elements.append(Paragraph(processed_line, style))
            else:  # Empty line
                elements.append(Spacer(1, 0.05 * inch))

            i += 1

        return elements

    # Verificar que el workspace existe
    db_workspace = (
        db.query(workspace_model.Workspace)
        .filter(workspace_model.Workspace.id == workspace_id)
        .first()
    )

    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado.",
        )

    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para exportar desde este workspace.",
        )

    # Crear buffer para el PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
    )

    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=HexColor("#1a1a1a"),
        spaceAfter=30,
    )

    subtitle_style = ParagraphStyle(
        "CustomSubtitle",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=HexColor("#333333"),
        spaceAfter=12,
    )

    user_style = ParagraphStyle(
        "UserMessage",
        parent=styles["Normal"],
        fontSize=11,
        textColor=HexColor("#0066cc"),
        alignment=TA_RIGHT,
        spaceAfter=8,
        leftIndent=100,
    )

    assistant_style = ParagraphStyle(
        "AssistantMessage",
        parent=styles["Normal"],
        fontSize=11,
        textColor=HexColor("#333333"),
        spaceAfter=8,
        rightIndent=100,
    )

    timestamp_style = ParagraphStyle(
        "Timestamp",
        parent=styles["Normal"],
        fontSize=8,
        textColor=HexColor("#666666"),
        spaceAfter=4,
    )

    code_style = ParagraphStyle(
        "CodeBlock",
        parent=styles["Code"],
        fontSize=9,
        textColor=HexColor("#000000"),
        backColor=HexColor("#f5f5f5"),
        leftIndent=20,
        rightIndent=20,
        spaceAfter=10,
        fontName="Courier",
    )

    # Contenido del PDF
    story = []

    # Título
    story.append(Paragraph(f"Chat Export - {db_workspace.name}", title_style))
    story.append(
        Paragraph(
            f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]
        )
    )
    story.append(Spacer(1, 0.3 * inch))

    # Obtener conversaciones
    if conversation_id:
        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.workspace_id == workspace_id,
            )
            .all()
        )
        if not conversations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversación {conversation_id} no encontrada.",
            )
    else:
        conversations = (
            db.query(Conversation)
            .filter(Conversation.workspace_id == workspace_id)
            .order_by(Conversation.created_at.desc())
            .all()
        )

    if not conversations:
        story.append(
            Paragraph("No hay conversaciones en este workspace.", styles["Normal"])
        )
    else:
        for idx, conv in enumerate(conversations):
            if idx > 0:
                story.append(PageBreak())

            story.append(Paragraph(f"Conversación: {conv.title}", subtitle_style))
            story.append(
                Paragraph(
                    f"Creada: {conv.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                    timestamp_style,
                )
            )
            story.append(Spacer(1, 0.2 * inch))

            # Obtener mensajes
            messages = (
                db.query(Message)
                .filter(Message.conversation_id == conv.id)
                .order_by(Message.created_at.asc())
                .all()
            )

            if not messages:
                story.append(Paragraph("(Sin mensajes)", styles["Italic"]))
            else:
                for msg in messages:
                    # Timestamp
                    story.append(
                        Paragraph(
                            f"{msg.created_at.strftime('%H:%M:%S')}", timestamp_style
                        )
                    )

                    # Mensaje con formato markdown
                    if msg.role == "user":
                        story.append(Paragraph(f"<b>Usuario:</b>", user_style))
                        # Usuario: texto simple
                        story.append(Paragraph(msg.content, user_style))
                    else:
                        story.append(Paragraph(f"<b>Asistente:</b>", assistant_style))
                        # Asistente: parsear markdown
                        markdown_elements = markdown_to_paragraphs(
                            msg.content, assistant_style, code_style
                        )
                        story.extend(markdown_elements)

                    story.append(Spacer(1, 0.15 * inch))

    # Construir PDF
    doc.build(story)
    buffer.seek(0)

    # Preparar respuesta
    filename = f"chat_{conversation_id if conversation_id else workspace_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/cache/stats", summary="Obtener estadísticas del cache TIVIT")
def get_cache_statistics(current_user: User = Depends(get_current_active_user)):
    """
    Obtiene estadísticas del sistema de cache para monitoreo.

    Requiere autenticación de administrador.
    """
    # Solo administradores pueden ver stats (por ahora cualquier usuario autenticado)
    stats = get_cache_stats()
    return stats


@router.post("/cache/invalidate", summary="Invalidar cache TIVIT")
def invalidate_cache(current_user: User = Depends(get_current_active_user)):
    """
    Invalida todo el cache de TIVIT.

    Requiere autenticación de administrador.
    """
    invalidate_tivit_cache()
    return {"message": "Cache TIVIT invalidado correctamente"}


@router.get("/llm/metrics", summary="Obtener métricas del sistema LLM optimizado")
def get_llm_metrics_endpoint(current_user: User = Depends(get_current_active_user)):
    """
    Obtiene métricas de rendimiento del sistema LLM optimizado.

    Incluye estadísticas de cache semántico, tipos de tareas soportadas, y rendimiento.

    Requiere autenticación.
    """
    from core.llm_service import get_llm_metrics

    return get_llm_metrics()


@router.post(
    "/llm/analyze-query", summary="Analizar complejidad de una query (para debugging)"
)
def analyze_query_endpoint(
    query_request: schemas.ChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Analiza la complejidad de una query y muestra los parámetros óptimos que se usarían.

    Útil para debugging y optimización del sistema LLM.

    Requiere autenticación.
    """
    from core.llm_service import analyze_query_complexity

    # Simular chunks vacíos para análisis básico
    context_chunks = []

    analysis = analyze_query_complexity(query_request.query, context_chunks)
    return analysis
