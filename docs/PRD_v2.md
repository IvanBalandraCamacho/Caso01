# Product Requirements Document (PRD) v2.0
## Sistema de Análisis Inteligente de Documentos - TIVIT

---

**Fecha de actualización**: 5 de enero de 2026  
**Versión**: 2.0.0  
**Estado**: Producción

---

## 📋 Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Visión y Objetivos](#2-visión-y-objetivos)
3. [Usuarios y Personas](#3-usuarios-y-personas)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Funcionalidades Principales](#5-funcionalidades-principales)
6. [Requisitos Técnicos](#6-requisitos-técnicos)
7. [Flujos de Usuario](#7-flujos-de-usuario)
8. [APIs e Integraciones](#8-apis-e-integraciones)
9. [Seguridad y Compliance](#9-seguridad-y-compliance)
10. [Métricas de Éxito](#10-métricas-de-éxito)
11. [Roadmap](#11-roadmap)
12. [Anexos](#12-anexos)

---

## 1. Resumen Ejecutivo

### 1.1 Descripción del Producto

**TIVIT AI Document Analyzer** es una plataforma empresarial de análisis inteligente de documentos que combina tecnologías de **Retrieval-Augmented Generation (RAG)**, **múltiples modelos de lenguaje (LLMs)** y **servicios de Google Cloud Platform (GCP)** para automatizar el análisis de propuestas comerciales, RFPs y documentos empresariales.

### 1.2 Propuesta de Valor Única

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Eficiencia Radical** | Reduce análisis de documentos de horas a minutos | 70% reducción tiempo |
| **Precisión Contextual** | Respuestas basadas en conocimiento específico TIVIT | >95% precisión |
| **Multi-LLM** | Soporte para GPT-4, Gemini y modelos futuros | Flexibilidad total |
| **Generación Automática** | Propuestas profesionales DOCX/PDF en segundos | 5x productividad |
| **RAG Avanzado** | Búsqueda semántica en tiempo real sobre documentos | Contexto relevante |

### 1.3 Stack Tecnológico Principal

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 15 + React 18 + TypeScript + TailwindCSS + CopilotKit │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND                                  │
│  FastAPI + Python 3.10+ + SQLAlchemy + Celery + JWT Auth        │
├─────────────────────────────────────────────────────────────────┤
│                      AI / ML LAYER                               │
│  OpenAI GPT-4o-mini | Google Gemini | LangChain | Embeddings   │
├─────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                 │
│  MySQL 8.0 | Redis 7 | Qdrant (Vector DB)                       │
├─────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE                               │
│  Docker + Docker Compose | GCP Services                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Estado Actual del Producto

- **Fase**: MVP Completado + Mejoras CopilotKit
- **Usuarios Beta**: Activo
- **Documentos Procesados**: Producción
- **LLM Principal**: Configurable (GPT-4o-mini / Gemini)

---

## 2. Visión y Objetivos

### 2.1 Visión del Producto

> *"Transformar la manera en que TIVIT analiza y responde a propuestas comerciales, utilizando inteligencia artificial de última generación para convertir documentos complejos en insights accionables y propuestas profesionales en minutos."*

### 2.2 Objetivos de Negocio

| Objetivo | Métrica | Target Q1 2026 | Target Q4 2026 |
|----------|---------|----------------|----------------|
| **Adopción** | Usuarios Activos Mensuales | 100+ | 500+ |
| **Eficiencia** | Tiempo promedio por análisis | <15 min | <10 min |
| **Calidad** | Precisión de extracción | 95% | 98% |
| **ROI** | Retorno de inversión | Positivo | >200% |
| **Productividad** | Documentos por usuario/día | 10+ | 20+ |

### 2.3 Objetivos Técnicos

| Área | Métrica | Target |
|------|---------|--------|
| **Performance** | Latencia P95 chat | <3 segundos |
| **Performance** | Time to First Token | <1 segundo |
| **Disponibilidad** | Uptime mensual | 99.5% |
| **Escalabilidad** | Documentos/día | 1,000+ |
| **Seguridad** | Vulnerabilidades críticas | 0 |

### 2.4 Principios de Diseño

1. **AI-First**: La IA es el centro de la experiencia, no un complemento
2. **Context-Aware**: Respuestas siempre basadas en el contexto del workspace
3. **Enterprise-Ready**: Seguridad, auditoría y escalabilidad desde el diseño
4. **Developer-Friendly**: APIs limpias, documentadas y extensibles
5. **User-Centric**: Interfaz intuitiva inspirada en productos de consumo (Gemini, ChatGPT)

---

## 3. Usuarios y Personas

### 3.1 Persona Principal: Analista de Propuestas

| Atributo | Detalle |
|----------|---------|
| **Nombre** | María García |
| **Rol** | Analista Senior de Propuestas Comerciales |
| **Edad** | 32 años |
| **Experiencia** | 5+ años en pre-venta |
| **Frustración Principal** | Revisar RFPs de 100+ páginas manualmente |
| **Objetivo** | Entregar análisis completos en tiempo récord |
| **Herramientas Actuales** | Word, Excel, email, lectura manual |

**Jobs to Be Done:**
- Extraer requisitos técnicos de RFPs en <30 minutos
- Identificar fechas críticas y SLAs automáticamente
- Generar propuestas con formato corporativo TIVIT
- Comparar requisitos con capacidades de TIVIT

### 3.2 Persona Secundaria: Ejecutivo de Cuenta

| Atributo | Detalle |
|----------|---------|
| **Nombre** | Carlos Mendoza |
| **Rol** | Ejecutivo de Cuenta Senior |
| **Edad** | 38 años |
| **Experiencia** | 10+ años en ventas enterprise |
| **Frustración Principal** | Deadlines ajustados para responder RFPs |
| **Objetivo** | Cerrar más deals con propuestas de calidad |
| **Herramientas Actuales** | CRM, email, reuniones |

**Jobs to Be Done:**
- Revisar propuestas generadas antes de enviar
- Obtener resúmenes ejecutivos rápidos
- Validar que la propuesta cubre todos los requisitos

### 3.3 Persona Terciaria: Gerente de Operaciones

| Atributo | Detalle |
|----------|---------|
| **Nombre** | Ana Rodríguez |
| **Rol** | Gerente de Operaciones Comerciales |
| **Edad** | 45 años |
| **Experiencia** | 15+ años en gestión |
| **Frustración Principal** | Falta de visibilidad sobre estado de propuestas |
| **Objetivo** | Dashboard con métricas de equipo |
| **Herramientas Actuales** | BI tools, reportes manuales |

**Jobs to Be Done:**
- Ver métricas de uso del equipo
- Auditar análisis realizados
- Asegurar cumplimiento de procesos

---

## 4. Arquitectura del Sistema

### 4.1 Diagrama de Arquitectura

```
                                    ┌─────────────────┐
                                    │   Usuario/Web   │
                                    └────────┬────────┘
                                             │ HTTPS
                                             ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 15)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │  Landing     │ │  Workspace   │ │    Chat      │ │  CopilotKit  │      │
│  │  Page        │ │   Manager    │ │   Interface  │ │   Components │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                                             │
│  TanStack Query │ Ant Design │ Radix UI │ Framer Motion │ Socket.IO       │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ REST API + WebSocket + SSE
                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API (FastAPI)                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API Routes Layer                             │   │
│  │  /auth │ /workspaces │ /conversations │ /chat │ /copilot │ /rag    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Core Services Layer                           │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │   │
│  │  │ LLM Router │ │ RAG Client │ │ Intent     │ │ Document   │       │   │
│  │  │ (Multi-LLM)│ │            │ │ Detector   │ │ Generator  │       │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │   │
│  │  │ Chat       │ │ Checklist  │ │ GCP        │ │ Natural    │       │   │
│  │  │ Service    │ │ Analyzer   │ │ Service    │ │ Language   │       │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Middleware: CORS │ Rate Limiting │ Security Headers │ JWT Auth            │
└────────┬────────────────────┬────────────────────┬──────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     MySQL 8.0   │  │    Redis 7      │  │  RAG Service    │
│    (Metadata)   │  │ (Cache/Queue)   │  │   (FastAPI)     │
│                 │  │                 │  │                 │
│ • Users         │  │ • Session Cache │  │ • LangChain     │
│ • Workspaces    │  │ • Rate Limiting │  │ • Embeddings    │
│ • Conversations │  │ • Celery Queue  │  │ • Chunking      │
│ • Documents     │  │ • LLM Cache     │  │                 │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────┐
                                          │     Qdrant      │
                                          │   (Vector DB)   │
                                          │                 │
                                          │ • Embeddings    │
                                          │ • Similarity    │
                                          │ • Filtering     │
                                          └─────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │    OpenAI API   │  │   Google Cloud  │  │    CopilotKit   │            │
│  │                 │  │    Platform     │  │     Runtime     │            │
│  │  • GPT-4o-mini  │  │                 │  │                 │            │
│  │  • GPT-4        │  │  • Gemini Pro   │  │  • Actions      │            │
│  │  • Embeddings   │  │  • Document AI  │  │  • Context      │            │
│  │                 │  │  • NL API       │  │  • Streaming    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes del Sistema

#### 4.2.1 Frontend (Next.js 15)

| Componente | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| **App Router** | Next.js 15 | Routing, SSR, API Routes |
| **UI Components** | Ant Design + Radix UI + shadcn/ui | Interfaz de usuario |
| **State Management** | TanStack Query | Cache, fetching, mutations |
| **Chat System** | Custom + CopilotKit | Interfaz de chat con IA |
| **Real-time** | Socket.IO | WebSocket para notificaciones |
| **Forms** | React Hook Form + Zod | Validación de formularios |
| **Styling** | TailwindCSS + CSS Variables | Estilos responsive |

**Páginas Principales:**
- `/` - Landing Page (estilo Gemini)
- `/login` - Autenticación
- `/register` - Registro de usuarios
- `/workspace` - Hub de espacios de trabajo
- `/workspace/[id]` - Workspace individual
- `/workspace/[id]/chat` - Chat con IA
- `/workspace/[id]/quick-analysis` - Análisis rápido con CopilotKit
- `/profile` - Perfil de usuario

#### 4.2.2 Backend (FastAPI)

| Módulo | Archivo Principal | Funcionalidad |
|--------|-------------------|---------------|
| **Auth** | `api/routes/auth.py` | JWT, login, registro |
| **Workspaces** | `api/routes/workspaces.py` | CRUD workspaces, documentos |
| **Conversations** | `api/routes/conversations.py` | Historial, mensajes |
| **Chat** | `core/chat_service.py` | Lógica de chat con RAG |
| **CopilotKit** | `api/routes/copilot.py` | Endpoint para CopilotKit |
| **Document Gen** | `api/routes/document_generation.py` | DOCX/PDF export |
| **RAG Proxy** | `api/routes/rag_proxy.py` | Proxy a RAG service |
| **Intent** | `core/intent_detector.py` | Clasificación de intenciones |
| **LLM Router** | `core/llm_router.py` | Selección de modelo LLM |
| **GCP Services** | `core/gcp_service.py` | Gemini, Document AI, NL |
| **Checklist** | `core/checklist_analyzer.py` | Análisis estructurado |
| **Dashboard** | `api/routes/dashboard.py` | Métricas y analytics |
| **WebSocket** | `api/routes/notifications_ws.py` | Notificaciones real-time |

#### 4.2.3 RAG Service (Microservicio)

| Componente | Tecnología | Función |
|------------|------------|---------|
| **Text Splitter** | LangChain RecursiveCharacterTextSplitter | Chunking de documentos |
| **Embeddings** | Sentence Transformers (all-MiniLM-L6-v2) | Vectorización local |
| **Vector Store** | Qdrant | Almacenamiento y búsqueda |
| **API** | FastAPI | Endpoints REST |

**Configuración de Chunking:**
```python
chunk_size = 1000        # caracteres por chunk
chunk_overlap = 200      # overlap para mantener contexto
separators = ["\n\n", "\n", ". ", " "]
```

#### 4.2.4 Bases de Datos

| Database | Propósito | Datos |
|----------|-----------|-------|
| **MySQL 8.0** | Relacional | Users, Workspaces, Conversations, Documents, Messages |
| **Redis 7** | Cache/Queue | Sessions, Rate Limiting, Celery Queue, LLM Cache |
| **Qdrant** | Vectorial | Embeddings de documentos, Metadata, Índices HNSW |

### 4.3 Flujo de Datos

#### Flujo de Procesamiento de Documentos

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Upload  │───▶│ Validate│───▶│ Extract │───▶│  Chunk  │───▶│ Embed   │
│ File    │    │ Format  │    │  Text   │    │  Text   │    │ & Index │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
Frontend       Backend        Backend        RAG Service    Qdrant
                              (PyMuPDF,      (LangChain)
                              python-docx)
```

#### Flujo de Chat con RAG

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ User    │───▶│ Detect  │───▶│ Semantic│───▶│ Build   │───▶│ LLM     │
│ Message │    │ Intent  │    │ Search  │    │ Context │    │ Generate│
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
Frontend       Intent         RAG Service    Chat Service  GPT-4/Gemini
               Detector       + Qdrant                      (Streaming)
```

---

## 5. Funcionalidades Principales

### 5.1 Gestión de Workspaces

#### F-001: Crear Workspace

| Campo | Detalle |
|-------|---------|
| **Descripción** | Crear espacios de trabajo aislados para proyectos |
| **Prioridad** | P0 (Crítica) |
| **Estado** | ✅ Implementado |

**Criterios de Aceptación:**
- [ ] Usuario puede crear workspace con nombre y descripción
- [ ] Instrucciones personalizadas opcionales
- [ ] Conversación por defecto creada automáticamente
- [ ] Validación de nombre único por usuario

**Endpoint:** `POST /api/v1/workspaces`

```json
// Request
{
  "name": "RFP Cliente Banco XYZ",
  "description": "Análisis de RFP para proyecto de migración cloud",
  "instructions": "Considerar servicios de Azure y normativas bancarias"
}

// Response
{
  "id": "uuid-v4",
  "name": "RFP Cliente Banco XYZ",
  "description": "...",
  "instructions": "...",
  "created_at": "2026-01-05T10:00:00Z",
  "is_active": true,
  "default_conversation_id": "conv-uuid",
  "document_count": 0
}
```

#### F-002: Upload de Documentos

| Campo | Detalle |
|-------|---------|
| **Descripción** | Subir y procesar documentos al workspace |
| **Prioridad** | P0 (Crítica) |
| **Estado** | ✅ Implementado |

**Formatos Soportados:**
- PDF (hasta 10 MB)
- DOCX (hasta 10 MB)
- TXT (hasta 5 MB)
- CSV (hasta 5 MB)
- XLSX (hasta 10 MB)

**Estados de Procesamiento:**
```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED
```

**Endpoint:** `POST /api/v1/workspaces/{workspace_id}/documents`

### 5.2 Sistema de Chat Inteligente

#### F-003: Chat con RAG

| Campo | Detalle |
|-------|---------|
| **Descripción** | Conversación contextual con búsqueda semántica |
| **Prioridad** | P0 (Crítica) |
| **Estado** | ✅ Implementado |

**Características:**
- Streaming de respuestas en tiempo real (SSE)
- Historial de conversación con contexto
- Búsqueda semántica en documentos subidos
- Detección automática de intenciones
- Soporte multi-LLM (GPT-4, Gemini)

**Endpoint:** `POST /api/v1/workspaces/{workspace_id}/chat`

```json
// Request
{
  "message": "¿Cuáles son los requisitos técnicos del RFP?",
  "conversation_id": "conv-uuid",
  "stream": true
}

// Response (SSE Stream)
data: {"content": "Según", "type": "chunk"}
data: {"content": " el", "type": "chunk"}
data: {"content": " documento", "type": "chunk"}
...
data: {"type": "done", "sources": [...]}
```

#### F-004: Detección de Intenciones

| Campo | Detalle |
|-------|---------|
| **Descripción** | Clasificación automática de intención del usuario |
| **Prioridad** | P1 (Alta) |
| **Estado** | ✅ Implementado |

**Intenciones Soportadas:**

| Intención | Trigger | Comportamiento |
|-----------|---------|----------------|
| `CHECKLIST_ANALYSIS` | "analiza con checklist" | Invoca ChecklistAnalyzer |
| `DOCUMENT_GENERATION` | "genera propuesta" | Inicia DocumentGenerator |
| `GENERAL_QUESTION` | Pregunta genérica | RAG + LLM estándar |
| `COMPARISON` | "compara documentos" | Análisis comparativo |
| `EXTRACTION` | "extrae fechas/requisitos" | Extracción estructurada |

### 5.3 CopilotKit Integration

#### F-005: Análisis Rápido de RFP

| Campo | Detalle |
|-------|---------|
| **Descripción** | Módulo de análisis con CopilotKit SDK |
| **Prioridad** | P1 (Alta) |
| **Estado** | ✅ Implementado |

**Componentes UI:**
- `CopilotPanel` - Chat flotante
- `CopilotSidebar` - Panel lateral
- `SmartTextarea` - Autocompletado inteligente
- `QuickCommands` - Comandos predefinidos

**Acciones Disponibles:**
```typescript
// Acciones definidas en useCopilotActions.ts
- quickAnalysis: Análisis rápido de documento
- extractDates: Extraer fechas y plazos
- extractRequirements: Extraer requisitos técnicos
- identifyRisks: Identificar riesgos potenciales
- generateSummary: Generar resumen ejecutivo
```

**Endpoint Backend:** `POST /api/copilotkit`

### 5.4 Generación de Documentos

#### F-006: Exportar Propuesta DOCX/PDF

| Campo | Detalle |
|-------|---------|
| **Descripción** | Generar documentos profesionales formateados |
| **Prioridad** | P1 (Alta) |
| **Estado** | ✅ Implementado |

**Plantilla de Documento:**
1. Portada con logo TIVIT
2. Índice automático
3. Resumen Ejecutivo
4. Objetivos del Proyecto
5. Alcance y Entregables
6. Cronograma Propuesto
7. Equipo de Trabajo
8. Presupuesto
9. Términos y Condiciones

**Endpoints:**
- `GET /api/v1/conversations/{id}/proposal/download?format=docx`
- `GET /api/v1/conversations/{id}/proposal/download?format=pdf`

### 5.5 Dashboard y Analytics

#### F-007: Dashboard de Métricas

| Campo | Detalle |
|-------|---------|
| **Descripción** | Visualización de métricas de uso |
| **Prioridad** | P2 (Media) |
| **Estado** | ✅ Implementado |

**Métricas Disponibles:**
- Documentos procesados (total/día/semana)
- Mensajes de chat (total/usuario)
- Tiempo promedio de respuesta
- Uso de tokens LLM
- Workspaces activos

### 5.6 Autenticación y Seguridad

#### F-008: Sistema de Autenticación

| Campo | Detalle |
|-------|---------|
| **Descripción** | Registro, login y gestión de sesiones |
| **Prioridad** | P0 (Crítica) |
| **Estado** | ✅ Implementado |

**Características:**
- Registro con validación de email
- Login con JWT (30 min expiración)
- Hashing bcrypt para contraseñas
- Rate limiting en endpoints de auth

**Endpoints:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

---

## 6. Requisitos Técnicos

### 6.1 Requisitos de Infraestructura

#### Producción (Recomendado)

| Componente | Especificación |
|------------|----------------|
| **Backend Server** | 4 vCPU, 8 GB RAM, 100 GB SSD |
| **MySQL** | 2 vCPU, 4 GB RAM, 50 GB SSD |
| **Redis** | 1 vCPU, 2 GB RAM |
| **Qdrant** | 2 vCPU, 4 GB RAM, 20 GB SSD |
| **RAG Service** | 2 vCPU, 4 GB RAM |

#### Desarrollo (Mínimo)

| Componente | Especificación |
|------------|----------------|
| **Máquina Local** | 8 GB RAM, 20 GB disco |
| **Docker Desktop** | 4 GB RAM asignados |

### 6.2 Dependencias de Software

#### Backend (Python 3.10+)

```
fastapi>=0.110
uvicorn[standard]
sqlalchemy>=2.0
pydantic-settings
pyjwt
passlib[bcrypt]
celery>=5.3
redis
httpx
openai>=1.54.0
google-cloud-aiplatform>=1.40.0
google-generativeai>=0.8.3
python-docx
reportlab
pdfplumber
copilotkit
```

#### Frontend (Node.js 18+)

```json
{
  "next": "15.1.0",
  "react": "^18.3.1",
  "@copilotkit/react-core": "1.3.15",
  "@copilotkit/react-ui": "1.3.15",
  "@tanstack/react-query": "^5.60.0",
  "antd": "latest",
  "axios": "^1.7.7",
  "socket.io-client": "latest"
}
```

### 6.3 APIs Externas Requeridas

| API | Uso | Rate Limits |
|-----|-----|-------------|
| **OpenAI** | GPT-4o-mini, embeddings | 10k req/min |
| **Google Cloud** | Gemini Pro, Document AI | Variable |
| **CopilotKit** | SDK runtime | Incluido |

### 6.4 Requisitos de Performance

| Métrica | Target | Actual |
|---------|--------|--------|
| Latencia Chat P95 | <3s | ~2.5s |
| Time to First Token | <1s | ~0.8s |
| Upload (validación) | <2s | ~1.5s |
| Procesamiento Doc | <30s | ~20s |
| Generación DOCX | <5s | ~4s |
| Generación PDF | <8s | ~6s |
| Búsqueda semántica | <500ms | ~300ms |

---

## 7. Flujos de Usuario

### 7.1 Flujo Principal: Análisis de RFP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: ANÁLISIS DE PROPUESTA RFP                     │
└─────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────┐
                           │   LOGIN     │
                           │  Usuario    │
                           └──────┬──────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │   WORKSPACE HUB        │
                     │   Seleccionar/Crear    │
                     └───────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
         ┌──────────┐     ┌──────────┐     ┌──────────┐
         │ Crear    │     │ Abrir    │     │ Ver      │
         │ Nuevo    │     │ Existente│     │ Dashboard│
         └────┬─────┘     └────┬─────┘     └──────────┘
              │                │
              └───────┬────────┘
                      │
                      ▼
              ┌───────────────┐
              │   WORKSPACE   │
              │   Interface   │
              └───────┬───────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Upload   │ │ Chat IA  │ │ Quick    │
   │ Docs     │ │          │ │ Analysis │
   └────┬─────┘ └────┬─────┘ └────┬─────┘
        │            │            │
        ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │Processing│ │ RAG +    │ │CopilotKit│
   │ Async    │ │ LLM      │ │ Actions  │
   └────┬─────┘ └────┬─────┘ └────┬─────┘
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
              ┌───────────────┐
              │   GENERAR     │
              │   PROPUESTA   │
              └───────┬───────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
        ┌──────────┐   ┌──────────┐
        │ Download │   │ Download │
        │  DOCX    │   │   PDF    │
        └──────────┘   └──────────┘
```

### 7.2 Detalle: Proceso de Chat con RAG

**Paso a Paso:**

1. **Usuario envía mensaje**
   - Frontend captura input
   - Valida longitud y contenido
   - Envía a backend via `POST /chat`

2. **Backend procesa request**
   - Autentica usuario (JWT)
   - Carga historial de conversación
   - Invoca Intent Detector

3. **Intent Detection**
   - Analiza mensaje con prompt ligero
   - Clasifica intención
   - Enruta a handler apropiado

4. **Búsqueda Semántica**
   - Envía query a RAG Service
   - RAG genera embedding del query
   - Busca top-K chunks similares en Qdrant
   - Retorna chunks con metadata

5. **Construcción de Contexto**
   - Combina: System Prompt + Workspace Instructions + Chunks + History + Query
   - Trunca si excede límite de tokens

6. **Llamada a LLM**
   - Selecciona modelo (GPT-4o-mini o Gemini)
   - Configura temperatura y tokens
   - Inicia streaming SSE

7. **Streaming de Respuesta**
   - Backend transmite tokens via SSE
   - Frontend renderiza progresivamente
   - Muestra indicador de typing

8. **Persistencia**
   - Guarda mensaje usuario en BD
   - Guarda respuesta asistente en BD
   - Actualiza historial de conversación

---

## 8. APIs e Integraciones

### 8.1 API REST - Endpoints Principales

#### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Registro de usuario |
| POST | `/api/v1/auth/login` | Login, obtiene JWT |
| GET | `/api/v1/auth/me` | Info del usuario actual |

#### Workspaces

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/workspaces` | Listar workspaces |
| POST | `/api/v1/workspaces` | Crear workspace |
| GET | `/api/v1/workspaces/{id}` | Obtener workspace |
| PUT | `/api/v1/workspaces/{id}` | Actualizar workspace |
| DELETE | `/api/v1/workspaces/{id}` | Eliminar workspace |
| POST | `/api/v1/workspaces/{id}/documents` | Upload documento |
| GET | `/api/v1/workspaces/{id}/documents` | Listar documentos |

#### Chat y Conversaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/workspaces/{id}/conversations` | Listar conversaciones |
| POST | `/api/v1/workspaces/{id}/conversations` | Crear conversación |
| POST | `/api/v1/workspaces/{id}/chat` | Enviar mensaje (streaming) |
| GET | `/api/v1/conversations/{id}/messages` | Historial de mensajes |

#### CopilotKit

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/copilotkit` | Endpoint CopilotKit runtime |

#### Generación de Documentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/conversations/{id}/proposal/download` | Descargar propuesta |
| POST | `/api/v1/conversations/{id}/proposal/generate` | Generar propuesta |

### 8.2 WebSocket

**Conexión:** `ws://backend:8000/api/v1/ws/{workspace_id}?token={jwt}`

**Eventos:**

```json
// Documento en procesamiento
{
  "type": "document_processing",
  "document_id": "uuid",
  "status": "PROCESSING",
  "progress": 50
}

// Documento completado
{
  "type": "document_completed",
  "document_id": "uuid",
  "status": "COMPLETED",
  "chunks_count": 42
}

// Error
{
  "type": "document_failed",
  "document_id": "uuid",
  "error": "Formato no soportado"
}
```

### 8.3 Integración con OpenAI

```python
# Configuración de llamada
{
    "model": "gpt-4o-mini",
    "messages": [...],
    "temperature": 0.7,
    "max_tokens": 2000,
    "stream": True
}
```

**Manejo de Errores:**
- 429 (Rate Limit): Retry exponential backoff
- 401 (Auth): Alerta a admin
- 500 (Server): Fallback a modelo alternativo

### 8.4 Integración con Google Cloud

**Servicios Habilitados:**

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **Gemini Pro** | LLM alternativo | `LLM_PROVIDER=gemini` |
| **Document AI** | OCR avanzado | `DOCUMENT_AI_PROCESSOR_ID` |
| **Natural Language API** | Análisis de sentimiento | `ENABLE_NATURAL_LANGUAGE=true` |

---

## 9. Seguridad y Compliance

### 9.1 Autenticación y Autorización

| Mecanismo | Implementación |
|-----------|----------------|
| **Autenticación** | JWT con HS256, 30 min expiry |
| **Hashing** | bcrypt con salt rounds=12 |
| **Autorización** | Owner-based (usuario solo ve sus recursos) |
| **Rate Limiting** | SlowAPI + Redis |

### 9.2 Rate Limits

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `/auth/login` | 5 req | 1 minuto |
| `/chat` | 20 req | 1 minuto |
| `/documents` | 10 req | 1 minuto |
| `/search` | 30 req | 1 minuto |

### 9.3 Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### 9.4 Validación de Entrada

- Pydantic models para validación estricta
- Sanitización de nombres de archivo
- Whitelist de extensiones permitidas
- Límite de tamaño: 10 MB por archivo

### 9.5 Logging y Auditoría

**Eventos Auditados:**
- Login/logout
- Creación/eliminación de recursos
- Upload de documentos
- Generación de documentos
- Errores de autenticación

**Formato de Log:**
```json
{
  "timestamp": "2026-01-05T10:00:00Z",
  "level": "INFO",
  "user_id": "uuid",
  "action": "document_upload",
  "workspace_id": "uuid",
  "metadata": {
    "filename": "rfp.pdf",
    "size_bytes": 1048576
  }
}
```

---

## 10. Métricas de Éxito

### 10.1 KPIs de Producto

| Categoría | Métrica | Target Q1 2026 |
|-----------|---------|----------------|
| **Adopción** | MAU | 100+ |
| **Adopción** | Workspaces creados | 500+ |
| **Adopción** | Documentos procesados | 5,000+ |
| **Engagement** | Sesiones/usuario/mes | 10+ |
| **Engagement** | Mensajes/sesión | 8+ |
| **Satisfacción** | NPS | >50 |
| **Retención** | Retención 30 días | >60% |

### 10.2 KPIs Técnicos

| Categoría | Métrica | Target |
|-----------|---------|--------|
| **Performance** | P95 latencia chat | <3s |
| **Performance** | Tasa de éxito procesamiento | >98% |
| **Disponibilidad** | Uptime | 99.5% |
| **Infraestructura** | CPU utilization | <70% |
| **Infraestructura** | Error rate | <0.1% |

### 10.3 KPIs de Negocio

| Métrica | Target |
|---------|--------|
| Tiempo ahorrado por propuesta | >2 horas |
| Reducción de errores | >50% |
| Incremento productividad | 3-5x |
| Costo por usuario/mes | <$5 |

---

## 11. Roadmap

### Fase Actual: MVP + CopilotKit ✅

**Estado:** COMPLETADO (Q4 2025)

- ✅ Backend API completo (FastAPI)
- ✅ Frontend Next.js 15
- ✅ Autenticación JWT
- ✅ Gestión de workspaces
- ✅ Upload y procesamiento de documentos
- ✅ Chat con RAG (multi-LLM)
- ✅ Generación DOCX/PDF
- ✅ CopilotKit integration
- ✅ Dashboard básico
- ✅ Docker Compose deployment

### Fase 2: Enterprise Features (Q1 2026)

**Prioridades:**

| Feature | Prioridad | Estado |
|---------|-----------|--------|
| Compartir workspaces | P0 | 🔜 Planificado |
| Roles y permisos (RBAC) | P0 | 🔜 Planificado |
| SSO / Azure AD | P1 | 📋 Backlog |
| Templates personalizados | P1 | 📋 Backlog |
| Auditoría avanzada | P1 | 📋 Backlog |
| API pública documentada | P2 | 📋 Backlog |

### Fase 3: AI Avanzado (Q2 2026)

**Prioridades:**

| Feature | Prioridad |
|---------|-----------|
| Fine-tuning de modelos | P1 |
| OCR para escaneados | P1 |
| Multi-idioma (ES/EN/PT) | P1 |
| Análisis de sentimiento | P2 |
| Comparación multi-documento | P2 |

### Fase 4: Integraciones (Q3 2026)

**Prioridades:**

| Integración | Tipo |
|-------------|------|
| Google Drive / OneDrive | Storage |
| Salesforce / HubSpot | CRM |
| Slack / Teams | Comunicación |
| DocuSign / Adobe Sign | Firma digital |
| Zapier / Make | Automatización |

---

## 12. Anexos

### 12.1 Variables de Entorno

```env
# Database
DATABASE_URL=mysql+pymysql://user:pass@mysql:3306/ia_db
REDIS_URL=redis://redis:6379

# LLM Providers
LLM_PROVIDER=gemini  # o "openai"
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# GCP
GOOGLE_CLOUD_PROJECT=tivit-caso01
GOOGLE_APPLICATION_CREDENTIALS=/app/caso01-gcp-key.json
DOCUMENT_AI_PROCESSOR_ID=...
ENABLE_NATURAL_LANGUAGE=true

# RAG Service
RAG_SERVICE_URL=http://rag-service:8080
RAG_SERVICE_ENABLED=true

# Security
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 12.2 Comandos de Desarrollo

```bash
# Levantar entorno completo
docker-compose up -d

# Solo backend (desarrollo)
cd backend && uvicorn main:app --reload

# Solo frontend (desarrollo)
cd front-v2 && pnpm dev

# Migraciones de BD
cd backend && alembic upgrade head

# Logs
docker-compose logs -f backend
```

### 12.3 Glosario

| Término | Definición |
|---------|------------|
| **RAG** | Retrieval-Augmented Generation - Técnica que combina búsqueda con generación |
| **LLM** | Large Language Model - Modelo de lenguaje grande |
| **Embedding** | Representación vectorial de texto |
| **Chunk** | Fragmento de documento para procesamiento |
| **Vector DB** | Base de datos optimizada para búsqueda vectorial |
| **SSE** | Server-Sent Events - Streaming unidireccional |
| **JWT** | JSON Web Token - Estándar de autenticación |

### 12.4 Contacto

| Rol | Responsable |
|-----|-------------|
| Product Owner | [TBD] |
| Tech Lead | [TBD] |
| Backend Lead | [TBD] |
| Frontend Lead | [TBD] |

---

**Documento Confidencial - TIVIT**  
**Versión 2.0.0 - Enero 2026**
