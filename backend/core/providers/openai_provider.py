"""
OpenAI GPT-4o-mini LLM Provider.

Uses OpenAI API for GPT-4o-mini model.
Cost-effective and fast model for general tasks.
"""

from typing import List, Generator
from openai import OpenAI
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """
    OpenAI GPT-4o-mini provider.
    
    Características:
    - Modelo: GPT-4o-mini
    - Costo: Bajo
    - Bueno para chat, análisis y generación
    """
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        """
        Inicializa el provider de OpenAI.
        
        Args:
            api_key: OpenAI API key
            model_name: Modelo a usar (default: gpt-4o-mini)
        """
        logger.info(f"Inicializando OpenAI provider con modelo {model_name}")
        
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name
        
        logger.info("OpenAI provider inicializado correctamente")
    
    def generate_response(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """
        Genera una respuesta completa usando GPT-4o-mini.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de contexto del RAG
            
        Returns:
            Respuesta generada
        """
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
            logger.error(f"Error en OpenAI API: {e}")
            raise RuntimeError(f"Error al generar respuesta con OpenAI: {e}") from e
    
    def generate_response_stream(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk]
    ) -> Generator[str, None, None]:
        """
        Genera una respuesta en streaming usando GPT-4o-mini.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de contexto del RAG
            
        Yields:
            Chunks de texto de la respuesta
        """
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
            logger.error(f"Error en OpenAI streaming: {e}")
            raise RuntimeError(f"Error en streaming con OpenAI: {e}") from e