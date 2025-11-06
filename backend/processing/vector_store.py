import uuid
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter  # <-- CAMBIO
from core.config import settings

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