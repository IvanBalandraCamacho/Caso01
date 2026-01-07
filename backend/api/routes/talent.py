"""
API Routes para busqueda de talento via MCP.

Endpoints:
- POST /api/v1/talent/search - Buscar candidatos por consulta semantica
- POST /api/v1/talent/enrich-team - Enriquecer equipo sugerido con candidatos
- GET /api/v1/talent/stats - Estadisticas de la base de talento
- GET /api/v1/talent/health - Health check del servicio MCP
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

from core.mcp_client import mcp_talent_client, TalentSearchResponse, Candidato
from core.auth import get_current_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/talent", tags=["talent"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class TalentSearchRequest(BaseModel):
    """Request para busqueda de talento."""
    consulta: str
    limit: int = 10


class TeamMember(BaseModel):
    """Miembro del equipo sugerido."""
    rol: str
    seniority: Optional[str] = None
    cantidad: int = 1
    skills: List[str] = []


class EnrichTeamRequest(BaseModel):
    """Request para enriquecer equipo con candidatos."""
    equipo_sugerido: List[TeamMember]
    pais: Optional[str] = None


class CandidatoSugerido(BaseModel):
    """Candidato sugerido para un rol."""
    nombre: str
    cargo_actual: str
    certificacion: str
    institucion: str
    pais: str
    match_score: float


class TeamMemberEnriched(BaseModel):
    """Miembro del equipo enriquecido con candidatos."""
    rol: str
    seniority: Optional[str] = None
    cantidad: int = 1
    skills: List[str] = []
    candidatos_sugeridos: List[CandidatoSugerido] = []


class EnrichTeamResponse(BaseModel):
    """Response de enriquecimiento de equipo."""
    exito: bool
    mensaje: str
    equipo_enriquecido: List[TeamMemberEnriched]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/search", response_model=TalentSearchResponse)
async def search_talent(
    request: TalentSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Busca candidatos basandose en una consulta en lenguaje natural.
    
    Ejemplos de consultas:
    - "Experto en seguridad cloud AWS"
    - "Desarrollador Java Senior en Colombia"
    - "Arquitecto de soluciones con certificacion Azure"
    """
    try:
        logger.info(f"Talent search request: '{request.consulta}' by user {current_user.id}")
        
        result = await mcp_talent_client.search_talent(
            consulta=request.consulta,
            limit=request.limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in talent search: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al buscar talento: {str(e)}"
        )


@router.post("/enrich-team", response_model=EnrichTeamResponse)
async def enrich_team(
    request: EnrichTeamRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Enriquece un equipo sugerido con candidatos reales de la base de talento.
    
    Recibe la estructura de equipo generada por el LLM y la enriquece
    con candidatos que tengan certificaciones relevantes.
    """
    try:
        logger.info(f"Enrich team request with {len(request.equipo_sugerido)} roles by user {current_user.id}")
        
        # Convertir a diccionarios para el cliente
        equipo_dict = [m.model_dump() for m in request.equipo_sugerido]
        
        # Llamar al cliente MCP
        enriched = await mcp_talent_client.enrich_team_suggestions(
            equipo_sugerido=equipo_dict,
            pais=request.pais
        )
        
        # Convertir respuesta
        equipo_enriquecido = []
        for miembro in enriched:
            candidatos = [
                CandidatoSugerido(**c) 
                for c in miembro.get("candidatos_sugeridos", [])
            ]
            equipo_enriquecido.append(
                TeamMemberEnriched(
                    rol=miembro.get("rol", ""),
                    seniority=miembro.get("seniority"),
                    cantidad=miembro.get("cantidad", 1),
                    skills=miembro.get("skills", []),
                    candidatos_sugeridos=candidatos
                )
            )
        
        total_candidatos = sum(len(m.candidatos_sugeridos) for m in equipo_enriquecido)
        
        return EnrichTeamResponse(
            exito=True,
            mensaje=f"Equipo enriquecido con {total_candidatos} candidatos sugeridos",
            equipo_enriquecido=equipo_enriquecido
        )
        
    except Exception as e:
        logger.error(f"Error enriching team: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al enriquecer equipo: {str(e)}"
        )


@router.get("/stats")
async def get_talent_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadisticas de la base de datos de talento.
    
    Retorna informacion sobre:
    - Total de certificaciones indexadas
    - Distribucion por paises
    - Top instituciones certificadoras
    - Top cargos
    """
    try:
        stats = await mcp_talent_client.get_statistics()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting talent stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener estadisticas: {str(e)}"
        )


@router.get("/health")
async def talent_health_check():
    """
    Verifica el estado del servicio MCP de talento.
    """
    try:
        health = await mcp_talent_client.health_check()
        return health
        
    except Exception as e:
        logger.error(f"MCP health check failed: {e}")
        return {
            "status": "error",
            "detail": str(e)
        }
