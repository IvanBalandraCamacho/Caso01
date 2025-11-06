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

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Instancia única de la configuración
settings = Settings()