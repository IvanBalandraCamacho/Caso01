import time
import os
from core.celery_app import celery_app
from models import database, document as document_model
from sqlalchemy.orm import Session

@celery_app.task
def process_document(document_id: str, temp_file_path: str):
    """
    Tarea asíncrona de Celery para procesar un documento.
    """
    print(f"WORKER: Iniciando procesamiento para Documento ID: {document_id}")
    
    # Obtenemos una sesión de BD para el worker
    db: Session = database.SessionLocal()
    
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

        # 3. Simular el trabajo (chunking, embeddings, etc.)
        # (Más adelante aquí irá la lógica de RAG)
        print(f"WORKER: Procesando archivo en {temp_file_path}...")
        time.sleep(10) # Simulación de 10 segundos de trabajo
        
        # 4. Actualizar estado a COMPLETED
        db_document.status = "COMPLETED"
        db_document.chunk_count = 99 # Valor de prueba
        db.commit()
        print(f"WORKER: Documento {document_id} completado. {db_document.chunk_count} chunks creados.")

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