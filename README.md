# 🤖 Sistema de Asistente RAG "Velvet"

Sistema de Inteligencia Artificial empresarial para consulta de documentos internos utilizando tecnología RAG (Retrieval-Augmented Generation). Permite subir documentos y hacer preguntas en lenguaje natural, obteniendo respuestas contextualizadas basadas en el contenido real de los archivos.

## 🎯 Características Principales

### Funcionalidades Core
- 📄 **Procesamiento de Documentos**: Soporta PDF, Word, Excel, PowerPoint y TXT
- 💬 **Chat Inteligente**: Interfaz conversacional para consultar documentos
- 🔍 **Búsqueda Semántica**: Utiliza embeddings y bases de datos vectoriales
- 🚀 **Procesamiento Asíncrono**: Manejo eficiente de archivos grandes con Celery
- 🎨 **UI Moderna**: Interfaz responsiva con Tailwind CSS

### Seguridad (Alta Prioridad - Implementado) ✅
- 🔐 **Autenticación JWT**: Login seguro con access y refresh tokens
- 🚫 **Rate Limiting**: Protección contra ataques de fuerza bruta y abuso
  - Login: 10 requests/minuto
  - Registro: 5 requests/hora
  - Upload: 10 requests/minuto
  - Chat: 20 requests/minuto
- 🔑 **Docker Secrets**: API keys gestionadas de forma segura
- ✅ **Validación de Archivos**: 
  - Verificación de magic bytes
  - Límite de tamaño (50MB)
  - Detección de archivos corruptos
  - Máximo 50 documentos por workspace
- 🔒 **Token Blacklist**: Sistema de logout con revocación de tokens en Redis

## 🏗️ Arquitectura

### Stack Tecnológico

**Backend (FastAPI + Python)**
- Framework: FastAPI
- Procesamiento Asíncrono: Celery + Redis
- LLM: Google Gemini
- Embeddings: `all-MiniLM-L6-v2` (sentence-transformers)
- ORM: SQLAlchemy
- Parsers: PyPDF2, python-docx, pandas

**Frontend (Next.js 14)**
- Framework: Next.js 14 (App Router)
- Lenguaje: TypeScript
- Estilos: Tailwind CSS
- Componentes: shadcn/ui

**Infraestructura (Docker)**
- Base de Datos (Metadatos): MySQL 8.0
- Base de Datos (Vectores): Qdrant
- Message Broker: Redis
- Orquestación: Docker Compose

## 📋 Prerrequisitos

- [Docker](https://www.docker.com/products/docker-desktop/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/) (version 2.0+)
- [Git](https://git-scm.com/)

## ⚙️ Instalación y Ejecución

### 1. Clonar el Repositorio

```bash
git clone https://github.com/ivanbalandracamacho/caso01.git
cd Caso01
```

### 2. Configurar Variables de Entorno y Secretos

#### A. Archivo Raíz (`.env`)
Cree un archivo `.env` en la raíz del proyecto:

```env
MYSQL_DATABASE=ia_db
MYSQL_USER=admin
MYSQL_PASSWORD=supersecret
MYSQL_ROOT_PASSWORD=supersecret_root
```

#### B. Archivo Backend (`backend/.env`)
Cree un archivo `.env` en la carpeta `backend`:

```env
# Configuración LLM
ACTIVE_LLM_SERVICE=GEMINI

# Configuración JWT (cambiar en producción)
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Límites de Upload
MAX_UPLOAD_SIZE=52428800  # 50MB en bytes
MAX_DOCUMENTS_PER_WORKSPACE=50
```

#### C. Docker Secrets (Gemini API Key)
**IMPORTANTE**: No poner la API key directamente en variables de entorno.

```bash
# Crear carpeta de secrets
mkdir -p secrets

# Crear archivo con tu API key (consigue una en https://aistudio.google.com/app/apikey)
echo "AIzaSy...tu-clave-aqui" > secrets/gemini_api_key.txt

# NUNCA subir este archivo a Git (ya está en .gitignore)
```

### 3. Construir y Ejecutar

```bash
# Construir e iniciar todos los servicios
docker-compose up --build -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de los contenedores
docker-compose ps
```

### 4. Acceder a la Aplicación

- **Frontend (Aplicación)**: http://localhost:3000
- **Backend (API Docs)**: http://localhost:8000/docs
- **Qdrant (Dashboard)**: http://localhost:6333/dashboard

### Credenciales de Prueba

**Usuario de emergencia** (solo para desarrollo):
- Usuario: `admin`
- Contraseña: `admin`

> ⚠️ **IMPORTANTE**: Eliminar estas credenciales hardcodeadas en producción

## 📁 Estructura del Proyecto

```
Caso01/
├── backend/                    # API Backend (FastAPI)
│   ├── api/
│   │   └── routes/            # Endpoints REST
│   │       ├── auth.py        # Autenticación JWT
│   │       ├── health.py      # Health checks
│   │       ├── settings.py    # Configuración
│   │       └── workspaces.py  # CRUD workspaces y chat
│   ├── core/
│   │   ├── celery_app.py      # Configuración Celery
│   │   ├── config.py          # Settings centralizados
│   │   └── llm_service.py     # Integración con Gemini
│   ├── models/                # Modelos de datos
│   │   ├── database.py        # Configuración SQLAlchemy
│   │   ├── document.py        # Modelo Document
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── user.py            # Modelo User
│   │   └── workspace.py       # Modelo Workspace
│   ├── processing/            # Pipeline RAG
│   │   ├── parser.py          # Extracción de texto
│   │   ├── tasks.py           # Tareas Celery
│   │   └── vector_store.py    # Integración Qdrant
│   ├── Dockerfile
│   ├── main.py                # Entry point FastAPI
│   └── requirements.txt
│
├── frontend/                   # Aplicación Web (Next.js)
│   ├── src/
│   │   ├── app/               # App Router
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/        # Componentes React
│   │   │   ├── chat-area.tsx
│   │   │   ├── login-modal.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── hooks/             # Custom hooks
│   │   │   └── useChat.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── public/
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── package.json
│   └── tailwind.config.ts
│
├── docker-compose.yml          # Orquestación de servicios
├── .env                        # Variables MySQL
├── .gitignore
└── README.md
```

## 🔄 Flujo de Trabajo (Pipeline RAG)

### 1. Subida de Documento
```
Usuario → Frontend → Backend API → MySQL (metadata) → Celery Task
```

### 2. Procesamiento Asíncrono
```
Celery Worker → Extrae texto → Genera chunks → Crea embeddings → Guarda en Qdrant
```

### 3. Consulta (Chat)
```
Usuario pregunta → Frontend → Backend
                    ↓
            Qdrant (busca chunks similares)
                    ↓
            Gemini (genera respuesta con contexto)
                    ↓
            Frontend (muestra respuesta + fuentes)
```

## 🧪 Probar el Sistema

### Opción 1: Interfaz Web (Recomendado)
1. Abrir http://localhost:3000
2. Iniciar sesión con `admin` / `admin`
3. Crear un workspace
4. Subir un documento (PDF, Word, etc.)
5. Hacer preguntas sobre el contenido

### Opción 2: API Docs (Swagger)
1. Abrir http://localhost:8000/docs
2. Registrar un usuario con `/api/v1/auth/register`
3. Obtener token con `/api/v1/auth/token`
4. Crear workspace con `/api/v1/workspaces`
5. Subir documento con `/api/v1/workspaces/{id}/upload`
6. Consultar con `/api/v1/workspaces/{id}/chat`

## 🐛 Solución de Problemas

### Los contenedores no inician
```bash
# Limpiar y reiniciar
docker-compose down -v
docker-compose up --build
```

### Error de conexión a MySQL
```bash
# Verificar logs
docker-compose logs mysql

# El backend reintenta automáticamente 5 veces
# Esperar ~15 segundos para que MySQL esté listo
```

### Frontend no conecta con Backend
```bash
# Verificar variables de entorno
echo $NEXT_PUBLIC_API_URL

# Debe ser http://localhost:8000
# O editar frontend/next.config.mjs
```

### Error al procesar documentos
```bash
# Ver logs del worker
docker-compose logs -f celery_worker

# Verificar que la API key esté correctamente configurada
cat secrets/gemini_api_key.txt
```

## 📊 Comandos Útiles

```bash
# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f celery_worker

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Limpiar volúmenes (CUIDADO: Borra la BD)
docker-compose down -v
```

## 🔒 Seguridad

### Implementaciones de Alta Prioridad ✅

#### 1. Docker Secrets para API Keys
- Las claves sensibles NO están en variables de entorno
- Se almacenan en `secrets/gemini_api_key.txt`
- Montadas como archivos read-only en `/run/secrets/`
- No se suben a Git (protegidas por `.gitignore`)

#### 2. Rate Limiting
- Implementado con SlowAPI + Redis
- Límites por endpoint:
  - `/auth/login`: 10/min (protección brute force)
  - `/auth/register`: 5/hora (prevención spam)
  - `/upload`: 10/min (evita abuso)
  - `/chat`: 20/min (control de costos LLM)

#### 3. Gestión de Sesiones
- **Access Token**: JWT de corta duración (24h por defecto)
- **Refresh Token**: Token de larga duración (7 días) almacenado en Redis
- **Blacklist**: Tokens revocados en logout guardados en Redis
- Endpoints:
  - `POST /api/v1/auth/token` - Login (retorna access + refresh)
  - `POST /api/v1/auth/refresh` - Renovar access token
  - `POST /api/v1/auth/logout` - Cerrar sesión

#### 4. Validación de Archivos
- Verificación de magic bytes (firmas de archivo)
- Límite de tamaño: 50MB
- Extensiones permitidas: PDF, DOCX, XLSX, PPTX, TXT
- Detección de archivos vacíos o corruptos
- Máximo 50 documentos por workspace

### Ejemplos de API

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/token \
  -F "username=admin" \
  -F "password=admin"

# Respuesta
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJ...",
  "refresh_token": "dGhpc19pc19hX3JlZnJlc2g...",
  "token_type": "bearer"
}

# Renovar token
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "dGhpc19pc19hX3JlZnJlc2g..."}'

# Logout
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJ..."
```

## 📊 Comandos Útiles

```bash
# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f celery_worker

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Limpiar volúmenes (borra la BD)
docker-compose down -v

# Reconstruir solo un servicio
docker-compose build backend
docker-compose up -d backend

# Acceder a la shell de un contenedor
docker-compose exec backend bash
docker-compose exec mysql mysql -u admin -p
```

## 🔒 Seguridad

### Consideraciones para Producción

1. **Variables de Entorno**: Usar secretos seguros para `SECRET_KEY`, `MYSQL_PASSWORD`, etc.
2. **HTTPS**: Configurar certificados SSL/TLS
3. **CORS**: Restringir orígenes permitidos en `main.py`
4. **Rate Limiting**: Implementar límites de peticiones
5. **Validación**: Validar y sanitizar todos los inputs
6. **Autenticación**: Remover credenciales hardcodeadas
7. **API Keys**: Rotar regularmente las claves de Gemini

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📝 Licencia

Este proyecto es solo para fines educativos y de demostración.

## 👥 Autores

- Equipo de Desarrollo - IvanBalandraCamacho

## 🙏 Agradecimientos

- Google Gemini por la API de LLM
- Qdrant por la base de datos vectorial
- FastAPI y Next.js por los excelentes frameworks
- La comunidad open source

---

**Nota**: Este sistema está diseñado para uso interno/educativo. Para uso en producción, implementar las medidas de seguridad mencionadas arriba.