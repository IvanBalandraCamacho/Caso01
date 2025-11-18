from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
import os

from models import database, document as document_model, schemas
from processing import parser, vector_store
from core import llm_service

router = APIRouter()

TEMP_UPLOAD_DIR = Path("temp_uploads")
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)


@router.post(
    "/documents/summary",
    response_model=schemas.SummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generar resumen estructurado para un documento (subido o guardado)"
)
def generate_document_summary(
    document_id: str | None = Form(None),
    workspace_id: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(database.get_db)
):
    """
    Genera un resumen siguiendo las instrucciones estrictas del archivo `summary_instructions.md`.
    - Proveer `document_id` para usar un documento previamente procesado (usa los chunks en Qdrant).
    - O subir `file` en multipart/form-data para resumir al vuelo.

    Si se proveen ambos, se prioriza el `file` subido.
    """

    # 1) Si se subió un archivo, procesarlo y extraer su texto
    if file is not None:
        try:
            temp_file_path = TEMP_UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        finally:
            file.file.close()

        try:
            text = parser.extract_text_from_file(temp_file_path)
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

        # Try to load project-level instructions file if present
        instructions_text = None
        try:
            # Prefer repository root 'summary_instructions.md'
            candidate = Path.cwd() / "summary_instructions.md"
            if not candidate.exists():
                # fallback to a sibling path used when running from different CWD
                candidate = Path(__file__).resolve().parents[4] / "summary_instructions.md"
            if candidate.exists():
                instructions_text = candidate.read_text(encoding="utf-8")
        except Exception as e:
            print(f"WARNING: No se pudo leer summary_instructions.md: {e}")

        summary_sections = llm_service.generate_summary_from_text(text, instructions_text=instructions_text)
        if isinstance(summary_sections, dict) and summary_sections.get("error"):
            raise HTTPException(status_code=500, detail=summary_sections.get("error"))

        resp = schemas.SummaryResponse(
            document_id=None,
            summary=schemas.SummarySections(
                administrativo=summary_sections.get("administrativo", ""),
                posibles_competidores=summary_sections.get("posibles_competidores", ""),
                tecnico=summary_sections.get("tecnico", ""),
                viabilidad_del_alcance=summary_sections.get("viabilidad_del_alcance", "")
            )
        )
        return resp

    # 2) Si se pide por document_id, intentar reconstruir texto a partir de chunks
    if document_id:
        db_document = db.query(document_model.Document).filter(
            document_model.Document.id == document_id
        ).first()

        if not db_document:
            raise HTTPException(status_code=404, detail=f"Documento {document_id} no encontrado.")

        # Obtener workspace_id desde el documento si no fue provisto
        use_workspace_id = workspace_id or db_document.workspace_id

        # Recuperar chunks desde Qdrant
        chunks = vector_store.get_document_chunks(document_id=document_id, workspace_id=use_workspace_id)

        if not chunks:
            raise HTTPException(status_code=404, detail="No se encontraron chunks para este documento. Asegúrese de que el documento fue procesado.")

        # Reconstruir texto ordenando por chunk_index
        full_text = "\n\n".join([c.chunk_text for c in chunks])

        # Try to load project-level instructions file if present
        instructions_text = None
        try:
            candidate = Path.cwd() / "summary_instructions.md"
            if not candidate.exists():
                candidate = Path(__file__).resolve().parents[4] / "summary_instructions.md"
            if candidate.exists():
                instructions_text = candidate.read_text(encoding="utf-8")
        except Exception as e:
            print(f"WARNING: No se pudo leer summary_instructions.md: {e}")

        summary_sections = llm_service.generate_summary_from_text(full_text, instructions_text=instructions_text)
        if isinstance(summary_sections, dict) and summary_sections.get("error"):
            raise HTTPException(status_code=500, detail=summary_sections.get("error"))

        # Nota: No se persiste el resumen en la BD por decisión del usuario.

        resp = schemas.SummaryResponse(
            document_id=document_id,
            summary=schemas.SummarySections(
                administrativo=summary_sections.get("administrativo", ""),
                posibles_competidores=summary_sections.get("posibles_competidores", ""),
                tecnico=summary_sections.get("tecnico", ""),
                viabilidad_del_alcance=summary_sections.get("viabilidad_del_alcance", "")
            )
        )
        return resp

    # Si no hay datos
    raise HTTPException(status_code=400, detail="Proporcione `file` o `document_id`.")
