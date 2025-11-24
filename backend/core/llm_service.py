"""
LLM Service - Factory for Multi-LLM providers (Simplificado).
Provides a unified interface to different LLM backends with intelligent routing.

Sistema Multi-LLM:
- OpenAI GPT-4o-mini: Principal para análisis de documentos
- Gemini 1.5 Flash: Chat y respuestas generales
- DeepSeek V3: Secundario para Q&A específico (opcional)
"""
from typing import List, Generator
from core.config import settings
from core.providers import GeminiProvider, LLMProvider, OpenAIProvider
from core.providers.deepseek_provider import DeepSeekProvider
from core.llm_router import LLMRouter, TaskType
from models.schemas import DocumentChunk
import logging

logger = logging.getLogger(__name__)

# Global provider instances
_providers = {}
_router = None


def initialize_providers():
    """
    Inicializa todos los providers disponibles.
    """
    global _providers, _router
    
    logger.info("Inicializando sistema Multi-LLM (Refinado)...")
    
    # 1. OpenAI GPT-4o-mini (Análisis de documentos)
    if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
        try:
            _providers["gpt4o_mini"] = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name="gpt-4o-mini"
            )
            logger.info("✅ OpenAI GPT-4o-mini inicializado (ANÁLISIS)")
        except Exception as e:
            logger.error(f"❌ Error OpenAI GPT-4o-mini: {e}")
    
    # 2. Gemini 1.5 Flash (Chat/General)
    try:
        _providers["gemini_flash"] = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model_name=settings.GEMINI_MODEL
        )
        logger.info("✅ Gemini 1.5 Flash inicializado (CHAT/GENERAL)")
    except Exception as e:
        logger.error(f"❌ Error Gemini Flash: {e}")

    # 3. Gemini 1.5 Pro (Generación)
    try:
        _providers["gemini_pro"] = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model_name=getattr(settings, "GEMINI_PRO_MODEL", "gemini-1.5-pro")
        )
        logger.info("✅ Gemini 1.5 Pro inicializado (GENERACIÓN)")
    except Exception as e:
        logger.error(f"❌ Error Gemini Pro: {e}")
    
    # 4. DeepSeek V3 (Análisis alternativo)
    if settings.DEEPSEEK_API_KEY:
        try:
            _providers["deepseek"] = DeepSeekProvider()
            logger.info("✅ DeepSeek V3 inicializado (ANÁLISIS)")
        except Exception as e:
            logger.error(f"❌ Error DeepSeek: {e}")
    
    # Inicializar router
    _router = LLMRouter()
    logger.info("✅ LLM Router inicializado")
    
    logger.info(f"Sistema Multi-LLM listo con {len(_providers)} providers")


def get_provider(model_name: str = None, task_type: str = None) -> LLMProvider:
    """
    Obtiene un provider específico o usa el router para seleccionar el mejor.
    
    Args:
        model_name: Nombre específico del modelo (opcional)
        task_type: Tipo de tarea para routing automático (opcional)
        
    Returns:
        LLMProvider instance
    """
    if not _providers:
        initialize_providers()
    
    # Si se especifica modelo, retornar ese
    if model_name and model_name in _providers:
        return _providers[model_name]
    
    # Si se especifica tipo de tarea, usar routing basado en task_type
    if task_type:
        if task_type == "analyze":
            # Prioridad: GPT-4o-mini > DeepSeek > Gemini
            return (_providers.get("gpt4o_mini") or 
                    _providers.get("deepseek") or 
                    _providers.get("gemini_flash"))
        elif task_type == "respond":
            return _providers.get("deepseek") or _providers.get("gemini_flash")
        elif task_type == "create":
            return _providers.get("gemini_pro") or _providers.get("gemini_flash")
    
    # Default: GPT-4o-mini si está disponible, sino Gemini Flash
    return _providers.get("gpt4o_mini") or _providers.get("gemini_flash") or list(_providers.values())[0]
    return _providers.get("gemini_flash") or list(_providers.values())[0]


def generate_response(
    query: str, 
    context_chunks: List[DocumentChunk],
    task_type: str = None
) -> str:
    """
    Genera respuesta usando el mejor modelo para la tarea.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Chunks de contexto del RAG
        task_type: Tipo de tarea ("analyze", "respond", "create")
        
    Returns:
        Respuesta generada
    """
    if settings.MULTI_LLM_ENABLED and _router:
        # Usar router para seleccionar modelo
        model_name, detected_task, reason = _router.route(
            query=query,
            num_documents=len(context_chunks)
        )
        logger.info(f"Router seleccionó: {model_name} - {reason}")
        provider = _providers.get(model_name)
    else:
        # Usar provider por defecto
        provider = get_provider()
    
    if not provider:
        raise RuntimeError("No hay provider disponible")
    
    return provider.generate_response(query, context_chunks)


def generate_response_stream(
    query: str, 
    context_chunks: List[DocumentChunk],
    task_type: str = None
) -> Generator[str, None, None]:
    """
    Genera respuesta en streaming usando el mejor modelo.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Chunks de contexto del RAG
        task_type: Tipo de tarea ("analyze", "respond", "create")
        
    Yields:
        Chunks de texto de la respuesta
    """
    if settings.MULTI_LLM_ENABLED and _router:
        # Usar router para seleccionar modelo
        model_name, detected_task, reason = _router.route(
            query=query,
            num_documents=len(context_chunks)
        )
        logger.info(f"Router seleccionó: {model_name} - {reason}")
        provider = _providers.get(model_name)
    else:
        # Usar provider por defecto
        provider = get_provider()
    
    if not provider:
        raise RuntimeError("No hay provider disponible")
    
    return provider.generate_response_stream(query, context_chunks)


# Inicializar providers al cargar el módulo
try:
    initialize_providers()
except Exception as e:
    logger.error(f"Error inicializando providers: {e}")


# Legacy functions for backward compatibility
def _build_summary_prompt(text: str, instructions_text: str | None = None) -> str:
    """Build prompt for document summarization."""
    if instructions_text:
        instr = instructions_text.strip()
    else:
        instr = (
            "Eres un asistente experto en análisis de propuestas comerciales. "
            "Genera un resumen estructurado en las secciones: Administrativo, Posibles competidores, Técnico, Viabilidad del alcance."
        )
    
    prompt = f"""{instr}\n\nDOCUMENTO:\n{text}\n\nSALIDA:"""
    return prompt


def generate_summary_from_text(text: str, instructions_text: str | None = None) -> dict:
    """
    Generate summary from text using the configured LLM provider.
    
    Args:
        text: Document text to summarize
        instructions_text: Optional custom instructions
        
    Returns:
        Dictionary with summary or error
    """
    provider = get_provider()
    
    if not provider:
        return {"error": "LLM no inicializado"}
    
    prompt = _build_summary_prompt(text, instructions_text=instructions_text)
    
    try:
        summary = provider.generate_response(prompt, [])
        return {"summary_raw": summary}
    except Exception as e:
        return {"error": str(e)}
