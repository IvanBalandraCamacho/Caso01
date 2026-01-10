"""
Configuracion de templates para propuestas comerciales TIVIT.

Este modulo define la estructura, estilos y secciones para la generacion
de documentos de propuestas comerciales en formato DOCX y PDF.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class ProposalSection(Enum):
    """Secciones disponibles para una propuesta comercial."""
    PORTADA = "portada"
    RESUMEN_EJECUTIVO = "resumen_ejecutivo"
    ENTENDIMIENTO_PROBLEMA = "entendimiento_problema"
    ANALISIS_REQUERIMIENTOS = "analisis_requerimientos"
    PROPUESTA_SOLUCION = "propuesta_solucion"
    CRONOGRAMA = "cronograma"
    EQUIPO_TRABAJO = "equipo_trabajo"
    INVERSION = "inversion"
    GARANTIAS_SLA = "garantias_sla"
    ANEXOS = "anexos"


@dataclass
class StyleConfig:
    """Configuracion de estilos para documentos."""
    font_name: str = "Calibri"
    font_size_body: int = 11
    font_size_title: int = 28
    font_size_heading1: int = 16
    font_size_heading2: int = 14
    font_size_heading3: int = 12
    
    # Colores TIVIT (RGB)
    color_primary: tuple = (227, 24, 55)  # Rojo TIVIT #E31837
    color_secondary: tuple = (255, 107, 0)  # Naranja #FF6B00
    color_text: tuple = (50, 50, 50)  # Gris oscuro
    color_accent: tuple = (0, 102, 204)  # Azul para links
    
    # Margenes (en inches)
    margin_top: float = 1.0
    margin_bottom: float = 1.0
    margin_left: float = 1.0
    margin_right: float = 1.0


@dataclass 
class SectionTemplate:
    """Template para una seccion de la propuesta."""
    id: str
    title: str
    required: bool = True
    description: str = ""
    placeholders: List[str] = field(default_factory=list)


# Templates de secciones predefinidas
PROPOSAL_SECTIONS: List[SectionTemplate] = [
    SectionTemplate(
        id="portada",
        title="Portada",
        required=True,
        description="Pagina de titulo con logo TIVIT",
        placeholders=["{{cliente}}", "{{nombre_proyecto}}", "{{fecha}}"]
    ),
    SectionTemplate(
        id="resumen_ejecutivo", 
        title="Resumen Ejecutivo",
        required=True,
        description="Vision general de la propuesta",
        placeholders=["{{texto_resumen_ejecutivo}}"]
    ),
    SectionTemplate(
        id="entendimiento_problema",
        title="Entendimiento del Problema", 
        required=True,
        description="Analisis del contexto y necesidad del cliente",
        placeholders=["{{texto_entendimiento_problema}}"]
    ),
    SectionTemplate(
        id="analisis_requerimientos",
        title="Analisis de Requerimientos",
        required=True,
        description="Requerimientos funcionales y no funcionales",
        placeholders=["{{texto_analisis_requerimientos}}", "{{tabla_requerimientos}}"]
    ),
    SectionTemplate(
        id="propuesta_solucion",
        title="Propuesta de Solucion",
        required=True,
        description="Detalle de la solucion tecnica propuesta",
        placeholders=["{{texto_propuesta_solucion}}", "{{arquitectura}}"]
    ),
    SectionTemplate(
        id="cronograma",
        title="Cronograma de Implementacion",
        required=True,
        description="Fases, hitos y duracion del proyecto",
        placeholders=["{{texto_duracion}}", "{{tabla_cronograma}}"]
    ),
    SectionTemplate(
        id="equipo_trabajo",
        title="Equipo de Trabajo",
        required=True,
        description="Perfiles y roles del equipo propuesto",
        placeholders=["{{texto_propuesta_equipo}}", "{{tabla_equipo}}"]
    ),
    SectionTemplate(
        id="inversion",
        title="Inversion",
        required=True,
        description="Desglose de costos y condiciones comerciales",
        placeholders=["{{monto_total}}", "{{moneda}}", "{{tabla_costos}}"]
    ),
    SectionTemplate(
        id="garantias_sla",
        title="Garantias y SLAs",
        required=False,
        description="Niveles de servicio y garantias",
        placeholders=["{{texto_sla}}"]
    ),
    SectionTemplate(
        id="anexos",
        title="Anexos",
        required=False,
        description="Documentos adicionales y referencias",
        placeholders=["{{lista_anexos}}"]
    ),
]


# Estructura JSON esperada del LLM para generacion de propuestas
PROPOSAL_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "texto_entendimiento_problema": {"type": "string"},
        "texto_resumen_ejecutivo": {"type": "string"},
        "texto_analisis_requerimientos": {"type": "string"},
        "texto_propuesta_equipo": {"type": "string"},
        "texto_sla": {"type": "string"},
        "texto_duracion": {"type": "string"},
        "requerimientos_funcionales": {
            "type": "array",
            "items": {"type": "string"}
        },
        "requerimientos_no_funcionales": {
            "type": "array",
            "items": {"type": "string"}
        },
        "equipo_sugerido": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "rol": {"type": "string"},
                    "cantidad": {"type": "integer"},
                    "seniority": {"type": "string"},
                    "skills": {"type": "array", "items": {"type": "string"}}
                }
            }
        },
        "cronograma": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "fase": {"type": "string"},
                    "duracion": {"type": "string"},
                    "entregables": {"type": "array", "items": {"type": "string"}}
                }
            }
        }
    },
    "required": [
        "texto_entendimiento_problema",
        "texto_resumen_ejecutivo", 
        "texto_analisis_requerimientos",
        "texto_propuesta_equipo",
        "texto_duracion"
    ]
}


def get_default_style_config() -> StyleConfig:
    """Retorna la configuracion de estilos por defecto."""
    return StyleConfig()


def get_sections_by_ids(section_ids: List[str]) -> List[SectionTemplate]:
    """Filtra y retorna secciones por sus IDs."""
    return [s for s in PROPOSAL_SECTIONS if s.id in section_ids]


def get_required_sections() -> List[SectionTemplate]:
    """Retorna solo las secciones obligatorias."""
    return [s for s in PROPOSAL_SECTIONS if s.required]
