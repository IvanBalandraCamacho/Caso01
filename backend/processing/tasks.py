import time
import os
from pathlib import Path
from core.celery_app import celery_app
from models import database, document as document_model, workspace as workspace_model, user as user_model
from sqlalchemy.orm import Session
from . import parser
# DEPRECADO: from . import vector_store (eliminado - usar rag_client)
from core.rag_client import rag_client
from core.config import settings
import asyncio

@celery_app.task(bind=True, max_retries=3)
def process_document(self, document_id: str, temp_file_path_str: str):
    """
    Tarea asíncrona de Celery para procesar un documento.
    Envía el documento al servicio RAG externo para procesamiento.
    """
    print(f"WORKER: Iniciando procesamiento para Documento ID: {document_id}")
    
    db: Session = database.SessionLocal()
    temp_file_path = Path(temp_file_path_str)
    
    try:
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        
        if not db_document:
            print(f"WORKER: ERROR - Documento ID {document_id} no encontrado.")
            return

        # Evitar re-procesamiento
        if db_document.status == "COMPLETED":
            print(f"WORKER: Documento {document_id} ya está completado. Saltando.")
            return

        db_document.status = "PROCESSING"
        db.commit()
        print(f"WORKER: Documento {document_id} en estado PROCESSING.")

        # Extraer texto del documento
        print(f"WORKER: Iniciando extracción de texto de {temp_file_path}...")
        text_content = ""
        
        for text_chunk in parser.extract_text_from_file(temp_file_path):
            text_content += text_chunk
        
        print(f"WORKER: Texto extraído ({len(text_content)} caracteres)")

        # Enviar al servicio RAG externo (si está habilitado)
        chunk_count = 0
        
        if settings.RAG_SERVICE_ENABLED and rag_client:
            print("WORKER: Enviando documento al servicio RAG externo...")
            try:
                result = asyncio.run(
                    rag_client.ingest_text_content(
                        document_id=db_document.id,
                        workspace_id=db_document.workspace_id,
                        content=text_content,
                        metadata={
                            "filename": db_document.file_name,
                            "file_type": db_document.file_type,
                            "created_at": db_document.created_at.isoformat()
                        }
                    )
                )
                chunk_count = result.chunks_count if result else 0
                print(f"WORKER: Documento procesado por RAG externo - {chunk_count} chunks creados")
            except Exception as e:
                print(f"WORKER: ERROR en servicio RAG externo: {e}")
                # Retry automático
                raise self.retry(exc=e, countdown=60)
        else:
            print("WORKER: ADVERTENCIA - RAG_SERVICE_ENABLED=false, documento no procesado")
            # Marcar como completado pero sin chunks
            chunk_count = 0

        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count
        db.commit()
        print(f"WORKER: Documento {document_id} completado. {chunk_count} chunks creados.")

        # Limpiar archivo temporal
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"WORKER: Archivo temporal {temp_file_path} eliminado.")

    except Exception as e:
        print(f"WORKER: ERROR procesando {document_id}: {e}")
        db.rollback()
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        if db_document:
            db_document.status = "FAILED"
            db.commit()
    finally:
        db.close()