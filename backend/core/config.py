"""
Configuración de la aplicación.
Carga variables de entorno y define configuración global.
"""

import os
import secrets
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Configuración centralizada de la aplicación cargada desde .env"""
    
    # ========================================================================
    # PROJECT & ENVIRONMENT
    # ========================================================================
    ENV: str = os.getenv("ENV", "development") # development, production
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "squad-ia-latam")
    GCP_REGION: str = os.getenv("GCP_REGION", "us-central1")
    
    # ========================================================================
    # DATABASE (PostgreSQL)
    # ========================================================================
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME: str = os.getenv("DB_NAME", "caso01_db")
    DB_HOST: str = os.getenv("DB_HOST", "db-postgres17") # Nombre del servicio en docker-compose
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    
    # Nombre de conexión de Cloud SQL (formato: project:region:instance)
    # Se inyectará automáticamente en Cloud Run o lo defines manual
    INSTANCE_CONNECTION_NAME: Optional[str] = os.getenv("INSTANCE_CONNECTION_NAME")

    @property
    def DATABASE_URL(self) -> str:
        """
        Construye la URL de conexión dinámicamente:
        - Si existe INSTANCE_CONNECTION_NAME -> Conexión por Unix Socket (Cloud Run)
        - Si no -> Conexión TCP estándar (Local/Docker)
        """
        if self.INSTANCE_CONNECTION_NAME:
            # Conexión via Unix Socket para Cloud Run
            # postgresql+psycopg2://USER:PASS@/DB_NAME?host=/cloudsql/INSTANCE_CONNECTION_NAME
            return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@/{self.DB_NAME}?host=/cloudsql/{self.INSTANCE_CONNECTION_NAME}"
        
        # Conexión estándar TCP para Desarrollo Local
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # ========================================================================
    # REDIS (Cola de Tareas & Cache)
    # ========================================================================
    REDIS_HOST: str = os.getenv("REDIS_HOST", "ia_redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD", None)

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # ========================================================================
    # GCP SERVICES
    # ========================================================================
    GCS_BUCKET_NAME: str = os.getenv("BUCKET_NAME", "caso01-documents")
    
    # ========================================================================
    # JWT & SECURITY
    # ========================================================================
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 días
    
    # ========================================================================
    # LLM & RAG CONFIG
    # ========================================================================
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    GEMINI_MODEL: str = "gemini-1.5-flash" 
    
    # RAG Service (URL interna o externa)
    RAG_SERVICE_URL: str = os.getenv("RAG_SERVICE_URL", "http://rag-service:8080")
    
    # ========================================================================
    # GENERAL
    # ========================================================================
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "*")

    class Config:
        # Pydantic v2 config
        case_sensitive = True
        extra = "ignore" # Ignorar variables extra en .env

settings = Settings()