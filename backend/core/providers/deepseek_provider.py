"""
DeepSeek V3 LLM Provider.

Este provider está preparado para usar DeepSeek V3 cuando la API esté disponible.
Compatible con OpenAI API (mismo formato).

Costo: $0.14/M tokens (97% más barato que GPT-4o)
Rate Limit: Sin límites restrictivos

TODO: Descomentar cuando tengas la API key de DeepSeek
"""

from typing import List, Generator
# from openai import OpenAI  # TODO: Descomentar cuando API esté disponible
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class DeepSeekProvider(LLMProvider):
    """
    DeepSeek V3 provider (compatible con OpenAI API).
    
    Características:
    - Costo: $0.14/M tokens
    - Sin rate limits restrictivos
    - Compatible con OpenAI SDK
    - Bueno para Q&A y análisis
    """
    
    def __init__(self):
        """
        Inicializa el provider de DeepSeek.
        """
        logger.info("Inicializando DeepSeek provider")
        
        from openai import OpenAI
        
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )
        self.model_name = settings.DEEPSEEK_MODEL or "deepseek-chat"
        
        logger.info("DeepSeek provider inicializado correctamente")
    
    def generate_response(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """
        Genera una respuesta completa usando DeepSeek.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de contexto del RAG
            
        Returns:
            Respuesta generada
        """
        if not self.client:
            logger.warning("DeepSeek API no disponible, usando respuesta placeholder")
            return self._generate_placeholder_response(query)
        
        prompt = self._build_prompt(query, context_chunks)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente experto en análisis de documentos y propuestas comerciales."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=8000,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error en DeepSeek API: {e}")
            raise RuntimeError(f"Error al generar respuesta con DeepSeek: {e}") from e
    
    def generate_response_stream(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk]
    ) -> Generator[str, None, None]:
        """
        Genera una respuesta en streaming usando DeepSeek.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de contexto del RAG
            
        Yields:
            Chunks de texto de la respuesta
        """
        if not self.client:
            logger.warning("DeepSeek API no disponible, usando respuesta placeholder")
            yield self._generate_placeholder_response(query)
            return
        
        prompt = self._build_prompt(query, context_chunks)
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente experto en análisis de documentos y propuestas comerciales."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=8000,
                stream=True,
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error en DeepSeek streaming: {e}")
            raise RuntimeError(f"Error en streaming con DeepSeek: {e}") from e
    
    def _generate_placeholder_response(self, query: str) -> str:
        """
        Genera respuesta placeholder cuando API no está disponible.
        """
        return f"""
[MODO DESARROLLO - DeepSeek API no configurada]

Pregunta: {query}

Esta es una respuesta placeholder. Cuando configures la API de DeepSeek:

1. Agrega DEEPSEEK_API_KEY a tu .env
2. Descomenta el código en deepseek_provider.py
3. Instala: pip install openai

DeepSeek V3 es ideal para:
- Responder preguntas sobre documentos
- Análisis de datos
- Q&A conversacional
- Costo: $0.14/M tokens (97% más barato que GPT-4o)
"""
