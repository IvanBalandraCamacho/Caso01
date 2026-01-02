import os
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
# from starlette.middleware.gzip import GZIPMiddleware
from api.routes import health, workspaces, conversations, document_generation, auth, intention_task, tivit, notifications_ws, rag_proxy, general_chat, metrics, dashboard, workspace_analytics, templates
# from api.routes import users  # Comentado: módulo no existe aún
from exceptions import ServiceException
from core.config import settings
from models import database
from sqlalchemy.exc import OperationalError
from starlette.middleware.cors import CORSMiddleware
from core import llm_service

# Rate Limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Logging Estructurado
from core.logging_config import setup_logging
import logging

# Security Headers
from middleware.security_headers import SecurityHeadersMiddleware

# --- Configurar Logging ---
setup_logging(log_level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# --- Configurar Rate Limiter ---
limiter = Limiter(key_func=get_remote_address)

# --- Definir orígenes permitidos (CORS) ---
raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000,http://localhost:3000/*",
)
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

# NOTA: create_tables_with_retry() comentado porque usamos Alembic para migraciones
# Si no usas Alembic, descomenta esta función para crear tablas automáticamente

# def create_tables_with_retry(max_retries=5, delay=3):
#     """Intenta crear las tablas, esperando a que MySQL esté listo."""
#     for attempt in range(max_retries):
#         try:
#             logger.info(f"Intento {attempt + 1}/{max_retries} de crear tablas en la base de datos...")
#             database.Base.metadata.create_all(bind=database.engine)
#             logger.info("✅ Tablas creadas exitosamente.")
#             return
#         except OperationalError as e:
#             if attempt < max_retries - 1:
#                 logger.warning(f"⚠️  MySQL no está listo aún. Reintentando en {delay} segundos...")
#                 time.sleep(delay)
#             else:
#                 logger.error(f"❌ No se pudo conectar a MySQL después de {max_retries} intentos.")
#                 raise

# create_tables_with_retry()  # Comentado - usar Alembic: alembic upgrade head

# Inicializar GCP services
logger.info("📊 Inicializando GCP services...")
try:
    from core.gcp_service import gcp_service
    if gcp_service.gemini_available:
        logger.info("✅ Gemini disponible")
    if gcp_service.document_ai:
        logger.info("✅ Document AI disponible")
    if gcp_service.natural_language:
        logger.info("✅ Natural Language disponible")
except Exception as e:
    logger.warning(f"⚠️ Error inicializando GCP: {e}")

# Inicializar providers de LLM
logger.info("Inicializando providers de LLM...")
llm_service.initialize_providers()

app = FastAPI(
    title="Sistema de IA Empresarial (Multi-LLM)",
    description="Backend para RAG, gestión de documentos y análisis de propuestas.",
    version="1.0.0"
)

# --- Configurar Rate Limiting ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Configurar Security Headers Middleware ---
app.add_middleware(SecurityHeadersMiddleware)

# --- Configurar CORS (Restrictivo) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Solo orígenes específicos
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Agregar OPTIONS para preflight
    allow_headers=["*"],  # Permitir todos los headers para desarrollo
)

# Configurar GZIP para compresión de respuestas (60-70% reducción de tamaño)
# app.add_middleware(GZIPMiddleware, minimum_size=1000)

# --- Registrar Routers ---
app.include_router(health.router, prefix="/api/v1", tags=["Health Check"])
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["Dashboard"])
app.include_router(workspace_analytics.router, prefix="/api/v1", tags=["Workspace Analytics"])
app.include_router(templates.router, prefix="/api/v1", tags=["Templates"])
app.include_router(workspaces.router, prefix="/api/v1", tags=["Workspaces"])
app.include_router(conversations.router, prefix="/api/v1", tags=["Conversations"])
app.include_router(document_generation.router, prefix="/api/v1", tags=["Document Generation"])
app.include_router(intention_task.router, prefix="/api/v1", tags=["Task Intentions"])
app.include_router(tivit.router, prefix="/api/v1", tags=["TIVIT Services"])
app.include_router(notifications_ws.router, prefix="/api/v1", tags=["Notifications"])
app.include_router(rag_proxy.router, prefix="/api/v1/rag", tags=["RAG Service (Proxy)"])
app.include_router(general_chat.router, prefix="/api/v1", tags=["General Chat"])

# Tasks Router (sin prefijo v1 estricto, o interno)
from api.routes import tasks
app.include_router(tasks.router, prefix="/api/tasks", tags=["Cloud Tasks Handlers"])

# Montar directorio de archivos estáticos para fotos de perfil
from pathlib import Path
profile_pictures_dir = Path("uploaded_files/profile_pictures")
profile_pictures_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploaded_files", StaticFiles(directory="uploaded_files"), name="uploaded_files")

@app.get("/")
@limiter.limit("30/minute")  # Rate limit en root endpoint
def read_root(request: Request):
    logger.info("Root endpoint accessed")
    return {
        "message": "Bienvenido al API del Sistema de IA",
        "active_llm": settings.LLM_PROVIDER,
        "version": "1.0.0"
    }

@app.exception_handler(ServiceException)
async def service_exception_handler(request: Request, exc: ServiceException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Log de inicio
logger.info("=" * 80)
logger.info("🚀 Aplicación iniciada correctamente")
logger.info(f"📊 Versión: 1.0.0")
logger.info(f"🔧 LLM Activo: {settings.LLM_PROVIDER}")
logger.info(f"🔒 RAG Externo: {'Habilitado' if settings.RAG_SERVICE_ENABLED else 'Deshabilitado'}")
logger.info(f"🌐 CORS Orígenes: {', '.join(origins)}")
logger.info("=" * 80)