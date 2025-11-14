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
    def from_upload(cls, file: UploadFile, workspace_id: str):
        """Helper para crear un DocumentPublic desde un UploadFile."""
        # Detectar el tipo de archivo por extensión
        file_extension = file.filename.split('.')[-1].lower()
        
        # Mapeo de extensiones a tipos
        extension_map = {
            'pdf': 'pdf',
            'docx': 'docx',
            'doc': 'doc',
            'txt': 'txt',
            'xlsx': 'xlsx',
            'xls': 'xls',
            'csv': 'csv'
        }
        
        simple_file_type = extension_map.get(file_extension, 'unknown')
        
        return cls(
            id="temp-id", # Se sobreescribirá con el de la BD
            file_name=file.filename,
            file_type=simple_file_type, 
            workspace_id=workspace_id,
            status="PENDING",
            chunk_count=0,
            created_at=datetime.utcnow() # Temporal, se sobreescribirá
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
    score: float # La puntuación de similitud de Qdrant

class ChatResponse(BaseModel):
    """Schema para la respuesta del chat (ahora con respuesta del LLM)."""
    query: str
    llm_response: str  # <-- AÑADIR ESTA LÍNEA
    relevant_chunks: list[DocumentChunk]


# --- Chat History Schemas ---
class ChatMessageCreate(BaseModel):
    """Schema para crear un mensaje de chat"""
    workspace_id: str
    role: str  # 'user' o 'assistant'
    content: str
    sources: str | None = None  # JSON string

class ChatMessagePublic(BaseModel):
    """Schema para retornar un mensaje de chat"""
    id: str
    workspace_id: str
    role: str
    content: str
    sources: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatHistoryExport(BaseModel):
    """Schema para exportar historial de chat"""
    format: str  # 'pdf' o 'txt'


# --- Settings Schemas ---
class SettingPublic(BaseModel):
    key: str
    value: str | None = None

    class Config:
        from_attributes = True

class ActiveLLMUpdate(BaseModel):
    active_llm: str


# --- Auth / User Schemas ---
class UserCreate(BaseModel):
    username: str
    password: str

class UserPublic(BaseModel):
    username: str
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    username: str | None = None