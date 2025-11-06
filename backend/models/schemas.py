from pydantic import BaseModel
from datetime import datetime
import uuid
import mimetypes
from fastapi import UploadFile # <-- AÑADIDO: Importación necesaria

# --- Workspace Schemas ---

class WorkspaceBase(BaseModel):
    """Schema base, tiene los campos comunes."""
    name: str
    description: str | None = None

class WorkspaceCreate(WorkspaceBase):
    """Schema para crear un Workspace (solo entrada)."""
    pass

class WorkspacePublic(WorkspaceBase):
    """Schema para devolver un Workspace (salida)."""
    id: str  # Usamos str para el UUID
    created_at: datetime
    is_active: bool

    # --- CORREGIDO ---
    # Solo debe haber una clase Config
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
    def from_upload(cls, file: UploadFile, workspace_id: str): # <-- CORREGIDO: Quitado comillas
        """Helper para crear un DocumentPublic desde un UploadFile."""
        file_type = mimetypes.guess_type(file.filename)[0] or "unknown"
        
        # Manejo simple del tipo de archivo
        simple_file_type = file_type.split('/')[-1]
        if "openxmlformats-officedocument.wordprocessingml.document" in simple_file_type:
            simple_file_type = "docx"
        elif "openxmlformats-officedocument.spreadsheetml.sheet" in simple_file_type:
            simple_file_type = "xlsx"
        
        return cls(
            id="temp-id", # Se sobreescribirá con el de la BD
            file_name=file.filename,
            file_type=simple_file_type, 
            workspace_id=workspace_id,
            status="PENDING",
            chunk_count=0,
            created_at=datetime.utcnow() # Temporal, se sobreescribirá
        )