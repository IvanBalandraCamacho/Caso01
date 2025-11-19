import uuid
import hashlib
import pickle
import redis
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.config import settings
from models.schemas import DocumentChunk 

# --- Inicializar Clientes (se cargan una vez) ---
print("VECTOR_STORE: Cargando cliente de Qdrant...")
qdrant_client = QdrantClient(url=settings.QDRANT_URL)

print("VECTOR_STORE: Conectando a Redis para caché...")
try:
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=False)
    redis_client.ping()
    print("VECTOR_STORE: Redis conectado correctamente.")
except Exception as e:
    print(f"VECTOR_STORE: WARNING - Redis no disponible para caché: {e}")
    redis_client = None

# Lazy loading del modelo de embeddings
_embedding_model = None

def get_embedding_model():
    """Lazy loading del modelo de embeddings para arranque más rápido"""
    global _embedding_model
    if _embedding_model is None:
        print("VECTOR_STORE: Cargando modelo de embeddings 'all-mpnet-base-v2'...")
        _embedding_model = SentenceTransformer(
            "all-mpnet-base-v2",  # Mejor precisión que MiniLM
            device="cpu",
            cache_folder="/tmp/sentence_transformers"
        )
        print("VECTOR_STORE: Modelo de embeddings cargado.")
    return _embedding_model

# --- Text Splitter ---
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50
)

# --- Funciones de Caché para Embeddings ---
def get_cached_embedding(text: str):
    """Obtener embedding desde caché Redis"""
    if not redis_client:
        return None
    
    try:
        cache_key = f"emb:{hashlib.md5(text.encode()).hexdigest()}"
        cached = redis_client.get(cache_key)
        if cached:
            return pickle.loads(cached)
    except Exception as e:
        print(f"VECTOR_STORE: Error al leer caché: {e}")
    return None

def cache_embedding(text: str, embedding):
    """Guardar embedding en caché (24 horas)"""
    if not redis_client:
        return
    
    try:
        cache_key = f"emb:{hashlib.md5(text.encode()).hexdigest()}"
        redis_client.setex(cache_key, 86400, pickle.dumps(embedding))
    except Exception as e:
        print(f"VECTOR_STORE: Error al guardar en caché: {e}")

from typing import Iterator

# --- Cache de Colecciones (Set en memoria) ---
_existing_collections = set()

def get_or_create_collection(collection_name: str):
    """Asegura que una colección exista en Qdrant (con caché en memoria)."""
    if collection_name in _existing_collections:
        return

    try:
        # Verificar si existe antes de intentar crear (optimización)
        if qdrant_client.collection_exists(collection_name):
            _existing_collections.add(collection_name)
            return

        embedding_model = get_embedding_model()  # Lazy loading
        qdrant_client.recreate_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=embedding_model.get_sentence_embedding_dimension(),
                distance=models.Distance.COSINE
            )
        )
        _existing_collections.add(collection_name)
        print(f"VECTOR_STORE: Colección '{collection_name}' creada.")
    except Exception as e:
        print(f"VECTOR_STORE: Error al crear/verificar colección '{collection_name}': {e}")

def process_and_embed_text(text_iterator: Iterator[str], document_id: str, workspace_id: str) -> int:
    """
    Procesa un iterador de texto (streaming), divide en chunks, crea embeddings y sube a Qdrant.
    Devuelve el número total de chunks creados.
    """
    
    # 1. Crear la colección si no existe (una sola vez)
    collection_name = f"workspace_{workspace_id}"
    get_or_create_collection(collection_name)
    
    total_chunks = 0
    current_batch_points = []
    batch_size = 100
    
    embedding_model = get_embedding_model()
    
    print(f"VECTOR_STORE: Iniciando procesamiento streaming para doc {document_id}...")

    for text_chunk in text_iterator:
        # Dividir el chunk de texto (ej: una página) en sub-chunks más pequeños para el vector store
        sub_chunks = text_splitter.split_text(text_chunk)
        
        if not sub_chunks:
            continue
            
        # Preparar vectores para este lote de sub-chunks
        vectors = []
        chunks_to_encode = []
        chunks_to_encode_indices = []
        
        # Verificar caché de embeddings
        for i, chunk_text in enumerate(sub_chunks):
            cached_vec = get_cached_embedding(chunk_text)
            if cached_vec is not None:
                vectors.append(cached_vec)
            else:
                vectors.append(None)
                chunks_to_encode.append(chunk_text)
                chunks_to_encode_indices.append(i)
        
        # Calcular embeddings faltantes
        if chunks_to_encode:
            new_vectors = embedding_model.encode(
                chunks_to_encode,
                batch_size=32,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            
            for idx, chunk_idx in enumerate(chunks_to_encode_indices):
                vectors[chunk_idx] = new_vectors[idx]
                cache_embedding(chunks_to_encode[idx], new_vectors[idx])
        
        # Crear puntos para Qdrant
        for i, chunk_text in enumerate(sub_chunks):
            point = models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vectors[i].tolist(),
                payload={
                    "document_id": document_id,
                    "workspace_id": workspace_id,
                    "chunk_text": chunk_text,
                    "chunk_index": total_chunks + i # Índice global
                }
            )
            current_batch_points.append(point)
        
        total_chunks += len(sub_chunks)
        
        # Subir a Qdrant si el batch está lleno
        if len(current_batch_points) >= batch_size:
            qdrant_client.upsert(
                collection_name=collection_name,
                points=current_batch_points,
                wait=False # Async para velocidad
            )
            print(f"VECTOR_STORE: Subidos {len(current_batch_points)} puntos (Total: {total_chunks})")
            current_batch_points = []

    # Subir remanente
    if current_batch_points:
        qdrant_client.upsert(
            collection_name=collection_name,
            points=current_batch_points,
            wait=True # Esperar en el último
        )
        print(f"VECTOR_STORE: Subidos {len(current_batch_points)} puntos finales.")
    
    print(f"VECTOR_STORE: Procesamiento finalizado. {total_chunks} chunks indexados en Qdrant.")
    return total_chunks

# ... (la función process_and_embed_text está arriba) ...

def search_similar_chunks(query: str, workspace_id: str, top_k: int = 5) -> list[DocumentChunk]:
    """
    Busca en Qdrant los chunks más relevantes para una consulta con CACHÉ.
    """
    collection_name = f"workspace_{workspace_id}"
    
    # CACHÉ DE BÚSQUEDAS: Generar clave única para esta consulta
    search_cache_key = f"search:{workspace_id}:{hashlib.md5(query.encode()).hexdigest()}:{top_k}"
    
    # Intentar obtener del caché (TTL: 5 min)
    try:
        cached_results = redis_client.get(search_cache_key)
        if cached_results:
            print(f"VECTOR_STORE: Búsqueda obtenida del caché! ⚡")
            return pickle.loads(cached_results)
    except Exception as e:
        print(f"VECTOR_STORE: Error accediendo caché de búsqueda: {e}")
    
    # 1. Verificar si la colección existe
    try:
        collections = qdrant_client.get_collections()
        collection_exists = any(col.name == collection_name for col in collections.collections)
        
        if not collection_exists:
            print(f"VECTOR_STORE: Colección '{collection_name}' no existe. No hay documentos indexados.")
            return []
    except Exception as e:
        print(f"VECTOR_STORE: Error verificando colección: {e}")
        return []
    
    # 2. Crear el embedding para la consulta del usuario (con lazy loading)
    embedding_model = get_embedding_model()
    query_vector = embedding_model.encode(query).tolist()
    
    # 3. Realizar la búsqueda en Qdrant
    print(f"VECTOR_STORE: Buscando en '{collection_name}' (top_k={top_k}) para la consulta: '{query[:20]}...'")
    
    try:
        # Usar query_points en lugar de search (API nueva de Qdrant)
        search_results = qdrant_client.query_points(
            collection_name=collection_name,
            query=query_vector,
            limit=top_k,
            with_payload=True # Para que nos devuelva los datos del chunk
        ).points
    except Exception as e:
        print(f"VECTOR_STORE: Error en búsqueda: {e}")
        return []
    
    # 4. Formatear los resultados
    chunks = []
    for result in search_results:
        chunks.append(
            DocumentChunk(
                document_id=result.payload.get("document_id"),
                chunk_text=result.payload.get("chunk_text"),
                chunk_index=result.payload.get("chunk_index"),
                score=result.score
            )
        )
    
    # Guardar en caché (5 minutos)
    try:
        redis_client.setex(
            search_cache_key,
            300,  # 5 minutos TTL
            pickle.dumps(chunks)
        )
    except Exception as e:
        print(f"VECTOR_STORE: Error guardando en caché de búsqueda: {e}")
    
    print(f"VECTOR_STORE: Encontrados {len(chunks)} chunks relevantes.")
    return chunks

def delete_document_vectors(workspace_id: str, document_id: str):
    """
    Elimina todos los vectores asociados con un document_id específico
    de una colección (workspace) en Qdrant.
    """
    collection_name = f"workspace_{workspace_id}"
    print(f"VECTOR_STORE: Eliminando vectores para doc {document_id} de {collection_name}...")

    qdrant_client.delete(
        collection_name=collection_name,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=document_id),
                    )
                ]
            )
        ),
        wait=True,
    )
    
    print(f"VECTOR_STORE: Vectores eliminados para doc {document_id}.")


def delete_workspace_vectors(workspace_id: str):
    """Elimina una colección completa asociada a un workspace."""
    collection_name = f"workspace_{workspace_id}"
    print(f"VECTOR_STORE: Eliminando colección completa {collection_name}...")

    try:
        qdrant_client.delete_collection(collection_name=collection_name)
        print(f"VECTOR_STORE: Colección {collection_name} eliminada.")
    except Exception as exc:  # noqa: BLE001 - logging purpose only
        print(
            f"VECTOR_STORE: No se pudo eliminar la colección {collection_name}: {exc}"
        )