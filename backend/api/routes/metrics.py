"""
Endpoint para métricas del sistema LLM.
Permite monitorear uso, costos y calidad.
"""
from fastapi import APIRouter, Depends
from core.auth import get_current_superuser
from core.llm_validators import get_metrics
from core.llm_cache import get_llm_cache
from models.user import User

router = APIRouter()


@router.get("/metrics/llm")
def get_llm_metrics(current_user: User = Depends(get_current_superuser)):
    """
    Obtiene métricas del sistema LLM.
    
    Requiere permisos de superusuario.
    
    Returns:
        {
            "llm_usage": {...},
            "cache_stats": {...}
        }
    """
    metrics = get_metrics()
    cache = get_llm_cache()
    
    response = {
        "llm_usage": metrics.get_stats(),
        "cache_stats": {}
    }
    
    if cache:
        response["cache_stats"] = cache.get_stats()
    
    return response


@router.post("/metrics/llm/reset")
def reset_llm_metrics(current_user: User = Depends(get_current_superuser)):
    """
    Resetea las métricas del sistema LLM.
    
    Requiere permisos de superusuario.
    """
    metrics = get_metrics()
    metrics.__init__()  # Resetear
    
    return {"message": "Métricas reseteadas correctamente"}


@router.delete("/cache/llm")
def clear_llm_cache(current_user: User = Depends(get_current_superuser)):
    """
    Limpia el caché del sistema LLM.
    
    Requiere permisos de superusuario.
    """
    cache = get_llm_cache()
    
    if cache:
        cache.clear_all()
        return {"message": "Caché limpiado correctamente"}
    else:
        return {"message": "Caché no disponible"}
