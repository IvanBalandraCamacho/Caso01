"""
Abstract base class for LLM providers.
All LLM implementations must inherit from this class.
"""
from abc import ABC, abstractmethod
from typing import List, Generator
from models.schemas import DocumentChunk


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    def generate_response(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """
        Generate a complete response for the given query and context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks for context
            
        Returns:
            Complete response as string
        """
        pass
    
    @abstractmethod
    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk]) -> Generator[str, None, None]:
        """
        Generate a streaming response for the given query and context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks for context
            
        Yields:
            Response chunks as they are generated
        """
        pass
    
    def _build_prompt(self, query: str, context_chunks: List[DocumentChunk]) -> str:
        """
        Build the prompt with context and query.
        Can be overridden by subclasses for custom prompt formatting.
        """
        if context_chunks:
            context_string = "=== CONTEXTO DE LOS DOCUMENTOS ===\n\n"
            for i, chunk in enumerate(context_chunks):
                score = getattr(chunk, "score", 0.0)
                context_string += f"📄 Fragmento {i+1} (Relevancia: {score:.2f}):\n"
                context_string += chunk.chunk_text.strip() + "\n"
                context_string += "\n" + ("=" * 80) + "\n\n"
        else:
            context_string = "=== CONTEXTO ===\nNo hay documentos disponibles para esta consulta.\n\n"

        prompt = f"""Eres un asistente de IA profesional, preciso y detallado especializado en análisis de documentos.

{context_string}

=== PREGUNTA DEL USUARIO ===
{query}

=== INSTRUCCIONES ===
- Responde usando solo la información provista en el contexto cuando exista.
- Organiza la respuesta en secciones claras; usa listas cuando sea apropiado.
- Proporciona recomendaciones accionables si corresponde.

=== RESPUESTA ===
"""
        return prompt
    