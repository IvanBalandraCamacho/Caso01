"""
Gemini 3 Pro LLM Provider.
Uses Google Generative AI API for Gemini 3 Pro model with thinking mode.
Optimizado para generación de documentos y propuestas comerciales.

Características:
- Thinking level: HIGH (razonamiento profundo)
- Temperature: 0 (determinístico, preciso)
- Recibe documentos crudos directamente (NO usa RAG)
"""

from typing import List, Generator, Optional
import time
from google import genai
from google.genai import types
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk
from core.config import settings
from core.gemini_usage_logger import log_gemini_usage, log_gemini_stream_start, log_gemini_stream_end, log_gemini_error
import logging

logger = logging.getLogger(__name__)


class Gemini3ProProvider(LLMProvider):
    """
    Provider para Gemini 3 Pro con thinking mode.
    
    Uso:
    - Generación de documentos (quick-analysis)
    - Propuestas comerciales detectadas en chat
    - Análisis profundo de RFPs
    
    NO usa RAG - recibe documentos crudos directamente.
    """
    
    def __init__(self):
        """Inicializar provider de Gemini 3 Pro."""
        self.model_name = settings.GEMINI_PRO_MODEL
        self.thinking_level = settings.GEMINI_PRO_THINKING_LEVEL
        self.temperature = settings.GEMINI_PRO_TEMPERATURE
        self.max_tokens = settings.GEMINI_PRO_MAX_TOKENS
        
        # Inicializar cliente de Gemini
        if not settings.GOOGLE_API_KEY:
            raise RuntimeError("GOOGLE_API_KEY no configurado")
        
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        
        logger.info(f"✅ Gemini 3 Pro Provider inicializado: {self.model_name}")
        logger.info(f"   Thinking level: {self.thinking_level}, Temperature: {self.temperature}")
    
    def _get_thinking_config(self) -> types.ThinkingConfig:
        """Obtiene la configuración de thinking mode."""
        thinking_map = {
            "OFF": types.ThinkingConfig(thinking_budget=0),
            "LOW": types.ThinkingConfig(thinking_budget=1024),
            "MEDIUM": types.ThinkingConfig(thinking_budget=8192),
            "HIGH": types.ThinkingConfig(thinking_budget=24576),
        }
        return thinking_map.get(self.thinking_level, thinking_map["HIGH"])
    
    def generate_response(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk] = None, 
        chat_history: List[dict] = None,
        raw_document: str = None
    ) -> str:
        """
        Generate a complete response for document generation tasks.
        
        Args:
            query: User's request/instructions
            context_chunks: NOT USED - this provider receives raw documents
            chat_history: List of previous messages (optional)
            raw_document: Raw document content to analyze
            
        Returns:
            Complete response as string
        """
        start_time = time.time()
        try:
            # Build prompt with raw document (no RAG)
            prompt_parts = []
            
            # Add raw document if provided
            if raw_document:
                prompt_parts.append(f"--- DOCUMENTO A ANALIZAR ---\n{raw_document}\n--- FIN DEL DOCUMENTO ---\n")
            
            # Add chat history if exists
            if chat_history:
                prompt_parts.append("--- HISTORIAL DE CONVERSACIÓN ---")
                for msg in chat_history[-5:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    prompt_parts.append(f"{role.upper()}: {content}")
                prompt_parts.append("--- FIN DEL HISTORIAL ---\n")
            
            # Add user query
            prompt_parts.append(f"INSTRUCCIONES DEL USUARIO:\n{query}")
            
            full_prompt = "\n\n".join(prompt_parts)
            
            # Generate with thinking mode
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                    thinking_config=self._get_thinking_config(),
                ),
            )
            
            # Log usage
            duration_ms = int((time.time() - start_time) * 1000)
            log_gemini_usage(
                model=self.model_name,
                operation="document_analysis",
                response=response,
                prompt=full_prompt,
                duration_ms=duration_ms
            )
            
            # Extract text from response parts (skip thinking parts)
            result_text = ""
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        # Skip thinking thoughts (they have 'thought' attribute)
                        if not hasattr(part, 'thought') or not part.thought:
                            result_text += part.text
            
            return result_text.strip() if result_text else ""
            
        except Exception as e:
            log_gemini_error(self.model_name, "document_analysis", e)
            raise
    
    def generate_response_stream(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk] = None, 
        chat_history: List[dict] = None,
        raw_document: str = None
    ) -> Generator[str, None, None]:
        """
        Generate a streaming response for document generation tasks.
        
        Args:
            query: User's request/instructions
            context_chunks: NOT USED - this provider receives raw documents
            chat_history: List of previous messages (optional)
            raw_document: Raw document content to analyze
            
        Yields:
            Response chunks as they are generated (excludes thinking)
        """
        start_time = time.time()
        output_tokens_estimate = 0
        
        try:
            # Build prompt with raw document (no RAG)
            prompt_parts = []
            
            if raw_document:
                prompt_parts.append(f"--- DOCUMENTO A ANALIZAR ---\n{raw_document}\n--- FIN DEL DOCUMENTO ---\n")
            
            if chat_history:
                prompt_parts.append("--- HISTORIAL DE CONVERSACIÓN ---")
                for msg in chat_history[-5:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    prompt_parts.append(f"{role.upper()}: {content}")
                prompt_parts.append("--- FIN DEL HISTORIAL ---\n")
            
            prompt_parts.append(f"INSTRUCCIONES DEL USUARIO:\n{query}")
            
            full_prompt = "\n\n".join(prompt_parts)
            
            # Log stream start
            log_gemini_stream_start(self.model_name, "document_stream", full_prompt)
            
            # Estimate input tokens (rough: 4 chars = 1 token)
            input_tokens_estimate = len(full_prompt) // 4
            
            # Generate with streaming and thinking mode
            response_stream = self.client.models.generate_content_stream(
                model=self.model_name,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                    thinking_config=self._get_thinking_config(),
                ),
            )
            
            for chunk in response_stream:
                if chunk.candidates:
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, 'text') and part.text:
                            # Skip thinking thoughts
                            if not hasattr(part, 'thought') or not part.thought:
                                output_tokens_estimate += len(part.text) // 4
                                yield part.text
            
            # Log stream end
            duration_ms = int((time.time() - start_time) * 1000)
            log_gemini_stream_end(
                model=self.model_name,
                operation="document_stream",
                input_tokens=input_tokens_estimate,
                output_tokens=output_tokens_estimate,
                duration_ms=duration_ms
            )
            
        except Exception as e:
            log_gemini_error(self.model_name, "document_stream", e)
            yield f"Error: {str(e)}"
    
    def generate_document(
        self,
        document_type: str,
        raw_document: str,
        instructions: str = None,
        output_format: str = "markdown"
    ) -> str:
        """
        Genera un documento estructurado basado en el documento fuente.
        
        Args:
            document_type: Tipo de documento a generar (proposal, analysis, summary, etc.)
            raw_document: Contenido del documento fuente
            instructions: Instrucciones adicionales del usuario
            output_format: Formato de salida (markdown, html, plain)
            
        Returns:
            Documento generado
        """
        prompt = f"""Eres un experto en análisis y generación de documentos empresariales para TIVIT.

TAREA: Generar un documento de tipo "{document_type}" basado en el documento proporcionado.

FORMATO DE SALIDA: {output_format}

{f'INSTRUCCIONES ADICIONALES: {instructions}' if instructions else ''}

Genera el documento de manera profesional, estructurada y completa.
Extrae TODOS los datos relevantes del documento fuente.
NO inventes información que no esté en el documento."""

        logger.info(f"🔷 GEMINI PRO [generate_document] - Tipo: {document_type}")
        
        return self.generate_response(
            query=prompt,
            raw_document=raw_document
        )
