"""
OpenAI GPT Provider.
Uses OpenAI's API with GPT-4.1 nano model.
"""
from typing import List, Generator
from openai import OpenAI
from .llm_provider import LLMProvider
from models.schemas import DocumentChunk


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider implementation."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4.1-nano-2025-04-14"):
        """
        Initialize OpenAI provider.
        
        Args:
            api_key: OpenAI API key
            model_name: GPT model to use
        """
        print(f"OPENAI_PROVIDER: Configurando cliente con modelo {model_name}...")
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name
        print("OPENAI_PROVIDER: Cliente cargado correctamente.")
    
    def generate_response(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """Generate a complete response using OpenAI."""
        prompt = self._build_prompt(query, context_chunks)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente de IA profesional, preciso y detallado especializado en análisis de documentos."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=8192,
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"Fallo al generar respuesta con OpenAI: {e}") from e
    
    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk]) -> Generator[str, None, None]:
        """Generate a streaming response using OpenAI."""
        prompt = self._build_prompt(query, context_chunks)
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente de IA profesional, preciso y detallado especializado en análisis de documentos."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=8192,
                stream=True,
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            raise RuntimeError(f"Error en streaming con OpenAI: {e}") from e
