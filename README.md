# Caso01 — Sistema RAG con Multi-LLM y Streaming

Sistema avanzado de Retrieval-Augmented Generation (RAG) con soporte multi-proveedor de LLM, streaming en tiempo real, y exportación profesional de conversaciones.

## 🚀 Características Principales

### 💬 Chat Inteligente con RAG
- **Streaming en tiempo real**: Respuestas que se van escribiendo en vivo
- **Contexto de documentos**: Búsqueda semántica en vectores con Qdrant
- **Historial persistente**: Conversaciones guardadas en MySQL
- **Referencias a chunks**: Trazabilidad de fuentes usadas en cada respuesta

### 🤖 Multi-LLM Provider Support
- **Google Gemini 2.0 Flash**: Modelo rápido y eficiente (default)
- **OpenAI GPT-4.1 Nano**: Modelo compacto de alta calidad
- **Selector en UI**: Cambia de modelo durante la conversación
- **Precarga automática**: Ambos modelos listos al iniciar
- **Indicador visual**: Badge mostrando qué modelo generó cada respuesta

### 📄 Gestión de Documentos
- **Formatos soportados**: PDF, DOCX, PPTX, XLSX, TXT, CSV
- **Procesamiento asíncrono**: Celery + Redis para chunking
- **Embeddings semánticos**: Sentence Transformers (all-mpnet-base-v2)
- **Vector store**: Qdrant para búsqueda eficiente

### 📤 Exportación Profesional
- **Export a TXT**: Texto plano con formato Markdown convertido
- **Export a PDF**: Reportes profesionales con ReportLab
  - Estilos diferenciados por rol (Usuario/Asistente)
  - Sintaxis Markdown preservada (bold, italic, código)
  - Code blocks con fuente monoespaciada y fondo gris
  - Listas, headers y links formateados
- **Export por conversación**: Exporta solo el chat activo
- **Nombres descriptivos**: Archivos con timestamp único

## 🏗️ Arquitectura

### Backend (FastAPI)
```
backend/
├── api/routes/          # Endpoints REST
│   └── workspaces.py    # Chat, documents, conversations, exports
├── core/
│   ├── config.py        # Configuración centralizada
│   ├── llm_service.py   # Factory pattern para LLM providers
│   └── providers/       # Implementaciones de LLM
│       ├── llm_provider.py      # Abstract base class
│       ├── gemini_provider.py   # Google Gemini implementation
│       └── openai_provider.py   # OpenAI GPT implementation
├── models/
│   ├── workspace.py     # Modelo de workspaces
│   ├── document.py      # Modelo de documentos
│   ├── conversation.py  # Modelos de conversaciones y mensajes
│   └── schemas.py       # Pydantic schemas
└── processing/
    ├── parser.py        # Parseo de documentos
    ├── tasks.py         # Tareas Celery
    └── vector_store.py  # Integración con Qdrant
```

### Frontend (Next.js 16)
```
frontend/src/
├── app/                 # App router (Next.js 16)
├── components/
│   ├── chat-area.tsx    # Chat UI con streaming
│   ├── sidebar.tsx      # Navegación y selector de modelo
│   └── ui/              # shadcn/ui components
├── context/
│   └── WorkspaceContext.tsx  # Estado global
└── hooks/
    └── useApi.ts        # API client con streaming
```

## 🔧 Stack Tecnológico

- **Backend**: FastAPI, SQLAlchemy, Celery, Pydantic
- **Frontend**: Next.js 16 (Turbopack), TypeScript, React, Tailwind CSS, shadcn/ui
- **Base de Datos**: MySQL (metadata), Redis (cache/queue), Qdrant (vectores)
- **LLM**: Google Gemini 2.0 Flash, OpenAI GPT-4.1 Nano
- **Embeddings**: Sentence Transformers (all-mpnet-base-v2)
- **Documentos**: pypdf, python-docx, python-pptx, openpyxl, pdfplumber
- **PDF Generation**: ReportLab

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura:
- `GEMINI_API_KEY`: Tu API key de Google AI Studio
- `OPENAI_API_KEY`: Tu API key de OpenAI (opcional)
- `LLM_PROVIDER`: Proveedor por defecto ("gemini" o "openai")

### 2. Levantar con Docker Compose

```bash
docker-compose up -d --build
```

Esto iniciará:
- **Backend** (FastAPI): http://localhost:8000
- **Frontend** (Next.js): http://localhost:3000
- **MySQL**: Puerto 3307
- **Redis**: Puerto 6380
- **Qdrant**: Puerto 6334
- **Celery Worker**: Procesamiento en background

### 3. Acceder a la Aplicación

- 🌐 **Frontend**: http://localhost:3000
- 📚 **API Docs**: http://localhost:8000/docs
- 🔍 **Qdrant Dashboard**: http://localhost:6334/dashboard

## 📖 Uso

### Crear Workspace y Subir Documentos

1. Crea un nuevo workspace desde el sidebar
2. Haz clic en "Upload Document"
3. Selecciona archivos (PDF, DOCX, etc.)
4. Espera a que se procesen (estado: pending → processed)

### Chat con Multi-LLM

1. Selecciona un workspace con documentos procesados
2. Elige el modelo LLM desde el selector (Gemini 2.0 o GPT-4.1 Nano)
3. Escribe tu pregunta
4. Observa la respuesta en streaming
5. Cada respuesta muestra un badge con el modelo usado

### Exportar Conversaciones

1. Abre una conversación existente
2. Haz clic en "Export to TXT" o "Export to PDF"
3. El archivo descargará con:
   - Formato Markdown convertido a texto/PDF
   - Estilos profesionales en PDF
   - Timestamp y metadata de la conversación

## 🔧 Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f backend
docker-compose logs -f celery_worker
docker-compose logs -f frontend

# Reiniciar servicios
docker-compose restart backend
docker-compose restart frontend

# Detener todo
docker-compose down

# Limpiar volúmenes (CUIDADO: elimina datos)
docker-compose down -v

# Reconstruir desde cero
docker-compose up -d --build --force-recreate
```

## ⚙️ Configuración Avanzada

### Cambiar Modelo LLM por Defecto

En `backend/.env`:
```env
LLM_PROVIDER=openai  # o "gemini"
OPENAI_MODEL=gpt-4.1-nano-2025-04-14
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Ajustar Chunk Size para RAG

En `backend/processing/parser.py`:
```python
CHUNK_SIZE = 1000  # Caracteres por chunk
CHUNK_OVERLAP = 200  # Overlap entre chunks
```

### Configurar CORS

En `backend/.env`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://tu-dominio.com
```

## 🐛 Troubleshooting

### Backend no inicia
```bash
docker logs ia_backend
# Verificar que MySQL y Redis estén corriendo
docker-compose ps
```

### Frontend no conecta al backend
- Verifica que `NEXT_PUBLIC_API_URL` apunte a http://localhost:8000
- Revisa CORS en `backend/.env`

### Documentos no se procesan
```bash
docker logs ia_celery_worker
# Verificar conexión a Redis
docker exec ia_backend redis-cli -h redis ping
```

### Streaming se repite o duplica
- Problema resuelto con `activeStreamRef` en chat-area.tsx
- Cada stream tiene ID único para evitar updates de streams anteriores

### Export PDF corrupto
- Problema resuelto: ahora usa ReportLab correctamente
- Markdown se parsea y formatea con estilos profesionales

## 📚 Documentación Adicional

- **ENDPOINTS_API.md**: Documentación completa de endpoints REST
- **API Docs**: http://localhost:8000/docs (Swagger UI automático)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Add: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📝 Changelog

### v2.1 (Noviembre 19, 2025)
- ✅ Multi-LLM provider support (Gemini + OpenAI)
- ✅ Streaming con prevención de duplicación
- ✅ Export TXT/PDF con formato Markdown
- ✅ Indicador visual de modelo activo
- ✅ Precarga de providers al iniciar
- ✅ Provider caching para mejor performance

### v2.0 (Noviembre 2025)
- Sistema RAG completo
- Procesamiento asíncrono con Celery
- Historial de conversaciones persistente

---

**Última actualización**: Noviembre 19, 2025  
**Versión**: 2.1  
**Autor**: IvanBalandraCamacho
