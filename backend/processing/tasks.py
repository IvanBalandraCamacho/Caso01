import time
import os
import asyncio
from pathlib import Path
from core.celery_app import celery_app
from models import database, document as document_model, workspace as workspace_model
from sqlalchemy.orm import Session
from . import parser
from . import vector_store


def notify_websocket(workspace_id: str, document_id: str, status: str, filename: str = None):
    """Helper para enviar notificación WebSocket desde tarea síncrona"""
    try:
        from core.websocket_manager import ws_manager
        # Ejecutar la coroutine en el event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(
            ws_manager.notify_document_status(workspace_id, document_id, status, filename)
        )
        loop.close()
    except Exception as e:
        print(f"WORKER: Error enviando notificación WebSocket: {e}")


@celery_app.task
def process_document(document_id: str, temp_file_path_str: str):
    """
    Tarea asíncrona de Celery para procesar un documento.
    """
    print(f"WORKER: Iniciando procesamiento para Documento ID: {document_id}")
    
    db: Session = database.SessionLocal()
    temp_file_path = Path(temp_file_path_str)
    
    try:
        # 1. Encontrar el documento
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        
        if not db_document:
            print(f"WORKER: ERROR - Documento ID {document_id} no encontrado.")
            return

        # 2. Actualizar estado a PROCESSING y notificar
        db_document.status = "PROCESSING"
        db.commit()
        print(f"WORKER: Documento {document_id} en estado PROCESSING.")
        notify_websocket(db_document.workspace_id, document_id, "PROCESSING", db_document.file_name)

        # 3. --- LÓGICA RAG REAL ---
        # 3a. Extraer texto del archivo
        print(f"WORKER: Extrayendo texto de {temp_file_path}...")
        full_text = parser.extract_text_from_file(temp_file_path)
        
        # 3b. Vectorizar e Indexar
        print(f"WORKER: Vectorizando e indexando texto...")
        chunk_count = vector_store.process_and_embed_text(
            text=full_text,
            document_id=db_document.id,
            workspace_id=db_document.workspace_id
        )
        # --- FIN LÓGICA RAG ---

        # 4. Actualizar estado a COMPLETED y notificar
        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count
        db.commit()
        print(f"WORKER: Documento {document_id} completado. {chunk_count} chunks creados.")
        notify_websocket(db_document.workspace_id, document_id, "COMPLETED", db_document.file_name)

        # 5. Limpiar el archivo temporal
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"WORKER: Archivo temporal {temp_file_path} eliminado.")

    except Exception as e:
        # Manejo de errores
        print(f"WORKER: ERROR procesando {document_id}: {e}")
        db.rollback()
        # Actualizar estado a FAILED y notificar
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        if db_document:
            db_document.status = "FAILED"
            db.commit()
            notify_websocket(db_document.workspace_id, document_id, "FAILED", db_document.file_name)
    finally:
        # Siempre cerrar la sesión
        db.close()