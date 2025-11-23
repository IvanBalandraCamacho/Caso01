from fastapi import APIRouter, status
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from redis import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from core.config import settings
import time
import logging

# Configurar logger
logger = logging.getLogger(__name__)

router = APIRouter()

# Tiempo de inicio de la aplicación (para calcular uptime)
START_TIME = time.time()


def get_db_status() -> dict:
    """
    Verifica la conexión con MySQL.
    
    Returns:
        dict con status y detalles de la conexión
    """
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.scalar()
            return {
                "status": "ok",
                "version": version,
                "type": "MySQL"
            }
    except OperationalError as e:
        logger.error(f"Error conectando a MySQL: {e}")
        return {
            "status": "error",
            "error": str(e),
            "type": "MySQL"
        }


def get_redis_status() -> dict:
    """
    Verifica la conexión con Redis.
    
    Returns:
        dict con status y detalles de la conexión
    """
    try:
        r = Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        info = r.info()
        return {
            "status": "ok",
            "version": info.get("redis_version", "unknown"),
            "type": "Redis"
        }
    except RedisConnectionError as e:
        logger.error(f"Error conectando a Redis: {e}")
        return {
            "status": "error",
            "error": str(e),
            "type": "Redis"
        }


def get_rag_status() -> dict:
    """
    Verifica el estado del servicio RAG externo.
    
    Returns:
        dict con status del servicio RAG
    """
    if not settings.RAG_SERVICE_ENABLED:
        return {
            "status": "disabled",
            "message": "RAG service not enabled (RAG_SERVICE_ENABLED=false)"
        }
    
    # TODO: Implementar health check del servicio RAG cuando esté disponible
    # try:
    #     response = await rag_client.health_check()
    #     return {"status": "ok", "version": response.version}
    # except Exception as e:
    #     return {"status": "error", "error": str(e)}
    
    return {
        "status": "not_implemented",
        "message": "RAG service health check not implemented yet"
    }


# --- Endpoints de Health Check ---

@router.get(
    "/health",
    summary="Health check básico",
    status_code=status.HTTP_200_OK
)
def health_check():
    """
    Endpoint de health check básico.
    
    Retorna un simple OK si la aplicación está corriendo.
    Útil para load balancers y monitoreo básico.
    """
    return {"status": "ok"}


@router.get(
    "/health/detailed",
    summary="Health check detallado con estado de servicios"
)
def detailed_health_check():
    """
    Endpoint de health check detallado.
    
    Verifica la conectividad con todos los servicios dependientes:
    - MySQL (base de datos de metadata)
    - Redis (cache y broker de Celery)
    - RAG Service (si está habilitado)
    
    Retorna:
    - 200 si todos los servicios están OK
    - 503 si algún servicio crítico está caído
    """
    # Verificar servicios
    db_status = get_db_status()
    redis_status = get_redis_status()
    rag_status = get_rag_status()
    
    # Calcular uptime
    uptime_seconds = int(time.time() - START_TIME)
    uptime_hours = uptime_seconds // 3600
    uptime_minutes = (uptime_seconds % 3600) // 60
    
    # Construir respuesta
    health_data = {
        "status": "ok",
        "version": "1.0.0",
        "uptime": {
            "seconds": uptime_seconds,
            "formatted": f"{uptime_hours}h {uptime_minutes}m"
        },
        "services": {
            "mysql": db_status,
            "redis": redis_status,
            "rag": rag_status
        }
    }
    
    # Determinar status general
    critical_services = [db_status, redis_status]
    if any(s["status"] == "error" for s in critical_services):
        health_data["status"] = "degraded"
        logger.warning("Health check degraded - some services are down")
        return health_data, status.HTTP_503_SERVICE_UNAVAILABLE
    
    return health_data


@router.get(
    "/health/ready",
    summary="Readiness probe (Kubernetes)",
    status_code=status.HTTP_200_OK
)
def readiness_probe():
    """
    Readiness probe para Kubernetes.
    
    Verifica que la aplicación está lista para recibir tráfico.
    Chequea que los servicios críticos (MySQL, Redis) estén disponibles.
    
    Retorna:
    - 200 si está listo
    - 503 si no está listo
    """
    db_status = get_db_status()
    redis_status = get_redis_status()
    
    if db_status["status"] == "ok" and redis_status["status"] == "ok":
        return {"ready": True}
    else:
        logger.warning("Readiness probe failed")
        return {"ready": False, "reason": "Critical services unavailable"}, status.HTTP_503_SERVICE_UNAVAILABLE


@router.get(
    "/health/live",
    summary="Liveness probe (Kubernetes)",
    status_code=status.HTTP_200_OK
)
def liveness_probe():
    """
    Liveness probe para Kubernetes.
    
    Verifica que la aplicación está viva y no en deadlock.
    Este endpoint siempre debe responder rápido.
    
    Retorna:
    - 200 si está vivo
    """
    return {"alive": True}