
from pydantic import field_validator, Field
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    """Configuración validada de la aplicación"""
    
    # Base de datos
    DATABASE_URL: str = Field(..., min_length=10)
    
    # Redis
    REDIS_URL: str = Field(..., min_length=10)
    
    # Qdrant
    QDRANT_URL: str = Field(..., min_length=10)
    
    # LLM
    GEMINI_API_KEY: str = Field(..., min_length=20)
    ACTIVE_LLM_SERVICE: Literal["GEMINI", "OPENAI"] = "GEMINI"
    
    # Configuración de procesamiento
    CHUNK_SIZE: int = Field(default=512, ge=100, le=2000)
    CHUNK_OVERLAP: int = Field(default=50, ge=0, le=500)
    MAX_FILE_SIZE_MB: int = Field(default=50, ge=1, le=200)
    
    # Configuración de búsqueda
    DEFAULT_TOP_K: int = Field(default=5, ge=1, le=20)
    MIN_SIMILARITY_SCORE: float = Field(default=0.5, ge=0.0, le=1.0)
    
    # Ambiente
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith(("mysql://", "postgresql://")):
            raise ValueError("DATABASE_URL debe comenzar con mysql:// o postgresql://")
        return v
    
    @field_validator("CHUNK_OVERLAP")
    @classmethod
    def validate_chunk_overlap(cls, v: int, info) -> int:
        chunk_size = info.data.get("CHUNK_SIZE", 512)
        if v >= chunk_size:
            raise ValueError("CHUNK_OVERLAP debe ser menor que CHUNK_SIZE")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True


settings = Settings()