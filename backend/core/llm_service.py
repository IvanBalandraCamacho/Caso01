"""
LLM Service - Factory for LLM providers.
Provides a unified interface to different LLM backends (Gemini, OpenAI, etc.)
"""
from typing import List, Generator
from core.config import settings
from core.providers import GeminiProvider, OpenAIProvider, LLMProvider
from models.schemas import DocumentChunk

# Global provider instance
_provider: LLMProvider = None


def get_llm_provider() -> LLMProvider:
    """
    Get or create the LLM provider based on configuration.
    Returns the configured provider (Gemini or OpenAI).
    """
    global _provider
    
    if _provider is not None:
        return _provider
    
    provider_name = settings.LLM_PROVIDER.lower()
    print(f"LLM_SERVICE: Inicializando provider '{provider_name}'...")
    
    if provider_name == "openai":
        _provider = OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model_name=getattr(settings, "OPENAI_MODEL", "gpt-4.1-nano-2025-04-14")
        )
    elif provider_name == "gemini":
        _provider = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model_name=getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-exp")
        )
    else:
        raise ValueError(f"Provider desconocido: {provider_name}. Use 'gemini' o 'openai'.")
    
    return _provider


# Diccionario para cachear proveedores inicializados
_provider_cache = {}

# Initialize provider on module load
try:
    provider = get_llm_provider()
    print(f"LLM_SERVICE: Provider '{settings.LLM_PROVIDER}' inicializado correctamente.")
    
    # Precargar ambos proveedores para evitar delays en el primer uso
    print("LLM_SERVICE: Precargando proveedores...")
    try:
        _provider_cache["gemini-2.0"] = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model_name="gemini-2.0-flash-exp"
        )
        print("LLM_SERVICE: Gemini 2.0 precargado.")
    except Exception as e:
        print(f"LLM_SERVICE: No se pudo precargar Gemini: {e}")
    
    if settings.OPENAI_API_KEY:
        try:
            _provider_cache["gpt-4.1-nano"] = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name="gpt-4.1-nano-2025-04-14"
            )
            print("LLM_SERVICE: OpenAI GPT-4.1 Nano precargado.")
        except Exception as e:
            print(f"LLM_SERVICE: No se pudo precargar OpenAI: {e}")
    else:
        print("LLM_SERVICE: OpenAI API Key no configurada, omitiendo precarga.")
        
except Exception as e:
    print(f"LLM_SERVICE ERROR: No se pudo inicializar el provider: {e}")
    provider = None


def generate_response(query: str, context_chunks: List[DocumentChunk]) -> str:
    """
    Generate a complete response for the given query.
    
    Args:
        query: User's question
        context_chunks: Relevant document chunks
        
    Returns:
        Complete response as string
    """
    if provider is None:
        raise RuntimeError("El proveedor LLM no está inicializado.")
    return provider.generate_response(query, context_chunks)


def generate_response_stream(query: str, context_chunks: List[DocumentChunk], model: str | None = None) -> Generator[str, None, None]:
    """
    Generate a streaming response for the given query.
    
    Args:
        query: User's question
        context_chunks: Relevant document chunks
        model: Optional model override (gemini-2.0 or gpt-4.1-nano)
        
    Yields:
        Response chunks as they are generated
    """
    if provider is None:
        raise RuntimeError("El proveedor LLM no está inicializado.")
    
    # Si se especifica un modelo, crear proveedor temporal
    if model:
        temp_provider = _get_provider_for_model(model)
        return temp_provider.generate_response_stream(query, context_chunks)
    
    return provider.generate_response_stream(query, context_chunks)


def _get_provider_for_model(model: str) -> LLMProvider:
    """
    Get LLM provider instance for specific model.
    Uses cached providers when available.
    
    Args:
        model: Model identifier (gemini-2.0 or gpt-4.1-nano)
        
    Returns:
        LLMProvider instance
    """
    from core.config import settings
    
    print(f"LLM_SERVICE: Seleccionando proveedor para modelo '{model}'...")
    
    # Intentar usar cache primero
    if model in _provider_cache:
        print(f"LLM_SERVICE: Usando {model} desde cache (precargado)")
        return _provider_cache[model]
    
    # Si no está en cache, crear nueva instancia
    if model == "gpt-4.1-nano":
        print("LLM_SERVICE: Inicializando OpenAI GPT-4.1 Nano (no estaba en cache)")
        provider_instance = OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model_name="gpt-4.1-nano-2025-04-14"
        )
        _provider_cache[model] = provider_instance
        return provider_instance
    elif model == "gemini-2.0":
        print("LLM_SERVICE: Inicializando Gemini 2.0 Flash (no estaba en cache)")
        provider_instance = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model_name="gemini-2.0-flash-exp"
        )
        _provider_cache[model] = provider_instance
        return provider_instance
    else:
        print(f"LLM_SERVICE: Modelo '{model}' no reconocido, usando proveedor por defecto")
        return get_llm_provider()


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
    if provider is None:
        return {"error": "LLM no inicializado"}
    
    prompt = _build_summary_prompt(text, instructions_text=instructions_text)
    
    try:
        # Use generate_response with empty context for summarization
        summary = provider.generate_response(prompt, [])
        return {"summary_raw": summary}
    except Exception as e:
        return {"error": str(e)}
