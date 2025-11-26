# tasks.py
import time
import os
from pathlib import Path
from core.celery_app import celery_app
from models import database, document as document_model
from sqlalchemy.orm import Session
from . import parser
from core.rag_client import rag_client
from core.config import settings
import asyncio

# Checklist + chat
from core.checklist_analyzer import analyze_document_for_suggestions
from core.chat_service import send_ai_message_to_chat


@celery_app.task(bind=True, max_retries=3)
def process_document(self, document_id: str, temp_file_path_str: str):
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

        if db_document.status == "COMPLETED":
            print(f"WORKER: Documento {document_id} ya estaba completado.")
            return

        # Estado PROCESSING
        db_document.status = "PROCESSING"
        db.commit()

        # 1) EXTRAER TEXTO
        text_content = ""
        for text_chunk in parser.extract_text_from_file(temp_file_path):
            text_content += text_chunk

        # 2) PROCESAR RAG
        chunk_count = 0
        if settings.RAG_SERVICE_ENABLED and rag_client:
            user_id = (
                str(db_document.workspace.owner_id)
                if db_document.workspace and db_document.workspace.owner_id
                else None
            )

            try:
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

            except Exception as e:
                raise self.retry(exc=e, countdown=60)

        # 3) ANALIZAR DOCUMENTO
        suggestion_short, suggestion_full = analyze_document_for_suggestions(
            text_content, 
            db_document.file_name
        )

        db_document.suggestion_short = suggestion_short
        db_document.suggestion_full = suggestion_full

        # 4) ACTUALIZAR ESTADO
        db_document.status = "COMPLETED"
        db_document.chunk_count = chunk_count
        db.commit()

        # 5) ENVIAR MENSAJE BREVE AL CHAT
        send_ai_message_to_chat(
            db,
            workspace_id=str(db_document.workspace_id),
            conversation_id=getattr(db_document, "conversation_id", None),
            message=suggestion_full
        )

        # 6) LIMPIAR ARCHIVO TEMP
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    except Exception as e:
        print(f"WORKER: ERROR: {e}")
        db.rollback()
        if db_document:
            db_document.status = "FAILED"
            db.commit()

    finally:
        db.close()
