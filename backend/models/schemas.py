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
    conversation_id: str | None = None  # Opcional: ID de conversación existente
    
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
    conversation_id: str  # ID de la conversación creada o usada
    
class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    instructions: str | None = None

# --- Conversation Schemas ---

class MessageCreate(BaseModel):
    """Schema para crear un mensaje."""
    role: str  # 'user' o 'assistant'
    content: str
    chunk_references: str | None = None

class MessagePublic(BaseModel):
    """Schema para devolver un mensaje."""
    id: str
    conversation_id: str
    role: str
    content: str
    chunk_references: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    """Schema para crear una conversación."""
    workspace_id: str
    title: str

class ConversationUpdate(BaseModel):
    """Schema para actualizar una conversación."""
    title: str

class ConversationPublic(BaseModel):
    """Schema para devolver una conversación."""
    id: str
    workspace_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0  # Calculado
    
    class Config:
        from_attributes = True

class ConversationWithMessages(ConversationPublic):
    """Schema para conversación con todos sus mensajes."""
    messages: list[MessagePublic] = []

# ========================
# Document Generation Schemas
# ========================

# --- Schemas para Generación de Documentos Descargables ---

class GenerateDownloadableDocRequest(BaseModel):
    """Schema para solicitar generación de documento descargable."""
    format: str = "markdown"  # 'txt', 'markdown', 'pdf'
    document_type: str = "complete"  # 'complete', 'summary', 'key_points'
    include_metadata: bool = True
    custom_instructions: str | None = None

class DownloadableDocumentResponse(BaseModel):
    """Schema para respuesta de documento descargable."""
    content: str
    filename: str
    format: str
    word_count: int
    message: str


# --- User Schemas (Autenticación) ---

class UserBase(BaseModel):
    email: str
    full_name: str | None = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserPublic(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: str | None = None
