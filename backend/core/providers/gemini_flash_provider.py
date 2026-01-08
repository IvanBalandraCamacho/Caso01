"""
Gemini 2.0 Flash LLM Provider.
Uses Google Generative AI API for Gemini 2.0 Flash model.
"""

from typing import List, Generator
import google.generativeai as genai
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk
from core.config import settings
from core.gcp_service import gcp_service
import logging

logger = logging.getLogger(__name__)


class GeminiFlashProvider(LLMProvider):
    """Provider para Gemini 2.0 Flash."""
    
    def __init__(self):
        """Inicializar provider de Gemini."""
        self.model_name = settings.GEMINI_MODEL
        self.temperature = settings.GEMINI_TEMPERATURE
        self.max_tokens = settings.GEMINI_MAX_TOKENS
        logger.info(f"✅ Gemini Flash Provider inicializado: {self.model_name}")
    
    def generate_response(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk], 
        chat_history: List[dict] = None
    ) -> str:
        """
        Generate a complete response for the given query and context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks for context
            chat_history: List of previous messages
            
        Returns:
            Complete response as string
        """
        try:
            model = gcp_service.get_gemini_model(self.model_name)
            
            # Build prompt with context
            prompt = self._build_prompt(query, context_chunks)
            
            # Add chat history if exists
            full_prompt = []
            if chat_history:
                for msg in chat_history[-5:]:  # Last 5 messages
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    full_prompt.append(f"{role.upper()}: {content}")
            
            full_prompt.append(f"USER: {prompt}")
            
            # Generate
            response = model.generate_content(
                "\n\n".join(full_prompt),
                generation_config=genai.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                ),
            )
            
            return response.text if response.text else ""
            
        except Exception as e:
            logger.error(f"❌ Error en Gemini Flash: {e}")
            raise
    
    def generate_response_stream(
        self, 
        query: str, 
        context_chunks: List[DocumentChunk], 
        chat_history: List[dict] = None
    ) -> Generator[str, None, None]:
        """
        Generate a streaming response for the given query and context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks for context
            chat_history: List of previous messages
            
        Yields:
            Response chunks as they are generated
        """
        try:
            model = gcp_service.get_gemini_model(self.model_name)
            
            # Build prompt with context
            prompt = self._build_prompt(query, context_chunks)
            
            # Add chat history if exists
            full_prompt = []
            if chat_history:
                for msg in chat_history[-5:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    full_prompt.append(f"{role.upper()}: {content}")
            
            full_prompt.append(f"USER: {prompt}")
            
            # Generate with streaming
            response = model.generate_content(
                "\n\n".join(full_prompt),
                generation_config=genai.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                ),
                stream=True
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
            
        except Exception as e:
            logger.error(f"❌ Error en Gemini Flash streaming: {e}")
            yield f"Error: {str(e)}"
