import os
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Configuración centralizada de la aplicación cargada desde .env
    """
    DATABASE_URL: str
    REDIS_URL: str
    QDRANT_URL: str
    GEMINI_API_KEY: str
    ACTIVE_LLM_SERVICE: str = "GEMINI"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth & Service Account
    GOOGLE_SERVICE_ACCOUNT_FILE: str | None = None
    GOOGLE_OAUTH_CLIENT_ID: str | None = None
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = None
    GOOGLE_OAUTH_REDIRECT_URI: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Instancia única de la configuración
settings = Settings()