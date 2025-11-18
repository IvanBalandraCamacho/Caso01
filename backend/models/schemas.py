from pydantic import BaseModel
from datetime import datetime, timezone # <-- AÑADIR timezone
import uuid
import mimetypes
from fastapi import UploadFile

# --- Workspace Schemas ---

class WorkspaceBase(BaseModel):
    """Schema base, tiene los campos comunes."""
    name: str
    description: str | None = None
    instructions: str | None = None

class WorkspaceCreate(WorkspaceBase):
    """Schema para crear un Workspace (solo entrada)."""
    pass

class WorkspacePublic(WorkspaceBase):
    """Schema para devolver un Workspace (salida)."""
    id: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True 

# --- Document Schemas ---

class DocumentBase(BaseModel):
    file_name: str
    file_type: str
    
class DocumentCreate(DocumentBase):
    workspace_id: str
    status: str = "PENDING"
    chunk_count: int = 0

class DocumentPublic(DocumentBase):
    id: str
    workspace_id: str
    status: str
    chunk_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

    @classmethod
    def from_upload(cls, file: UploadFile, workspace_id: str):
        """Helper para crear un DocumentPublic desde un UploadFile."""
        file_type = mimetypes.guess_type(file.filename)[0] or "unknown"
        
        simple_file_type = file_type.split('/')[-1]
        if "openxmlformats-officedocument.wordprocessingml.document" in simple_file_type:
            simple_file_type = "docx"
        elif "openxmlformats-officedocument.spreadsheetml.sheet" in simple_file_type:
            simple_file_type = "xlsx"
        
        return cls(
            id="temp-id",
            file_name=file.filename,
            file_type=simple_file_type, 
            workspace_id=workspace_id,
            status="PENDING",
            chunk_count=0,
            # --- CORRECCIÓN ---
            created_at=datetime.now(timezone.utc) # Reemplaza utcnow()
        )
        
# --- Chat Schemas ---

class ChatRequest(BaseModel):
    """Schema para la pregunta del usuario."""
    query: str
    
class DocumentChunk(BaseModel):
    """Representa un chunk de contexto recuperado."""
    document_id: str
    chunk_text: str
    chunk_index: int
    score: float

class ChatResponse(BaseModel):
    """Schema para la respuesta del chat (ahora con respuesta del LLM)."""
    query: str
    llm_response: str
    relevant_chunks: list[DocumentChunk]
    
class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    instructions: str | None = None


# --- Summary Schemas ---
class SummaryRequest(BaseModel):
    """Solicita un resumen. Proveer `document_id` o subir `file` en multipart/form-data."""
    document_id: str | None = None
    # Si se provee documento guardado, se usará su workspace asociado; opcionalmente puede pasarse workspace_id
    workspace_id: str | None = None
    # Opciones básicas
    mode: str | None = "sync"  # sync | async (async no-implementado aún)


class SummarySections(BaseModel):
    administrativo: str
    posibles_competidores: str
    tecnico: str
    viabilidad_del_alcance: str


class SummaryResponse(BaseModel):
    """Respuesta con las cuatro secciones obligatorias según `summary_instructions.md`."""
    document_id: str | None = None
    summary: SummarySections

    class Config:
        from_attributes = True