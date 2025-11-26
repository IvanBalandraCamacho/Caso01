import time
import os
from pathlib import Path
from core.celery_app import celery_app
from models import database, document as document_model, workspace as workspace_model, user as user_model
from sqlalchemy.orm import Session
from . import parser
from core.rag_client import rag_client
from core.config import settings
import asyncio

# 🚨 NUEVO: Checklist Analyzer (ya implementado por ti)
from core.checklist_analyzer import analyze_text_and_save

@celery_app.task(bind=True, max_retries=3)
def process_document(self, document_id: str, temp_file_path_str: str):
    """
    Tarea asíncrona de Celery para procesar un documento.
    Envía el documento al servicio RAG externo para procesamiento,
    y luego ejecuta el Checklist Analyzer automáticamente.
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

        # ----------------------------------------
        # 1. EXTRAER TEXTO DEL DOCUMENTO
        # ----------------------------------------
        print(f"WORKER: Iniciando extracción de texto de {temp_file_path}...")
        text_content = ""
        
        try:
            for text_chunk in parser.extract_text_from_file(temp_file_path):
                text_content += text_chunk
        except Exception as e:
            # Intentar manejar extracción parcial y seguir
            print(f"WORKER: ERROR extrayendo texto: {e}")
            text_content = ""

        print(f"WORKER: Texto extraído ({len(text_content)} caracteres)")

        # ----------------------------------------
        # 2. PROCESAR CON RAG (si está habilitado)
        # ----------------------------------------
        chunk_count = 0
        
        if settings.RAG_SERVICE_ENABLED and rag_client:
            print("WORKER: Enviando documento al servicio RAG externo...")
            try:
                # Obtener el user_id desde el workspace
                user_id = None
                if db_document.workspace:
                    user_id = str(db_document.workspace.owner_id) if db_document.workspace.owner_id else None
                
                result = asyncio.run(
                    rag_client.ingest_text_content(
                        document_id=db_document.id,
                        workspace_id=db_document.workspace_id,
                        user_id=user_id,
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
                # Retry automático (si falla RAG)
                raise self.retry(exc=e, countdown=60)

        else:
            print("WORKER: ADVERTENCIA - RAG_SERVICE_ENABLED=false, documento no procesado")
            chunk_count = 0


        # ----------------------------------------
        # 3. MARCAR DOCUMENTO COMO COMPLETADO (PARCIAL)
        # ----------------------------------------
        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count
        db.commit()
        print(f"WORKER: Documento {document_id} completado. {chunk_count} chunks creados.")

        # ----------------------------------------
        # 4. EJECUTAR CHECKLIST ANALYZER AUTOMÁTICO
        # ----------------------------------------
        try:
            print("WORKER: Ejecutando Checklist Analyzer...")

            # Preparar texto a analizar. Si está vacío, intentar usar lo indexado en RAG (no implementado) o fallback.
            text_to_analyze = text_content
            if not text_to_analyze or not text_to_analyze.strip():
                print("WORKER: ADVERTENCIA - text_content vacío, intentando extraer desde archivo nuevamente.")
                try:
                    extracted = ""
                    for chunk in parser.extract_text_from_file(temp_file_path):
                        extracted += chunk
                    text_to_analyze = extracted
                except Exception as e:
                    print(f"WORKER: ERROR reextrayendo texto: {e}")
                    text_to_analyze = ""  # analizador manejará contenido vacío de forma segura

            user_id = None
            if db_document.workspace:
                user_id = str(db_document.workspace.owner_id) if db_document.workspace.owner_id else None

            conversation_id = analyze_text_and_save(
                text=text_to_analyze,
                document_id=db_document.id,
                file_name=db_document.file_name,
                workspace_id=db_document.workspace_id,
                user_id=user_id,
                db=db
            )

            # Guardar la referencia de la conversación en el documento
            if conversation_id:
                db_document.insights_conversation_id = conversation_id
                db.commit()
                print(f"WORKER: Checklist Analyzer guardó resultados en conversación {conversation_id} y se vinculó al documento.")
            else:
                print(f"WORKER: Checklist Analyzer no devolvió conversación para documento {document_id}")

        except Exception as e:
            print(f"WORKER: ERROR ejecutando Checklist Analyzer: {e}")


        # ----------------------------------------
        # 5. LIMPIAR ARCHIVO TEMPORAL
        # ----------------------------------------
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                print(f"WORKER: Archivo temporal {temp_file_path} eliminado.")
        except Exception as e:
            print(f"WORKER: ERROR al eliminar archivo temporal: {e}")

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
