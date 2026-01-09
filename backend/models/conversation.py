from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Index, Boolean
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
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    has_proposal = Column(Boolean, default=False)
    proposal_content = Column(Text, nullable=True)  # Contenido de la propuesta generada (Markdown)
    
    # ÍNDICES
    __table_args__ = (
        Index('idx_workspace_updated', 'workspace_id', 'updated_at'),
        Index('idx_user_updated', 'user_id', 'updated_at'),
    )
    
    # Relaciones
    workspace = relationship("Workspace", back_populates="conversations")
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    # 🔥 NUEVA RELACIÓN: documentos procesados que reportan a esta conversación
    documents = relationship(
        "Document",
        back_populates="conversation",
        passive_deletes=True
    )


class Message(Base):
    """
    Modelo para almacenar mensajes individuales del chat.
    """
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    chunk_references = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # ÍNDICES
    __table_args__ = (
        Index('idx_conversation_created', 'conversation_id', 'created_at'),
        Index('idx_role', 'role'),
    )
    
    # Relación
    conversation = relationship("Conversation", back_populates="messages")
