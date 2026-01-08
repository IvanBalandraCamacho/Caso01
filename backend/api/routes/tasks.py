from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
import logging
from core.gcp_services import gcp_services
from core.config import settings
from processing.tasks import process_document

# Router para manejar tareas (Cloud Tasks invoca estos endpoints)
router = APIRouter()
logger = logging.getLogger(__name__)

class ProcessDocumentPayload(BaseModel):
    document_id: str
    file_uri: str

@router.post("/tasks/process-document", status_code=status.HTTP_200_OK)
async def handle_process_document_task(payload: ProcessDocumentPayload):
    """
    Endpoint invocado por Cloud Tasks para procesar un documento.
    """
    logger.info(f"TASK RECEIVED: Processing document {payload.document_id}")
    
    try:
        # Reutilizamos la lógica de Celery, pero invocada síncronamente dentro de este request
        # Nota: Cloud Tasks espera un 200 OK para confirmar éxito.
        # Si process_document toma mucho tiempo, Cloud Tasks podría hacer timeout (default 10m).
        # Para procesos muy largos, Cloud Run Jobs es mejor, pero para documentos medianos esto funciona.
        
        # Invocamos la lógica directamente (sin .delay())
        # process_document es una funcion de celery, pero podemos llamarla como funcion normal si no usamos .delay()
        # PERO process_document en tasks.py tiene el decorador @celery_app.task
        # Si la llamamos directo, Celery crea un mock task context.
        # Lo ideal seria extraer la logica, pero por compatibilidad la llamaremos directo.
        
        process_document(payload.document_id, payload.file_uri)
        
        logger.info(f"TASK COMPLETED: Document {payload.document_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"TASK FAILED: {e}")
        # Retornar 500 hace que Cloud Tasks reintente
        raise HTTPException(status_code=500, detail=str(e))
