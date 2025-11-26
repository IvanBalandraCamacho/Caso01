import uuid
from sqlalchemy import Column, String, DateTime, Boolean, func, Text, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .database import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    
    # System Prompt
    instructions = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    owner_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    owner = relationship("User", back_populates="workspaces")

    # --- relaciones corregidas ---
    documents = relationship(
        "Document",
        back_populates="workspace",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    
    conversations = relationship(
        "Conversation",
        back_populates="workspace",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
