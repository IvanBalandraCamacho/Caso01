import time
import os
from pathlib import Path
from core.celery_app import celery_app
from models import database, document as document_model, workspace as workspace_model
from sqlalchemy.orm import Session
from . import parser
from . import vector_store

@celery_app.task
def process_document(document_id: str, temp_file_path_str: str):
    """
    Tarea asíncrona de Celery para procesar un documento.
    """
    # --- CORRECCIÓN ---
    print(f"WORKER: Iniciando procesamiento para Documento ID: {document_id}") # Esta está bien
    
    db: Session = database.SessionLocal()
    temp_file_path = Path(temp_file_path_str)
    
    try:
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        
        if not db_document:
            print(f"WORKER: ERROR - Documento ID {document_id} no encontrado.")
            return

        # --- OPTIMIZACIÓN: Evitar re-procesamiento ---
        if db_document.status == "COMPLETED":
            print(f"WORKER: Documento {document_id} ya está completado. Saltando.")
            return

        db_document.status = "PROCESSING"
        db.commit()
        print(f"WORKER: Documento {document_id} en estado PROCESSING.")

        # 3. --- LÓGICA RAG REAL (STREAMING) ---
        print(f"WORKER: Iniciando extracción streaming de {temp_file_path}...")
        text_iterator = parser.extract_text_from_file(temp_file_path)
        
        print("WORKER: Vectorizando e indexando texto (Streaming)...")
        
        chunk_count = vector_store.process_and_embed_text(
            text_iterator=text_iterator,
            document_id=db_document.id,
            workspace_id=db_document.workspace_id
        )

        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count
        db.commit()
        print(f"WORKER: Documento {document_id} completado. {chunk_count} chunks creados.")

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