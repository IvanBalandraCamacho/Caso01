import uuid
from sqlalchemy import Column, String, DateTime, Boolean, func, Text, ForeignKey, Float, Integer, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .database import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    
    # --- Strategic Fields (Fase 1) ---
    country = Column(String(100), nullable=True)
    client_company = Column(String(200), nullable=True)
    operation_name = Column(String(200), nullable=True)
    tvt = Column(Float, nullable=True)  # Total Contract Value
    tech_stack = Column(JSON, nullable=True)  # List of technologies
    opportunity_type = Column(String(50), nullable=True)  # RFP, RFI, etc.
    estimated_price = Column(Float, nullable=True)
    estimated_time = Column(String(100), nullable=True)
    resource_count = Column(Integer, nullable=True)
    category = Column(String(100), nullable=True)
    objective = Column(Text, nullable=True)
    
    # System Prompt
    instructions = Column(Text, nullable=True)
    
    # --- Proposal Tracking Fields (Fase 1.1) ---
    proposal_status = Column(String(20), nullable=True, default="pending")  # pending, sent, accepted, rejected, won, lost
    proposal_sent_at = Column(DateTime(timezone=True), nullable=True)
    tvt_id = Column(String(50), nullable=True)  # ID de propuesta comercial TIVIT
    rfp_type = Column(String(50), nullable=True, default="other")  # security, technology, infrastructure, development, consulting, other
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    owner_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    owner = relationship("User", back_populates="workspaces")

    # --- relaciones corregidas ---
    documents = relationship(
        "Document",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    
    conversations = relationship(
        "Conversation",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    
    proposals = relationship(
        "Proposal",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
