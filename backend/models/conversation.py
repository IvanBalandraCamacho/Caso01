from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

class Conversation(Base):
    """
    Modelo para almacenar conversaciones (títulos de chat).
    """
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    title = Column(String(255), nullable=False)  # Generado automáticamente del primer mensaje
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # ÍNDICES para optimización de consultas
    __table_args__ = (
        Index('idx_workspace_updated', 'workspace_id', 'updated_at'),
    )
    
    # Relaciones
    workspace = relationship("Workspace", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """
    Modelo para almacenar mensajes individuales del chat.
    """
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' o 'assistant'
    content = Column(Text, nullable=False)
    chunk_references = Column(Text, nullable=True)  # JSON string de los chunks usados
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # ÍNDICES para optimización de consultas
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
        Index('idx_role', 'role'),
    )
    
    # Relación
    conversation = relationship("Conversation", back_populates="messages")
