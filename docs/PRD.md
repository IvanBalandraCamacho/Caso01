# Product Requirements Document (PRD)
## Sistema de Análisis de Documentos con IA - TIVIT

---

## 📋 Tabla de Contenidos
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Objetivos del Producto](#objetivos-del-producto)
3. [Alcance del Proyecto](#alcance-del-proyecto)
4. [Usuarios y Stakeholders](#usuarios-y-stakeholders)
5. [Arquitectura del Sistema](#arquitectura-del-sistema)
6. [Funcionalidades Principales](#funcionalidades-principales)
7. [Requisitos Técnicos](#requisitos-técnicos)
8. [Flujos de Usuario](#flujos-de-usuario)
9. [Integraciones y APIs](#integraciones-y-apis)
10. [Seguridad y Cumplimiento](#seguridad-y-cumplimiento)
11. [Métricas de Éxito](#métricas-de-éxito)
12. [Roadmap](#roadmap)

---

## 1. Resumen Ejecutivo

### 1.1 Visión del Producto
Sistema empresarial de análisis inteligente de documentos que utiliza **Retrieval-Augmented Generation (RAG)** y múltiples modelos de lenguaje (LLMs) para:
- Automatizar el análisis de propuestas comerciales
- Extraer información clave de documentos empresariales
- Generar respuestas contextualizadas basadas en conocimiento específico de TIVIT
- Producir documentos formateados automáticamente

### 1.2 Propuesta de Valor
- **Eficiencia**: Reduce el tiempo de análisis de documentos de horas a minutos
- **Precisión**: Análisis contextual basado en conocimiento empresarial específico
- **Escalabilidad**: Procesamiento asíncrono de múltiples documentos simultáneamente
- **Trazabilidad**: Historial completo de conversaciones y análisis realizados

### 1.3 Estado Actual
- **Versión**: 1.0.0
- **Entorno**: Producción en contenedores Docker
- **Stack Principal**: FastAPI + Next.js + RAG Service
- **Modelo LLM**: OpenAI GPT-4o-mini

---

## 2. Objetivos del Producto

### 2.1 Objetivos de Negocio
- **Automatización**: Reducir en un 70% el tiempo de análisis manual de documentos
- **Calidad**: Mantener >95% de precisión en extracción de información clave
- **Adopción**: Alcanzar 100+ usuarios activos en los primeros 6 meses
- **ROI**: Generar retorno de inversión positivo en 12 meses

### 2.2 Objetivos Técnicos
- **Performance**: Respuestas de chat <3 segundos promedio
- **Disponibilidad**: 99.5% uptime mensual
- **Escalabilidad**: Soportar 1000+ documentos procesados por día
- **Extensibilidad**: Arquitectura modular para agregar nuevos LLMs

### 2.3 Objetivos de Usuario
- **Facilidad de Uso**: Onboarding <5 minutos
- **Satisfacción**: NPS >50
- **Productividad**: Usuarios procesan 5x más documentos que manualmente

---

## 3. Alcance del Proyecto

### 3.1 En Alcance (MVP Actual)

#### 3.1.1 Gestión de Workspaces
- ✅ Crear, listar y gestionar workspaces
- ✅ Asociar instrucciones personalizadas por workspace
- ✅ Subir múltiples documentos por workspace
- ✅ Visualizar estado de procesamiento de documentos

#### 3.1.2 Sistema de Chat Inteligente
- ✅ Conversaciones multi-turno con contexto
- ✅ Búsqueda semántica en documentos subidos
- ✅ Respuestas basadas en RAG (Retrieval-Augmented Generation)
- ✅ Streaming de respuestas en tiempo real
- ✅ Historial de conversaciones

#### 3.1.3 Procesamiento de Documentos
- ✅ Soporte para PDF, DOCX, TXT, CSV, XLSX
- ✅ Extracción y chunking inteligente de texto
- ✅ Indexación en base de datos vectorial (Qdrant)
- ✅ Procesamiento asíncrono con Celery
- ✅ Validación de duplicados

#### 3.1.4 Generación de Documentos
- ✅ Exportación de propuestas en formato DOCX
- ✅ Exportación de propuestas en formato PDF
- ✅ Plantillas profesionales con marca TIVIT
- ✅ Descarga directa desde conversación

#### 3.1.5 Autenticación y Seguridad
- ✅ Sistema de autenticación JWT
- ✅ Registro y login de usuarios
- ✅ Rate limiting en endpoints críticos
- ✅ CORS restrictivo configurado
- ✅ Headers de seguridad (HSTS, CSP, etc.)

### 3.2 Fuera de Alcance (Fase 1)
- ❌ Autenticación multi-factor (MFA)
- ❌ Integración con Active Directory / SSO
- ❌ Análisis de imágenes dentro de PDFs
- ❌ OCR para documentos escaneados
- ❌ Múltiples idiomas (solo español/inglés)
- ❌ Exportación a formatos adicionales (PPTX, HTML)
- ❌ Sistema de permisos granulares por usuario/workspace

---

## 4. Usuarios y Stakeholders

### 4.1 Usuarios Principales

#### 4.1.1 Analistas de Propuestas
- **Rol**: Evaluar propuestas comerciales
- **Necesidades**:
  - Análisis rápido de documentos largos
  - Extracción de requisitos y cronogramas
  - Comparación con conocimiento de TIVIT
- **Pain Points**:
  - Revisión manual toma 2-4 horas por documento
  - Información clave difícil de encontrar
  - Inconsistencias en formato de salida

#### 4.1.2 Ejecutivos de Cuenta
- **Rol**: Preparar respuestas a RFPs/RFQs
- **Necesidades**:
  - Generación rápida de propuestas
  - Acceso a información histórica
  - Documentos profesionales automáticos
- **Pain Points**:
  - Deadlines ajustados
  - Necesidad de revisar múltiples documentos de referencia

#### 4.1.3 Gerentes de Proyectos
- **Rol**: Supervisar múltiples propuestas
- **Necesidades**:
  - Vista consolidada de workspaces
  - Trazabilidad de análisis realizados
  - Métricas de procesamiento
- **Pain Points**:
  - Falta de visibilidad sobre estado de documentos
  - Dificultad para auditar decisiones

### 4.2 Stakeholders Secundarios

#### 4.2.1 IT/DevOps
- **Interés**: Estabilidad, seguridad, mantenibilidad
- **Responsabilidades**: Despliegue, monitoreo, actualizaciones

#### 4.2.2 Legal/Compliance
- **Interés**: Protección de datos, cumplimiento normativo
- **Responsabilidades**: Auditoría de seguridad, políticas de retención

#### 4.2.3 Liderazgo Ejecutivo
- **Interés**: ROI, adopción, ventaja competitiva
- **Responsabilidades**: Aprobación de inversión, estrategia

---

## 5. Arquitectura del Sistema

### 5.1 Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                  Next.js 14 (front-v2)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Chat UI    │  │  Workspaces  │  │  Documents   │     │
│  │   (React)    │  │   Manager    │  │   Viewer     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST + WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                       BACKEND API                           │
│                     FastAPI (Python)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │   Chat   │  │Documents │  │   RAG    │  │
│  │ Service  │  │ Service  │  │ Service  │  │  Proxy   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  Core Components:                                           │
│  • LLM Router (GPT-4o-mini)                                │
│  • Intent Detector                                          │
│  • Document Generator (DOCX/PDF)                           │
│  • Checklist Analyzer                                       │
└─────────────┬───────────────────────────┬───────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│      DATABASES          │  │     RAG SERVICE         │
│  ┌─────────────────┐   │  │   (Python + FastAPI)    │
│  │  MySQL 8.0      │   │  │  ┌──────────────────┐   │
│  │  (Metadata)     │   │  │  │ Text Splitter   │   │
│  └─────────────────┘   │  │  │ (LangChain)     │   │
│  ┌─────────────────┐   │  │  └──────────────────┘   │
│  │  Redis 7        │   │  │  ┌──────────────────┐   │
│  │  (Cache/Queue)  │   │  │  │ Embeddings      │   │
│  └─────────────────┘   │  │  │ (Local Model)   │   │
│  ┌─────────────────┐   │  │  └──────────────────┘   │
│  │  Qdrant         │   │  │                          │
│  │  (Vectors)      │◄──┼──┤  Vector Operations       │
│  └─────────────────┘   │  └─────────────────────────┘
└─────────────────────────┘
```

### 5.2 Componentes Principales

#### 5.2.1 Frontend (Next.js 14 - front-v2)
**Tecnologías:**
- Next.js 14 con App Router
- React 18 + TypeScript
- TanStack Query para gestión de estado
- Ant Design + Radix UI para componentes
- Axios para HTTP requests
- Socket.IO para WebSocket (notificaciones en tiempo real)

**Responsabilidades:**
- Interfaz de usuario responsive
- Gestión de sesiones y autenticación
- Upload de archivos con validación
- Streaming de respuestas de chat
- Vista previa de documentos
- Notificaciones en tiempo real

#### 5.2.2 Backend API (FastAPI)
**Tecnologías:**
- Python 3.10+
- FastAPI + Uvicorn
- SQLAlchemy (ORM)
- Pydantic (validación)
- Celery (tareas asíncronas)
- JWT para autenticación

**Módulos Principales:**

**api/routes/**
- `auth.py`: Login, registro, gestión de tokens
- `workspaces.py`: CRUD workspaces, upload documentos
- `conversations.py`: Chat, historial, streaming
- `document_generation.py`: Exportación DOCX/PDF
- `rag_proxy.py`: Proxy a RAG service
- `notifications_ws.py`: WebSocket para notificaciones

**core/**
- `llm_service.py`: Gestión de llamadas a OpenAI
- `llm_router.py`: Selección inteligente de modelo
- `chat_service.py`: Lógica de conversación
- `document_service.py`: Generación de documentos
- `rag_client.py`: Cliente HTTP para RAG service
- `intent_detector.py`: Clasificación de intenciones
- `security.py`: Hashing, JWT, validaciones

**models/**
- `user.py`: Usuario, credenciales
- `workspace.py`: Workspace, configuración
- `conversation.py`: Conversation, Message
- `document.py`: Document, chunks, metadata

#### 5.2.3 RAG Service (Microservicio)
**Tecnologías:**
- Python 3.10+
- FastAPI
- LangChain Text Splitters
- Sentence Transformers (embeddings locales)
- Qdrant Client

**Funcionalidades:**
- Ingestión de documentos (PDF, DOCX, TXT, etc.)
- Chunking inteligente con RecursiveCharacterTextSplitter
- Generación de embeddings con modelo local
- Indexación en Qdrant con metadata
- Búsqueda semántica con filtros
- Gestión de colecciones por workspace/conversation

#### 5.2.4 Bases de Datos

**MySQL 8.0**
- **Propósito**: Base de datos relacional principal
- **Contenido**:
  - Usuarios y credenciales
  - Workspaces y configuraciones
  - Conversaciones y mensajes
  - Metadata de documentos
  - Estado de procesamiento

**Redis 7**
- **Propósito**: Cache y message broker
- **Uso**:
  - Cache de respuestas frecuentes
  - Cola de tareas Celery
  - Rate limiting
  - Sesiones temporales

**Qdrant (Vector DB)**
- **Propósito**: Almacenamiento de embeddings
- **Contenido**:
  - Vectores de chunks de documentos
  - Metadata asociada (workspace_id, conversation_id, source)
  - Índices optimizados para búsqueda semántica

### 5.3 Flujo de Datos

#### 5.3.1 Upload y Procesamiento de Documentos
```
1. Usuario sube documento (Frontend)
   ↓
2. Backend valida formato y tamaño
   ↓
3. Guarda archivo físico + metadata en MySQL
   ↓
4. Envía tarea a Celery para procesamiento asíncrono
   ↓
5. Worker Celery:
   - Lee archivo
   - Extrae texto
   - Envía a RAG Service para chunking
   ↓
6. RAG Service:
   - Divide en chunks
   - Genera embeddings
   - Indexa en Qdrant
   ↓
7. Actualiza estado en MySQL (COMPLETED)
   ↓
8. Frontend recibe notificación via WebSocket
```

#### 5.3.2 Consulta de Chat con RAG
```
1. Usuario envía mensaje (Frontend)
   ↓
2. Backend:
   - Detecta intención (Intent Detector)
   - Extrae keywords
   ↓
3. Búsqueda Semántica:
   - Query a RAG Service con mensaje
   - RAG Service busca en Qdrant
   - Retorna top-K chunks relevantes
   ↓
4. Construcción de Contexto:
   - Combina chunks + historial conversación
   - Aplica instrucciones del workspace
   ↓
5. Llamada a LLM (GPT-4o-mini):
   - Genera respuesta contextualizada
   - Streaming de tokens
   ↓
6. Frontend recibe y muestra respuesta en tiempo real
   ↓
7. Backend guarda mensaje en MySQL
```

---

## 6. Funcionalidades Principales

### 6.1 Gestión de Workspaces

#### Feature: Crear Workspace
**Descripción**: Permite crear espacios de trabajo aislados para proyectos/clientes específicos.

**Criterios de Aceptación:**
- Usuario puede crear workspace con nombre y descripción
- Se puede añadir instrucciones personalizadas (prompt customizado)
- Se crea automáticamente una conversación por defecto
- Validación de nombre único por usuario

**Endpoints:**
- `POST /api/v1/workspaces`

**Request Body:**
```json
{
  "name": "Propuesta Cliente XYZ",
  "description": "RFP para proyecto de migración cloud",
  "instructions": "Analizar considerando servicios de Azure"
}
```

**Response:**
```json
{
  "id": "uuid-v4",
  "name": "Propuesta Cliente XYZ",
  "description": "...",
  "instructions": "...",
  "created_at": "2025-12-29T10:00:00Z",
  "is_active": true,
  "default_conversation_id": "conv-uuid"
}
```

#### Feature: Listar Workspaces
**Criterios de Aceptación:**
- Devuelve todos los workspaces del usuario autenticado
- Ordenados por fecha de creación (más reciente primero)
- Incluye contador de documentos pendientes/procesados

**Endpoints:**
- `GET /api/v1/workspaces`

#### Feature: Upload de Documentos
**Criterios de Aceptación:**
- Soporte para: PDF, DOCX, TXT, CSV, XLSX
- Tamaño máximo: 10 MB por archivo
- Validación de duplicados por hash SHA-256
- Procesamiento asíncrono notificado via WebSocket
- Estado: PENDING → PROCESSING → COMPLETED/FAILED

**Endpoints:**
- `POST /api/v1/workspaces/{workspace_id}/documents`

**Validaciones:**
- Extensión de archivo permitida
- Tamaño dentro del límite
- Workspace existe y usuario tiene acceso

### 6.2 Sistema de Chat

#### Feature: Chat Conversacional
**Descripción**: Interfaz de chat con memoria de contexto y búsqueda semántica.

**Criterios de Aceptación:**
- Usuario puede enviar mensajes de texto
- Sistema mantiene historial de conversación
- Respuestas incluyen contexto de documentos relevantes
- Streaming de respuestas en tiempo real
- Detección automática de intenciones

**Endpoints:**
- `POST /api/v1/workspaces/{workspace_id}/chat`

**Request Body:**
```json
{
  "message": "¿Cuál es el presupuesto propuesto?",
  "conversation_id": "conv-uuid",
  "stream": true
}
```

**Response (Streaming):**
```
data: {"content": "Según", "type": "chunk"}
data: {"content": " el", "type": "chunk"}
data: {"content": " documento", "type": "chunk"}
...
data: {"content": "...", "type": "done"}
```

#### Feature: Búsqueda Semántica
**Criterios de Aceptación:**
- Búsqueda por similitud de embeddings
- Filtrado por workspace/conversation
- Top-K configurable (default: 5 chunks)
- Threshold de relevancia configurable
- Retorna chunks con metadata (source, page, score)

**Flujo Interno:**
1. Mensaje del usuario → RAG Service
2. RAG Service genera embedding del query
3. Búsqueda en Qdrant con filtros
4. Retorna chunks ordenados por score
5. Backend construye contexto para LLM

#### Feature: Detección de Intenciones
**Descripción**: Clasifica automáticamente la intención del usuario.

**Intenciones Soportadas:**
- `CHECKLIST_ANALYSIS`: Usuario quiere análisis estructurado
- `DOCUMENT_GENERATION`: Solicita generar documento
- `GENERAL_QUESTION`: Pregunta general
- `CLARIFICATION`: Solicita aclaraciones
- `COMPARISON`: Comparación entre documentos

**Comportamiento:**
- Análisis con pocos tokens (rápido)
- Redirige a handler especializado según intención
- Fallback a `GENERAL_QUESTION` si no clasifica

### 6.3 Procesamiento de Documentos

#### Feature: Extracción de Texto
**Criterios de Aceptación:**
- PDF: Extracción con PyMuPDF (fitz)
- DOCX: Extracción con python-docx
- TXT/CSV: Lectura directa
- XLSX: Extracción con openpyxl/pandas
- Manejo de errores con logs detallados

#### Feature: Chunking Inteligente
**Criterios de Aceptación:**
- Usa RecursiveCharacterTextSplitter de LangChain
- Configuración:
  - `chunk_size`: 1000 caracteres
  - `chunk_overlap`: 200 caracteres
  - Separadores: `\n\n`, `\n`, `. `, ` `
- Preserva contexto entre chunks
- Genera metadata por chunk (source, page, position)

#### Feature: Generación de Embeddings
**Criterios de Aceptación:**
- Modelo local: `all-MiniLM-L6-v2` (Sentence Transformers)
- Dimensión: 384
- Latencia: <100ms por chunk
- Sin dependencia de APIs externas

#### Feature: Indexación Vectorial
**Criterios de Aceptación:**
- Colecciones separadas por workspace
- Metadata incluye:
  - `workspace_id`
  - `conversation_id` (opcional)
  - `document_id`
  - `source` (nombre archivo)
  - `chunk_index`
- Soporte para filtros en búsqueda
- Operaciones CRUD completas

### 6.4 Generación de Documentos

#### Feature: Exportar a DOCX
**Criterios de Aceptación:**
- Plantilla profesional con logo TIVIT
- Secciones:
  - Portada
  - Índice
  - Resumen ejecutivo
  - Objetivos
  - Alcance
  - Cronograma
  - Presupuesto
  - Términos y condiciones
- Formato consistente (fuentes, colores, espaciado)
- Descarga directa desde conversación

**Endpoints:**
- `GET /api/v1/conversations/{conversation_id}/proposal/download?format=docx`

#### Feature: Exportar a PDF
**Criterios de Aceptación:**
- Mismo contenido que DOCX
- Renderizado con ReportLab
- Tamaño optimizado (<2 MB)
- Compatible con visualizadores estándar

**Endpoints:**
- `GET /api/v1/conversations/{conversation_id}/proposal/download?format=pdf`

### 6.5 Autenticación y Seguridad

#### Feature: Registro de Usuarios
**Criterios de Aceptación:**
- Email único validado
- Contraseña mínimo 8 caracteres
- Hashing con bcrypt
- No almacenar contraseña en texto plano

**Endpoints:**
- `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "Juan Pérez"
}
```

#### Feature: Login con JWT
**Criterios de Aceptación:**
- Generación de token JWT con expiración (30 min)
- Refresh token (opcional - futuro)
- Token incluye: user_id, email, exp

**Endpoints:**
- `POST /api/v1/auth/login`

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### Feature: Rate Limiting
**Criterios de Aceptación:**
- Chat: 20 requests/minuto por usuario
- Upload: 10 requests/minuto por usuario
- Login: 5 intentos/minuto por IP
- Respuesta 429 (Too Many Requests) al exceder

**Implementación:**
- SlowAPI con Redis backend
- Headers informativos:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

#### Feature: Security Headers
**Criterios de Aceptación:**
- HSTS (Strict-Transport-Security)
- CSP (Content-Security-Policy)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

---

## 7. Requisitos Técnicos

### 7.1 Requisitos de Infraestructura

#### 7.1.1 Servidor Backend
**Especificaciones Mínimas:**
- CPU: 2 vCPUs
- RAM: 4 GB
- Almacenamiento: 50 GB SSD
- Red: 100 Mbps

**Especificaciones Recomendadas (Producción):**
- CPU: 4 vCPUs
- RAM: 8 GB
- Almacenamiento: 100 GB SSD
- Red: 1 Gbps

#### 7.1.2 Base de Datos MySQL
**Especificaciones Mínimas:**
- RAM: 2 GB
- Almacenamiento: 20 GB
- IOPS: 1000

**Configuración:**
- `max_connections`: 200
- `innodb_buffer_pool_size`: 1 GB
- Backups automáticos diarios

#### 7.1.3 Redis
**Especificaciones:**
- RAM: 1 GB
- Persistencia: AOF (Append-Only File)
- Eviction policy: `allkeys-lru`

#### 7.1.4 Qdrant
**Especificaciones:**
- RAM: 2 GB (depende de tamaño de colección)
- Almacenamiento: 10 GB inicial
- Índice: HNSW (Hierarchical Navigable Small World)

### 7.2 Requisitos de Software

#### 7.2.1 Backend
- Python 3.10 o superior
- FastAPI 0.110+
- SQLAlchemy 2.0+
- Celery 5.3+
- OpenAI Python SDK 1.0+

#### 7.2.2 Frontend
- Node.js 18+ / Node.js 20+
- Next.js 14
- React 18
- TypeScript 5+

#### 7.2.3 Contenedores
- Docker 24+
- Docker Compose 2.20+

### 7.3 Requisitos de APIs Externas

#### OpenAI API
- **Modelo**: GPT-4o-mini
- **Rate Limits**:
  - 10,000 requests/minuto
  - 2,000,000 tokens/minuto
- **Pricing**: ~$0.15/1M input tokens, ~$0.60/1M output tokens
- **Uso Estimado**: 500-1000 requests/día (bajo volumen)

### 7.4 Requisitos de Performance

#### 7.4.1 Tiempos de Respuesta (Percentil 95)
- Login/Registro: <500ms
- Listar workspaces: <300ms
- Upload documento: <2s (validación inicial)
- Chat (sin streaming): <3s
- Chat (primer token streaming): <1s
- Búsqueda semántica: <500ms
- Generación documento DOCX: <5s
- Generación documento PDF: <8s

#### 7.4.2 Throughput
- Chat concurrent users: 50 simultáneos
- Upload concurrent: 10 simultáneos
- Procesamiento documentos: 100/hora

#### 7.4.3 Disponibilidad
- Uptime: 99.5% mensual (3.6 horas downtime/mes)
- Recovery Time Objective (RTO): <30 minutos
- Recovery Point Objective (RPO): <1 hora

### 7.5 Requisitos de Almacenamiento

#### 7.5.1 Documentos
- Formato: Archivo original + texto extraído
- Retención: 90 días por defecto (configurable)
- Límite por workspace: 500 documentos o 5 GB

#### 7.5.2 Vectores
- Colección por workspace
- Tamaño promedio: 5 MB por 100 documentos
- Límite: 10,000 chunks por workspace

#### 7.5.3 Logs
- Rotación diaria
- Retención: 30 días
- Formato: JSON estructurado
- Niveles: INFO, WARNING, ERROR

---

## 8. Flujos de Usuario

### 8.1 Flujo Principal: Análisis de Propuesta

#### Paso 1: Crear Workspace
1. Usuario hace login
2. Click en "Nuevo Workspace"
3. Ingresa nombre: "Propuesta Cliente XYZ"
4. Agrega descripción e instrucciones opcionales
5. Sistema crea workspace + conversación default

#### Paso 2: Subir Documentos
1. Usuario entra al workspace
2. Click en "Subir Documentos"
3. Selecciona RFP.pdf + Términos.docx
4. Sistema valida archivos
5. Notificación: "Documentos en procesamiento"
6. Sistema procesa asíncronamente:
   - Extrae texto
   - Genera chunks
   - Indexa vectores
7. Notificación WebSocket: "2 documentos listos"

#### Paso 3: Conversar con IA
1. Usuario abre chat del workspace
2. Escribe: "Dame un resumen del RFP"
3. Sistema:
   - Busca chunks relevantes en RFP.pdf
   - Construye contexto
   - Llama a GPT-4o-mini
   - Streaming de respuesta
4. Usuario lee respuesta
5. Sigue preguntando: "¿Cuál es el presupuesto?"
6. Sistema mantiene contexto de conversación

#### Paso 4: Generar Documento
1. Usuario satisfecho con análisis
2. Escribe: "Genera propuesta formal"
3. Sistema detecta intención DOCUMENT_GENERATION
4. Genera documento DOCX con secciones:
   - Resumen ejecutivo
   - Objetivos extraídos
   - Alcance identificado
   - Cronograma propuesto
5. Usuario descarga documento
6. Puede editar en Word y enviar a cliente

### 8.2 Flujo Alternativo: Análisis de Checklist

#### Paso 1-2: Igual a flujo principal

#### Paso 3: Solicitar Análisis Estructurado
1. Usuario escribe: "Analiza este documento con checklist"
2. Sistema detecta intención CHECKLIST_ANALYSIS
3. Invoca ChecklistAnalyzer especializado
4. Genera análisis estructurado:
   ```json
   {
     "resumen": "...",
     "requisitos_tecnicos": [...],
     "requisitos_funcionales": [...],
     "gaps": [...],
     "recomendaciones": [...]
   }
   ```
5. Usuario visualiza análisis en formato tabla/cards

### 8.3 Flujo de Error: Documento Fallido

#### Escenario: PDF corrupto
1. Usuario sube documento.pdf
2. Sistema intenta procesar
3. Extracción de texto falla
4. Celery worker registra error
5. Estado en MySQL → FAILED
6. Notificación WebSocket: "Error procesando documento.pdf"
7. Usuario ve mensaje: "El archivo está corrupto o no es válido"
8. Opción para resubir o contactar soporte

---

## 9. Integraciones y APIs

### 9.1 OpenAI API

#### 9.1.1 Chat Completions
**Endpoint**: `POST https://api.openai.com/v1/chat/completions`

**Configuración:**
```python
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "Eres un asistente experto en análisis de propuestas..."},
    {"role": "user", "content": "Mensaje del usuario"}
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true
}
```

**Manejo de Errores:**
- Rate limit (429): Retry con exponential backoff
- Timeout (>30s): Cancelar y notificar usuario
- Invalid API key (401): Alerta a administrador

#### 9.1.2 Token Management
**Límites por Modelo:**
- GPT-4o-mini: 128k tokens context window
- Uso típico:
  - System prompt: 500 tokens
  - Historial conversación: 2000 tokens
  - Chunks RAG: 3000 tokens
  - Usuario query: 500 tokens
  - Margen para respuesta: 2000 tokens
  - **Total**: ~8000 tokens por request

**Optimizaciones:**
- Truncar historial si excede 10 mensajes
- Resumir chunks largos
- Cache de respuestas frecuentes

### 9.2 RAG Service API

#### 9.2.1 Ingest Document
**Endpoint**: `POST http://rag-service:8080/ingest`

**Request:**
```json
{
  "document_id": "doc-uuid",
  "workspace_id": "ws-uuid",
  "conversation_id": "conv-uuid",
  "text_content": "Contenido extraído del documento...",
  "metadata": {
    "source": "propuesta.pdf",
    "page_count": 15
  }
}
```

**Response:**
```json
{
  "status": "success",
  "chunks_created": 42,
  "collection_name": "ws-uuid"
}
```

#### 9.2.2 Search
**Endpoint**: `POST http://rag-service:8080/search`

**Request:**
```json
{
  "query": "presupuesto del proyecto",
  "workspace_id": "ws-uuid",
  "limit": 5,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk_id": "chunk-uuid",
      "text": "El presupuesto total del proyecto es...",
      "score": 0.89,
      "metadata": {
        "source": "propuesta.pdf",
        "page": 8
      }
    }
  ]
}
```

### 9.3 WebSocket Notifications

#### 9.3.1 Conexión
**Endpoint**: `ws://backend:8000/api/v1/ws/{workspace_id}`

**Autenticación**: Query param `?token=<jwt_token>`

#### 9.3.2 Eventos
**Evento: document_processing**
```json
{
  "type": "document_processing",
  "document_id": "doc-uuid",
  "status": "PROCESSING",
  "progress": 50
}
```

**Evento: document_completed**
```json
{
  "type": "document_completed",
  "document_id": "doc-uuid",
  "status": "COMPLETED",
  "chunks_count": 42
}
```

**Evento: document_failed**
```json
{
  "type": "document_failed",
  "document_id": "doc-uuid",
  "status": "FAILED",
  "error": "Formato de archivo no soportado"
}
```

---

## 10. Seguridad y Cumplimiento

### 10.1 Seguridad de Datos

#### 10.1.1 Datos en Tránsito
- **HTTPS Obligatorio**: Todos los endpoints en producción
- **TLS 1.3**: Protocolo mínimo aceptado
- **Certificate Pinning**: En cliente móvil (futuro)

#### 10.1.2 Datos en Reposo
- **Contraseñas**: Bcrypt con salt (rounds=12)
- **Tokens JWT**: Firmados con HS256, expiración 30 min
- **Documentos**: Almacenados en filesystem con permisos restrictivos
- **Base de Datos**: Conexiones con SSL

#### 10.1.3 Validación de Entrada
- **Pydantic Models**: Validación estricta de todos los requests
- **Sanitización**: Strip caracteres especiales en nombres de archivo
- **Límites de Tamaño**: 10 MB por archivo
- **Tipos MIME**: Whitelist de extensiones permitidas

### 10.2 Autenticación y Autorización

#### 10.2.1 Política de Contraseñas
- Mínimo 8 caracteres
- Recomendado: 1 mayúscula, 1 minúscula, 1 número
- No se permiten contraseñas comunes (top 10k)
- Hashing con bcrypt (futuro: Argon2)

#### 10.2.2 Gestión de Sesiones
- JWT con expiración corta (30 min)
- Refresh tokens (futuro): 7 días, rotación obligatoria
- Logout: Invalidación en cliente (futuro: blacklist en Redis)

#### 10.2.3 Control de Acceso
**Modelo Actual**: Owner-based
- Usuario solo ve sus propios workspaces
- Sin compartir entre usuarios (futuro)

**Modelo Futuro**: RBAC (Role-Based Access Control)
- Roles: Admin, Editor, Viewer
- Permisos granulares por workspace

### 10.3 Rate Limiting y Throttling

#### 10.3.1 Límites Globales
- **Chat**: 20 requests/min por usuario
- **Upload**: 10 requests/min por usuario
- **Auth**: 5 requests/min por IP
- **Search**: 30 requests/min por usuario

#### 10.3.2 Límites por Recurso
- **Workspaces**: Máximo 50 por usuario
- **Documentos**: Máximo 500 por workspace
- **Conversaciones**: Máximo 100 por workspace
- **Tamaño total**: 5 GB por workspace

### 10.4 Logging y Auditoría

#### 10.4.1 Eventos Auditados
- Login exitoso/fallido
- Creación/eliminación de workspace
- Upload de documentos
- Generación de documentos
- Cambios en configuración

#### 10.4.2 Formato de Logs
**Estructura JSON:**
```json
{
  "timestamp": "2025-12-29T10:00:00Z",
  "level": "INFO",
  "user_id": "user-uuid",
  "action": "document_upload",
  "workspace_id": "ws-uuid",
  "metadata": {
    "filename": "propuesta.pdf",
    "size_bytes": 1048576
  }
}
```

#### 10.4.3 Retención
- Logs de aplicación: 30 días
- Logs de auditoría: 1 año
- Backups de BD: 90 días

### 10.5 Cumplimiento Normativo

#### 10.5.1 GDPR (Futuro - para clientes EU)
- Derecho al olvido: API para eliminar datos de usuario
- Portabilidad: Exportar todos los datos en JSON
- Consentimiento: Checkboxes explícitos en registro
- DPO: Designar Data Protection Officer

#### 10.5.2 Manejo de Datos Sensibles
- No almacenar información de tarjetas de crédito
- No almacenar datos de salud (HIPAA)
- Documentos empresariales tratados como confidenciales
- Posibilidad de marcar workspaces como "sensibles"

---

## 11. Métricas de Éxito

### 11.1 KPIs de Producto

#### 11.1.1 Adopción
- **Usuarios Activos Mensuales (MAU)**: Target 100+ en Q1
- **Workspaces Creados**: Target 500+ en 6 meses
- **Documentos Procesados**: Target 5,000+ en 6 meses
- **Tasa de Retención (30 días)**: >60%

#### 11.1.2 Engagement
- **Sesiones por Usuario**: >10/mes
- **Duración Sesión Promedio**: 15-20 minutos
- **Mensajes de Chat por Sesión**: >8
- **Documentos Generados**: >2 por usuario/mes

#### 11.1.3 Satisfacción
- **NPS (Net Promoter Score)**: >50
- **CSAT (Customer Satisfaction)**: >4.5/5
- **Tiempo hasta Primera Acción**: <5 minutos
- **Tasa de Error**: <1% de requests

### 11.2 KPIs Técnicos

#### 11.2.1 Performance
- **P95 Latencia Chat**: <3s
- **P95 Latencia Upload**: <2s
- **P95 Time to First Token (streaming)**: <1s
- **Tasa de Éxito de Procesamiento**: >98%

#### 11.2.2 Infraestructura
- **Uptime**: 99.5%
- **CPU Utilization**: <70% promedio
- **Memory Utilization**: <80% promedio
- **Error Rate**: <0.1%

#### 11.2.3 Costos
- **Costo por Usuario/Mes**: <$5 (OpenAI API + infraestructura)
- **Costo por Documento Procesado**: <$0.10
- **Costo por 1000 Mensajes de Chat**: <$2

### 11.3 KPIs de Negocio

#### 11.3.1 ROI
- **Tiempo Ahorrado por Propuesta**: >2 horas (vs. manual)
- **Reducción de Errores**: >50% (vs. manual)
- **Incremento en Productividad**: 3-5x documentos procesados

#### 11.3.2 Calidad
- **Precisión de Extracción**: >95%
- **Relevancia de Respuestas (Evaluación Humana)**: >4/5
- **Tasa de Documentos Editados Post-Generación**: <30%

---

## 12. Roadmap

### 12.1 Fase 1 (Actual - MVP) ✅
**Duración**: 3 meses | **Estado**: COMPLETADO

**Funcionalidades:**
- ✅ Backend API completo (FastAPI)
- ✅ Frontend funcional (Next.js)
- ✅ Sistema de autenticación JWT
- ✅ Gestión de workspaces
- ✅ Upload y procesamiento de documentos
- ✅ Chat con RAG (GPT-4o-mini)
- ✅ Generación de documentos DOCX/PDF
- ✅ Despliegue en Docker Compose

**Métricas de Éxito:**
- Sistema funcional end-to-end
- 10 usuarios beta testers
- 100 documentos procesados en beta

### 12.2 Fase 2: Mejoras de Producto
**Duración**: 2 meses | **Inicio**: Q1 2026

**Prioridades:**
1. **Compartir Workspaces** (P0)
   - Invitar usuarios por email
   - Permisos: Owner, Editor, Viewer
   - Notificaciones de actividad
   
2. **Historial de Versiones** (P1)
   - Versionado de documentos generados
   - Comparación lado a lado
   - Restaurar versión anterior
   
3. **Templates Personalizados** (P1)
   - Subir plantilla DOCX custom
   - Variables dinámicas configurables
   - Galería de templates
   
4. **Búsqueda Avanzada** (P2)
   - Filtros por fecha, tipo de documento
   - Búsqueda en múltiples workspaces
   - Exportar resultados de búsqueda

5. **Dashboard Analítico** (P2)
   - Métricas de uso por workspace
   - Visualización de documentos más consultados
   - Estadísticas de chat

**Métricas de Éxito:**
- 50+ usuarios activos mensuales
- >70% usuarios comparten al menos 1 workspace
- NPS >40

### 12.3 Fase 3: Inteligencia Avanzada
**Duración**: 3 meses | **Inicio**: Q2 2026

**Prioridades:**
1. **Modelos LLM Adicionales** (P0)
   - Claude 3.5 Sonnet (Anthropic)
   - Gemini Pro (Google)
   - Router inteligente multi-LLM
   - Comparación de respuestas
   
2. **Fine-Tuning Personalizado** (P1)
   - Entrenar modelo con documentos TIVIT
   - Embedding model custom
   - Vocabulario específico del dominio
   
3. **Análisis de Sentimiento** (P1)
   - Detectar tono en propuestas (positivo/negativo/neutral)
   - Alertas sobre cláusulas riesgosas
   - Score de confianza en propuesta
   
4. **OCR para Documentos Escaneados** (P2)
   - Integración con Tesseract/AWS Textract
   - Mejora de calidad pre-OCR
   - Extracción de tablas
   
5. **Soporte Multi-Idioma** (P2)
   - Español, Inglés, Portugués
   - Traducción automática de documentos
   - Chat en idioma preferido del usuario

**Métricas de Éxito:**
- 100+ usuarios activos mensuales
- >30% de usuarios usan multi-LLM
- Precisión de OCR >90%

### 12.4 Fase 4: Enterprise Features
**Duración**: 3 meses | **Inicio**: Q3 2026

**Prioridades:**
1. **SSO & Active Directory** (P0)
   - Integración con Azure AD / Okta
   - SAML 2.0 support
   - Provisioning automático
   
2. **Compliance & Auditoría** (P0)
   - GDPR compliance completo
   - SOC 2 Type II certification
   - Logs de auditoría detallados
   - Exportación de datos (data portability)
   
3. **On-Premise Deployment** (P1)
   - Instalador automatizado
   - Sin dependencia de APIs externas (LLM local)
   - Soporte para air-gapped environments
   
4. **APIs Públicas** (P1)
   - RESTful API documentada
   - SDKs (Python, JavaScript, Java)
   - Webhooks para eventos
   - Rate limiting por API key
   
5. **Advanced Permissions** (P2)
   - RBAC granular
   - Políticas de acceso basadas en atributos (ABAC)
   - Segregación de datos por departamento

**Métricas de Éxito:**
- 5+ clientes enterprise
- Certificación de seguridad obtenida
- API con 1000+ requests/día

### 12.5 Fase 5: Integraciones Externas
**Duración**: 2 meses | **Inicio**: Q4 2026

**Prioridades:**
1. **Integraciones Cloud Storage** (P0)
   - Google Drive
   - OneDrive / SharePoint
   - Dropbox
   - Box
   - Sync bidireccional
   
2. **Integraciones CRM** (P1)
   - Salesforce
   - HubSpot
   - Dynamics 365
   - Importar oportunidades automáticamente
   
3. **Integraciones Productividad** (P1)
   - Slack (notificaciones + bot)
   - Microsoft Teams
   - Email (Gmail, Outlook)
   - Calendario (scheduling de reviews)
   
4. **Integraciones Firma Digital** (P2)
   - DocuSign
   - Adobe Sign
   - Enviar propuestas generadas para firma
   
5. **Zapier / Make Integration** (P2)
   - Automatizaciones no-code
   - 1000+ apps conectadas

**Métricas de Éxito:**
- >50% usuarios conectan al menos 1 integración
- 10,000+ documentos sincronizados desde storage
- 500+ workflows automatizados creados

---

## 13. Anexos

### 13.1 Glosario

- **RAG (Retrieval-Augmented Generation)**: Técnica de IA que combina búsqueda semántica con generación de texto para respuestas contextualizadas.
- **LLM (Large Language Model)**: Modelo de lenguaje grande entrenado con billones de tokens.
- **Embedding**: Representación vectorial de texto que captura significado semántico.
- **Chunking**: División de documentos en fragmentos manejables para procesamiento.
- **Vector Database**: Base de datos optimizada para búsqueda de similitud vectorial (ej: Qdrant).
- **Streaming**: Envío progresivo de respuesta token por token en tiempo real.
- **Intent Detection**: Clasificación automática de la intención del usuario.
- **JWT (JSON Web Token)**: Estándar para tokens de autenticación.
- **CORS (Cross-Origin Resource Sharing)**: Mecanismo de seguridad para requests entre dominios.

### 13.2 Referencias

#### Documentación Técnica
- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/docs
- OpenAI API: https://platform.openai.com/docs
- LangChain: https://python.langchain.com/docs
- Qdrant: https://qdrant.tech/documentation/

#### Arquitectura y Patrones
- The Twelve-Factor App: https://12factor.net/
- REST API Best Practices: https://restfulapi.net/
- Microservices Patterns: https://microservices.io/patterns/

#### Seguridad
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- GDPR Guidelines: https://gdpr.eu/

### 13.3 Contacto y Soporte

#### Equipo de Desarrollo
- **Product Owner**: [Nombre]
- **Tech Lead**: [Nombre]
- **Backend Lead**: [Nombre]
- **Frontend Lead**: [Nombre]

#### Canales de Comunicación
- Slack: #proyecto-ia-tivit
- Email: ia-support@tivit.com
- Issue Tracker: [URL del repositorio]

---

## 14. Control de Versiones del Documento

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 2025-12-29 | GitHub Copilot | Creación inicial del PRD completo |

---

**Documento Confidencial - Solo para uso interno de TIVIT**
