import os
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Configuración centralizada de la aplicación cargada desde .env
    """
    DATABASE_URL: str
    REDIS_URL: str
    
    # DEPRECADO: Qdrant local (mantener para compatibilidad temporal)
    QDRANT_URL: str = "http://qdrant:6333"  # Opcional durante migración
    
    GEMINI_API_KEY: str
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth & Service Account
    GOOGLE_SERVICE_ACCOUNT_FILE: str | None = None
    GOOGLE_OAUTH_CLIENT_ID: str | None = None
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = None
    GOOGLE_OAUTH_REDIRECT_URI: str | None = None

    # LLM Provider Configuration
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"      # Chat rápido / General
    GEMINI_PRO_MODEL: str = "gemini-1.5-pro"    # Generación de documentos (Mayor calidad)
    
    # OpenAI Configuration (Para ANÁLISIS)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Multi-LLM Configuration
    MULTI_LLM_ENABLED: bool = True
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # If OPENAI_API_KEY is not set, try to read from token.txt
        if not self.OPENAI_API_KEY:
            try:
                token_file = os.path.join(os.path.dirname(__file__), "..", "..", "token.txt")
                with open(token_file, "r") as f:
                    self.OPENAI_API_KEY = f.read().strip()
            except FileNotFoundError:
                pass
    
    # RAG External Service Configuration (NUEVO)
    RAG_SERVICE_URL: str = "http://localhost:8080"
    RAG_SERVICE_API_KEY: str | None = None
    RAG_SERVICE_TIMEOUT: float = 30.0
    RAG_SERVICE_ENABLED: bool = True  # Ahora habilitado por defecto

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore"  # Ignora variables extra del .env que no estén en el modelo

# Instancia única de la configuración
settings = Settings()