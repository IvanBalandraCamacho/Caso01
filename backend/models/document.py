import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")

    chunk_count = Column(Integer, default=0)

    # Mensajes automáticos generados
    suggestion_short = Column(Text, nullable=True)
    suggestion_full = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Workspace dueño del documento
    workspace_id = Column(
        CHAR(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    # Conversación donde se debe enviar el mensaje automático
    conversation_id = Column(
        CHAR(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=True
    )

    workspace = relationship("Workspace", back_populates="documents")

    # Relación hacia conversacion
    conversation = relationship("Conversation", back_populates="documents")
