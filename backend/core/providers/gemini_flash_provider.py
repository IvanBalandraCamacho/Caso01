"""
Gemini 3 Flash LLM Provider.
Uses Google Generative AI API for Gemini 3 Flash model with thinking mode.
Optimizado para chat, CopilotKit y tareas generales.

Características:
- Thinking level: MEDIUM (balance entre velocidad y razonamiento)
- Temperature: 1.5 (creativo)
- Usa RAG para contexto de documentos
- NO recibe archivos directamente
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


class Gemini3FlashProvider(LLMProvider):
    """
    Provider para Gemini 3 Flash con thinking mode.
    
    Uso:
    - CopilotKit
    - Chat común
    - Generar nombre del workspace
    - Resumen corto del workspace
    - Otras tareas generales
    
    SÍ usa RAG para obtener contexto de documentos.
    NO recibe archivos directamente.
    """
    
    def __init__(self):
        """Inicializar provider de Gemini 3 Flash."""
        self.model_name = settings.GEMINI_FLASH_MODEL
        self.thinking_level = settings.GEMINI_FLASH_THINKING_LEVEL
        self.temperature = settings.GEMINI_FLASH_TEMPERATURE
        self.max_tokens = settings.GEMINI_FLASH_MAX_TOKENS
        
        # Inicializar cliente de Gemini
        if not settings.GOOGLE_API_KEY:
            raise RuntimeError("GOOGLE_API_KEY no configurado")
        
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        
        logger.info(f"✅ Gemini 3 Flash Provider inicializado: {self.model_name}")
        logger.info(f"   Thinking level: {self.thinking_level}, Temperature: {self.temperature}")
    
    def _get_thinking_config(self) -> types.ThinkingConfig:
        """Obtiene la configuración de thinking mode."""
        thinking_map = {
            "OFF": types.ThinkingConfig(thinking_budget=0),
            "LOW": types.ThinkingConfig(thinking_budget=1024),
            "MEDIUM": types.ThinkingConfig(thinking_budget=8192),
            "HIGH": types.ThinkingConfig(thinking_budget=24576),
        }
        return thinking_map.get(self.thinking_level, thinking_map["MEDIUM"])
    
    def _build_prompt(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """
        Construye el prompt con contexto RAG.
        
        Args:
            query: Pregunta del usuario
            context_chunks: Chunks de documentos relevantes del RAG
            
        Returns:
            Prompt completo con contexto
        """
        prompt_parts = []
        
        # System instructions
        prompt_parts.append("""Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.
Tu objetivo es ayudar a analizar documentos, extraer datos y responder preguntas basándote en el contexto proporcionado.

REGLAS IMPORTANTES:
- Responde SOLO basándote en el contexto proporcionado
- Si no encuentras información relevante en el contexto, indícalo claramente
- NO inventes información que no esté en los documentos
- Sé conciso pero completo en tus respuestas
- Usa formato markdown para estructurar la respuesta cuando sea apropiado""")
        
        # RAG Context
        if context_chunks:
            prompt_parts.append("\n--- CONTEXTO DE DOCUMENTOS ---")
            for i, chunk in enumerate(context_chunks, 1):
                chunk_text = chunk.chunk_text if hasattr(chunk, 'chunk_text') else str(chunk)
                prompt_parts.append(f"[Documento {i}]:\n{chunk_text}")
            prompt_parts.append("--- FIN DEL CONTEXTO ---\n")
        else:
            prompt_parts.append("\n[Sin contexto de documentos disponible]\n")
        
        # User query
        prompt_parts.append(f"PREGUNTA DEL USUARIO:\n{query}")
        
        return "\n\n".join(prompt_parts)
    
    def generate_response(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk] = None, 
        chat_history: List[dict] = None
    ) -> str:
        """
        Generate a complete response using RAG context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks from RAG
            chat_history: List of previous messages
            
        Returns:
            Complete response as string
        """
        start_time = time.time()
        try:
            # Build prompt with RAG context
            prompt = self._build_prompt(query, context_chunks or [])
            
            # Add chat history if exists
            full_prompt = []
            if chat_history:
                for msg in chat_history[-5:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    full_prompt.append(f"{role.upper()}: {content}")
            
            full_prompt.append(f"USER: {prompt}")
            full_prompt_str = "\n\n".join(full_prompt)
            
            # Generate with thinking mode
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt_str,
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
                operation="chat",
                response=response,
                prompt=full_prompt_str,
                duration_ms=duration_ms
            )
            
            # Extract text from response parts (skip thinking parts)
            result_text = ""
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        if not hasattr(part, 'thought') or not part.thought:
                            result_text += part.text
            
            return result_text.strip() if result_text else ""
            
        except Exception as e:
            log_gemini_error(self.model_name, "chat", e)
            raise
    
    def generate_response_stream(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk] = None, 
        chat_history: List[dict] = None
    ) -> Generator[str, None, None]:
        """
        Generate a streaming response using RAG context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks from RAG
            chat_history: List of previous messages
            
        Yields:
            Response chunks as they are generated (excludes thinking)
        """
        start_time = time.time()
        output_tokens_estimate = 0
        
        try:
            # Build prompt with RAG context
            prompt = self._build_prompt(query, context_chunks or [])
            
            full_prompt = []
            if chat_history:
                for msg in chat_history[-5:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    full_prompt.append(f"{role.upper()}: {content}")
            
            full_prompt.append(f"USER: {prompt}")
            full_prompt_str = "\n\n".join(full_prompt)
            
            # Log stream start
            log_gemini_stream_start(self.model_name, "chat_stream", full_prompt_str)
            
            # Estimate input tokens (rough: 4 chars = 1 token)
            input_tokens_estimate = len(full_prompt_str) // 4
            
            # Generate with streaming and thinking mode
            response_stream = self.client.models.generate_content_stream(
                model=self.model_name,
                contents=full_prompt_str,
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
                operation="chat_stream",
                input_tokens=input_tokens_estimate,
                output_tokens=output_tokens_estimate,
                duration_ms=duration_ms
            )
            
        except Exception as e:
            log_gemini_error(self.model_name, "chat_stream", e)
            yield f"Error: {str(e)}"
    
    def generate_workspace_name(self, document_content: str) -> str:
        """
        Genera un nombre corto para el workspace basado en el documento.
        
        Args:
            document_content: Primeros 2000 caracteres del documento
            
        Returns:
            Nombre del workspace (máx 50 caracteres)
        """
        prompt = f"""Analiza el siguiente contenido y genera un nombre corto y descriptivo para un workspace.
El nombre debe tener máximo 50 caracteres y ser descriptivo del proyecto/RFP.

CONTENIDO:
{document_content[:2000]}

Responde SOLO con el nombre del workspace, sin explicaciones ni comillas."""

        start_time = time.time()
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=100,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),  # Sin thinking para velocidad
                ),
            )
            
            # Log usage
            duration_ms = int((time.time() - start_time) * 1000)
            log_gemini_usage(
                model=self.model_name,
                operation="workspace_name",
                response=response,
                prompt=prompt,
                duration_ms=duration_ms
            )
            
            result = ""
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        result += part.text
            
            return result.strip()[:50] if result else "Nuevo Workspace"
            
        except Exception as e:
            log_gemini_error(self.model_name, "workspace_name", e)
            return "Nuevo Workspace"
    
    def generate_workspace_summary(self, document_content: str) -> str:
        """
        Genera un resumen corto del workspace/documento.
        
        Args:
            document_content: Primeros 5000 caracteres del documento
            
        Returns:
            Resumen del workspace (máx 200 caracteres)
        """
        prompt = f"""Genera un resumen muy breve (máximo 200 caracteres) del siguiente documento.
El resumen debe capturar la esencia del proyecto/RFP.

CONTENIDO:
{document_content[:5000]}

Responde SOLO con el resumen, sin explicaciones."""

        start_time = time.time()
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.5,
                    max_output_tokens=150,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),  # Sin thinking para velocidad
                ),
            )
            
            # Log usage
            duration_ms = int((time.time() - start_time) * 1000)
            log_gemini_usage(
                model=self.model_name,
                operation="workspace_summary",
                response=response,
                prompt=prompt,
                duration_ms=duration_ms
            )
            
            result = ""
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        result += part.text
            
            return result.strip()[:200] if result else ""
            
        except Exception as e:
            log_gemini_error(self.model_name, "workspace_summary", e)
            return ""


# Alias para compatibilidad con código existente
GeminiFlashProvider = Gemini3FlashProvider
