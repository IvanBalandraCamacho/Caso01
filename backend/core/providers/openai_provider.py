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
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

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
        
        self.client = OpenAI(
            api_key=api_key,
            timeout=120.0  # Timeout de 120 segundos para respuestas largas
        )
        self.model_name = model_name
        
        logger.info("OpenAI provider inicializado correctamente")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    def generate_response(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk], 
        custom_prompt: str = None,
        chat_history: List[dict] = None
    ) -> str:
        """
        Genera una respuesta completa usando GPT-4o-mini.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de contexto del RAG
            custom_prompt: Prompt personalizado (opcional)
            chat_history: Historial de chat (opcional)
            
        Returns:
            Respuesta generada
        """
        # Construir el prompt del sistema (contexto RAG)
        system_content = custom_prompt if custom_prompt else self._build_prompt(query, context_chunks)
        
        # Construir lista de mensajes
        messages = [
            {
                "role": "system",
                "content": "Eres un asistente experto de TIVIT para análisis de propuestas. Solo respondes sobre temas de TIVIT y documentos del caso. " + system_content
            }
        ]
        
        # Inyectar historial si existe
        if chat_history:
            for msg in chat_history:
                if msg.get("role") in ["user", "assistant"]:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        
        # Agregar mensaje actual
        messages.append({
            "role": "user",
            "content": query
        })
        
        start_time = time.time()
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=8000,
                timeout=30.0
            )
            
            elapsed_time = time.time() - start_time
            tokens_used = response.usage.total_tokens if response.usage else 0
            
            logger.info(f"OpenAI response generated in {elapsed_time:.2f}s, tokens: {tokens_used}")
            
            return response.choices[0].message.content
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(f"Error en OpenAI API después de {elapsed_time:.2f}s: {e}")
            raise RuntimeError(f"Error al generar respuesta con OpenAI: {e}") from e
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    def generate_response_stream(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk],
        custom_prompt: str = None,
        chat_history: List[dict] = None
    ) -> Generator[str, None, None]:
        """
        Genera una respuesta en streaming usando GPT-4o-mini.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de contexto del RAG
            custom_prompt: Prompt personalizado (opcional)
            chat_history: Historial de chat (opcional)
            
        Yields:
            Chunks de texto de la respuesta
        """
        # Construir el prompt del sistema (contexto RAG)
        system_content = custom_prompt if custom_prompt else self._build_prompt(query, context_chunks)
        
        # Construir lista de mensajes
        messages = [
            {
                "role": "system",
                "content": "Eres un asistente experto de TIVIT para análisis de propuestas. Solo respondes sobre temas de TIVIT y documentos del caso. " + system_content
            }
        ]
        
        # Inyectar historial si existe
        if chat_history:
            for msg in chat_history:
                if msg.get("role") in ["user", "assistant"]:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        
        # Agregar mensaje actual
        messages.append({
            "role": "user",
            "content": query
        })
        
        start_time = time.time()
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=8000,
                stream=True,
                timeout=120.0
            )
            
            total_tokens = 0
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                
                # Track tokens if available
                if hasattr(chunk, 'usage') and chunk.usage:
                    total_tokens = chunk.usage.total_tokens
            
            elapsed_time = time.time() - start_time
            logger.info(f"OpenAI streaming completed in {elapsed_time:.2f}s, tokens: {total_tokens}")
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(f"Error en OpenAI streaming después de {elapsed_time:.2f}s: {e}")
            raise RuntimeError(f"Error en streaming con OpenAI: {e}") from e