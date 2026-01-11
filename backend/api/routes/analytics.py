"""
Analytics API Router - Fase 2.1
Endpoints para estadisticas y metricas del dashboard
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, List, Optional

from models import database
from models.user import User
from core.auth import get_current_active_user
from core.analytics_service import get_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter()


# === Schemas de respuesta ===

class RFPTypeStats(BaseModel):
    """Estadisticas por tipo de RFP"""
    data: Dict[str, int]
    total: int


class ProposalStatusStats(BaseModel):
    """Estadisticas por estado de propuesta"""
    data: Dict[str, int]
    total: int


class WinRateStats(BaseModel):
    """Estadisticas de tasa de exito"""
    won: int
    lost: int
    rejected: int
    total_finalized: int
    win_rate: float


class TVTSummary(BaseModel):
    """Resumen de valores TVT"""
    total_pipeline: float
    total_won: float
    total_pending: float
    total_sent: float
    by_status: Dict


class MonthlyStats(BaseModel):
    """Estadisticas mensuales"""
    month: str
    total: int
    won: int
    sent: int


class DashboardSummary(BaseModel):
    """Resumen completo del dashboard"""
    rfp_by_type: Dict[str, int]
    proposal_status: Dict[str, int]
    win_rate: WinRateStats
    tvt_summary: TVTSummary
    monthly_stats: List[MonthlyStats]


# === Endpoints ===

@router.get(
    "/rfp-by-type",
    response_model=RFPTypeStats,
    summary="Estadisticas de RFPs por tipo",
)
def get_rfp_by_type(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene el conteo de workspaces/RFPs agrupados por tipo:
    - Seguridad
    - Tecnologia
    - Infraestructura
    - Desarrollo
    - Consultoria
    - Otro
    """
    analytics = get_analytics_service(db)
    data = analytics.get_rfp_by_type_stats(current_user.id)
    total = sum(data.values())
    
    return RFPTypeStats(data=data, total=total)


@router.get(
    "/proposal-status",
    response_model=ProposalStatusStats,
    summary="Estadisticas de propuestas por estado",
)
def get_proposal_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene el conteo de propuestas por estado:
    - Pendiente
    - Enviada
    - Aceptada
    - Rechazada
    - Ganada
    - Perdida
    """
    analytics = get_analytics_service(db)
    data = analytics.get_proposal_status_stats(current_user.id)
    total = sum(data.values())
    
    return ProposalStatusStats(data=data, total=total)


@router.get(
    "/win-rate",
    response_model=WinRateStats,
    summary="Tasa de exito de propuestas",
)
def get_win_rate(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Calcula la tasa de exito de propuestas (ganadas vs perdidas/rechazadas)
    """
    analytics = get_analytics_service(db)
    data = analytics.get_win_rate(current_user.id)
    
    return WinRateStats(**data)


@router.get(
    "/tvt-summary",
    response_model=TVTSummary,
    summary="Resumen de valores TVT",
)
def get_tvt_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene el resumen de valores TVT (Total Value Target) por estado
    """
    analytics = get_analytics_service(db)
    data = analytics.get_tvt_summary(current_user.id)
    
    return TVTSummary(**data)


@router.get(
    "/monthly",
    response_model=List[MonthlyStats],
    summary="Estadisticas mensuales",
)
def get_monthly_stats(
    months: int = 6,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene estadisticas de los ultimos N meses (default 6)
    """
    analytics = get_analytics_service(db)
    data = analytics.get_monthly_stats(current_user.id, months)
    
    return [MonthlyStats(**item) for item in data]


@router.get(
    "/dashboard",
    response_model=DashboardSummary,
    summary="Resumen completo del dashboard",
)
def get_dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obtiene todas las metricas del dashboard en una sola llamada.
    Ideal para cargar el dashboard completo.
    """
    analytics = get_analytics_service(db)
    data = analytics.get_dashboard_summary(current_user.id)
    
    return DashboardSummary(
        rfp_by_type=data["rfp_by_type"],
        proposal_status=data["proposal_status"],
        win_rate=WinRateStats(**data["win_rate"]),
        tvt_summary=TVTSummary(**data["tvt_summary"]),
        monthly_stats=[MonthlyStats(**item) for item in data["monthly_stats"]],
    )
