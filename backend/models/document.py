import uuid
from sqlalchemy import Column, String, DateTime, func, ForeignKey, Integer
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False) # ej: "pdf", "xlsx", "docx"
    status = Column(String(50), nullable=False, default="PENDING") # PENDING -> PROCESSING -> COMPLETED -> FAILED
    
    chunk_count = Column(Integer, default=0) # Cuántos chunks vectoriales tiene en Qdrant
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Clave foránea para la relación
    workspace_id = Column(
        CHAR(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    
    # Relación: Un Documento pertenece a un Workspace
    workspace = relationship("Workspace", back_populates="documents")