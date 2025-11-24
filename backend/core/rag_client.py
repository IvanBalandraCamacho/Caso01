"""
Cliente HTTP para el servicio RAG (Retrieval-Augmented Generation)

Este módulo proporciona una interfaz completa para comunicarse con el servicio RAG
que maneja la búsqueda semántica, ingesta de documentos y gestión de embeddings.
"""

import httpx
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import logging
import json
from core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMAS - Compatibles con el servicio RAG implementado
# ============================================================================

class DocumentMetadata(BaseModel):
    filename: str
    content_type: Optional[str] = None  # Hacerlo opcional para compatibilidad
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None

class SearchResult(BaseModel):
    """Resultado de una búsqueda en el servicio RAG"""
    document_id: str
    content: str
    score: float
    metadata: Optional[Dict[str, Any]] = None

class SearchRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None
    limit: int = 5
    threshold: float = 0.7

class RAGIngestRequest(BaseModel):
    document_id: str
    workspace_id: str
    content: str
    metadata: Dict[str, Any]


class SearchResult(BaseModel):
    """Resultado de búsqueda del servicio RAG."""
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]


class IngestResponse(BaseModel):
    """Respuesta del servicio RAG al indexar contenido."""
    document_id: str
    chunks_count: int
    status: str
    message: Optional[str] = None


# ============================================================================
# CLIENTE RAG - IMPLEMENTACIÓN COMPLETA
# ============================================================================

class RAGClient:
    """
    Cliente completo para el servicio RAG.

    Proporciona métodos para:
    - Búsqueda semántica de documentos relevantes
    - Ingesta de documentos para procesamiento e indexación
    - Eliminación de documentos del índice
    - Verificación de salud del servicio
    """

    def __init__(
        self,
        base_url: str = None,
        api_key: str = None,
        timeout: float = 30.0
    ):
        """
        Inicializa el cliente RAG.

        Args:
            base_url: URL base del servicio RAG
            api_key: API key para autenticación (opcional)
            timeout: Timeout en segundos para requests HTTP
        """
        self.base_url = (base_url or settings.RAG_SERVICE_URL).rstrip('/')
        self.api_key = api_key or settings.RAG_SERVICE_API_KEY
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

        logger.info(f"RAG_CLIENT: Inicializado con base_url={self.base_url}")

    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene o crea un cliente HTTP async"""
        if self._client is None:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"

            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers=headers
            )
        return self._client

    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Hace una petición HTTP al servicio RAG"""
        client = await self._get_client()
        url = f"{self.base_url}{endpoint}"

        try:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"RAG HTTP error {e.response.status_code}: {e.response.text}")
            raise Exception(f"RAG service error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"RAG request error: {e}")
            raise Exception(f"RAG service unavailable: {e}")
        except Exception as e:
            logger.error(f"RAG unexpected error: {e}")
            raise Exception(f"RAG service error: {e}")

    async def search(
        self,
        query: str,
        workspace_id: Optional[str] = None,
        limit: int = 5,
        threshold: float = 0.7
    ) -> List[SearchResult]:
        """
        Busca documentos relevantes para una consulta.

        Args:
            query: Texto de búsqueda
            workspace_id: ID del workspace (opcional, para filtrar)
            limit: Número máximo de resultados
            threshold: Umbral mínimo de similitud

        Returns:
            Lista de resultados de búsqueda ordenados por score
        """
        try:
            payload = {
                "query": query,
                "limit": limit,
                "threshold": threshold
            }
            if workspace_id:
                payload["workspace_id"] = workspace_id

            response_data = await self._make_request("POST", "/search", json=payload)

            # Convertir respuesta a objetos SearchResult
            results = []
            for item in response_data:
                result = SearchResult(
                    document_id=item["document_id"],
                    content=item["content"],
                    metadata=item["metadata"],  # Mantener como dict
                    score=item["score"]
                )
                results.append(result)

            logger.info(f"RAG search: {len(results)} results for '{query[:50]}...'")
            return results

        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return []  # Retornar lista vacía en caso de error

    async def ingest_text_content(
        self,
        document_id: str,
        workspace_id: str,
        content: str,
        metadata: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Optional[IngestResponse]:
        """
        Indexa contenido de texto directamente en el servicio RAG.

        Args:
            document_id: ID único del documento
            workspace_id: ID del workspace
            content: Contenido de texto a indexar
            metadata: Metadata adicional
            user_id: ID del usuario (opcional)

        Returns:
            Respuesta de ingestión o None si falla
        """
        try:
            payload = {
                "document_id": document_id,
                "workspace_id": workspace_id,
                "content": content,
                "metadata": metadata,
                "user_id": user_id
            }

            response_data = await self._make_request("POST", "/ingest_text", json=payload)
            result = IngestResponse(**response_data)
            logger.info(f"RAG ingest text: {result.document_id} with {result.chunks_count} chunks")
            return result

        except Exception as e:
            logger.error(f"RAG ingest text error: {e}")
            return None

    async def delete_document(self, document_id: str) -> bool:
        """
        Elimina un documento del servicio RAG.

        Args:
            document_id: ID del documento a eliminar

        Returns:
            True si se eliminó correctamente
        """
        try:
            response_data = await self._make_request("DELETE", f"/delete/{document_id}")
            success = response_data.get("status") == "success"
            if success:
                logger.info(f"RAG delete: {document_id} deleted successfully")
            return success

        except Exception as e:
            logger.error(f"RAG delete error for {document_id}: {e}")
            return False

    async def health_check(self) -> Dict[str, Any]:
        """
        Verifica el estado del servicio RAG.

        Returns:
            Dict con información de salud del servicio
        """
        try:
            response_data = await self._make_request("GET", "/health")
            return response_data
        except Exception as e:
            logger.error(f"RAG health check failed: {e}")
            return {"status": "error", "detail": str(e)}

    async def close(self):
        """Cierra la conexión HTTP del cliente."""
        if self._client:
            await self._client.aclose()
            self._client = None
        logger.info("RAG_CLIENT: Conexión cerrada")


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================

rag_client = RAGClient(
    base_url=settings.RAG_SERVICE_URL,
    api_key=settings.RAG_SERVICE_API_KEY,
    timeout=settings.RAG_SERVICE_TIMEOUT
)

logger.info("RAG_CLIENT: Cliente activado con configuración completa")
