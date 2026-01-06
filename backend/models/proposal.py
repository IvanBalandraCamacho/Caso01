import uuid
from sqlalchemy import Column, String, DateTime, Boolean, func, Text, ForeignKey, Float, Integer, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from .database import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(CHAR(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(200), nullable=False) # Scenario Name
    version = Column(Integer, default=1)
    
    # Scenario Specific Fields
    tech_stack = Column(JSON, nullable=True)
    estimated_price = Column(Float, nullable=True)
    estimated_time = Column(String(100), nullable=True)
    resource_count = Column(Integer, nullable=True)
    objective = Column(Text, nullable=True)
    
    # Generated Content
    content = Column(Text, nullable=True) # The actual proposal document text
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="proposals")
