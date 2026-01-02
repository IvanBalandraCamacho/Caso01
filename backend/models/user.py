"""
Modelo de Usuario para autenticación y autorización.

Este módulo define el modelo User que se usa para:
- Autenticación con JWT
- Gestión de usuarios
- Ownership de workspaces
- Permisos y roles
"""

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base


class User(Base):
    """
    Modelo de Usuario.
    
    Attributes:
        id: UUID único del usuario
        email: Email único del usuario (usado para login)
        hashed_password: Contraseña hasheada con bcrypt
        full_name: Nombre completo del usuario (opcional)
        is_active: Si el usuario está activo (puede hacer login)
        is_superuser: Si el usuario es administrador
        created_at: Fecha de creación
        updated_at: Fecha de última actualización
        
    Relationships:
        workspaces: Lista de workspaces que posee el usuario
    """
    __tablename__ = "users"
    
    # Campos principales
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)  # URL o path de la foto de perfil
    
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
