"""
RAG Service API
"""

import os
import uuid
import logging
import tempfile
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Import the new VectorStore module
from vector_store import vector_store

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="RAG Service API",
    description="RAG Service for semantic search (Qdrant + Local Embeddings)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    workspace_id: Optional[str] = None
    conversation_id: Optional[str] = None
    limit: int = Field(5, ge=1, le=50)
    threshold: float = Field(0.0, ge=0.0, le=1.0) # Default 0.0 for cosine similarity

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
    conversation_id: Optional[str] = None # Added to support conversation-specific docs

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

# Utils
# deolver a 512 y 50, cambiado por prueba de consumo de tokens y mejora de respuestas (codigo mirai)
def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """Smart chunking with langchain (using smaller chunks for local models)"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len
    )
    return text_splitter.split_text(text)

# Endpoints
@app.post("/ingest_text", response_model=IngestResponse)
async def ingest_text_content(
    request: Request,
    rag_request: RAGIngestRequest
):
    """Index text content"""
    try:
        text_content = rag_request.content
        chunks = chunk_text(text_content)
        
        documents_to_upsert = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{rag_request.document_id}_chunk_{i}"
            
            metadata = {
                "conversation_id": None,
                **rag_request.metadata,
                "workspace_id": rag_request.workspace_id,
                "chunk_index": i,
                "document_id": rag_request.document_id,
                "chunk_id": chunk_id
            }
            if rag_request.user_id:
                metadata["user_id"] = rag_request.user_id
            
            if rag_request.conversation_id: # If passed in metadata
                 metadata["conversation_id"] = rag_request.conversation_id

            documents_to_upsert.append({
                "content": chunk,
                "metadata": metadata
            })

        count = vector_store.upsert_documents(documents_to_upsert)

        logger.info(f"Indexed doc {rag_request.document_id} with {count} chunks")

        return IngestResponse(
            document_id=rag_request.document_id,
            chunks_count=count,
            status="success"
        )

    except Exception as e:
        logger.error(f"Index error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest_batch", response_model=BatchIngestResponse)
async def ingest_batch(request: Request, batch_request: BatchIngestRequest):
    """Batch index documents"""
    try:
        results = []
        total_chunks = 0
        
        for doc_request in batch_request.documents:
            try:
                chunks = chunk_text(doc_request.content)
                documents_to_upsert = []
                
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{doc_request.document_id}_chunk_{i}"
                    metadata = {
                        "conversation_id": None,
                        **doc_request.metadata,
                        "workspace_id": doc_request.workspace_id,
                        "chunk_index": i,
                        "document_id": doc_request.document_id,
                        "chunk_id": chunk_id
                    }
                    if doc_request.user_id:
                        metadata["user_id"] = doc_request.user_id
                    
                    documents_to_upsert.append({
                        "content": chunk,
                        "metadata": metadata
                    })
                
                count = vector_store.upsert_documents(documents_to_upsert)
                total_chunks += count
                
                results.append(IngestResponse(
                    document_id=doc_request.document_id,
                    chunks_count=count,
                    status="success"
                ))
            except Exception as e:
                logger.error(f"Error processing doc {doc_request.document_id}: {e}")
                results.append(IngestResponse(
                    document_id=doc_request.document_id,
                    chunks_count=0,
                    status="error"
                ))
        
        return BatchIngestResponse(
            results=results,
            total_processed=len(results),
            total_chunks=total_chunks
        )
    
    except Exception as e:
        logger.error(f"Batch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=List[SearchResult])
async def search_documents(request: Request, search_request: SearchRequest):
    """Search documents"""
    try:
        results = vector_store.search(
            query=search_request.query,
            workspace_id=search_request.workspace_id,
            conversation_id=search_request.conversation_id,
            limit=search_request.limit,
            threshold=search_request.threshold
        )

        return [SearchResult(**r) for r in results]

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete/{document_id}")
async def delete_document(request: Request, document_id: str):
    """Delete document"""
    try:
        vector_store.delete_document(document_id)
        return {"status": "success", "message": f"Document {document_id} deleted"}
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check(request: Request):
    """Health check"""
    try:
        # Check Qdrant connection via vector_store
        vector_store.client.get_collections()
        return {"status": "healthy", "service": "RAG Service (Qdrant + Local Embeddings)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
