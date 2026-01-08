"""
LLM Service - Factory for OpenAI provider.
Provides a unified interface to OpenAI LLM backend.

Sistema LLM:
- OpenAI GPT-4o-mini: Para todas las tareas
"""
from typing import List, Generator
from core.config import settings
from core.providers import LLMProvider, OpenAIProvider
from core.llm_router import LLMRouter, TaskType
from models.schemas import DocumentChunk
from core.llm_cache import get_llm_cache
from core.llm_validators import ResponseValidator, get_metrics
import logging
import time

logger = logging.getLogger(__name__)

# Global provider instances
_providers = {}
_router = None
_cache = None


def initialize_providers():
    """
    Inicializa providers: OpenAI (prioridad), Gemini (deshabilitado temporalmente).
    """
    global _providers, _router, _cache
    
    logger.info("Inicializando sistema LLM...")
    
    # Inicializar caché
    _cache = get_llm_cache()
    if _cache:
        logger.info("✅ Sistema de caché LLM inicializado")
    
    # 1. OpenAI (prioridad actual)
    if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
        try:
            _providers["openai_gpt4o_mini"] = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name="gpt-4o-mini"
            )
            _providers["openai_gpt4"] = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name="gpt-4"
            )
            # Usar OpenAI como default
            _providers["gpt4o_mini"] = _providers["openai_gpt4o_mini"]
            _providers["gpt4"] = _providers["openai_gpt4"]
            logger.info("✅ OpenAI providers inicializados (PRINCIPAL)")
        except Exception as e:
            logger.error(f"❌ Error OpenAI: {e}")
    
    # 2. Gemini Flash (deshabilitado temporalmente - descomentar para producción)
    # try:
    #     from core.gcp_service import gcp_service
    #     if gcp_service.gemini_available:
    #         from core.providers.gemini_flash_provider import GeminiFlashProvider
    #         _providers["gemini_flash"] = GeminiFlashProvider()
    #         _providers["gemini"] = _providers["gemini_flash"]
    #         logger.info("✅ Gemini Flash provider inicializado")
    # except Exception as e:
    #     logger.warning(f"⚠️ No se pudo inicializar Gemini: {e}")

    # Inicializar router
    _router = LLMRouter()
    logger.info("✅ LLM Router inicializado")
    
    if not _providers:
        raise RuntimeError("❌ No hay providers disponibles")
    
    logger.info(f"Sistema LLM listo con {len(_providers)} providers")


def get_provider(model_name: str = None, task_type: str = None) -> LLMProvider:
    """
    Obtiene el provider apropiado.
    Prioridad: OpenAI GPT-4o-mini (Gemini deshabilitado temporalmente)
    
    Args:
        model_name: Nombre específico del modelo (opcional)
        task_type: Tipo de tarea (opcional)
        
    Returns:
        LLMProvider instance
    """
    if not _providers:
        initialize_providers()
    
    # 1. Si se especifica modelo por nombre
    if model_name and model_name in _providers:
        logger.info(f"🎯 Usando modelo solicitado: {model_name}")
        return _providers[model_name]
    
    # 2. Usar OpenAI GPT-4o-mini (Gemini deshabilitado temporalmente)
    if "openai_gpt4o_mini" in _providers:
        logger.info("🎯 Usando OpenAI GPT-4o-mini")
        return _providers["openai_gpt4o_mini"]
    
    # 3. Fallback a Gemini si OpenAI no está disponible
    if "gemini_flash" in _providers:
        logger.info("🎯 Fallback a Gemini Flash")
        return _providers["gemini_flash"]
    
    # 4. Último fallback - cualquier provider disponible
    if _providers:
        provider = next(iter(_providers.values()))
        logger.warning(f"⚠️ Usando fallback provider: {provider.model_name if hasattr(provider, 'model_name') else 'unknown'}")
        return provider
    
    error_msg = "No LLM provider available. Please check your OPENAI_API_KEY in .env"
    logger.error(f"❌ {error_msg}")
    raise RuntimeError(error_msg)


def generate_response(query: str, context_chunks: List[DocumentChunk], model_override: str = None, chat_history: List[dict] = None, use_cache: bool = True) -> str:
    """
    Genera una respuesta usando el LLM apropiado con caché automático y validaciones.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Documentos relevantes del RAG
        model_override: Modelo específico a usar (opcional)
        chat_history: Historial de chat (opcional)
        use_cache: Si True, intenta usar caché (default: True)
        
    Returns:
        Respuesta generada y validada
    """
    global _cache
    
    start_time = time.time()
    was_cached = False
    metrics = get_metrics()
    validator = ResponseValidator()
    
    # Intentar obtener del caché
    if use_cache and _cache:
        context_texts = [chunk.chunk_text[:200] for chunk in context_chunks]  # Primeros 200 chars
        model_name = model_override or "gpt4o_mini"
        
        cached_response = _cache.get(query, context_texts, model_name)
        if cached_response:
            was_cached = True
            response_time = time.time() - start_time
            
            # Registrar métricas
            metrics.record_request(
                query=query,
                response=cached_response,
                context_chunks=context_chunks,
                response_time=response_time,
                was_cached=True
            )
            
            return cached_response
    
    # Generar respuesta
    provider = get_provider(model_name=model_override)
    response = provider.generate_response(query, context_chunks, chat_history=chat_history)
    
    response_time = time.time() - start_time
    
    # Validar respuesta
    validation = validator.validate_response(query, response, context_chunks)
    
    if not validation['is_valid']:
        logger.warning(f"⚠️ Respuesta de baja calidad (score: {validation['quality_score']})")
        logger.warning(f"   Issues: {', '.join(validation['issues'])}")
        
        # Si es un problema técnico, reintentar UNA vez
        if validator.should_retry(validation):
            logger.info("🔄 Reintentando generación...")
            response = provider.generate_response(query, context_chunks, chat_history=chat_history)
            validation = validator.validate_response(query, response, context_chunks)
    
    # Log de calidad
    if validation['quality_score'] >= 0.8:
        logger.info(f"✅ Respuesta de alta calidad (score: {validation['quality_score']})")
    elif validation['quality_score'] >= 0.6:
        logger.info(f"⚠️ Respuesta aceptable (score: {validation['quality_score']})")
    
    # Guardar en caché solo si es de calidad aceptable
    if use_cache and _cache and response and validation['quality_score'] >= 0.6:
        context_texts = [chunk.chunk_text[:200] for chunk in context_chunks]
        model_name = model_override or "gpt4o_mini"
        _cache.set(query, context_texts, model_name, response)
    
    # Registrar métricas
    metrics.record_request(
        query=query,
        response=response,
        context_chunks=context_chunks,
        response_time=response_time,
        was_cached=was_cached
    )
    
    # Log stats cada 10 requests
    if metrics.requests_count % 10 == 0:
        metrics.log_stats()
    
    return response


def generate_response_stream(query: str, context_chunks: List[DocumentChunk], model_override: str = None, chat_history: List[dict] = None) -> Generator[str, None, None]:
    """
    Genera una respuesta en streaming usando el LLM apropiado.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Documentos relevantes del RAG
        model_override: Modelo específico a usar (opcional)
        chat_history: Historial de chat (opcional)
        
    Yields:
        Fragmentos de la respuesta
    """
    provider = get_provider(model_name=model_override)
    return provider.generate_response_stream(query, context_chunks, chat_history=chat_history)
