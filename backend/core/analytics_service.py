"""
Analytics Service - Fase 2.1
Servicio para generar estadisticas y metricas de workspaces y propuestas
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from models.workspace import Workspace
from models.document import Document
from models.conversation import Conversation

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Servicio centralizado para analytics de propuestas"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_rfp_by_type_stats(self, user_id: str) -> Dict:
        """
        Obtiene estadisticas de RFPs agrupadas por tipo
        
        Returns:
            Dict con conteo por tipo de RFP
        """
        try:
            results = (
                self.db.query(
                    Workspace.rfp_type,
                    func.count(Workspace.id).label("count")
                )
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.is_active == True)
                .group_by(Workspace.rfp_type)
                .all()
            )
            
            # Convertir a diccionario con labels amigables
            type_labels = {
                "security": "Seguridad",
                "technology": "Tecnologia",
                "infrastructure": "Infraestructura",
                "development": "Desarrollo",
                "consulting": "Consultoria",
                "other": "Otro",
                None: "Sin clasificar"
            }
            
            stats = {}
            for rfp_type, count in results:
                label = type_labels.get(rfp_type, rfp_type or "Sin clasificar")
                stats[label] = count
            
            return stats
        except Exception as e:
            logger.error(f"Error obteniendo stats por tipo: {e}")
            return {}
    
    def get_proposal_status_stats(self, user_id: str) -> Dict:
        """
        Obtiene estadisticas de propuestas por estado
        
        Returns:
            Dict con conteo por estado de propuesta
        """
        try:
            results = (
                self.db.query(
                    Workspace.proposal_status,
                    func.count(Workspace.id).label("count")
                )
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.is_active == True)
                .group_by(Workspace.proposal_status)
                .all()
            )
            
            status_labels = {
                "pending": "Pendiente",
                "sent": "Enviada",
                "accepted": "Aceptada",
                "rejected": "Rechazada",
                "won": "Ganada",
                "lost": "Perdida",
                None: "Sin estado"
            }
            
            stats = {}
            for status, count in results:
                label = status_labels.get(status, status or "Sin estado")
                stats[label] = count
            
            return stats
        except Exception as e:
            logger.error(f"Error obteniendo stats por estado: {e}")
            return {}
    
    def get_win_rate(self, user_id: str) -> Dict:
        """
        Calcula la tasa de exito de propuestas
        
        Returns:
            Dict con tasa de exito y totales
        """
        try:
            # Contar propuestas finalizadas
            won = (
                self.db.query(func.count(Workspace.id))
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.proposal_status == "won")
                .scalar() or 0
            )
            
            lost = (
                self.db.query(func.count(Workspace.id))
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.proposal_status == "lost")
                .scalar() or 0
            )
            
            rejected = (
                self.db.query(func.count(Workspace.id))
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.proposal_status == "rejected")
                .scalar() or 0
            )
            
            total_finalized = won + lost + rejected
            win_rate = (won / total_finalized * 100) if total_finalized > 0 else 0
            
            return {
                "won": won,
                "lost": lost,
                "rejected": rejected,
                "total_finalized": total_finalized,
                "win_rate": round(win_rate, 1),
            }
        except Exception as e:
            logger.error(f"Error calculando win rate: {e}")
            return {"win_rate": 0, "won": 0, "lost": 0, "total_finalized": 0}
    
    def get_tvt_summary(self, user_id: str) -> Dict:
        """
        Obtiene resumen de valores TVT
        
        Returns:
            Dict con totales por estado
        """
        try:
            results = (
                self.db.query(
                    Workspace.proposal_status,
                    func.sum(Workspace.tvt).label("total_tvt"),
                    func.count(Workspace.id).label("count")
                )
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.is_active == True)
                .filter(Workspace.tvt.isnot(None))
                .group_by(Workspace.proposal_status)
                .all()
            )
            
            summary = {
                "total_pipeline": 0,
                "total_won": 0,
                "total_pending": 0,
                "total_sent": 0,
                "by_status": {}
            }
            
            for status, total_tvt, count in results:
                total = float(total_tvt or 0)
                summary["total_pipeline"] += total
                summary["by_status"][status or "pending"] = {
                    "total": total,
                    "count": count
                }
                
                if status == "won":
                    summary["total_won"] = total
                elif status == "pending":
                    summary["total_pending"] = total
                elif status == "sent":
                    summary["total_sent"] = total
            
            return summary
        except Exception as e:
            logger.error(f"Error obteniendo resumen TVT: {e}")
            return {"total_pipeline": 0, "total_won": 0}
    
    def get_monthly_stats(self, user_id: str, months: int = 6) -> List[Dict]:
        """
        Obtiene estadisticas mensuales de los ultimos N meses
        
        Returns:
            Lista con stats por mes
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=months * 30)
            
            results = (
                self.db.query(
                    func.date_format(Workspace.created_at, '%Y-%m').label("month"),
                    func.count(Workspace.id).label("total"),
                    func.sum(case((Workspace.proposal_status == "won", 1), else_=0)).label("won"),
                    func.sum(case((Workspace.proposal_status == "sent", 1), else_=0)).label("sent"),
                )
                .filter(Workspace.owner_id == user_id)
                .filter(Workspace.created_at >= start_date)
                .group_by(func.date_format(Workspace.created_at, '%Y-%m'))
                .order_by(func.date_format(Workspace.created_at, '%Y-%m'))
                .all()
            )
            
            stats = []
            for month, total, won, sent in results:
                stats.append({
                    "month": month,
                    "total": total,
                    "won": won or 0,
                    "sent": sent or 0,
                })
            
            return stats
        except Exception as e:
            logger.error(f"Error obteniendo stats mensuales: {e}")
            return []
    
    def get_dashboard_summary(self, user_id: str) -> Dict:
        """
        Obtiene resumen completo para el dashboard
        
        Returns:
            Dict con todas las metricas del dashboard
        """
        return {
            "rfp_by_type": self.get_rfp_by_type_stats(user_id),
            "proposal_status": self.get_proposal_status_stats(user_id),
            "win_rate": self.get_win_rate(user_id),
            "tvt_summary": self.get_tvt_summary(user_id),
            "monthly_stats": self.get_monthly_stats(user_id),
        }


def get_analytics_service(db: Session) -> AnalyticsService:
    """Factory function para obtener el servicio de analytics"""
    return AnalyticsService(db)
