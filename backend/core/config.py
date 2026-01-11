"""
Configuración de la aplicación.
Carga variables de entorno y define configuración global.
"""

import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    """Configuración centralizada de la aplicación cargada desde .env"""
    
    # ========================================================================
    # DATABASE
    # ========================================================================
    DATABASE_URL: str = "mysql+pymysql://user:password@ia_mysql:3306/caso01_db"
    
    # ========================================================================
    # REDIS
    # ========================================================================
    REDIS_HOST: str = "ia_redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: str = "redis://ia_redis:6379/0"
    
    # ========================================================================
    # QDRANT
    # ========================================================================
    QDRANT_HOST: str = "ia_qdrant"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "rfp_documents"
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_URL: str = "http://ia_qdrant:6333"
    
    # ========================================================================
    # JWT
    # ========================================================================
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 días
    
    # ========================================================================
    # GCP SERVICES (NUEVO)
    # ========================================================================
    
    # Project
    GOOGLE_CLOUD_PROJECT: str = "tivit-caso01"
    GCP_REGION: str = "us-central1"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GCS_BUCKET_NAME: str = "caso01-documents"
    
    # Gemini API
    GOOGLE_API_KEY: Optional[str] = None
    
    # Gemini 3 Pro - Para generación de documentos y propuestas comerciales
    # Thinking level: HIGH, Temperature: 0 (determinístico)
    GEMINI_PRO_MODEL: str = "gemini-3-pro-preview"
    GEMINI_PRO_THINKING_LEVEL: str = "HIGH"  # OFF, LOW, MEDIUM, HIGH
    GEMINI_PRO_TEMPERATURE: float = 0.0
    GEMINI_PRO_MAX_TOKENS: int = 65536
    
    # Gemini 3 Flash - Para chat, CopilotKit, nombres de workspace, etc.
    # Thinking level: MEDIUM, Temperature: 1.5 (creativo)
    GEMINI_FLASH_MODEL: str = "gemini-3-flash-preview"
    GEMINI_FLASH_THINKING_LEVEL: str = "MEDIUM"  # OFF, LOW, MEDIUM, HIGH
    GEMINI_FLASH_TEMPERATURE: float = 1.5
    GEMINI_FLASH_MAX_TOKENS: int = 16384
    
    # Legacy - mantener compatibilidad
    GEMINI_MODEL: str = "gemini-3-flash-preview"
    GEMINI_TEMPERATURE: float = 1.5
    GEMINI_MAX_TOKENS: int = 16384
    
    # Document AI
    DOCUMENT_AI_PROCESSOR_ID: Optional[str] = None
    DOCUMENT_AI_LOCATION: str = "us"
    DOCUMENT_AI_ENABLED: bool = True
    
    # Natural Language API
    ENABLE_NATURAL_LANGUAGE: bool = True
    
    # ========================================================================
    # LLM PROVIDERS
    # ========================================================================
    
    # OpenAI (fallback)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Multi-LLM
    LLM_PROVIDER: str = "gemini"  # gemini, openai, vertex
    MULTI_LLM_ENABLED: bool = True
    
    # ========================================================================
    # RAG SERVICE
    # ========================================================================
    RAG_SERVICE_URL: str = "http://rag-service:8080"
    RAG_SERVICE_API_KEY: Optional[str] = None
    RAG_SERVICE_TIMEOUT: float = 120.0
    RAG_SERVICE_ENABLED: bool = True
    
    # ========================================================================
    # MCP TALENT SERVICE
    # ========================================================================
    MCP_SERVICE_URL: str = "http://mcp-server:8083"
    MCP_SERVICE_ENABLED: bool = True
    MCP_SERVICE_TIMEOUT: float = 30.0
    
    # ========================================================================
    # FILE UPLOAD
    # ========================================================================
    MAX_FILE_SIZE: int = 52428800  # 50MB
    ALLOWED_EXTENSIONS: str = ".pdf,.docx,.xlsx,.csv,.txt"
    
    # ========================================================================
    # CELERY
    # ========================================================================
    CELERY_BROKER_URL: str = "redis://ia_redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://ia_redis:6379/0"
    
    # ========================================================================
    # CORS
    # ========================================================================
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # ========================================================================
    # LOGGING
    # ========================================================================
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"


settings = Settings()