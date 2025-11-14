from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import health, workspaces, settings as settings_routes, auth as auth_routes, chat as chat_routes
from core.config import settings as core_settings
from core.rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from models import database
import time
from sqlalchemy.exc import OperationalError
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_tables_with_retry(max_retries: int = 5, delay: int = 3) -> None:
    """Intenta crear las tablas, esperando a que MySQL esté listo."""
    for attempt in range(max_retries):
        try:
            logger.info(f"Intento {attempt + 1}/{max_retries} de crear tablas en la base de datos...")
            database.Base.metadata.create_all(bind=database.engine)
            logger.info("✅ Tablas creadas exitosamente.")
            return
        except OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(f"⚠️  MySQL no está listo aún. Reintentando en {delay} segundos...")
                time.sleep(delay)
            else:
                logger.error(f"❌ No se pudo conectar a MySQL después de {max_retries} intentos.")
                raise


# Ejecutar la creación de tablas con reintentos
create_tables_with_retry()

# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema de IA Empresarial (Multi-LLM)",
    description="Backend para RAG, gestión de documentos y análisis de propuestas.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Agregar Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Routers
app.include_router(health.router, prefix="/api/v1", tags=["Health Check"])
app.include_router(auth_routes.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(workspaces.router, prefix="/api/v1", tags=["Workspaces"])
app.include_router(chat_routes.router, prefix="/api/v1", tags=["Chat History"])
app.include_router(settings_routes.router, prefix="/api/v1", tags=["Settings"])


@app.get("/")
def read_root():
    """Endpoint raíz con información del sistema"""
    return {
        "message": "Bienvenido al API del Sistema de IA - Velvet",
        "active_llm": core_settings.ACTIVE_LLM_SERVICE,
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.on_event("startup")
async def startup_event():
    """Eventos al iniciar la aplicación"""
    logger.info("🚀 Aplicación iniciada correctamente")
    logger.info(f"📊 LLM activo: {core_settings.ACTIVE_LLM_SERVICE}")
    logger.info(f"🔒 Rate limiting: {core_settings.RATE_LIMIT_PER_MINUTE} requests/min")


@app.on_event("shutdown")
async def shutdown_event():
    """Eventos al cerrar la aplicación"""
    logger.info("👋 Cerrando aplicación...")