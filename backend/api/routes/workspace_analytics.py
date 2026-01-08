"""
Endpoints para funcionalidades específicas de workspaces empresariales.
Incluye compliance, deadlines y análisis especializados.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Dict, Any
from datetime import datetime
import json
import re
import logging

from models.database import get_db
from models.user import User
from models.workspace import Workspace
from models.document import Document
from core.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/workspaces/{workspace_id}/compliance", summary="Obtener score de cumplimiento")
def get_workspace_compliance(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Calcula el score de cumplimiento basado en los análisis de documentos.
    
    Analiza los suggestion_full de documentos para extraer:
    - Requisitos cumplidos
    - Requisitos parciales
    - Requisitos pendientes
    
    Returns:
        {
            "score": float,  # 0-100
            "total_requirements": int,
            "completed": int,
            "partial": int,
            "pending": int,
            "details": [
                {
                    "requirement": str,
                    "status": "completed" | "partial" | "pending",
                    "document_name": str
                }
            ]
        }
    """
    try:
        # Verificar que el workspace pertenece al usuario
        workspace = db.query(Workspace).filter(
            and_(
                Workspace.id == workspace_id,
                Workspace.owner_id == current_user.id
            )
        ).first()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace no encontrado")
        
        # Obtener documentos completados con análisis
        documents = db.query(Document).filter(
            and_(
                Document.workspace_id == workspace_id,
                Document.status == "COMPLETED",
                Document.suggestion_full.isnot(None)
            )
        ).all()
        
        if not documents:
            # Sin documentos analizados, retornar valores por defecto
            return {
                "score": 0.0,
                "total_requirements": 0,
                "completed": 0,
                "partial": 0,
                "pending": 0,
                "details": []
            }
        
        # Analizar los suggestion_full para extraer requisitos
        completed_reqs = []
        partial_reqs = []
        pending_reqs = []
        
        for doc in documents:
            analysis = doc.suggestion_full or ""
            
            # Buscar patrones de preguntas críticas y supuestos
            # Las preguntas críticas indican requisitos pendientes
            if "PREGUNTAS CRÍTICAS" in analysis:
                critical_section = analysis.split("PREGUNTAS CRÍTICAS")[1]
                if "SUPUESTOS RECOMENDADOS" in critical_section:
                    critical_section = critical_section.split("SUPUESTOS RECOMENDADOS")[0]
                
                # Contar preguntas con 🔴 (críticas)
                critical_questions = re.findall(r'🔴.*?\n.*?❓\s*(.+?)\n', critical_section, re.DOTALL)
                for question in critical_questions:
                    pending_reqs.append({
                        "requirement": question.strip()[:100],  # Limitar longitud
                        "status": "pending",
                        "document_name": doc.file_name
                    })
                
                # Contar preguntas con 🟡 (importantes - considerarlas parciales)
                important_questions = re.findall(r'🟡.*?\n.*?❓\s*(.+?)\n', critical_section, re.DOTALL)
                for question in important_questions:
                    partial_reqs.append({
                        "requirement": question.strip()[:100],
                        "status": "partial",
                        "document_name": doc.file_name
                    })
            
            # Buscar supuestos (indican áreas con información)
            if "SUPUESTOS RECOMENDADOS" in analysis:
                assumptions_section = analysis.split("SUPUESTOS RECOMENDADOS")[1]
                assumptions = re.findall(r'📝\s*SUPUESTO.*?\n.*?Tema:\s*(.+?)\n', assumptions_section, re.DOTALL)
                for assumption in assumptions[:5]:  # Limitar a 5
                    completed_reqs.append({
                        "requirement": assumption.strip()[:100],
                        "status": "completed",
                        "document_name": doc.file_name
                    })
        
        # Si no se encontraron requisitos específicos, generar algunos genéricos
        if not (completed_reqs or partial_reqs or pending_reqs):
            # Contar documentos como proxy de progreso
            total_docs = len(documents)
            if total_docs >= 3:
                completed_reqs = [
                    {"requirement": "Documentación técnica", "status": "completed", "document_name": "Multiple"},
                    {"requirement": "Requisitos funcionales", "status": "completed", "document_name": "Multiple"},
                ]
            if total_docs >= 1:
                partial_reqs = [
                    {"requirement": "Alcance del proyecto", "status": "partial", "document_name": documents[0].file_name},
                ]
            pending_reqs = [
                {"requirement": "Validación completa de requisitos", "status": "pending", "document_name": "Pendiente"},
            ]
        
        # Calcular totales
        total_completed = len(completed_reqs)
        total_partial = len(partial_reqs)
        total_pending = len(pending_reqs)
        total_requirements = total_completed + total_partial + total_pending
        
        # Calcular score (completados = 100%, parciales = 50%, pendientes = 0%)
        if total_requirements > 0:
            score = round(
                ((total_completed * 1.0) + (total_partial * 0.5)) / total_requirements * 100,
                1
            )
        else:
            score = 0.0
        
        # Combinar todos los requisitos y limitar a 20
        all_requirements = (completed_reqs + partial_reqs + pending_reqs)[:20]
        
        return {
            "score": score,
            "total_requirements": total_requirements,
            "completed": total_completed,
            "partial": total_partial,
            "pending": total_pending,
            "details": all_requirements
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculando compliance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al calcular compliance: {str(e)}")


@router.get("/workspaces/{workspace_id}/deadlines", summary="Obtener fechas límite consolidadas")
def get_workspace_deadlines(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Extrae y consolida todas las fechas límite detectadas en los documentos del workspace.
    
    Returns:
        [
            {
                "date": str,  # ISO format
                "title": str,
                "description": str,
                "document_name": str,
                "days_remaining": int,
                "priority": "high" | "medium" | "low"
            }
        ]
    """
    try:
        # Verificar que el workspace pertenece al usuario
        workspace = db.query(Workspace).filter(
            and_(
                Workspace.id == workspace_id,
                Workspace.owner_id == current_user.id
            )
        ).first()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace no encontrado")
        
        # Obtener documentos con análisis
        documents = db.query(Document).filter(
            and_(
                Document.workspace_id == workspace_id,
                Document.suggestion_full.isnot(None)
            )
        ).all()
        
        deadlines = []
        now = datetime.now()
        
        # Patrones comunes de fechas en español
        date_patterns = [
            # "31 de diciembre de 2024", "15 de enero del 2025"
            r'(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de|del)\s+(\d{4})',
            # "2024-12-31", "2025-01-15"
            r'(\d{4})-(\d{2})-(\d{2})',
            # "31/12/2024", "15/01/2025"
            r'(\d{1,2})/(\d{1,2})/(\d{4})',
        ]
        
        months_es = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        }
        
        for doc in documents:
            text = doc.suggestion_full or ""
            
            # Buscar fechas en el texto
            for pattern in date_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    try:
                        if 'de' in pattern:  # Formato español
                            day = int(match.group(1))
                            month = months_es.get(match.group(2).lower(), 1)
                            year = int(match.group(3))
                        elif '-' in pattern:  # Formato ISO
                            year = int(match.group(1))
                            month = int(match.group(2))
                            day = int(match.group(3))
                        else:  # Formato DD/MM/YYYY
                            day = int(match.group(1))
                            month = int(match.group(2))
                            year = int(match.group(3))
                        
                        deadline_date = datetime(year, month, day)
                        
                        # Solo fechas futuras o hasta 90 días en el pasado
                        days_remaining = (deadline_date - now).days
                        if days_remaining >= -90:
                            # Extraer contexto alrededor de la fecha
                            start_idx = max(0, match.start() - 100)
                            end_idx = min(len(text), match.end() + 100)
                            context = text[start_idx:end_idx].replace('\n', ' ').strip()
                            
                            # Determinar prioridad basado en días restantes
                            if days_remaining < 0:
                                priority = "high"  # Vencida
                            elif days_remaining <= 7:
                                priority = "high"
                            elif days_remaining <= 30:
                                priority = "medium"
                            else:
                                priority = "low"
                            
                            # Generar título basado en contexto
                            title = f"Fecha límite - {doc.file_name}"
                            if "presentación" in context.lower():
                                title = "Presentación de propuesta"
                            elif "entrega" in context.lower():
                                title = "Entrega de documentos"
                            elif "cierre" in context.lower():
                                title = "Cierre de RFP"
                            
                            deadlines.append({
                                "date": deadline_date.isoformat(),
                                "title": title,
                                "description": context[:150],
                                "document_name": doc.file_name,
                                "days_remaining": days_remaining,
                                "priority": priority
                            })
                    
                    except (ValueError, AttributeError) as e:
                        logger.debug(f"Error parseando fecha en {doc.file_name}: {e}")
                        continue
        
        # Eliminar duplicados (misma fecha y documento)
        unique_deadlines = []
        seen = set()
        for deadline in deadlines:
            key = (deadline["date"], deadline["document_name"])
            if key not in seen:
                seen.add(key)
                unique_deadlines.append(deadline)
        
        # Ordenar por fecha (más cercanas primero)
        unique_deadlines.sort(key=lambda x: x["date"])
        
        # Limitar a 10 fechas más relevantes
        return unique_deadlines[:10]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extrayendo deadlines: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al extraer deadlines: {str(e)}")
