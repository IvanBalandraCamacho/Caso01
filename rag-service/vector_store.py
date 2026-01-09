import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorStore:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStore, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Solo inicializar una vez
        if VectorStore._initialized:
            return
            
        self.qdrant_url = os.getenv("QDRANT_URL", "http://qdrant:6333")
        self.collection_name = "documents_v2"
        self.embedding_model_name = "intfloat/multilingual-e5-base"
        self.vector_size = 768

        # Initialize Qdrant Client (lightweight)
        logger.info(f"VECTOR_STORE: Connecting to Qdrant at {self.qdrant_url}...")
        self.client = QdrantClient(url=self.qdrant_url, timeout=60)

        # NO cargar el modelo aquí - lazy loading
        self.embedding_model = None
        
        self._ensure_collection()
        VectorStore._initialized = True
        logger.info("VECTOR_STORE: Initialized (model will load on first use)")

    def _load_embedding_model(self):
        """Load embedding model only when needed (lazy loading)"""
        if self.embedding_model is None:
            logger.info(f"VECTOR_STORE: Loading embedding model '{self.embedding_model_name}'...")
            self.embedding_model = SentenceTransformer(
                self.embedding_model_name, device="cpu"
            )
            logger.info("VECTOR_STORE: Model loaded successfully")

    def _ensure_collection(self):
        """Ensure the collection exists with the correct config."""
        try:
            self.client.get_collection(self.collection_name)
            logger.info(f"VECTOR_STORE: Collection '{self.collection_name}' exists.")
        except Exception:
            logger.info(
                f"VECTOR_STORE: Creating collection '{self.collection_name}'..."
            )
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(
                    size=self.vector_size, distance=qmodels.Distance.COSINE
                ),
            )

    def get_embedding(self, text: str, is_query: bool = False) -> List[float]:
        """
        Generate embedding for a single string.
        Lazy loads the model on first call.
        """
        # Cargar modelo solo cuando se necesite
        self._load_embedding_model()
        
        if is_query:
            text = f"query: {text}"
        else:
            text = f"passage: {text}"

        embedding = self.embedding_model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def upsert_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        Upsert documents/chunks into Qdrant.
        """
        points = []
        for doc in documents:
            content = doc["content"]
            metadata = doc["metadata"]

            # Generate embedding (this will lazy load the model)
            vector = self.get_embedding(content, is_query=False)

            if "chunk_id" in metadata:
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, metadata["chunk_id"]))
            else:
                point_id = str(uuid.uuid4())

            payload = metadata.copy()
            payload["content"] = content

            points.append(
                qmodels.PointStruct(id=point_id, vector=vector, payload=payload)
            )

        if points:
            self.client.upsert(
                collection_name=self.collection_name, points=points, wait=True
            )

        return len(points)

    def search(
        self,
        query: str,
        workspace_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        limit: int = 5,
        threshold: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.
        """
        # Generate embedding (this will lazy load the model)
        query_vector = self.get_embedding(query, is_query=True)

        # Build filters
        must_filters = []

        if workspace_id:
            must_filters.append(
                qmodels.FieldCondition(
                    key="workspace_id", match=qmodels.MatchValue(value=workspace_id)
                )
            )

        if conversation_id:
            must_filters.append(
                qmodels.Filter(
                    should=[
                        qmodels.FieldCondition(
                            key="conversation_id",
                            match=qmodels.MatchValue(value=conversation_id),
                        ),
                        qmodels.IsNullCondition(
                            is_null=qmodels.PayloadField(key="conversation_id")
                        ),
                    ]
                )
            )

        search_result = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=qmodels.Filter(must=must_filters) if must_filters else None,
            limit=limit,
            score_threshold=None,
            with_payload=True,
        ).points

        results = []
        for hit in search_result:
            results.append(
                {
                    "document_id": hit.payload.get("document_id"),
                    "content": hit.payload.get("content"),
                    "score": hit.score,
                    "metadata": hit.payload,
                }
            )

        return results

    def delete_document(self, document_id: str):
        """Delete all chunks for a specific document ID."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="document_id",
                            match=qmodels.MatchValue(value=document_id),
                        )
                    ]
                )
            ),
            wait=True,
        )


# Singleton instance (pero el modelo se cargará lazy)
vector_store = VectorStore()