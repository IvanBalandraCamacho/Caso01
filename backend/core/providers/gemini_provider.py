"""
Google Gemini LLM Provider.
Uses Google's Generative AI API (Gemini 2.0).
"""
import time
from typing import List, Generator
import google.generativeai as genai
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk


class GeminiProvider(LLMProvider):
    """Google Gemini provider implementation."""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        """
        Initialize Gemini provider.
        
        Args:
            api_key: Google API key
            model_name: Gemini model to use
        """
        print(f"GEMINI_PROVIDER: Configurando cliente con modelo {model_name}...")
        genai.configure(api_key=api_key)
        
        generation_config = {
            "temperature": 0.8,
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }
        
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
        
        try:
            self.model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=generation_config,
                safety_settings=safety_settings,
            )
            print("GEMINI_PROVIDER: Modelo cargado correctamente.")
        except Exception as e:
            print(f"GEMINI_PROVIDER ERROR: {e}")
            raise RuntimeError(f"No se pudo inicializar Gemini: {e}")
    
    def generate_response(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """Generate a complete response using Gemini."""
        prompt = self._build_prompt(query, context_chunks)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt)
                text = getattr(response, "text", None)
                if not text:
                    raise ValueError("Respuesta vacía del modelo")
                return text
            except Exception as e:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Fallo al generar respuesta con Gemini: {e}") from e
                time.sleep(1)
    
    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk]) -> Generator[str, None, None]:
        """Generate a streaming response using Gemini."""
        prompt = self._build_prompt(query, context_chunks)
        
        try:
            stream = self.model.generate_content(prompt, stream=True)
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yield text
        except Exception as e:
            raise RuntimeError(f"Error en streaming con Gemini: {e}") from e
