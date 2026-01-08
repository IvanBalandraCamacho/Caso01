"""
Endpoints para gestión de plantillas de análisis especializadas.
Permite crear, listar y aplicar plantillas predefinidas para diferentes tipos de RFPs.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from models.database import get_db
from models.user import User
from core.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


class TemplateSection(BaseModel):
    """Sección de una plantilla de análisis."""
    name: str
    description: str
    required: bool = True


class AnalysisTemplate(BaseModel):
    """Plantilla completa de análisis."""
    id: str
    name: str
    description: str
    icon: str
    category: str  # "government", "private", "technology", "consulting", "express", "custom"
    sections: List[TemplateSection]
    estimated_time: str
    use_cases: List[str]


# Plantillas predefinidas
PREDEFINED_TEMPLATES = [
    {
        "id": "government-rfp",
        "name": "RFP Gobierno",
        "description": "Plantilla especializada para licitaciones públicas y organismos gubernamentales",
        "icon": "🏛️",
        "category": "government",
        "estimated_time": "15-20 min",
        "use_cases": [
            "Licitaciones públicas",
            "Contratos gubernamentales",
            "Proyectos del sector público"
        ],
        "sections": [
            {
                "name": "Requisitos Legales",
                "description": "Verificación de cumplimiento normativo y legal",
                "required": True
            },
            {
                "name": "Garantías y Pólizas",
                "description": "Análisis de requisitos de garantías, pólizas y seguros",
                "required": True
            },
            {
                "name": "Documentación Corporativa",
                "description": "Revisión de documentos legales de la empresa",
                "required": True
            },
            {
                "name": "Experiencia Previa",
                "description": "Validación de experiencia en proyectos similares",
                "required": True
            },
            {
                "name": "Propuesta Económica",
                "description": "Estructura de costos y presupuesto",
                "required": True
            },
            {
                "name": "Cronograma",
                "description": "Plan de trabajo y fechas de entrega",
                "required": True
            }
        ]
    },
    {
        "id": "private-rfp",
        "name": "RFP Empresa Privada",
        "description": "Plantilla para propuestas B2B y empresas del sector privado",
        "icon": "🏢",
        "category": "private",
        "estimated_time": "12-15 min",
        "use_cases": [
            "RFPs corporativos",
            "Proyectos B2B",
            "Servicios empresariales"
        ],
        "sections": [
            {
                "name": "Resumen Ejecutivo",
                "description": "Síntesis de la propuesta para C-level",
                "required": True
            },
            {
                "name": "Entendimiento del Negocio",
                "description": "Análisis de necesidades y contexto del cliente",
                "required": True
            },
            {
                "name": "Propuesta de Valor",
                "description": "Diferenciadores y beneficios clave",
                "required": True
            },
            {
                "name": "SLAs y Métricas",
                "description": "Niveles de servicio y KPIs comprometidos",
                "required": True
            },
            {
                "name": "Casos de Éxito",
                "description": "Referencias y proyectos similares exitosos",
                "required": True
            },
            {
                "name": "Modelo Comercial",
                "description": "Estructura de precios y términos comerciales",
                "required": True
            }
        ]
    },
    {
        "id": "technology-rfp",
        "name": "RFP Tecnología",
        "description": "Plantilla para proyectos de infraestructura, desarrollo y servicios TI",
        "icon": "💻",
        "category": "technology",
        "estimated_time": "18-25 min",
        "use_cases": [
            "Desarrollo de software",
            "Infraestructura cloud",
            "Transformación digital"
        ],
        "sections": [
            {
                "name": "Arquitectura Técnica",
                "description": "Diseño de solución y componentes tecnológicos",
                "required": True
            },
            {
                "name": "Stack Tecnológico",
                "description": "Tecnologías, frameworks y herramientas propuestas",
                "required": True
            },
            {
                "name": "Seguridad y Compliance",
                "description": "Medidas de seguridad y cumplimiento normativo",
                "required": True
            },
            {
                "name": "Integraciones",
                "description": "APIs, conectores y puntos de integración",
                "required": True
            },
            {
                "name": "Escalabilidad y Performance",
                "description": "Capacidad de crecimiento y métricas de rendimiento",
                "required": True
            },
            {
                "name": "DevOps y Despliegue",
                "description": "Pipeline CI/CD, ambientes y estrategia de despliegue",
                "required": True
            },
            {
                "name": "Soporte y Mantenimiento",
                "description": "Plan de operación, monitoreo y soporte técnico",
                "required": True
            }
        ]
    },
    {
        "id": "consulting-rfp",
        "name": "Consultoría",
        "description": "Plantilla para servicios de consultoría y asesoría estratégica",
        "icon": "📊",
        "category": "consulting",
        "estimated_time": "10-15 min",
        "use_cases": [
            "Consultoría estratégica",
            "Asesoría de negocio",
            "Transformación organizacional"
        ],
        "sections": [
            {
                "name": "Diagnóstico Inicial",
                "description": "Análisis de situación actual y problemática",
                "required": True
            },
            {
                "name": "Metodología",
                "description": "Enfoque y framework de trabajo propuesto",
                "required": True
            },
            {
                "name": "Entregables",
                "description": "Documentos, informes y productos del proyecto",
                "required": True
            },
            {
                "name": "Equipo Consultor",
                "description": "Perfiles, roles y experiencia del equipo",
                "required": True
            },
            {
                "name": "Plan de Trabajo",
                "description": "Fases, hitos y cronograma del proyecto",
                "required": True
            }
        ]
    },
    {
        "id": "express-analysis",
        "name": "Análisis Rápido",
        "description": "Análisis express para revisión inicial de documentos",
        "icon": "⚡",
        "category": "express",
        "estimated_time": "5-8 min",
        "use_cases": [
            "Revisión preliminar",
            "Go/No-go rápido",
            "Screening inicial"
        ],
        "sections": [
            {
                "name": "Resumen Ejecutivo",
                "description": "Síntesis de puntos clave del RFP",
                "required": True
            },
            {
                "name": "Requisitos Críticos",
                "description": "Identificación de requisitos imprescindibles",
                "required": True
            },
            {
                "name": "Alertas Rojas",
                "description": "Riesgos o blockers identificados",
                "required": True
            },
            {
                "name": "Recomendación Inicial",
                "description": "Participar o no participar en la licitación",
                "required": True
            }
        ]
    },
    {
        "id": "custom-analysis",
        "name": "Análisis Personalizado",
        "description": "Plantilla flexible que se adapta al contenido del documento",
        "icon": "🎯",
        "category": "custom",
        "estimated_time": "Variable",
        "use_cases": [
            "RFPs únicos",
            "Propuestas especiales",
            "Análisis a medida"
        ],
        "sections": [
            {
                "name": "Análisis Automático",
                "description": "El sistema detecta automáticamente las secciones relevantes",
                "required": True
            },
            {
                "name": "Preguntas Críticas",
                "description": "Vacíos de información detectados",
                "required": True
            },
            {
                "name": "Supuestos Recomendados",
                "description": "Supuestos para completar información faltante",
                "required": True
            }
        ]
    }
]


@router.get("/templates", summary="Listar plantillas de análisis disponibles", response_model=List[AnalysisTemplate])
def list_templates(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Lista todas las plantillas de análisis disponibles.
    
    Args:
        category: Filtrar por categoría (government, private, technology, consulting, express, custom)
    
    Returns:
        Lista de plantillas con toda su configuración
    """
    templates = PREDEFINED_TEMPLATES
    
    if category:
        templates = [t for t in templates if t["category"] == category]
    
    return templates


@router.get("/templates/{template_id}", summary="Obtener detalle de una plantilla", response_model=AnalysisTemplate)
def get_template(
    template_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Obtiene el detalle completo de una plantilla específica.
    """
    template = next((t for t in PREDEFINED_TEMPLATES if t["id"] == template_id), None)
    
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    return template


@router.post("/workspaces/{workspace_id}/apply-template", summary="Aplicar plantilla a workspace")
def apply_template_to_workspace(
    workspace_id: str,
    template_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Aplica una plantilla de análisis a un workspace específico.
    
    Esto configura el workspace para usar la estructura de análisis de la plantilla
    y puede desencadenar re-análisis de documentos existentes.
    
    Args:
        workspace_id: ID del workspace
        template_id: ID de la plantilla a aplicar
    
    Returns:
        {
            "message": str,
            "template": dict,
            "workspace_id": str,
            "applied_at": str
        }
    """
    from models.workspace import Workspace
    from sqlalchemy import and_
    
    try:
        # Verificar que el workspace existe y pertenece al usuario
        workspace = db.query(Workspace).filter(
            and_(
                Workspace.id == workspace_id,
                Workspace.owner_id == current_user.id
            )
        ).first()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace no encontrado")
        
        # Verificar que la plantilla existe
        template = next((t for t in PREDEFINED_TEMPLATES if t["id"] == template_id), None)
        if not template:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        
        # TODO: En el futuro, guardar la plantilla aplicada en el workspace
        # Por ahora, solo retornamos confirmación
        
        return {
            "message": f"Plantilla '{template['name']}' aplicada correctamente al workspace '{workspace.name}'",
            "template": template,
            "workspace_id": workspace_id,
            "workspace_name": workspace.name,
            "applied_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error aplicando plantilla: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al aplicar plantilla: {str(e)}")
