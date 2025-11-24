"""
LLM Service - OpenAI GPT-4o-mini Provider.
Provides a unified interface using OpenAI GPT-4o-mini for all tasks.
"""
from typing import List, Generator
from core.config import settings
from core.providers import OpenAIProvider, LLMProvider
from models.schemas import DocumentChunk
import logging

logger = logging.getLogger(__name__)

# Global provider instance
_provider = None


def initialize_provider():
    """
    Inicializa el provider de OpenAI GPT-4o-mini.
    """
    global _provider
    
    logger.info("Inicializando OpenAI GPT-4o-mini...")
    
    if settings.OPENAI_API_KEY:
        try:
            _provider = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name=settings.OPENAI_MODEL
            )
            logger.info("✅ OpenAI GPT-4o-mini inicializado")
        except Exception as e:
            logger.error(f"❌ Error OpenAI: {e}")
            raise
    else:
        logger.warning("OPENAI_API_KEY no configurada")


def get_provider() -> LLMProvider:
    """
    Obtiene el provider de OpenAI.
    
    Returns:
        OpenAIProvider instance
    """
    if not _provider:
        initialize_provider()
    
    if not _provider:
        raise RuntimeError("OpenAI provider no disponible")
    
    return _provider


def generate_response(
    query: str, 
    context_chunks: List[DocumentChunk],
    task_type: str = None
) -> str:
    """
    Genera respuesta usando GPT-4o-mini.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Chunks de contexto del RAG
        task_type: Ignorado, siempre usa GPT-4o-mini
        
    Returns:
        Respuesta generada
    """
    provider = get_provider()
    return provider.generate_response(query, context_chunks)


def generate_response_stream(
    query: str, 
    context_chunks: List[DocumentChunk],
    task_type: str = None
) -> Generator[str, None, None]:
    """
    Genera respuesta en streaming usando GPT-4o-mini.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Chunks de contexto del RAG
        task_type: Ignorado, siempre usa GPT-4o-mini
        
    Yields:
        Chunks de texto de la respuesta
    """
    provider = get_provider()
    return provider.generate_response_stream(query, context_chunks)


# Inicializar provider al cargar el módulo
try:
    initialize_provider()
except Exception as e:
    logger.error(f"Error inicializando provider: {e}")


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
