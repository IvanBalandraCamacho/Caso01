# 🚀 Caso01 Backend

Backend robusto y escalable para la plataforma de análisis de documentos con IA.

## 🏗 Arquitectura

El sistema está construido sobre una arquitectura moderna y modular:

- **API Framework**: FastAPI (Python 3.10+)
- **Base de Datos**: MySQL (Datos relacionales)
- **Cola de Tareas**: Celery + Redis (Procesamiento asíncrono)
- **Cache**: Redis
- **LLM Engine**: Sistema Multi-LLM con Routing Inteligente

## 🧠 Sistema LLM

El backend utiliza OpenAI GPT-4o-mini para todas las tareas de IA:

- **GPT-4o-mini (OpenAI)**: 
   - *Rol*: Modelo Principal (Chat, Respuestas rápidas, Análisis general, Generación de documentos)
   - *Ventaja*: Rápido, económico, alta calidad.

## 🛠 Configuración

1. **Variables de Entorno**:
   Copiar `.env.example` a `.env` y configurar las claves:
   ```bash
   cp .env.example .env
   ```
   
   Claves críticas:
   - `OPENAI_API_KEY`: Para modelo GPT-4o-mini.
   - `DATABASE_URL`: Conexión a MySQL.
   - `REDIS_URL`: Conexión a Redis.

2. **Instalación de Dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecución**:
   ```bash
   # Servidor de Desarrollo
   uvicorn main:app --reload
   
   # Worker de Celery (en otra terminal)
   celery -A core.celery_app worker --loglevel=info
   ```

## 📂 Estructura del Proyecto

```
backend/
├── api/                # Endpoints de la API
│   └── routes/         # Rutas organizadas por recurso
├── core/               # Lógica central
│   ├── providers/      # Integración con OpenAI
│   ├── llm_router.py   # Lógica de selección de modelos
│   └── llm_service.py  # Servicio unificado de LLM
├── models/             # Modelos de base de datos (SQLAlchemy)
├── processing/         # Tareas asíncronas (Celery)
└── main.py             # Punto de entrada de la aplicación
```

## 🔒 Seguridad

- **Autenticación**: JWT (JSON Web Tokens).
- **Rate Limiting**: Protección contra abuso de API.
- **Validación**: Pydantic para validación estricta de datos.
- **CORS**: Configurado para permitir solo orígenes confiables.

## 📄 Documentación API

Una vez iniciado el servidor, visitar:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
