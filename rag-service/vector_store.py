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
    def __init__(self):
        self.qdrant_url = os.getenv("QDRANT_URL", "http://qdrant:6333")
        # ACTUALIZACIÓN: Usando documents_v2 para el nuevo modelo de 768 dimensiones
        self.collection_name = "documents_v2"
        # ACTUALIZACIÓN: Modelo multilingüe superior (E5 Base)
        self.embedding_model_name = "intfloat/multilingual-e5-base"
        self.vector_size = 768  # Size for multilingual-e5-base

        # Initialize Qdrant Client
        logger.info(f"VECTOR_STORE: Connecting to Qdrant at {self.qdrant_url}...")
        self.client = QdrantClient(url=self.qdrant_url, timeout=60)

        # Initialize Embedding Model (Local CPU)
        logger.info(
            f"VECTOR_STORE: Loading embedding model '{self.embedding_model_name}'..."
        )
        self.embedding_model = SentenceTransformer(
            self.embedding_model_name, device="cpu"
        )
        logger.info("VECTOR_STORE: Model loaded.")

        self._ensure_collection()

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
        E5 models require 'query: ' prefix for queries and 'passage: ' for documents (optional but recommended).
        For simplicity and standard E5 usage:
        - Queries MUST have "query: " prefix.
        - Documents (passages) usually used as is or with "passage: ".
        We will use "query: " for search queries and raw text for documents (symmetric is fine for base, but prefix is better).
        Let's stick to adding "query: " only for search queries as per E5 instructions for asymmetric tasks.
        """
        if is_query:
            text = f"query: {text}"
        else:
            # E5 technically recommends "passage: " for documents but often works fine without if trained symmetrically.
            # However, standard E5 practice acts as asymmetric. We'll add "passage: " to be safe and consistent.
            text = f"passage: {text}"

        embedding = self.embedding_model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def upsert_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        Upsert documents/chunks into Qdrant.
        Expects list of dicts with: content, metadata (including document_id, workspace_id, etc.)
        """
        points = []
        for doc in documents:
            content = doc["content"]
            metadata = doc["metadata"]

            # Generate embedding (is_query=False)
            vector = self.get_embedding(content, is_query=False)

            # Generate deterministic ID if not provided, or use random
            if "chunk_id" in metadata:
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, metadata["chunk_id"]))
            else:
                point_id = str(uuid.uuid4())

            # Ensure payload has the content for retrieval
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
        # Generate embedding (is_query=True)
        query_vector = self.get_embedding(query, is_query=True)

        # Build filters
        must_filters = []

        # Filter by Workspace (Strict)
        if workspace_id:
            must_filters.append(
                qmodels.FieldCondition(
                    key="workspace_id", match=qmodels.MatchValue(value=workspace_id)
                )
            )

        # Filter by Conversation (Contextual)
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
            score_threshold=None,  # Disable threshold for debugging/re-calibration
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


# Singleton instance
vector_store = VectorStore()
