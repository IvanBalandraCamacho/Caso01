"""
Quick Wins Routes - Fase 6.2
Funcionalidades diferenciadoras: Checklist de Cumplimiento, Resumen Ejecutivo, etc.
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_current_user
from core.llm_service import LLMService
from core.rag_client import RAGClient
from models.user import User
from prompts.chat_prompts import (
    COMPLIANCE_CHECKLIST_PROMPT,
    EXECUTIVE_SUMMARY_PITCH_PROMPT,
)

router = APIRouter(prefix="/quick-wins", tags=["Quick Wins"])
logger = logging.getLogger(__name__)


# =========================================================================
# SCHEMAS
# =========================================================================

class ComplianceChecklistRequest(BaseModel):
    workspace_id: str
    proposal_content: Optional[str] = None


class ExecutiveSummaryRequest(BaseModel):
    cliente: str
    nombre_operacion: str
    presupuesto: Optional[str] = "No especificado"
    moneda: Optional[str] = "USD"
    tiempo_aproximado: Optional[str] = "No especificado"
    nro_recursos: Optional[int] = 0
    stack_tecnologico: Optional[list] = []
    objetivo: Optional[str] = ""


class ComplianceItem(BaseModel):
    requisito: str
    seccion_rfp: str
    estado: str  # CUMPLE, NO_CUMPLE, PARCIAL, NO_APLICA
    evidencia: str
    prioridad: str  # OBLIGATORIO, DESEABLE, OPCIONAL


class ComplianceCategory(BaseModel):
    nombre: str
    icon: str
    items: list[ComplianceItem]


class ComplianceChecklistResponse(BaseModel):
    resumen: dict
    categorias: list[ComplianceCategory]
    recomendaciones: list[str]
    alertas: list[str]


class ExecutiveSummaryResponse(BaseModel):
    pitch: str
    hook: str
    problema: str
    solucion: str
    beneficio_clave: str
    diferenciador: str
    cta: str
    variantes: dict


# =========================================================================
# ENDPOINTS
# =========================================================================

@router.post("/compliance-checklist", response_model=ComplianceChecklistResponse)
async def generate_compliance_checklist(
    request: ComplianceChecklistRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Genera un checklist de cumplimiento automático comparando el RFP con la propuesta.
    """
    try:
        # Obtener contenido del RFP desde RAG
        rag_client = RAGClient()
        rfp_content = ""
        
        try:
            # Buscar todo el contenido relevante del workspace
            search_results = await rag_client.search(
                query="requisitos obligatorios especificaciones técnicas funcionales legales administrativos",
                workspace_id=request.workspace_id,
                top_k=20,  # Obtener más chunks para análisis completo
                score_threshold=0.3
            )
            
            if search_results:
                rfp_content = "\n\n".join([
                    f"[{r.get('file_name', 'Documento')}]: {r.get('content', '')}"
                    for r in search_results
                ])
        except Exception as e:
            logger.warning(f"Error obteniendo contenido RAG: {e}")
        
        if not rfp_content:
            raise HTTPException(
                status_code=400,
                detail="No se encontró contenido del RFP en el workspace. Asegúrate de haber subido el documento."
            )
        
        # Preparar el prompt
        prompt = COMPLIANCE_CHECKLIST_PROMPT.format(
            rfp_content=rfp_content[:15000],  # Limitar para no exceder contexto
            proposal_content=request.proposal_content or "No se ha generado una propuesta aún."
        )
        
        # Llamar al LLM
        llm_service = LLMService()
        response = await llm_service.generate_response(
            prompt=prompt,
            system_prompt="Eres un experto en análisis de RFPs. Responde SOLO con JSON válido.",
            temperature=0.3,
            max_tokens=4000
        )
        
        # Parsear respuesta JSON
        try:
            # Limpiar respuesta de posibles bloques de código
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            result = json.loads(clean_response)
        except json.JSONDecodeError as e:
            logger.error(f"Error parseando JSON de compliance: {e}")
            logger.error(f"Respuesta: {response[:500]}")
            # Devolver estructura por defecto si falla el parsing
            result = {
                "resumen": {
                    "total_requisitos": 0,
                    "cumple": 0,
                    "no_cumple": 0,
                    "parcial": 0,
                    "no_aplica": 0,
                    "porcentaje_cumplimiento": 0
                },
                "categorias": [],
                "recomendaciones": ["No se pudo analizar el documento. Intenta de nuevo."],
                "alertas": ["Error en el análisis. Verifica que el documento esté correctamente cargado."]
            }
        
        return ComplianceChecklistResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando checklist de cumplimiento: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/executive-summary", response_model=ExecutiveSummaryResponse)
async def generate_executive_summary(
    request: ExecutiveSummaryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Genera un resumen ejecutivo tipo "Pitch de 30 segundos" para la propuesta.
    """
    try:
        # Preparar el prompt con los datos
        prompt = EXECUTIVE_SUMMARY_PITCH_PROMPT.format(
            cliente=request.cliente,
            nombre_operacion=request.nombre_operacion,
            presupuesto=request.presupuesto,
            moneda=request.moneda,
            tiempo_aproximado=request.tiempo_aproximado,
            nro_recursos=request.nro_recursos,
            stack_tecnologico=", ".join(request.stack_tecnologico) if request.stack_tecnologico else "No especificado",
            objetivo=request.objetivo or "No especificado"
        )
        
        # Llamar al LLM
        llm_service = LLMService()
        response = await llm_service.generate_response(
            prompt=prompt,
            system_prompt="Eres un experto en ventas B2B. Responde SOLO con JSON válido.",
            temperature=0.7,  # Un poco más creativo para el pitch
            max_tokens=2000
        )
        
        # Parsear respuesta JSON
        try:
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            result = json.loads(clean_response)
        except json.JSONDecodeError as e:
            logger.error(f"Error parseando JSON de executive summary: {e}")
            # Devolver estructura por defecto
            result = {
                "pitch": f"Ayudamos a {request.cliente} a transformar su operación con una solución integral que aborda {request.objetivo}. Nuestro equipo de {request.nro_recursos} especialistas implementará la solución en {request.tiempo_aproximado}, generando valor inmediato para su organización.",
                "hook": f"Transformamos {request.cliente} con IA",
                "problema": "Necesidad de modernización tecnológica",
                "solucion": f"Solución integral con {', '.join(request.stack_tecnologico[:3]) if request.stack_tecnologico else 'tecnología de punta'}",
                "beneficio_clave": "Eficiencia operativa y reducción de costos",
                "diferenciador": "Experiencia comprobada y equipo especializado",
                "cta": "Agendemos una reunión para profundizar",
                "variantes": {
                    "email": f"Estimado equipo de {request.cliente}, nos complace presentar nuestra propuesta...",
                    "linkedin": f"Trabajando en un proyecto innovador para {request.cliente}. #Transformacion #Tecnologia",
                    "presentacion": f"- Cliente: {request.cliente}\n- Proyecto: {request.nombre_operacion}\n- Inversión: {request.presupuesto} {request.moneda}"
                }
            }
        
        return ExecutiveSummaryResponse(**result)
        
    except Exception as e:
        logger.error(f"Error generando resumen ejecutivo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check para el módulo Quick Wins"""
    return {"status": "ok", "module": "quick-wins"}
