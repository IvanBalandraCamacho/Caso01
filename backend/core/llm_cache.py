"""
Sistema de caché para respuestas LLM usando Redis.
Reduce costos y mejora rendimiento al cachear respuestas frecuentes.
"""
import hashlib
import json
import logging
from typing import Optional, List
from redis import Redis
from core.config import settings

logger = logging.getLogger(__name__)


class LLMCache:
    """Caché inteligente para respuestas LLM."""
    
    def __init__(self, redis_client: Redis, ttl: int = 3600):
        """
        Args:
            redis_client: Cliente Redis
            ttl: Tiempo de vida en segundos (default: 1 hora)
        """
        self.redis = redis_client
        self.ttl = ttl
        self.prefix = "llm_cache:"
    
    def _generate_key(self, query: str, context: List[str], model: str) -> str:
        """Genera una clave única basada en query, contexto y modelo."""
        # Crear un hash único combinando query + contexto + modelo
        content = f"{model}:{query}:{':'.join(sorted(context))}"
        hash_key = hashlib.sha256(content.encode()).hexdigest()
        return f"{self.prefix}{hash_key}"
    
    def get(self, query: str, context: List[str], model: str) -> Optional[str]:
        """
        Obtiene respuesta desde caché si existe.
        
        Returns:
            str si existe en caché, None si no existe
        """
        try:
            key = self._generate_key(query, context, model)
            cached = self.redis.get(key)
            
            if cached:
                logger.info(f"✅ Cache HIT para query: {query[:50]}...")
                return cached.decode('utf-8')
            
            logger.debug(f"❌ Cache MISS para query: {query[:50]}...")
            return None
            
        except Exception as e:
            logger.warning(f"Error al obtener del caché: {e}")
            return None
    
    def set(self, query: str, context: List[str], model: str, response: str):
        """
        Guarda respuesta en caché.
        """
        try:
            key = self._generate_key(query, context, model)
            self.redis.setex(key, self.ttl, response)
            logger.info(f"💾 Respuesta cacheada para: {query[:50]}...")
            
        except Exception as e:
            logger.warning(f"Error al guardar en caché: {e}")
    
    def invalidate_pattern(self, pattern: str):
        """
        Invalida todas las claves que coincidan con el patrón.
        Útil para invalidar caché cuando se actualiza un documento.
        """
        try:
            keys = self.redis.keys(f"{self.prefix}{pattern}*")
            if keys:
                self.redis.delete(*keys)
                logger.info(f"🗑️ Invalidadas {len(keys)} entradas de caché")
        except Exception as e:
            logger.warning(f"Error al invalidar caché: {e}")
    
    def clear_all(self):
        """Limpia todo el caché LLM."""
        try:
            keys = self.redis.keys(f"{self.prefix}*")
            if keys:
                self.redis.delete(*keys)
                logger.info(f"🗑️ Caché LLM limpiado ({len(keys)} entradas)")
        except Exception as e:
            logger.warning(f"Error al limpiar caché: {e}")
    
    def get_stats(self) -> dict:
        """Obtiene estadísticas del caché."""
        try:
            keys = self.redis.keys(f"{self.prefix}*")
            return {
                "total_entries": len(keys),
                "estimated_memory_kb": sum(self.redis.memory_usage(k) or 0 for k in keys) / 1024
            }
        except Exception as e:
            logger.warning(f"Error al obtener stats: {e}")
            return {"total_entries": 0, "estimated_memory_kb": 0}


# Instancia global
_cache_instance: Optional[LLMCache] = None


def get_llm_cache() -> Optional[LLMCache]:
    """Obtiene la instancia del caché LLM."""
    global _cache_instance
    
    if _cache_instance is None and hasattr(settings, 'REDIS_URL'):
        try:
            import redis
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=False)
            _cache_instance = LLMCache(redis_client, ttl=3600)  # 1 hora
            logger.info("✅ LLM Cache inicializado")
        except Exception as e:
            logger.warning(f"No se pudo inicializar caché LLM: {e}")
    
    return _cache_instance
