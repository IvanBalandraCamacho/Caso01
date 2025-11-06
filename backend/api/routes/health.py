from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from qdrant_client import QdrantClient
from redis import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from core.config import settings

router = APIRouter()

# --- Funciones de Dependencia para verificar servicios ---

def get_db_status():
    """Verifica la conexión con MySQL."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except OperationalError:
        return "error"

def get_qdrant_status():
    """
    Verifica la conexión con Qdrant.
    La clase 'QdrantException' ha sido eliminada en versiones nuevas.
    Ahora simplemente capturamos la Excepción genérica.
    """
    try:
        client = QdrantClient(url=settings.QDRANT_URL, timeout=1.0)
        # Usamos un método simple para verificar la conexión
        client.get_collections() 
        return "ok"
    except Exception: # <-- ESTE ES EL CAMBIO PRINCIPAL
        return "error"

def get_redis_status():
    """Verifica la conexión con Redis."""
    try:
        r = Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()
        return "ok"
    except RedisConnectionError:
        return "error"

# --- Endpoint de Salud ---

@router.get(
    "/health",
    summary="Verifica la salud de los servicios dependientes"
)
def health_check(
    db_status: str = Depends(get_db_status),
    qdrant_status: str = Depends(get_qdrant_status),
    redis_status: str = Depends(get_redis_status),
):
    """
    Endpoint de Health Check.
    
    Verifica la conectividad con:
    - MySQL (Metadata DB)
    - Qdrant (Vector DB)
    - Redis (Cache & Celery Broker)
    
    Si todos los servicios están 'ok', devuelve un 200.
    Si algún servicio falla, devuelve un 503.
    """
    service_status = {
        "mysql": db_status,
        "qdrant": qdrant_status,
        "redis": redis_status
    }
    
    if all(s == "ok" for s in service_status.values()):
        return service_status
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check fallido. Estado de servicios: {service_status}"
        )