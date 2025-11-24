"""
OpenAI LLM Provider.
Compatible con modelos GPT-4, GPT-4o, GPT-3.5-turbo, etc.
"""
import time
from typing import List, Generator
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """
    OpenAI provider (GPT-4o-mini, GPT-4o, GPT-4, etc).
    
    Características:
    - Soporta GPT-4o-mini (rápido y económico)
    - Soporta GPT-4o (avanzado)
    - Soporta GPT-3.5-turbo
    - Streaming nativo
    """
    
    def __init__(self, api_key: str = None, model_name: str = "gpt-4o-mini"):
        """
        Inicializa el provider de OpenAI.
        
        Args:
            api_key: OpenAI API key
            model_name: Modelo a usar (gpt-4o-mini, gpt-4o, gpt-4, etc)
        """
        try:
            from openai import OpenAI
            
            self.client = OpenAI(
                api_key=api_key or settings.OPENAI_API_KEY,
            )
            self.model_name = model_name
            logger.info(f"✅ OpenAI Provider inicializado con {model_name}")
            
        except ImportError:
            raise ImportError(
                "OpenAI SDK no está instalado. "
                "Instala con: pip install openai"
            )
        except Exception as e:
            logger.error(f"❌ Error al inicializar OpenAI: {e}")
            raise RuntimeError(f"No se pudo inicializar OpenAI: {e}")
    
    def generate_response(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """
        Genera una respuesta completa usando OpenAI.
        
        Args:
            query: Pregunta o prompt del usuario
            context_chunks: Chunks de documentos para contexto (opcional)
            
        Returns:
            Respuesta generada
        """
        prompt = self._build_prompt(query, context_chunks)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "Eres un asistente experto en análisis de documentos y generación de propuestas comerciales."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4096,
                )
                
                return response.choices[0].message.content
                
            except Exception as e:
                logger.error(f"Error en OpenAI (intento {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Fallo al generar respuesta con OpenAI: {e}") from e
                time.sleep(1)
    
    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk]) -> Generator[str, None, None]:
        """
        Genera una respuesta en streaming usando OpenAI.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de documentos para contexto
            
        Yields:
            Fragmentos de texto de la respuesta
        """
        prompt = self._build_prompt(query, context_chunks)
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "Eres un asistente experto en análisis de documentos y generación de propuestas comerciales."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4096,
                stream=True,
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Error en streaming de OpenAI: {e}")
            raise RuntimeError(f"Error en streaming con OpenAI: {e}") from e
