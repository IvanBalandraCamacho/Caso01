"""
LLM Service - Routing inteligente entre Gemini 3 Pro y Flash.

Sistema LLM con dos modelos especializados:
- Gemini 3 Pro: SOLO para quick-analysis y propuestas comerciales (thinking HIGH, temp 0)
- Gemini 3 Flash: Chat, CopilotKit, tareas generales (thinking MEDIUM, temp 1.5)

CONTROL DE COSTOS:
- Gemini 3 Pro solo se usa cuando se pasa explícitamente `use_pro=True`
- Pro NUNCA reintenta (una sola llamada por operación)
- Por defecto TODO usa Flash
"""
from typing import List, Generator, Optional
from enum import Enum
import logging
import time

from core.config import settings
from core.providers import LLMProvider
from core.providers.gemini_pro_provider import Gemini3ProProvider
from core.providers.gemini_flash_provider import Gemini3FlashProvider
from core.llm_router import LLMRouter, TaskType
from models.schemas import DocumentChunk
from core.llm_cache import get_llm_cache
from core.llm_validators import ResponseValidator, get_metrics

logger = logging.getLogger(__name__)


class ModelType(Enum):
    """Tipos de modelo disponibles."""
    PRO = "gemini_pro"      # Para documentos y propuestas (EXPLÍCITO)
    FLASH = "gemini_flash"  # Para todo lo demás (DEFAULT)


# Global provider instances
_providers = {}
_router = None
_cache = None


def initialize_providers():
    """
    Inicializa ambos providers: Gemini 3 Pro y Flash.
    """
    global _providers, _router, _cache
    
    logger.info("Inicializando sistema LLM con Gemini 3 Pro y Flash...")
    
    # Inicializar caché
    _cache = get_llm_cache()
    if _cache:
        logger.info("✅ Sistema de caché LLM inicializado")
    
    # 1. Gemini 3 Flash (PROVIDER PRINCIPAL - DEFAULT)
    try:
        _providers[ModelType.FLASH] = Gemini3FlashProvider()
        _providers["gemini_flash"] = _providers[ModelType.FLASH]
        _providers["gemini"] = _providers[ModelType.FLASH]  # Alias para compatibilidad
        _providers["default"] = _providers[ModelType.FLASH]
        logger.info(f"✅ Gemini 3 Flash inicializado: {settings.GEMINI_FLASH_MODEL}")
    except Exception as e:
        logger.error(f"❌ Error inicializando Gemini 3 Flash: {e}")
        raise RuntimeError(f"No se pudo inicializar Gemini 3 Flash: {e}")
    
    # 2. Gemini 3 Pro (SOLO para quick-analysis y propuestas - EXPLÍCITO)
    try:
        _providers[ModelType.PRO] = Gemini3ProProvider()
        _providers["gemini_pro"] = _providers[ModelType.PRO]
        logger.info(f"✅ Gemini 3 Pro inicializado: {settings.GEMINI_PRO_MODEL}")
    except Exception as e:
        logger.error(f"❌ Error inicializando Gemini 3 Pro: {e}")
        logger.warning("⚠️ Continuando solo con Gemini 3 Flash")
    
    # Inicializar router
    _router = LLMRouter()
    logger.info("✅ LLM Router inicializado")
    
    if not _providers:
        raise RuntimeError("❌ No hay providers disponibles. Configura GOOGLE_API_KEY en .env")
    
    logger.info(f"Sistema LLM listo con {len(_providers)} providers")


def get_provider(
    model_name: str = None, 
    task_type: str = None,
    force_pro: bool = False
) -> LLMProvider:
    """
    Obtiene el provider apropiado.
    
    REGLA: Siempre usa Flash EXCEPTO si force_pro=True explícitamente.
    
    Args:
        model_name: Nombre específico del modelo (ignorado)
        task_type: Tipo de tarea (ignorado)
        force_pro: Si True, usa Gemini 3 Pro (para quick-analysis/propuestas)
        
    Returns:
        Provider instance (Pro o Flash)
    """
    if not _providers:
        initialize_providers()
    
    # SOLO usar Pro si se solicita EXPLÍCITAMENTE
    if force_pro and ModelType.PRO in _providers:
        logger.info("🎯 Usando Gemini 3 Pro (solicitado explícitamente)")
        return _providers[ModelType.PRO]
    
    # DEFAULT: Flash para todo
    if ModelType.FLASH in _providers:
        logger.debug("🎯 Usando Gemini 3 Flash (default)")
        return _providers[ModelType.FLASH]
    
    # Fallback
    if _providers:
        provider = next(iter(_providers.values()))
        logger.warning(f"⚠️ Usando fallback provider")
        return provider
    
    raise RuntimeError("No LLM provider available. Please check your GOOGLE_API_KEY in .env")


def get_pro_provider() -> Optional[Gemini3ProProvider]:
    """
    Obtiene el provider Gemini 3 Pro para generación de documentos.
    
    Returns:
        Gemini3ProProvider o None si no está disponible
    """
    if not _providers:
        initialize_providers()
    
    if ModelType.PRO in _providers:
        return _providers[ModelType.PRO]
    return None


def get_flash_provider() -> Gemini3FlashProvider:
    """
    Obtiene el provider Gemini 3 Flash para chat.
    
    Returns:
        Gemini3FlashProvider
    """
    if not _providers:
        initialize_providers()
    
    if ModelType.FLASH in _providers:
        return _providers[ModelType.FLASH]
    
    raise RuntimeError("Gemini 3 Flash no disponible")


def generate_response(
    query: str, 
    context_chunks: List[DocumentChunk], 
    model_override: str = None, 
    chat_history: List[dict] = None, 
    use_cache: bool = True,
    use_pro: bool = False,
    raw_document: str = None
) -> str:
    """
    Genera una respuesta usando Flash (default) o Pro (explícito).
    
    CONTROL DE COSTOS:
    - Por defecto usa Flash
    - Solo usa Pro si use_pro=True o raw_document está presente
    - Pro NUNCA reintenta
    
    Args:
        query: Pregunta del usuario
        context_chunks: Documentos relevantes del RAG
        model_override: Modelo específico (ignorado)
        chat_history: Historial de chat (opcional)
        use_cache: Si True, intenta usar caché (default: True)
        use_pro: Si True, usa Gemini 3 Pro (para quick-analysis/propuestas)
        raw_document: Documento crudo (activa Pro automáticamente)
        
    Returns:
        Respuesta generada y validada
    """
    global _cache
    
    start_time = time.time()
    was_cached = False
    metrics = get_metrics()
    validator = ResponseValidator()
    
    # Determinar si usar Pro (SOLO por parámetro explícito o raw_document)
    should_use_pro = use_pro or (raw_document is not None)
    
    if should_use_pro:
        logger.info("📄 Usando Gemini 3 Pro (solicitado explícitamente)")
    
    # Intentar obtener del caché (SOLO para Flash)
    if not should_use_pro and use_cache and _cache:
        context_texts = [chunk.chunk_text[:200] for chunk in context_chunks] if context_chunks else []
        model_name = "gemini_flash"
        
        cached_response = _cache.get(query, context_texts, model_name)
        if cached_response:
            was_cached = True
            response_time = time.time() - start_time
            
            metrics.record_request(
                query=query,
                response=cached_response,
                context_chunks=context_chunks,
                response_time=response_time,
                was_cached=True
            )
            
            return cached_response
    
    # Generar respuesta
    if should_use_pro and ModelType.PRO in _providers:
        provider = _providers[ModelType.PRO]
        response = provider.generate_response(
            query=query,
            context_chunks=None,  # Pro no usa RAG
            chat_history=chat_history,
            raw_document=raw_document
        )
    else:
        provider = get_provider()
        response = provider.generate_response(query, context_chunks, chat_history=chat_history)
    
    response_time = time.time() - start_time
    
    # Validar respuesta
    validation = validator.validate_response(query, response, context_chunks)
    
    if not validation['is_valid']:
        logger.warning(f"⚠️ Respuesta de baja calidad (score: {validation['quality_score']})")
        logger.warning(f"   Issues: {', '.join(validation['issues'])}")
        
        # CONTROL DE COSTOS: Pro NUNCA reintenta
        if validator.should_retry(validation) and not should_use_pro:
            logger.info("🔄 Reintentando generación con Flash...")
            response = provider.generate_response(query, context_chunks, chat_history=chat_history)
            validation = validator.validate_response(query, response, context_chunks)
        elif should_use_pro:
            logger.info("💰 Gemini Pro: aceptando respuesta sin retry (control de costos)")
    
    # Log de calidad
    if validation['quality_score'] >= 0.8:
        logger.info(f"✅ Respuesta de alta calidad (score: {validation['quality_score']})")
    elif validation['quality_score'] >= 0.6:
        logger.info(f"⚠️ Respuesta aceptable (score: {validation['quality_score']})")
    
    # Guardar en caché solo Flash y si es de calidad aceptable
    if not should_use_pro and use_cache and _cache and response and validation['quality_score'] >= 0.6:
        context_texts = [chunk.chunk_text[:200] for chunk in context_chunks] if context_chunks else []
        _cache.set(query, context_texts, "gemini_flash", response)
    
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


def generate_response_stream(
    query: str, 
    context_chunks: List[DocumentChunk], 
    model_override: str = None, 
    chat_history: List[dict] = None,
    use_pro: bool = False,
    raw_document: str = None,
    thinking_level: str = None
) -> Generator[str, None, None]:
    """
    Genera una respuesta en streaming usando Flash (default) o Pro (explícito).
    
    CONTROL DE COSTOS:
    - Por defecto usa Flash
    - Solo usa Pro si use_pro=True o raw_document está presente
    
    Args:
        query: Pregunta del usuario
        context_chunks: Documentos relevantes del RAG
        model_override: Modelo específico (ignorado)
        chat_history: Historial de chat (opcional)
        use_pro: Si True, usa Gemini 3 Pro (para quick-analysis/propuestas)
        raw_document: Documento crudo (activa Pro automáticamente)
        thinking_level: Nivel de thinking (OFF, LOW, MEDIUM, HIGH)
        
    Yields:
        Fragmentos de la respuesta
    """
    # Determinar si usar Pro (SOLO por parámetro explícito o raw_document)
    should_use_pro = use_pro or (raw_document is not None)
    
    if should_use_pro:
        logger.info("📄 Streaming: Usando Gemini 3 Pro (solicitado explícitamente)")
    
    if should_use_pro and ModelType.PRO in _providers:
        provider = _providers[ModelType.PRO]
        return provider.generate_response_stream(
            query=query,
            context_chunks=None,  # Pro no usa RAG
            chat_history=chat_history,
            raw_document=raw_document
        )
    else:
        provider = get_provider()
        return provider.generate_response_stream(
            query, 
            context_chunks, 
            chat_history=chat_history,
            thinking_level=thinking_level
        )


def generate_response_stream_pro(
    query: str,
    raw_document: str,
    chat_history: List[dict] = None
) -> Generator[str, None, None]:
    """
    Genera una respuesta en streaming usando Gemini 3 Pro.
    
    USO: Solo para quick-analysis y propuestas comerciales.
    
    Args:
        query: Pregunta/instrucciones del usuario
        raw_document: Documento crudo a analizar
        chat_history: Historial de chat (opcional)
        
    Yields:
        Fragmentos de la respuesta
    """
    logger.info("📄 generate_response_stream_pro: Usando Gemini 3 Pro")
    
    pro_provider = get_pro_provider()
    if not pro_provider:
        raise RuntimeError("Gemini 3 Pro no disponible")
    
    return pro_provider.generate_response_stream(
        query=query,
        context_chunks=None,
        chat_history=chat_history,
        raw_document=raw_document
    )


def generate_document(
    document_type: str,
    raw_document: str,
    instructions: str = None,
    output_format: str = "markdown"
) -> str:
    """
    Genera un documento usando Gemini 3 Pro.
    
    Args:
        document_type: Tipo de documento (proposal, analysis, summary, etc.)
        raw_document: Contenido del documento fuente
        instructions: Instrucciones adicionales
        output_format: Formato de salida
        
    Returns:
        Documento generado
    """
    pro_provider = get_pro_provider()
    if not pro_provider:
        raise RuntimeError("Gemini 3 Pro no disponible para generación de documentos")
    
    return pro_provider.generate_document(
        document_type=document_type,
        raw_document=raw_document,
        instructions=instructions,
        output_format=output_format
    )


def generate_workspace_name(document_content: str) -> str:
    """
    Genera un nombre para el workspace usando Gemini 3 Flash (SIN thinking).
    
    Args:
        document_content: Contenido del documento (primeros 2000 chars)
        
    Returns:
        Nombre del workspace
    """
    flash_provider = get_flash_provider()
    return flash_provider.generate_workspace_name(document_content)


def generate_workspace_summary(document_content: str) -> str:
    """
    Genera un resumen del workspace usando Gemini 3 Flash (SIN thinking).
    
    Args:
        document_content: Contenido del documento (primeros 5000 chars)
        
    Returns:
        Resumen del workspace
    """
    flash_provider = get_flash_provider()
    return flash_provider.generate_workspace_summary(document_content)
