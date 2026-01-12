# backend/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    # Campos principales
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # CORRECCIÓN: nullable=True para permitir login con Google sin contraseña
    hashed_password = Column(String(255), nullable=True)
    
    full_name = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    
    # Campo para saber si es "google" o "email"
    auth_provider = Column(String(50), default="email", nullable=False)
    
    # Flags de estado
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relaciones
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"