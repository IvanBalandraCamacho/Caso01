"""
Endpoints para el Dashboard empresarial.
Proporciona métricas, estadísticas y datos agregados para la vista principal.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Dict, Any
from datetime import datetime, timedelta
from models.database import get_db
from models.user import User
from models.workspace import Workspace
from models.document import Document
from models.conversation import Conversation
from core.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboard/stats", summary="Obtener estadísticas del dashboard")
def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene métricas agregadas para el dashboard principal.
    
    Returns:
        {
            "total_workspaces": int,
            "active_workspaces": int,
            "total_documents": int,
            "rfps_processed": int,
            "completed_documents": int,
            "success_rate": float,
            "documents_this_month": int,
            "trend": str  # "up", "down", "stable"
        }
    """
    try:
        # Total de workspaces del usuario
        total_workspaces = db.query(func.count(Workspace.id)).filter(
            Workspace.owner_id == current_user.id
        ).scalar() or 0
        
        # Workspaces activos
        active_workspaces = db.query(func.count(Workspace.id)).filter(
            and_(
                Workspace.owner_id == current_user.id,
                Workspace.is_active == True
            )
        ).scalar() or 0
        
        # Total de documentos del usuario (a través de sus workspaces)
        total_documents = db.query(func.count(Document.id)).join(
            Workspace, Document.workspace_id == Workspace.id
        ).filter(
            Workspace.owner_id == current_user.id
        ).scalar() or 0
        
        # Documentos completados
        completed_documents = db.query(func.count(Document.id)).join(
            Workspace, Document.workspace_id == Workspace.id
        ).filter(
            and_(
                Workspace.owner_id == current_user.id,
                Document.status == "COMPLETED"
            )
        ).scalar() or 0
        
        # RFPs procesados (asumimos que son documentos con análisis completo)
        rfps_processed = db.query(func.count(Document.id)).join(
            Workspace, Document.workspace_id == Workspace.id
        ).filter(
            and_(
                Workspace.owner_id == current_user.id,
                Document.suggestion_full.isnot(None)
            )
        ).scalar() or 0
        
        # Tasa de éxito (documentos completados / total)
        success_rate = round((completed_documents / total_documents * 100), 1) if total_documents > 0 else 0
        
        # Documentos del mes actual
        first_day_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        documents_this_month = db.query(func.count(Document.id)).join(
            Workspace, Document.workspace_id == Workspace.id
        ).filter(
            and_(
                Workspace.owner_id == current_user.id,
                Document.created_at >= first_day_of_month
            )
        ).scalar() or 0
        
        # Documentos del mes anterior para calcular tendencia
        first_day_last_month = (first_day_of_month - timedelta(days=1)).replace(day=1)
        documents_last_month = db.query(func.count(Document.id)).join(
            Workspace, Document.workspace_id == Workspace.id
        ).filter(
            and_(
                Workspace.owner_id == current_user.id,
                Document.created_at >= first_day_last_month,
                Document.created_at < first_day_of_month
            )
        ).scalar() or 0
        
        # Calcular tendencia
        trend = "stable"
        trend_percentage = 0
        if documents_last_month > 0:
            trend_percentage = round(((documents_this_month - documents_last_month) / documents_last_month) * 100)
            if trend_percentage > 5:
                trend = "up"
            elif trend_percentage < -5:
                trend = "down"
        elif documents_this_month > 0:
            trend = "up"
            trend_percentage = 100
        
        return {
            "total_workspaces": total_workspaces,
            "active_workspaces": active_workspaces,
            "total_documents": total_documents,
            "rfps_processed": rfps_processed,
            "completed_documents": completed_documents,
            "success_rate": success_rate,
            "documents_this_month": documents_this_month,
            "documents_last_month": documents_last_month,
            "trend": trend,
            "trend_percentage": trend_percentage
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas del dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")


@router.get("/suggestions", summary="Obtener sugerencias proactivas del asistente")
def get_suggestions(
    workspace_id: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Genera sugerencias proactivas basadas en el estado actual de los workspaces.
    
    Args:
        workspace_id: ID del workspace específico (opcional, si no se pasa analiza todos)
    
    Returns:
        List[Dict]: Lista de sugerencias con type, priority, title, description, action, workspace_id, workspace_name
    """
    try:
        suggestions = []
        
        # Filtrar workspaces según parámetro
        workspaces_query = db.query(Workspace).filter(
            and_(
                Workspace.owner_id == current_user.id,
                Workspace.is_active == True
            )
        )
        
        if workspace_id:
            workspaces_query = workspaces_query.filter(Workspace.id == workspace_id)
        
        workspaces = workspaces_query.all()
        
        for workspace in workspaces:
            # 1. Detectar documentos en estado FAILED
            failed_docs = db.query(Document).filter(
                and_(
                    Document.workspace_id == workspace.id,
                    Document.status == "FAILED"
                )
            ).count()
            
            if failed_docs > 0:
                suggestions.append({
                    "type": "missing_doc",
                    "priority": "high",
                    "title": f"{failed_docs} documento(s) con error",
                    "description": f"Hay {failed_docs} documento(s) que fallaron en procesamiento en '{workspace.name}'",
                    "action": "review_documents",
                    "workspace_id": workspace.id,
                    "workspace_name": workspace.name
                })
            
            # 2. Detectar documentos pendientes de procesar
            pending_docs = db.query(Document).filter(
                and_(
                    Document.workspace_id == workspace.id,
                    Document.status.in_(["PENDING", "PROCESSING"])
                )
            ).count()
            
            if pending_docs > 0:
                suggestions.append({
                    "type": "requirement",
                    "priority": "medium",
                    "title": f"{pending_docs} documento(s) en proceso",
                    "description": f"Hay {pending_docs} documento(s) siendo analizados en '{workspace.name}'",
                    "action": "check_status",
                    "workspace_id": workspace.id,
                    "workspace_name": workspace.name
                })
            
            # 3. Detectar workspaces sin documentos
            total_docs = db.query(func.count(Document.id)).filter(
                Document.workspace_id == workspace.id
            ).scalar() or 0
            
            if total_docs == 0:
                suggestions.append({
                    "type": "missing_doc",
                    "priority": "high",
                    "title": "Workspace sin documentos",
                    "description": f"El workspace '{workspace.name}' aún no tiene documentos cargados",
                    "action": "upload_document",
                    "workspace_id": workspace.id,
                    "workspace_name": workspace.name
                })
            
            # 4. Detectar workspaces con pocos documentos pero conversaciones activas
            if total_docs > 0 and total_docs < 3:
                conversations_count = db.query(func.count(Conversation.id)).filter(
                    Conversation.workspace_id == workspace.id
                ).scalar() or 0
                
                if conversations_count > 0:
                    suggestions.append({
                        "type": "improvement",
                        "priority": "low",
                        "title": "Mejorar base de conocimiento",
                        "description": f"'{workspace.name}' tiene solo {total_docs} documento(s). Agrega más para mejores análisis",
                        "action": "upload_document",
                        "workspace_id": workspace.id,
                        "workspace_name": workspace.name
                    })
            
            # 5. Detectar documentos completados sin suggestion_full (no analizados completamente)
            docs_without_analysis = db.query(Document).filter(
                and_(
                    Document.workspace_id == workspace.id,
                    Document.status == "COMPLETED",
                    Document.suggestion_full.is_(None)
                )
            ).count()
            
            if docs_without_analysis > 0:
                suggestions.append({
                    "type": "requirement",
                    "priority": "medium",
                    "title": "Documentos sin análisis completo",
                    "description": f"{docs_without_analysis} documento(s) en '{workspace.name}' necesitan análisis detallado",
                    "action": "analyze_documents",
                    "workspace_id": workspace.id,
                    "workspace_name": workspace.name
                })
        
        # Ordenar por prioridad: high > medium > low
        priority_order = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        # Limitar a las 10 sugerencias más importantes
        return suggestions[:10]
        
    except Exception as e:
        logger.error(f"Error generando sugerencias: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al generar sugerencias: {str(e)}")
