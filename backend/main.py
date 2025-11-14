
from contextlib import asynccontextmanager
import time
import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.exc import OperationalError

from api.routes import health, workspaces
from core.config import settings
from core.logging import setup_logging
from core.exceptions import BaseAPIException
from models import database

# ============================================================================
# CONFIGURACIÓN DE LOGGING
# ============================================================================

logger = setup_logging(log_level=settings.LOG_LEVEL)

# ============================================================================
# INICIALIZACIÓN DE BASE DE DATOS
# ============================================================================

def create_tables_with_retry(max_retries: int = 10, delay: int = 3) -> None:
    """
    Intenta crear las tablas en la base de datos con reintentos.
    
    Args:
        max_retries: Número máximo de intentos
        delay: Segundos entre intentos
    
    Raises:
        OperationalError: Si no se puede conectar después de todos los intentos
    """
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                f"Intento {attempt}/{max_retries}: Creando tablas en la base de datos..."
            )
            database.Base.metadata.create_all(bind=database.engine)
            logger.info("✅ Tablas creadas exitosamente")
            return
            
        except OperationalError as e:
            if attempt < max_retries:
                logger.warning(
                    f"⚠️  Base de datos no está lista. Reintentando en {delay}s... "
                    f"(Error: {str(e)[:100]})"
                )
                time.sleep(delay)
            else:
                logger.error(
                    f"❌ No se pudo conectar a la base de datos después de "
                    f"{max_retries} intentos"
                )
                raise


# ============================================================================
# LIFESPAN EVENTS (Startup/Shutdown)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja eventos de inicio y cierre de la aplicación.
    Reemplaza los decoradores @app.on_event deprecados.
    """
    # === STARTUP ===
    logger.info("🚀 Iniciando aplicación...")
    logger.info(f"Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")
    logger.info(f"LLM Activo: {settings.ACTIVE_LLM_SERVICE}")
    
    try:
        create_tables_with_retry()
    except Exception as e:
        logger.critical(f"Error crítico al inicializar DB: {e}")
        raise
    
    logger.info("✅ Aplicación lista")
    
    yield  # La aplicación corre aquí
    
    # === SHUTDOWN ===
    logger.info("🛑 Cerrando aplicación...")
    # Aquí puedes cerrar conexiones, guardar estado, etc.
    logger.info("✅ Aplicación cerrada correctamente")


# ============================================================================
# CREACIÓN DE LA APP
# ============================================================================

app = FastAPI(
    title="Sistema de IA Empresarial (RAG Multi-LLM)",
    description=(
        "Backend para Retrieval-Augmented Generation (RAG), "
        "gestión de documentos y análisis con múltiples modelos LLM."
    ),
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,  # Desactivar Swagger en producción
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan  # Usar el context manager de lifespan
)

# ============================================================================
# MIDDLEWARE
# ============================================================================

# 1. CORS - Debe ir primero
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"]
)

# 2. Trusted Host (Seguridad)
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["tu-dominio.com", "*.tu-dominio.com"]
    )

# 3. Request ID y Logging
@app.middleware("http")
async def add_request_id_and_logging(request: Request, call_next):
    """
    Agrega un ID único a cada request y logea información de la solicitud.
    """
    import uuid
    request_id = str(uuid.uuid4())
    
    # Agregar ID al state del request
    request.state.request_id = request_id
    
    # Loggear request
    logger.info(
        f"Request {request_id}: {request.method} {request.url.path}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else None
        }
    )
    
    start_time = time.time()
    
    # Procesar request
    response = await call_next(request)
    
    # Calcular tiempo de procesamiento
    process_time = time.time() - start_time
    
    # Agregar headers de respuesta
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    
    # Loggear respuesta
    logger.info(
        f"Response {request_id}: {response.status_code} ({process_time:.4f}s)",
        extra={
            "request_id": request_id,
            "status_code": response.status_code,
            "process_time": process_time
        }
    )
    
    return response

# 4. Manejo Global de Errores
@app.middleware("http")
async def error_handler_middleware(request: Request, call_next):
    """
    Captura y formatea errores de manera consistente.
    """
    try:
        return await call_next(request)
        
    except BaseAPIException as exc:
        # Errores de negocio esperados
        logger.error(
            f"API Exception: {exc.message}",
            extra={
                "error_type": exc.__class__.__name__,
                "details": exc.details,
                "request_id": getattr(request.state, "request_id", None)
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.message,
                "details": exc.details,
                "status_code": exc.status_code,
                "request_id": getattr(request.state, "request_id", None)
            }
        )
    
    except Exception as exc:
        # Errores inesperados
        logger.exception(
            f"Unhandled exception: {str(exc)}",
            extra={
                "request_id": getattr(request.state, "request_id", None)
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Error interno del servidor",
                "details": {"message": str(exc)} if settings.DEBUG else {},
                "status_code": 500,
                "request_id": getattr(request.state, "request_id", None)
            }
        )

# 5. Rate Limiting (Opcional - requiere slowapi)
# from slowapi import Limiter, _rate_limit_exceeded_handler
# from slowapi.util import get_remote_address
# from slowapi.errors import RateLimitExceeded
#
# limiter = Limiter(key_func=get_remote_address)
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================================================
# REGISTRAR ROUTERS
# ============================================================================

app.include_router(
    health.router,
    prefix="/api/v1",
    tags=["Health Check"]
)

app.include_router(
    workspaces.router,
    prefix="/api/v1",
    tags=["Workspaces & Documents"]
)

# ============================================================================
# ENDPOINTS RAÍZ
# ============================================================================

@app.get(
    "/",
    tags=["Root"],
    summary="Información de la API"
)
def read_root():
    """
    Endpoint raíz con información básica de la API.
    """
    return {
        "message": "🤖 Sistema de IA Empresarial - API RAG",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "active_llm": settings.ACTIVE_LLM_SERVICE,
        "docs": "/api/docs" if settings.DEBUG else "disabled",
        "endpoints": {
            "health": "/api/v1/health",
            "workspaces": "/api/v1/workspaces",
            "docs": "/api/docs"
        }
    }

@app.get(
    "/api/v1/info",
    tags=["Root"],
    summary="Información detallada del sistema"
)
def system_info():
    """
    Endpoint con información detallada del sistema (solo en desarrollo).
    """
    if settings.ENVIRONMENT == "production":
        return {"error": "Endpoint no disponible en producción"}
    
    import sys
    import platform
    
    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "llm_service": settings.ACTIVE_LLM_SERVICE,
        "database_url": settings.DATABASE_URL.split("@")[-1],  # Sin credenciales
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB
    }

# ============================================================================
# MANEJO DE 404
# ============================================================================

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    """Handler personalizado para rutas no encontradas"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Ruta no encontrada",
            "details": {
                "path": str(request.url.path),
                "method": request.method
            },
            "status_code": 404,
            "request_id": getattr(request.state, "request_id", None)
        }
    )

# ============================================================================
# HEALTH CHECK MEJORADO (Opcional - agregar a health.py)
# ============================================================================

@app.get(
    "/health",
    tags=["Health Check"],
    summary="Health Check Simple"
)
def simple_health_check():
    """
    Health check simple sin dependencias externas.
    Útil para load balancers.
    """
    return {"status": "healthy", "timestamp": time.time()}

# ============================================================================
# MAIN PARA DESARROLLO LOCAL
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🔧 Modo de desarrollo - Iniciando servidor Uvicorn...")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload en desarrollo
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )