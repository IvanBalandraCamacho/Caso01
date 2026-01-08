import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Any
from core.config import settings
from core.auth import get_current_active_user
from models import rag_schemas
from models.user import User

router = APIRouter()

# Helper function to forward requests
async def forward_request(method: str, path: str, json_data: Any = None, timeout: float = 60.0):
    url = f"{settings.RAG_SERVICE_URL}{path}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(method, url, json=json_data, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except httpx.RequestError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"RAG Service unavailable: {str(e)}")

@router.post("/ingest_text", response_model=rag_schemas.IngestResponse)
async def ingest_text(
    request: rag_schemas.RAGIngestRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Proxy to RAG Service: Ingest text content.
    """
    return await forward_request("POST", "/ingest_text", request.model_dump(), timeout=settings.RAG_SERVICE_TIMEOUT)

@router.post("/ingest_batch", response_model=rag_schemas.BatchIngestResponse)
async def ingest_batch(
    request: rag_schemas.BatchIngestRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Proxy to RAG Service: Batch ingest documents.
    """
    return await forward_request("POST", "/ingest_batch", request.model_dump(), timeout=settings.RAG_SERVICE_TIMEOUT)

@router.post("/search", response_model=List[rag_schemas.SearchResult])
async def search_documents(
    request: rag_schemas.SearchRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Proxy to RAG Service: Search documents.
    """
    return await forward_request("POST", "/search", request.model_dump())

@router.delete("/delete/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Proxy to RAG Service: Delete document.
    """
    return await forward_request("DELETE", f"/delete/{document_id}")

@router.get("/health")
async def health_check(
    current_user: User = Depends(get_current_active_user)
):
    """
    Proxy to RAG Service: Health check.
    """
    return await forward_request("GET", "/health")
