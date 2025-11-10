import uuid
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.config import settings
from models.schemas import DocumentChunk 

# --- Inicializar Clientes (se cargan una vez) ---
print("VECTOR_STORE: Cargando cliente de Qdrant...")
qdrant_client = QdrantClient(url=settings.QDRANT_URL)

print("VECTOR_STORE: Cargando modelo de embeddings 'all-MiniLM-L6-v2'...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu") 
print("VECTOR_STORE: Modelo de embeddings cargado.")

# --- Text Splitter ---
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50
)

def get_or_create_collection(collection_name: str):
    """Asegura que una colección exista en Qdrant."""
    try:
        qdrant_client.recreate_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=embedding_model.get_sentence_embedding_dimension(),
                distance=models.Distance.COSINE
            )
        )
        print(f"VECTOR_STORE: Colección '{collection_name}' creada.")
    except Exception as e:
        print(f"VECTOR_STORE: Colección '{collection_name}' ya existe o no se pudo crear: {e}")

def process_and_embed_text(text: str, document_id: str, workspace_id: str) -> int:
    """
    Divide el texto, crea embeddings y los sube a Qdrant.
    Devuelve el número de chunks creados.
    """
    
    # 1. Crear la colección si no existe
    collection_name = f"workspace_{workspace_id}"
    get_or_create_collection(collection_name)
    
    # 2. Dividir texto en Chunks
    chunks = text_splitter.split_text(text)
    
    if not chunks:
        print("VECTOR_STORE: El texto no generó chunks.")
        return 0
        
    print(f"VECTOR_STORE: Texto dividido en {len(chunks)} chunks.")
    
    # 3. Crear Embeddings
    vectors = embedding_model.encode(chunks, show_progress_bar=True)
    
    # 4. Preparar Puntos para Qdrant
    points = []
    for i, chunk_text in enumerate(chunks):
        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vectors[i].tolist(),
                payload={
                    "document_id": document_id,
                    "workspace_id": workspace_id,
                    "chunk_text": chunk_text,
                    "chunk_index": i
                }
            )
        )
    
    # 5. Subir a Qdrant
    qdrant_client.upsert(
        collection_name=collection_name,
        points=points,
        wait=True
    )
    
    print(f"VECTOR_STORE: {len(points)} chunks indexados en Qdrant (Colección: {collection_name}).")
    return len(points)

# ... (la función process_and_embed_text está arriba) ...

def search_similar_chunks(query: str, workspace_id: str, top_k: int = 5) -> list[DocumentChunk]:
    """
    Busca en Qdrant los chunks más relevantes para una consulta.
    """
    collection_name = f"workspace_{workspace_id}"
    
    # 1. Crear el embedding para la consulta del usuario
    query_vector = embedding_model.encode(query).tolist()
    
    # 2. Realizar la búsqueda en Qdrant
    print(f"VECTOR_STORE: Buscando en '{collection_name}' (top_k={top_k}) para la consulta: '{query[:20]}...'")
    
    search_results = qdrant_client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=top_k,
        with_payload=True # Para que nos devuelva los datos del chunk
    )
    
    # 3. Formatear los resultados
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