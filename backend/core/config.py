from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configuración centralizada de la aplicación cargada desde .env
    Permitir variables adicionales en el .env (extra ignored) para no romper
    cuando se definen variables auxiliares como MYSQL_* en desarrollo.
    """
    DATABASE_URL: str
    REDIS_URL: str
    QDRANT_URL: str
    GEMINI_API_KEY: str
    ACTIVE_LLM_SERVICE: str = "GEMINI"

    # pydantic v2 uses `model_config`; permitimos extras y el archivo .env
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Instancia única de la configuración
settings = Settings()