"""
Servicio RAG (Retrieval-Augmented Generation)
API para indexación y búsqueda semántica de documentos
"""

import os
import json
import uuid
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

import redis
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from openai import OpenAI

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536

# Inicializar clientes
redis_client = redis.from_url(REDIS_URL)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# FastAPI app
app = FastAPI(
    title="RAG Service API",
    description="Servicio de Retrieval-Augmented Generation para búsqueda semántica",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class DocumentMetadata(BaseModel):
    filename: str
    content_type: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None

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
    user_id: Optional[str] = None

class IngestResponse(BaseModel):
    """Respuesta de indexación de contenido"""
    document_id: str
    chunks_count: int
    status: str
    message: Optional[str] = None

class SearchResult(BaseModel):
    """Resultado de búsqueda semántica"""
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]

# Utilidades
def get_embedding(text: str) -> List[float]:
    """Genera embedding para un texto usando OpenAI"""
    try:
        response = openai_client.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generando embedding: {e}")
        raise HTTPException(status_code=500, detail="Error generando embedding")

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calcula similitud coseno entre dos vectores"""
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Divide el texto en chunks con overlap"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
        if start >= len(text):
            break
    return chunks

def extract_text_from_file(file: UploadFile) -> str:
    """Extrae texto de diferentes tipos de archivos"""
    filename = file.filename.lower()

    if filename.endswith('.pdf'):
        # Para PDF usamos PyPDF2
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(file.file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text

    elif filename.endswith('.docx'):
        # Para DOCX usamos python-docx
        import docx
        doc = docx.Document(file.file)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text

    else:
        # Para otros archivos (TXT, etc.) leemos como texto
        content = file.file.read().decode('utf-8')
        return content

# Endpoints
@app.post("/ingest_text", response_model=IngestResponse)
async def ingest_text_content(
    request: RAGIngestRequest
):
    """Indexa contenido de texto directamente en el sistema RAG"""
    try:
        # Generar ID único para el documento
        document_id = str(uuid.uuid4())

        # Usar el contenido proporcionado
        text_content = request.content

        if not text_content.strip():
            raise HTTPException(status_code=400, detail="El contenido no puede estar vacío")

        # Dividir en chunks
        chunks = chunk_text(text_content)

        # Procesar cada chunk
        chunk_ids = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{document_id}_chunk_{i}"

            # Generar embedding
            embedding = get_embedding(chunk)

            # Guardar chunk en Redis
            # Filtrar valores None del metadata
            filtered_request_metadata = {k: v for k, v in request.metadata.items() if v is not None}
            
            metadata_dict = {
                **filtered_request_metadata,
                "workspace_id": request.workspace_id,
                "chunk_index": i
            }
            # Solo agregar user_id si no es None
            if request.user_id is not None:
                metadata_dict["user_id"] = request.user_id
            
            chunk_data = {
                "document_id": document_id,
                "chunk_id": chunk_id,
                "content": chunk,
                "embedding": json.dumps(embedding),
                "metadata": json.dumps(metadata_dict)
            }

            redis_client.hset(f"chunk:{chunk_id}", mapping=chunk_data)
            chunk_ids.append(chunk_id)

        # Guardar metadata del documento
        # Filtrar valores None del metadata
        filtered_metadata = {k: v for k, v in request.metadata.items() if v is not None}
        
        doc_metadata = {
            "document_id": document_id,
            "workspace_id": request.workspace_id,
            "total_chunks": len(chunks),
            "chunk_ids": json.dumps(chunk_ids),
            **filtered_metadata
        }
        # Solo agregar user_id si no es None
        if request.user_id is not None:
            doc_metadata["user_id"] = request.user_id
        
        redis_client.hset(f"document:{document_id}", mapping=doc_metadata)

        logger.info(f"Contenido indexado: documento {document_id} con {len(chunks)} chunks")

        return IngestResponse(
            document_id=document_id,
            chunks_count=len(chunks),
            status="success"
        )

    except Exception as e:
        logger.error(f"Error indexando contenido: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=List[SearchResult])
async def search_documents(request: SearchRequest):
    """Busca documentos relevantes para una consulta"""
    try:
        logger.info(f"Búsqueda iniciada - Query: '{request.query}' | Workspace: {request.workspace_id} | Threshold: {request.threshold}")
        
        # Generar embedding de la consulta
        query_embedding = get_embedding(request.query)

        # Buscar en todos los chunks (o filtrar por workspace si se especifica)
        search_pattern = "chunk:*"
        if request.workspace_id:
            # Para filtrar por workspace, necesitamos buscar en documentos primero
            doc_pattern = f"document:*"
            relevant_chunks = []

            for doc_key in redis_client.scan_iter(doc_pattern):
                doc_data = redis_client.hgetall(doc_key)
                # Decodificar bytes a string para comparación
                workspace_id_bytes = doc_data.get(b"workspace_id") or doc_data.get("workspace_id")
                workspace_id = workspace_id_bytes.decode() if isinstance(workspace_id_bytes, bytes) else workspace_id_bytes
                
                logger.info(f"Comparando workspace: '{workspace_id}' == '{request.workspace_id}' ? {workspace_id == request.workspace_id}")
                
                if workspace_id == request.workspace_id:
                    chunk_ids_bytes = doc_data.get(b"chunk_ids") or doc_data.get("chunk_ids")
                    chunk_ids_str = chunk_ids_bytes.decode() if isinstance(chunk_ids_bytes, bytes) else chunk_ids_bytes
                    chunk_ids = json.loads(chunk_ids_str)
                    relevant_chunks.extend(chunk_ids)
                    logger.info(f"✓ Match! Agregados {len(chunk_ids)} chunks del documento")
            
            logger.info(f"Total chunks relevantes para workspace {request.workspace_id}: {len(relevant_chunks)}")
        else:
            # Buscar todos los chunks
            relevant_chunks = [key.decode().split(":", 1)[1] for key in redis_client.scan_iter(search_pattern)]
            logger.info(f"Búsqueda sin filtro workspace: {len(relevant_chunks)} chunks totales")

        # Calcular similitudes
        results = []
        logger.info(f"Calculando similitudes para {len(relevant_chunks)} chunks...")
        
        for chunk_id in relevant_chunks:
            chunk_data = redis_client.hgetall(f"chunk:{chunk_id}")

            if not chunk_data:
                logger.warning(f"Chunk {chunk_id} no encontrado en Redis")
                continue

            # Decodificar bytes a string
            def get_value(data, key):
                val = data.get(key.encode() if isinstance(key, str) else key) or data.get(key)
                return val.decode() if isinstance(val, bytes) else val

            embedding_str = get_value(chunk_data, "embedding")
            content_str = get_value(chunk_data, "content")
            document_id_str = get_value(chunk_data, "document_id")
            metadata_str = get_value(chunk_data, "metadata")

            embedding = json.loads(embedding_str)
            similarity = cosine_similarity(query_embedding, embedding)

            logger.info(f"Chunk {chunk_id[:20]}... - Similitud: {similarity:.4f} (threshold: {request.threshold})")

            if similarity >= request.threshold:
                metadata = json.loads(metadata_str)
                results.append(SearchResult(
                    document_id=document_id_str,
                    content=content_str,
                    score=similarity,
                    metadata=metadata
                ))
                logger.info(f"✓ Chunk añadido a resultados")

        # Ordenar por score descendente y limitar resultados
        results.sort(key=lambda x: x.score, reverse=True)
        results = results[:request.limit]

        logger.info(f"Búsqueda completada: {len(results)} resultados para query '{request.query}'")

        return results

    except Exception as e:
        logger.error(f"Error en búsqueda: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete/{document_id}")
async def delete_document(document_id: str):
    """Elimina un documento y todos sus chunks"""
    try:
        # Obtener metadata del documento
        doc_key = f"document:{document_id}"
        doc_data = redis_client.hgetall(doc_key)

        if not doc_data:
            raise HTTPException(status_code=404, detail="Documento no encontrado")

        # Eliminar chunks
        chunk_ids = json.loads(doc_data.get("chunk_ids", "[]"))
        for chunk_id in chunk_ids:
            redis_client.delete(f"chunk:{chunk_id}")

        # Eliminar documento
        redis_client.delete(doc_key)

        logger.info(f"Documento {document_id} eliminado")

        return {"status": "success", "message": f"Documento {document_id} eliminado"}

    except Exception as e:
        logger.error(f"Error eliminando documento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Verificación de salud del servicio"""
    try:
        # Verificar conexión a Redis
        redis_client.ping()

        # Verificar API key de OpenAI
        if not OPENAI_API_KEY:
            return {"status": "error", "message": "OPENAI_API_KEY no configurada"}

        return {"status": "healthy", "service": "RAG Service"}

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)