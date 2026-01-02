# CLAUDE.md - Guía del Proyecto TIVIT AI Hub

## 📋 Resumen del Proyecto

**Nombre:** TIVIT AI Hub / Sistema de Análisis de Documentos con IA  
**Propósito:** Plataforma empresarial de análisis inteligente de documentos usando RAG (Retrieval-Augmented Generation) y múltiples modelos LLM para automatizar el análisis de propuestas comerciales, RFPs y documentos empresariales.  
**Cliente:** TIVIT (Almaviva Group)

---

## 🏗 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│                    Puerto: 3000 (ia_frontend_v2)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                     │
│                     Puerto: 8000 (ia_backend)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  API Routes  │  │ Core Logic   │  │  Celery Workers          │  │
│  │  - Auth      │  │ - LLM Service│  │  - Document Processing   │  │
│  │  - Workspace │  │ - RAG Client │  │  - Async Tasks           │  │
│  │  - Chat      │  │ - GCP Service│  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                        │
         ▼                    ▼                        ▼
┌─────────────┐     ┌─────────────────┐      ┌─────────────────────┐
│   MySQL     │     │   RAG Service   │      │      Redis          │
│  Puerto:    │     │   Puerto: 8082  │      │   Puerto: 6379      │
│  3307       │     │  (ia_rag)       │      │  (Cache + Broker)   │
└─────────────┘     └─────────────────┘      └─────────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │     Qdrant      │
                    │   Puerto: 6333  │
                    │ (Vector Store)  │
                    └─────────────────┘
```

---

## 🗂 Estructura de Carpetas

```
Caso01/
├── backend/                 # API FastAPI (Python)
│   ├── api/routes/          # Endpoints REST
│   ├── core/                # Servicios centrales (LLM, RAG, Auth)
│   ├── models/              # SQLAlchemy models y Pydantic schemas
│   ├── processing/          # Celery tasks para documentos
│   ├── middleware/          # Security headers
│   ├── prompts/             # Plantillas de prompts LLM
│   └── alembic/             # Migraciones de BD
│
├── front-v2/                # Frontend Next.js 16 + React 19
│   ├── app/                 # App Router (páginas)
│   ├── components/          # Componentes React
│   ├── context/             # React Context (Workspace)
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # API client, utils
│   ├── providers/           # Query/Theme providers
│   └── types/               # TypeScript types
│
├── rag-service/             # Servicio RAG independiente
│   ├── main.py              # FastAPI para búsqueda semántica
│   └── vector_store.py      # Qdrant + embeddings
│
├── docs/                    # Documentación
└── docker-compose.yml       # Orquestación de servicios
```

---

## 🔧 Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Python** | 3.10+ | Lenguaje principal |
| **FastAPI** | Latest | Framework API REST |
| **SQLAlchemy** | 2.x | ORM para MySQL |
| **Celery** | Latest | Tareas asíncronas |
| **Redis** | 7 | Cache + Message Broker |
| **MySQL** | 8.0 | Base de datos relacional |
| **Qdrant** | Latest | Vector database |
| **Alembic** | Latest | Migraciones de BD |

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 16.0.7 | Framework React |
| **React** | 19.2.0 | UI Library |
| **TypeScript** | 5.x | Tipado estático |
| **Ant Design** | Latest | Componentes UI |
| **TailwindCSS** | 4.x | Estilos |
| **TanStack Query** | 5.x | Data fetching |
| **Axios** | 1.7.x | HTTP client |

### LLM & AI
| Proveedor | Modelo | Uso |
|-----------|--------|-----|
| **Google Gemini** | gemini-2.0-flash-exp | Modelo principal (prioridad) |
| **OpenAI** | gpt-4o-mini | Fallback |
| **Sentence Transformers** | multilingual-e5-base | Embeddings locales |
| **Google Document AI** | - | OCR/Extracción de documentos |
| **Google Natural Language** | - | Análisis de texto |

---

## 🚀 Comandos de Desarrollo

### Iniciar todo el stack
```bash
docker-compose up --build -d
```

### Ver logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f rag-service
```

### Solo backend local
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Solo frontend local
```bash
cd front-v2
pnpm install
pnpm dev
```

### Migraciones de BD
```bash
cd backend
alembic upgrade head           # Aplicar migraciones
alembic revision --autogenerate -m "descripcion"  # Nueva migración
```

### Celery worker
```bash
cd backend
celery -A core.celery_app worker --loglevel=info
```

---

## 🔐 Autenticación

- **Método:** JWT (JSON Web Tokens)
- **Algoritmo:** HS256
- **Expiración:** 30 días (43200 minutos)
- **Endpoints:**
  - `POST /api/v1/auth/register` - Registro
  - `POST /api/v1/auth/token` - Login (OAuth2 form)
  - `POST /api/v1/auth/refresh` - Refresh token
  - `GET /api/v1/auth/me` - Usuario actual

---

## 📡 Endpoints Principales

### Workspaces
```
GET    /api/v1/workspaces              # Listar workspaces del usuario
POST   /api/v1/workspaces              # Crear workspace
GET    /api/v1/workspaces/{id}         # Obtener workspace
PUT    /api/v1/workspaces/{id}         # Actualizar workspace
DELETE /api/v1/workspaces/{id}         # Eliminar workspace
POST   /api/v1/workspaces/{id}/upload  # Subir documento
```

### Conversaciones
```
GET    /api/v1/workspaces/{id}/conversations     # Listar conversaciones
GET    /api/v1/conversations/general             # Conversaciones sin workspace
POST   /api/v1/workspaces/{id}/conversations     # Crear conversación
GET    /api/v1/conversations/{id}                # Obtener con mensajes
POST   /api/v1/conversations/{id}/messages       # Enviar mensaje
```

### Chat (Streaming)
```
POST   /api/v1/workspaces/{id}/chat/stream       # Chat con RAG + streaming
POST   /api/v1/chat/general/stream               # Chat general + streaming
```

### Documentos
```
GET    /api/v1/workspaces/{id}/documents         # Listar documentos
DELETE /api/v1/documents/{id}                    # Eliminar documento
POST   /api/v1/documents/generate                # Generar documento (PDF/DOCX)
```

### RAG Service (interno)
```
POST   /search                  # Búsqueda semántica
POST   /ingest                  # Indexar documento
DELETE /documents/{id}          # Eliminar del índice
GET    /health                  # Health check
```

---

## 🗄 Modelos de Base de Datos

### User
```python
- id: UUID (PK)
- email: String (unique)
- hashed_password: String
- full_name: String
- is_active: Boolean
- created_at: DateTime
```

### Workspace
```python
- id: UUID (PK)
- owner_id: UUID (FK -> User)
- name: String
- description: String
- instructions: Text (instrucciones personalizadas)
- created_at: DateTime
- updated_at: DateTime
```

### Document
```python
- id: UUID (PK)
- workspace_id: UUID (FK -> Workspace)
- file_name: String
- file_type: String
- file_size: Integer
- status: Enum (PENDING, PROCESSING, COMPLETED, FAILED)
- chunk_count: Integer
- created_at: DateTime
```

### Conversation
```python
- id: UUID (PK)
- workspace_id: UUID (FK, nullable)
- user_id: UUID (FK -> User)
- title: String
- has_proposal: Boolean
- created_at: DateTime
- updated_at: DateTime
```

### Message
```python
- id: UUID (PK)
- conversation_id: UUID (FK -> Conversation)
- role: Enum (user, assistant, system)
- content: Text
- created_at: DateTime
```

---

## 🎨 Convenciones de Código

### Backend (Python)
- **Estilo:** PEP 8
- **Imports:** Absolutos desde raíz del proyecto
- **Logging:** Usar `logging.getLogger(__name__)`
- **Async:** Usar `async/await` para operaciones I/O
- **Validación:** Pydantic models para request/response

### Frontend (TypeScript)
- **Componentes:** Functional components con hooks
- **Estilo:** "use client" para componentes cliente
- **Estado:** React Query para server state, Context para global state
- **Formularios:** react-hook-form + zod
- **CSS:** TailwindCSS + Ant Design tokens

---

## 🌐 Variables de Entorno Importantes

### Backend (.env)
```env
# Database
DATABASE_URL=mysql+pymysql://user:pass@mysql:3306/ia_db
MYSQL_ROOT_PASSWORD=xxx
MYSQL_DATABASE=ia_db
MYSQL_USER=admin
MYSQL_PASSWORD=xxx

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET_KEY=xxx

# LLM Providers
LLM_PROVIDER=gemini
OPENAI_API_KEY=sk-xxx
GOOGLE_API_KEY=xxx

# GCP
GOOGLE_CLOUD_PROJECT=tivit-caso01
GOOGLE_APPLICATION_CREDENTIALS=/app/caso01-gcp-key.json
DOCUMENT_AI_PROCESSOR_ID=xxx
ENABLE_NATURAL_LANGUAGE=true

# RAG
RAG_SERVICE_URL=http://rag-service:8080
RAG_SERVICE_ENABLED=true
QDRANT_URL=http://qdrant:6333
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 🔄 Flujo de Procesamiento de Documentos

1. **Upload:** Usuario sube documento via `/workspaces/{id}/upload`
2. **Cola:** Backend encola task Celery `process_document`
3. **Extracción:** Worker extrae texto (PDF/DOCX/TXT/CSV/XLSX)
4. **Chunking:** Texto dividido en fragmentos (RecursiveCharacterTextSplitter)
5. **Embeddings:** RAG Service genera embeddings con E5-base
6. **Indexación:** Chunks almacenados en Qdrant (colección `documents_v2`)
7. **Notificación:** Redis pub/sub notifica al frontend via WebSocket

---

## 💬 Flujo de Chat con RAG

1. **Query:** Usuario envía mensaje
2. **Búsqueda:** Backend consulta RAG Service con workspace_id
3. **Contexto:** RAG retorna chunks relevantes (top 5-15, threshold 0.6)
4. **Prompt:** Se construye prompt con contexto + historial + instrucciones workspace
5. **LLM:** Gemini Flash (o GPT-4o-mini fallback) genera respuesta
6. **Streaming:** Respuesta streameada via SSE al frontend
7. **Persistencia:** Mensaje guardado en BD

---

## 🎯 Características Principales

- ✅ **RAG (Retrieval-Augmented Generation):** Respuestas basadas en documentos
- ✅ **Multi-Workspace:** Organización por proyectos/clientes
- ✅ **Streaming:** Respuestas en tiempo real
- ✅ **Multi-formato:** PDF, DOCX, XLSX, CSV, TXT
- ✅ **Generación de documentos:** Exportar a PDF/DOCX
- ✅ **Autenticación JWT:** Seguridad enterprise
- ✅ **Rate Limiting:** Protección contra abuso
- ✅ **Cache LLM:** Optimización de costos
- ✅ **Embeddings locales:** Sin dependencia externa para vectorización

---

## 🐛 Debugging Tips

### Backend no conecta a MySQL
```bash
docker-compose logs mysql
# Esperar a que MySQL esté healthy antes de iniciar backend
```

### RAG no encuentra documentos
```bash
# Verificar colección en Qdrant
curl http://localhost:6333/collections/documents_v2
# Verificar logs del worker
docker-compose logs celery_worker
```

### Frontend 401 Unauthorized
```javascript
// Verificar token en localStorage
localStorage.getItem('access_token')
// Limpiar y re-login
localStorage.removeItem('access_token')
```

### Gemini no disponible
```bash
# Verificar GOOGLE_API_KEY en .env
# Backend fallback automático a OpenAI si OPENAI_API_KEY está configurado
```

---

## 📚 Documentación Relacionada

- [docs/PRD.md](docs/PRD.md) - Product Requirements Document completo
- [docs/README.md](docs/README.md) - README del backend
- [docs/SETUP_LOCAL.md](docs/SETUP_LOCAL.md) - Setup local detallado
- [docs/GEMINI.md](docs/GEMINI.md) - Integración con Google Gemini
- [docs/GCP_SERVICES_RECOMMENDATIONS.md](docs/GCP_SERVICES_RECOMMENDATIONS.md) - Servicios GCP

---

## ⚠️ Notas Importantes para Claude

1. **Priorizar Gemini:** El sistema usa Gemini Flash como LLM principal. OpenAI es fallback.

2. **RAG Service separado:** El servicio RAG corre independiente en puerto 8082. No modificar embeddings sin actualizar ambos servicios.

3. **Alembic para migraciones:** NO usar `create_all()`. Siempre crear migraciones Alembic.

4. **Docker en desarrollo:** Los volúmenes montan código local. Cambios se reflejan con hot-reload.

5. **Credenciales GCP:** El archivo `caso01-gcp-key.json` NO debe commitearse. Usar `.example` como referencia.

6. **Frontend Dark Mode:** El diseño está optimizado para dark mode profesional. Colores principales:
   - Fondo: `#0A0A0B`
   - Tarjetas: `#141416`
   - Rojo TIVIT: `#E31837`
   - Naranja secundario: `#FF6B00`

7. **Ant Design + Radix:** El frontend usa Ant Design para componentes principales y Radix para primitivos. Mantener consistencia.

8. **pnpm obligatorio:** El frontend usa pnpm. No usar npm o yarn.
