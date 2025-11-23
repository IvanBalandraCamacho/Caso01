# Especificación Técnica: Servicio RAG Externo (Recommendation Core)

## 🎯 Visión General
El servicio RAG (Retrieval-Augmented Generation) es un componente crítico que maneja la ingesta, procesamiento y recuperación de información de documentos. Debe exponer una API RESTful para ser consumida por el Backend principal.

## 🔐 Autenticación y Seguridad
- **Protocolo**: HTTPS
- **Header Requerido**: `X-API-Key: <RAG_SERVICE_API_KEY>`
- **Rate Limiting**: 100 requests/minuto por cliente.

## 📡 Endpoints de la API

### 1. Health Check
Verifica que el servicio y sus dependencias (Vector DB, Embedding Model) estén operativos.

- **GET** `/health`
- **Response 200 OK**:
  ```json
  {
    "status": "ok",
    "version": "1.2.0",
    "dependencies": {
      "vector_db": "connected",
      "embedding_model": "loaded"
    }
  }
  ```

### 2. Indexación de Documentos (Upload)
Recibe un archivo, extrae texto, genera chunks y embeddings, y los guarda en la base vectorial.

- **POST** `/index/upload`
- **Content-Type**: `multipart/form-data`
- **Parámetros (Form Data)**:
  - `file`: Archivo binario (Requerido). Tipos: PDF, DOCX, XLSX, TXT, CSV, PPTX.
  - `workspace_id`: UUID del workspace (Requerido).
  - `document_id`: UUID del documento (Requerido).
  - `chunk_size`: Entero (Opcional, default: 1000). Tamaño de chunk en caracteres.
  - `chunk_overlap`: Entero (Opcional, default: 200). Solapamiento.

- **Response 202 Accepted**:
  ```json
  {
    "task_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "message": "Documento en cola de procesamiento"
  }
  ```
- **Error 400 Bad Request**: Archivo no soportado o corrupto.
- **Error 413 Payload Too Large**: Archivo excede límite (ej. 50MB).

### 3. Estado de Indexación
Consulta el progreso del procesamiento de un documento.

- **GET** `/index/status/{document_id}`
- **Response 200 OK**:
  ```json
  {
    "document_id": "doc-123",
    "status": "completed",  # Estados: pending, processing, completed, failed
    "progress": 100,        # Porcentaje 0-100
    "chunks_created": 45,
    "error": null,
    "created_at": "2023-10-27T10:00:00Z",
    "completed_at": "2023-10-27T10:00:15Z"
  }
  ```

### 4. Búsqueda Semántica (Search)
Recupera los fragmentos de texto más relevantes para una consulta dada.

- **POST** `/search`
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "workspace_id": "ws-123",
    "query": "¿Cuál es el presupuesto total del proyecto?",
    "top_k": 10,           # Número de chunks a recuperar (Default: 5)
    "threshold": 0.75,     # Similitud mínima 0.0-1.0 (Default: 0.7)
    "filters": {           # Opcional: Filtros de metadatos
      "document_id": "doc-123" 
    }
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "results": [
      {
        "content": "El presupuesto total asignado para la fase 1 es de $50,000 USD...",
        "score": 0.89,
        "metadata": {
          "document_id": "doc-123",
          "page_number": 5,
          "file_name": "presupuesto_2024.pdf",
          "chunk_index": 12
        }
      },
      {
        "content": "Costos adicionales por imprevistos: $5,000 USD...",
        "score": 0.82,
        "metadata": { ... }
      }
    ]
  }
  ```

### 5. Gestión de Índice
Eliminar documentos del índice vectorial.

- **DELETE** `/index/{document_id}`
- **Response 200 OK**:
  ```json
  {
    "status": "deleted",
    "document_id": "doc-123",
    "chunks_removed": 45
  }
  ```

## 🛠 Stack Tecnológico Recomendado
- **Lenguaje**: Python 3.10+ (FastAPI)
- **Vector Database**: Qdrant (Recomendado), Pinecone, o Milvus.
- **Embeddings**: 
  - Opción A (Calidad/Costo): `text-embedding-3-small` (OpenAI)
  - Opción B (Open Source): `intfloat/multilingual-e5-large` (HuggingFace)
- **Procesamiento de Archivos**: `LangChain` o `LlamaIndex` para loaders y splitters.
