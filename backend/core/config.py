from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path


class Settings(BaseSettings):
    """
    Configuración centralizada de la aplicación cargada desde .env
    """
    DATABASE_URL: str
    REDIS_URL: str
    QDRANT_URL: str
    GEMINI_API_KEY: str = ""  # Se leerá desde Docker Secrets
    ACTIVE_LLM_SERVICE: str = "GEMINI"
    
    # Configuración de seguridad JWT
    SECRET_KEY: str = "dev-secret-for-jwt-please-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Configuración de uploads
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".odt", ".rtf", ".csv"}
    MAX_DOCUMENTS_PER_WORKSPACE: int = 50
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Intentar leer Gemini API Key desde Docker Secrets
        secret_path = Path("/run/secrets/gemini_api_key")
        if secret_path.exists():
            with open(secret_path) as f:
                self.GEMINI_API_KEY = f.read().strip()
            print(f"✅ API Key cargada desde Docker Secrets")
        elif not self.GEMINI_API_KEY:
            # Fallback a variable de entorno
            self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
            if self.GEMINI_API_KEY:
                print(f"⚠️ API Key cargada desde variable de entorno (no recomendado en producción)")


@lru_cache()
def get_settings() -> Settings:
    """Retorna una instancia cacheada de Settings"""
    return Settings()


# Instancia única de la configuración
settings = get_settings()