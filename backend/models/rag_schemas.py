from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    workspace_id: Optional[str] = None
    conversation_id: Optional[str] = None
    limit: int = Field(5, ge=1, le=50)
    threshold: float = Field(0.0, ge=0.0, le=1.0)

    @validator('query')
    def query_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()

class RAGIngestRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    workspace_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None

    @validator('content')
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()

class IngestResponse(BaseModel):
    document_id: str
    chunks_count: int
    status: str

class BatchIngestRequest(BaseModel):
    documents: List[RAGIngestRequest]

class BatchIngestResponse(BaseModel):
    results: List[IngestResponse]
    total_processed: int
    total_chunks: int

class SearchResult(BaseModel):
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]
