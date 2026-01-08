# tasks.py
import time
import os
import redis
import logging
import json
from pathlib import Path
from core.celery_app import celery_app
from models import database, document as document_model
from sqlalchemy.orm import Session
from . import parser
from core.rag_client import RAGClient  # Importar clase, no instancia
from core.config import settings
from core.gcp_services import gcp_services
import asyncio
import nest_asyncio
import tempfile
import shutil


# Checklist + chat
from core.checklist_analyzer import analyze_document_for_suggestions
from core.chat_service import send_ai_message_to_chat

redis_client = (
    redis.from_url(settings.REDIS_URL) if hasattr(settings, "REDIS_URL") else None
)

# Configurar logger
logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_document(self, document_id: str, temp_file_path_str: str):
    print(f"WORKER: Iniciando procesamiento para Documento ID: {document_id}")

    db: Session = database.SessionLocal()
    temp_file_path = None
    is_gcs_file = False

    # Manejo de archivos GCS vs Locales
    if temp_file_path_str.startswith("gs://"):
        is_gcs_file = True
        try:
            # Parse gs://bucket/blob_name
            prefix_len = len("gs://")
            path_parts = temp_file_path_str[prefix_len:].split("/", 1)
            bucket_name = path_parts[0]
            blob_name = path_parts[1]
            
            # Crear archivo temporal
            fd, local_temp_path = tempfile.mkstemp(suffix=Path(blob_name).suffix)
            os.close(fd)
            
            # Descargar
            if not gcp_services.download_to_filename(blob_name, local_temp_path, bucket_name):
                 raise Exception("Failed to download file from GCS via gcp_services")
            
            temp_file_path = Path(local_temp_path)
            print(f"WORKER: Archivo GCS descargado a temporal: {temp_file_path}")
            
        except Exception as e:
             print(f"WORKER: Error descargando de GCS: {e}")
             # Marcar documento como Failed
             try:
                 db_document = db.query(document_model.Document).filter(
                     document_model.Document.id == document_id
                 ).first()
                 if db_document:
                     db_document.status = "FAILED"
                     db.commit()
             except:
                 pass
             db.close()
             return
    else:
        temp_file_path = Path(temp_file_path_str)
        if not temp_file_path.exists():
             # Puede ser ruta relativa legacy
             pass
    
    # Si sigue siendo None o no existe (y no era GCS que fallo antes)
    if not temp_file_path or (not is_gcs_file and not temp_file_path.exists()):
         print(f"WORKER: Archivo no encontrado: {temp_file_path_str}")
         db.close()
         return

    try:
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()

        if not db_document:
            print(f"WORKER: ERROR - Documento ID {document_id} no encontrado.")
            return

        if db_document.status == "COMPLETED":
            print(f"WORKER: Documento {document_id} ya estaba completado.")
            return

        # Estado PROCESSING
        db_document.status = "PROCESSING"
        db.commit()

        # Notify START
        try:
            redis_client.publish(
                "documents",
                json.dumps({
                    "status": "PROCESSING",
                    "document_id": db_document.id,
                    "workspace_id": db_document.workspace_id,
                    "message": "Iniciando procesamiento..."
                })
            )
        except Exception:
            pass

        # 1) EXTRAER TEXTO
        try:
            redis_client.publish(
                "documents",
                json.dumps({
                    "status": "PROCESSING",
                    "document_id": db_document.id,
                    "workspace_id": db_document.workspace_id,
                    "message": "Extrayendo texto..."
                })
            )
        except Exception:
            pass

        text_content = ""
        for text_chunk in parser.extract_text_from_file(temp_file_path):
            text_content += text_chunk

        # 2) PROCESAR RAG
        chunk_count = 0
        if settings.RAG_SERVICE_ENABLED:
            try:
                redis_client.publish(
                    "documents",
                    json.dumps({
                        "status": "PROCESSING",
                        "document_id": db_document.id,
                        "workspace_id": db_document.workspace_id,
                        "message": "Indexando en base de conocimientos..."
                    })
                )
            except Exception:
                pass

            user_id = (
                str(db_document.workspace.owner_id)
                if db_document.workspace and db_document.workspace.owner_id
                else None
            )

            try:
                # Incluir conversation_id en metadatos para filtrado independiente
                metadata = {
                    "filename": db_document.file_name,
                    "file_type": db_document.file_type,
                    "created_at": db_document.created_at.isoformat()
                }
                
                # Agregar conversation_id si existe (documento específico de conversación)
                if db_document.conversation_id:
                    metadata["conversation_id"] = db_document.conversation_id
                
                # Función auxiliar para ejecutar ingestión con cliente local
                async def ingest_with_local_client():
                    local_client = RAGClient()
                    try:
                        return await local_client.ingest_text_content(
                            document_id=db_document.id,
                            workspace_id=db_document.workspace_id,
                            user_id=user_id,
                            content=text_content,
                            metadata=metadata
                        )
                    finally:
                        await local_client.close()

                # Aplicar nest_asyncio solo cuando sea necesario
                try:
                    nest_asyncio.apply()
                except ValueError:
                    pass  # Ya está aplicado o no es necesario
                result = asyncio.run(ingest_with_local_client())
                chunk_count = result.chunks_count if result else 0

            except Exception as e:
                print(f"WORKER: Error RAG: {e}")
                # No reintentar infinitamente si es error de conexión persistente
                # raise self.retry(exc=e, countdown=60)

     

       
        # 4) ACTUALIZAR ESTADO
        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count
        db.commit()
        
        # 5) PUBLICAR NOTIFICACIÓN EN REDIS
        try:
            redis_client.publish(
                "documents",
                json.dumps(
                    {
                        "status": "COMPLETED",
                        "document_id": db_document.id,
                        "workspace_id": db_document.workspace_id,
                        "conversation_id": db_document.conversation_id,
                        "message": "Procesamiento completado exitosamente"
                    }
                )
            )
        except Exception as e:
            logger.error(f"ERROR notificando de exito de documento guardado: {str(e)}")

        # 5) ENVIAR MENSAJE BREVE AL CHAT
        
        # send_ai_message_to_chat(
         #   db,
         #   workspace_id=str(db_document.workspace_id),
         #   conversation_id=getattr(db_document, "conversation_id", None),
         #   message=suggestion_full
        #)

        # 6) LIMPIAR ARCHIVO TEMP
        # NOTA: Ya no eliminamos el archivo porque lo usamos para preview/descarga persistente
        # if os.path.exists(temp_file_path):
        #     os.remove(temp_file_path)

    except Exception as e:
        print(f"WORKER: ERROR: {e}")
        db.rollback()
        if db_document:
            db_document.status = "FAILED"
            db.commit()
            
            # Publicar notificación de error en Redis
            try:
                redis_client.publish(
                    "documents",
                    json.dumps(
                        {
                            "status": "ERROR",
                            "document_id": db_document.id,
                            "workspace_id": db_document.workspace_id,
                            "conversation_id": db_document.conversation_id,
                            "error": str(e),
                        }
                    )
                )
            except Exception as redis_error:
                logger.error(f"ERROR notificando fallo de documento: {str(redis_error)}")

    finally:
        # Limpiar archivo temporal si fue descargado de GCS
        if is_gcs_file and temp_file_path and temp_file_path.exists():
            try:
                os.remove(temp_file_path)
                print(f"WORKER: Archivo temporal GCS eliminado: {temp_file_path}")
            except Exception as e:
                 print(f"WORKER: Error eliminando temporal: {e}")
        
        db.close()
