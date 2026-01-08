from typing import List, Generator
import vertexai
from vertexai.generative_models import GenerativeModel, ChatSession, HarmCategory, HarmBlockThreshold
from core.providers import LLMProvider
from core.config import settings
from models.schemas import DocumentChunk
import logging

logger = logging.getLogger(__name__)

class VertexAIProvider(LLMProvider):
    def __init__(self, project_id: str, location: str = "us-central1", model_name: str = "gemini-1.5-pro-preview-0409"):
        self.model_name = model_name
        self.project_id = project_id
        self.location = location
        
        try:
            vertexai.init(project=project_id, location=location)
            self.model = GenerativeModel(model_name)
            logger.info(f"✅ Vertex AI initialized with model: {model_name}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Vertex AI: {e}")
            raise e

    def _format_context(self, context_chunks: List[DocumentChunk]) -> str:
        if not context_chunks:
            return ""
        
        context_text = "\n\n".join([
            f"Content: {chunk.chunk_text}\nSource: {chunk.document_id}" 
            for chunk in context_chunks
        ])
        
        return f"""
        Use the following retrieved context to answer the question. 
        If the answer is not in the context, say you don't know.
        
        Context:
        {context_text}
        """

    def generate_response(self, query: str, context_chunks: List[DocumentChunk], chat_history: List[dict] = None) -> str:
        context_str = self._format_context(context_chunks)
        full_prompt = f"{context_str}\n\nQuestion: {query}"
        
        # Simple generation for now, ignoring chat history for single-turn RAG mostly
        # To support history, we would structure it as Content objects
        
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Vertex AI generation error: {e}")
            return "Lo siento, tuve un problema generando la respuesta con Vertex AI."

    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk], chat_history: List[dict] = None) -> Generator[str, None, None]:
        context_str = self._format_context(context_chunks)
        full_prompt = f"{context_str}\n\nQuestion: {query}"
        
        try:
            responses = self.model.generate_content(full_prompt, stream=True)
            for response in responses:
                yield response.text
        except Exception as e:
            logger.error(f"Vertex AI streaming error: {e}")
            yield "Error generando respuesta."
