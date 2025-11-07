# Sistema de Asistente RAG "Velvet" (Caso 01)

Este repositorio contiene el código fuente de un sistema de Inteligencia Artificial para consulta de documentos internos. Utiliza un pipeline de **RAG (Retrieval-Augmented Generation)** para analizar y responder preguntas sobre documentos (como propuestas comerciales) utilizando LLMs.

El proyecto está completamente contenedorizado con Docker.

## 🚀 Stack Tecnológico

El sistema está dividido en dos servicios principales (backend y frontend) y cuatro servicios de soporte.

* **Backend:**
    * **Framework:** FastAPI (Python)
    * **Procesamiento Asíncrono:** Celery
    * **LLM:** Google Gemini (conectado vía API)
    * **Embeddings:** `all-MiniLM-L6-v2` (vía `sentence-transformers`)
    * **ORM:** SQLAlchemy
    * **Parsing de Documentos:** `PyPDF2`, `python-docx`, `pandas`

* **Frontend:**
    * **Framework:** Next.js 14 (App Router)
    * **Lenguaje:** TypeScript
    * **UI:** Tailwind CSS
    * **Componentes:** shadcn/ui

* **Infraestructura (Servicios):**
    * **Contenedores:** Docker Compose
    * **Base de Datos (Metadatos):** MySQL 8.0
    * **Base de Datos (Vectores):** Qdrant
    * **Broker de Tareas:** Redis

## 📋 Prerrequisitos

Para ejecutar este proyecto, solo necesitará tener instalados:

* [Docker](https://www.docker.com/products/docker-desktop/)
* [Git](https://git-scm.com/)

## ⚙️ Guía de Instalación y Ejecución

Siga estos pasos para levantar el entorno de desarrollo completo.

### 1. Clonar el Repositorio

```bash
git clone https://github.com/ivanbalandracamacho/caso01.git
cd Caso01-dev
```

### 2. Configurar Variables de Entorno

Este proyecto requiere dos archivos `.env`.

#### A. Archivo Raíz (`.env`)
Utilizado por `docker-compose.yml` para configurar la base de datos MySQL.

Cree un archivo llamado `.env` en la raíz del proyecto con el siguiente contenido:

```ini
MYSQL_DATABASE=ia_db
MYSQL_USER=admin
MYSQL_PASSWORD=supersecret
MYSQL_ROOT_PASSWORD=supersecret_root
```

#### B. Archivo de Backend (`backend/.env`)
Usado por FastAPI y el worker de Celery.

Cree un archivo llamado `.env` dentro de la carpeta `backend` con el siguiente contenido:

```ini
# Consiga su clave de API en Google AI Studio
GEMINI_API_KEY="AIzaSy...tu-clave-aqui"
ACTIVE_LLM_SERVICE="GEMINI"
```

### 3. Construir y Ejecutar los Contenedores

Una vez configurados los archivos `.env`, puede construir e iniciar todos los servicios:

```bash
docker-compose up --build -d
```

**Flags útiles:**  
`--build`: Fuerza la construcción de las imágenes (necesario la primera vez).  
`-d`: Ejecuta los contenedores en segundo plano.

**Solución de problemas:** Si experimenta errores de caché durante la construcción:

```bash
docker-compose build --no-cache
docker-compose up -d
```

### 4. Acceder a la Aplicación

Una vez que los contenedores estén en funcionamiento:

- **Frontend (UI):** http://localhost:3000  
- **Backend (API Docs):** http://localhost:8000/docs  
- **Qdrant (Vector DB UI):** http://localhost:6333/dashboard  

## 📁 Estructura del Repositorio

```
.
├── backend/
│   ├── api/
│   │   └── routes/         # Endpoints (health.py, workspaces.py)
│   ├── core/               # Lógica central (celery_app.py, config.py, llm_service.py)
│   ├── models/             # Definiciones de datos (database.py, document.py, schemas.py)
│   ├── processing/         # Lógica RAG (parser.py, tasks.py, vector_store.py)
│   ├── temp_uploads/       # Almacenamiento temporal de archivos
│   ├── .env                # Claves de API (requiere creación manual)
│   ├── Dockerfile          # Instrucciones del contenedor Backend/Celery
│   ├── main.py             # Punto de entrada de FastAPI
│   └── requirements.txt    # Dependencias de Python
│
├── frontend/
│   ├── public/             # Assets estáticos
│   ├── src/
│   │   ├── app/            # Páginas y layouts de Next.js (page.tsx, layout.tsx)
│   │   ├── components/     # Componentes de React (sidebar.tsx, chat-area.tsx)
│   │   │   └── ui/         # Componentes Shadcn (button.tsx, select.tsx, etc.)
│   │   └── lib/            # Utilidades (utils.ts)
│   ├── .dockerignore       # Ignora node_modules en el build de Docker
│   ├── Dockerfile          # Instrucciones del contenedor Frontend
│   ├── next.config.mjs     # Configuración de Next.js (con 'output: standalone')
│   ├── package.json        # Dependencias de Node.js
│   └── tailwind.config.ts  # Configuración de Tailwind (con colores brand)
│
├── .env                    # Contraseñas de BD (requiere creación manual)
└── docker-compose.yml      # Orquesta todos los servicios
```

## 🕹️ Flujo de Trabajo (Cómo Probar)

Puede probar el pipeline completo usando la documentación de la API:

1. Vaya a http://localhost:8000/docs  
2. Use el endpoint **POST /api/v1/workspaces** para crear un nuevo workspace  
3. Copie el `id` del workspace de la respuesta  
4. Use el endpoint **POST /api/v1/workspaces/{workspace_id}/upload** para subir un archivo (ej. PDF)  
5. Espere unos segundos a que el `ia_celery_worker` procese el archivo  
   (puede monitorear esto con `docker-compose logs -f celery_worker`)  
6. Use el endpoint **POST /api/v1/workspaces/{workspace_id}/chat** para hacer una pregunta sobre su documento  
7. Revise la respuesta JSON: contendrá la `llm_response` (respuesta de Gemini) y los `relevant_chunks` (contexto de Qdrant)
