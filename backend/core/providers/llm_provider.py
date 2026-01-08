"""
Abstract base class for LLM providers.
All LLM implementations must inherit from this class.
"""
from abc import ABC, abstractmethod
from typing import List, Generator
from models.schemas import DocumentChunk
from prompts.chat_prompts import RAG_SYSTEM_PROMPT_TEMPLATE


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    def generate_response(self, query: str, context_chunks: List[DocumentChunk], chat_history: List[dict] = None) -> str:
        """
        Generate a complete response for the given query and context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks for context
            chat_history: List of previous messages [{"role": "user", "content": "..."}]
            
        Returns:
            Complete response as string
        """
        pass
    
    @abstractmethod
    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk], chat_history: List[dict] = None) -> Generator[str, None, None]:
        """
        Generate a streaming response for the given query and context.
        
        Args:
            query: User's question
            context_chunks: Relevant document chunks for context
            chat_history: List of previous messages
            
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

        prompt = RAG_SYSTEM_PROMPT_TEMPLATE.format(
            context_string=context_string,
            query=query
        )
        return prompt
    