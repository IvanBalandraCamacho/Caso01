"""
LLM Providers package.
Contains different LLM provider implementations.

Gemini 3 Providers:
- Gemini3ProProvider: Para generación de documentos y propuestas (thinking HIGH, temp 0)
- Gemini3FlashProvider: Para chat, CopilotKit y tareas generales (thinking MEDIUM, temp 1.5)
"""
from .llm_provider import LLMProvider
from .openai_provider import OpenAIProvider
from .gemini_pro_provider import Gemini3ProProvider
from .gemini_flash_provider import Gemini3FlashProvider, GeminiFlashProvider

__all__ = [
    "LLMProvider",
    "OpenAIProvider",
    "Gemini3ProProvider",
    "Gemini3FlashProvider",
    "GeminiFlashProvider",  # Alias para compatibilidad
]
