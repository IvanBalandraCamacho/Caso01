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
import logging

logger = logging.getLogger(__name__)

# Global provider instances
_providers = {}
_router = None


def initialize_providers():
    """
    Inicializa el provider de OpenAI.
    """
    global _providers, _router
    
    logger.info("Inicializando sistema LLM con OpenAI...")
    
    # 1. OpenAI GPT-4o-mini
    if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
        try:
            _providers["gpt4o_mini"] = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name="gpt-4o-mini"
            )
            logger.info("✅ OpenAI GPT-4o-mini inicializado")
        except Exception as e:
            logger.error(f"❌ Error OpenAI GPT-4o-mini: {e}")
    
    # Inicializar router
    _router = LLMRouter()
    logger.info("✅ LLM Router inicializado")
    
    logger.info(f"Sistema LLM listo con {len(_providers)} providers")


def get_provider(model_name: str = None, task_type: str = None) -> LLMProvider:
    """
    Obtiene el provider de OpenAI.
    
    Args:
        model_name: Nombre específico del modelo (opcional)
        task_type: Tipo de tarea (opcional, ignorado ya que solo hay uno)
        
    Returns:
        OpenAIProvider instance
    """
    if not _providers:
        initialize_providers()
    
    # Siempre retornar GPT-4o-mini
    return _providers.get("gpt4o_mini")


def generate_response(query: str, context_chunks: List[DocumentChunk], model_override: str = None) -> str:
    """
    Genera una respuesta usando el LLM apropiado.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Documentos relevantes del RAG
        model_override: Modelo específico a usar (opcional)
        
    Returns:
        Respuesta generada
    """
    provider = get_provider(model_name=model_override)
    return provider.generate_response(query, context_chunks)


def generate_response_stream(query: str, context_chunks: List[DocumentChunk], model_override: str = None) -> Generator[str, None, None]:
    """
    Genera una respuesta en streaming usando el LLM apropiado.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Documentos relevantes del RAG
        model_override: Modelo específico a usar (opcional)
        
    Yields:
        Fragmentos de la respuesta
    """
    provider = get_provider(model_name=model_override)
    return provider.generate_response_stream(query, context_chunks)
