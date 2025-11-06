import time
import os
from pathlib import Path # <-- AÑADIR
from core.celery_app import celery_app
from models import database, document as document_model, workspace as workspace_model
from sqlalchemy.orm import Session
from . import parser        # <-- AÑADIR
from . import vector_store  # <-- AÑADIR

@celery_app.task
def process_document(document_id: str, temp_file_path_str: str):
    """
    Tarea asíncrona de Celery para procesar un documento.
    """
    print(f"WORKER: Iniciando procesamiento para Documento ID: {document_id}")
    
    db: Session = database.SessionLocal()
    temp_file_path = Path(temp_file_path_str) # Convertir string a Path
    
    try:
        # 1. Encontrar el documento
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        
        if not db_document:
            print(f"WORKER: ERROR - Documento ID {document_id} no encontrado.")
            return

        # 2. Actualizar estado a PROCESSING
        db_document.status = "PROCESSING"
        db.commit()
        print(f"WORKER: Documento {document_id} en estado PROCESSING.")

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

        # 4. Actualizar estado a COMPLETED
        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count # Guardar el número real de chunks
        db.commit()
        print(f"WORKER: Documento {document_id} completado. {chunk_count} chunks creados.")

        # 5. Limpiar el archivo temporal
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"WORKER: Archivo temporal {temp_file_path} eliminado.")

    except Exception as e:
        # Manejo de errores
        print(f"WORKER: ERROR procesando {document_id}: {e}")
        db.rollback()
        # Actualizar estado a FAILED
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()
        if db_document:
            db_document.status = "FAILED"
            db.commit()
    finally:
        # Siempre cerrar la sesión
        db.close()