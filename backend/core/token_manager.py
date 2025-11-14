"""
Gestor de tokens JWT con Redis para blacklist y refresh tokens
"""
import redis
from datetime import timedelta
from core.config import settings
from typing import Optional

# Cliente Redis para gestión de tokens
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

class TokenManager:
    """Gestiona la blacklist de tokens y refresh tokens"""
    
    BLACKLIST_PREFIX = "blacklist:"
    REFRESH_TOKEN_PREFIX = "refresh:"
    
    @staticmethod
    def blacklist_token(token: str, expire_minutes: int) -> None:
        """Añade un token a la blacklist"""
        key = f"{TokenManager.BLACKLIST_PREFIX}{token}"
        redis_client.setex(
            key,
            timedelta(minutes=expire_minutes),
            "blacklisted"
        )
    
    @staticmethod
    def is_token_blacklisted(token: str) -> bool:
        """Verifica si un token está en la blacklist"""
        key = f"{TokenManager.BLACKLIST_PREFIX}{token}"
        return redis_client.exists(key) > 0
    
    @staticmethod
    def store_refresh_token(username: str, refresh_token: str) -> None:
        """Almacena un refresh token"""
        key = f"{TokenManager.REFRESH_TOKEN_PREFIX}{username}"
        redis_client.setex(
            key,
            timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            refresh_token
        )
    
    @staticmethod
    def get_refresh_token(username: str) -> Optional[str]:
        """Obtiene el refresh token de un usuario"""
        key = f"{TokenManager.REFRESH_TOKEN_PREFIX}{username}"
        return redis_client.get(key)
    
    @staticmethod
    def revoke_refresh_token(username: str) -> None:
        """Revoca el refresh token de un usuario"""
        key = f"{TokenManager.REFRESH_TOKEN_PREFIX}{username}"
        redis_client.delete(key)

token_manager = TokenManager()
