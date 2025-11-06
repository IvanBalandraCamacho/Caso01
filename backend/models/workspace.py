import uuid
from sqlalchemy import Column, String, DateTime, Boolean, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .database import Base

class Workspace(Base):
    __tablename__ = "workspaces"

    # Usamos UUID como ID principal. 
    # CHAR(36) es el estándar para almacenar UUIDs en MySQL.
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Relación: Un Workspace puede tener muchos Documentos
    documents = relationship("Document", back_populates="workspace")