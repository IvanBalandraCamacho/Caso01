"""
Cliente HTTP para el servicio RAG externo (RECOMMENDATION CORE SERVICE)

Este módulo proporciona una interfaz para comunicarse con el servicio RAG externo
que maneja la búsqueda semántica, ingesta de documentos y embeddings.

TODO: Completar cuando el servicio RAG externo esté disponible
- Actualizar URLs de endpoints
- Ajustar schemas de request/response según API real
- Configurar autenticación (API key, OAuth, etc.)
"""

import httpx
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging
from core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMAS - Ajustar según API del servicio RAG externo
# ============================================================================

class RAGSearchRequest(BaseModel):
    """Request para búsqueda semántica en RAG externo"""
    query: str
    workspace_id: str
    filters: Optional[Dict] = None
    top_k: int = 10


class RAGSearchResult(BaseModel):
    """Resultado individual de búsqueda RAG"""
    chunk_id: str
    document_id: str
    content: str
    score: float
    metadata: Optional[Dict] = None


class RAGIngestRequest(BaseModel):
    """Request para ingesta de documento en RAG externo"""
    document_id: str
    workspace_id: str
    content: str
    metadata: Dict


class RAGIngestResponse(BaseModel):
    """Response de ingesta de documento"""
    status: str
    chunks_created: int
    message: Optional[str] = None


# ============================================================================
# CLIENTE RAG
# ============================================================================

class RAGClient:
    """
    Cliente para comunicarse con el servicio RAG externo.
    
    Proporciona métodos para:
    - Búsqueda semántica de chunks relevantes
    - Ingesta de documentos para procesamiento
    - Eliminación de documentos del índice vectorial
    
    TODO: Actualizar base_url cuando el servicio esté desplegado
    """
    
    def __init__(
        self, 
        base_url: str = None,
        api_key: str = None,
        timeout: int = 30
    ):
        """
        Inicializa el cliente RAG.
        
        Args:
            base_url: URL base del servicio RAG (ej: http://rag-service:8080)
            api_key: API key para autenticación (opcional)
            timeout: Timeout en segundos para requests HTTP
        """
        # TODO: Actualizar con la URL real del servicio
        self.base_url = (base_url or settings.RAG_SERVICE_URL).rstrip('/')
        self.timeout = timeout
        
        # Headers comunes
        self.headers = {
            "Content-Type": "application/json"
        }
        
        # TODO: Configurar autenticación según el servicio RAG
        if api_key or settings.RAG_SERVICE_API_KEY:
            self.headers["Authorization"] = f"Bearer {api_key or settings.RAG_SERVICE_API_KEY}"
        
        # Cliente HTTP asíncrono
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers=self.headers
        )
        
        logger.info(f"RAG_CLIENT: Inicializado con base_url={self.base_url}")
    
    async def search(
        self, 
        query: str, 
        workspace_id: str,
        filters: Optional[Dict] = None,
        top_k: int = 10
    ) -> List[RAGSearchResult]:
        """
        Busca chunks relevantes en el servicio RAG externo.
        
        Args:
            query: Consulta de búsqueda semántica
            workspace_id: ID del workspace para filtrar resultados
            filters: Filtros adicionales (ej: fecha, categoría)
            top_k: Número máximo de resultados a retornar
            
        Returns:
            Lista de resultados ordenados por relevancia (score descendente)
            
        Raises:
            RuntimeError: Si hay error de comunicación con el servicio
            
        Example:
            >>> results = await rag_client.search(
            ...     query="¿Cuál es el presupuesto?",
            ...     workspace_id="workspace-123",
            ...     top_k=5
            ... )
            >>> for result in results:
            ...     print(f"Score: {result.score}, Content: {result.content[:50]}")
        """
        try:
            request_data = RAGSearchRequest(
                query=query,
                workspace_id=workspace_id,
                filters=filters or {},
                top_k=top_k
            )
            
            logger.info(f"RAG_CLIENT: Buscando '{query[:50]}...' en workspace {workspace_id}")
            
            # TODO: Ajustar endpoint según API real
            endpoint = f"{self.base_url}/api/v1/search"
            
            response = await self.client.post(
                endpoint,
                json=request_data.dict()
            )
            response.raise_for_status()
            
            data = response.json()
            
            # TODO: Ajustar parsing según estructura de respuesta real
            results = [RAGSearchResult(**item) for item in data.get('results', [])]
            
            logger.info(f"RAG_CLIENT: {len(results)} resultados encontrados")
            return results
            
        except httpx.TimeoutException:
            logger.error(f"RAG_CLIENT: Timeout al buscar en servicio RAG")
            raise RuntimeError("Servicio RAG no responde (timeout)")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"RAG_CLIENT: HTTP {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"Error en servicio RAG: {e.response.status_code}")
            
        except Exception as e:
            logger.error(f"RAG_CLIENT: Error inesperado: {str(e)}")
            raise RuntimeError(f"Error conectando con servicio RAG: {str(e)}")
    
    async def ingest_document(
        self,
        document_id: str,
        workspace_id: str,
        content: str,
        metadata: Dict
    ) -> RAGIngestResponse:
        """
        Envía documento al servicio RAG para procesamiento e indexación.
        
        El servicio RAG se encargará de:
        1. Dividir el documento en chunks
        2. Crear embeddings de cada chunk
        3. Indexar en base de datos vectorial
        
        Args:
            document_id: ID único del documento
            workspace_id: ID del workspace al que pertenece
            content: Contenido completo del documento (texto extraído)
            metadata: Metadata adicional (filename, file_type, etc.)
            
        Returns:
            Respuesta con status y número de chunks creados
            
        Raises:
            RuntimeError: Si hay error en el procesamiento
            
        Example:
            >>> response = await rag_client.ingest_document(
            ...     document_id="doc-123",
            ...     workspace_id="workspace-123",
            ...     content="Contenido del documento...",
            ...     metadata={"filename": "reporte.pdf", "file_type": "pdf"}
            ... )
            >>> print(f"Chunks creados: {response.chunks_created}")
        """
        try:
            request_data = RAGIngestRequest(
                document_id=document_id,
                workspace_id=workspace_id,
                content=content,
                metadata=metadata
            )
            
            logger.info(f"RAG_CLIENT: Enviando documento {document_id} para ingesta")
            
            # TODO: Ajustar endpoint según API real
            endpoint = f"{self.base_url}/api/v1/ingest"
            
            response = await self.client.post(
                endpoint,
                json=request_data.dict()
            )
            response.raise_for_status()
            
            result = RAGIngestResponse(**response.json())
            
            logger.info(f"RAG_CLIENT: Documento {document_id} procesado - {result.chunks_created} chunks")
            return result
            
        except httpx.TimeoutException:
            logger.error(f"RAG_CLIENT: Timeout en ingesta de documento {document_id}")
            raise RuntimeError("Servicio RAG no responde (timeout en ingesta)")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"RAG_CLIENT: Error HTTP en ingesta - {e.response.status_code}")
            raise RuntimeError(f"Error ingesta RAG: {e.response.status_code}")
            
        except Exception as e:
            logger.error(f"RAG_CLIENT: Error en ingesta: {str(e)}")
            raise RuntimeError(f"Error ingesta RAG: {str(e)}")
    
    async def delete_document(self, document_id: str) -> bool:
        """
        Elimina documento del índice vectorial del servicio RAG.
        
        Args:
            document_id: ID del documento a eliminar
            
        Returns:
            True si se eliminó correctamente, False en caso contrario
            
        Example:
            >>> success = await rag_client.delete_document("doc-123")
            >>> if success:
            ...     print("Documento eliminado del índice RAG")
        """
        try:
            # TODO: Ajustar endpoint según API real
            endpoint = f"{self.base_url}/api/v1/documents/{document_id}"
            
            logger.info(f"RAG_CLIENT: Eliminando documento {document_id}")
            
            response = await self.client.delete(endpoint)
            response.raise_for_status()
            
            logger.info(f"RAG_CLIENT: Documento {document_id} eliminado correctamente")
            return True
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"RAG_CLIENT: Documento {document_id} no encontrado en RAG")
                return False
            logger.error(f"RAG_CLIENT: Error eliminando documento - {e.response.status_code}")
            return False
            
        except Exception as e:
            logger.error(f"RAG_CLIENT: Error eliminando documento: {str(e)}")
            return False
    
    async def health_check(self) -> Dict:
        """
        Verifica el estado del servicio RAG externo.
        
        Returns:
            Dict con status del servicio
            
        Example:
            >>> health = await rag_client.health_check()
            >>> print(health)
            {'status': 'ok', 'version': '1.0.0'}
        """
        try:
            # TODO: Ajustar endpoint según API real
            endpoint = f"{self.base_url}/health"
            
            response = await self.client.get(endpoint)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"RAG_CLIENT: Health check falló: {str(e)}")
            return {"status": "error", "detail": str(e)}
    
    async def close(self):
        """Cierra la conexión HTTP del cliente."""
        await self.client.aclose()
        logger.info("RAG_CLIENT: Conexión cerrada")


# ============================================================================
# INSTANCIA GLOBAL (Singleton)
# ============================================================================

# TODO: Descomentar cuando el servicio RAG esté disponible
# rag_client = RAGClient()

# Mientras tanto, usar None y manejar en el código
rag_client = None

logger.info("RAG_CLIENT: Módulo cargado (servicio RAG externo pendiente)")
