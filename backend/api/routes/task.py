"""
Endpoints para análisis y generación de propuestas comerciales.

Este módulo proporciona endpoints para:
- Analizar documentos RFP con IA
- Generar propuestas en formato Word
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from api.service.impl.proposals_service_impl import ProposalsServiceImpl
from api.service.proposals_service import ProposalsService
from models import database
from models.user import User
from core.auth import get_current_active_user
from core import llm_service
from core import document_service
import logging
import json
import os
import pdfplumber
import tempfile

# Configurar logger
logger = logging.getLogger(__name__)

router = APIRouter()

def get_proposal_service() -> ProposalsService:
    """Función de dependencia para obtener la instancia del servicio."""
    return ProposalsServiceImpl()


@router.post("/proposals/analyze", summary="Actualizado")
async def analyze_proposal(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    service: ProposalsService = Depends(get_proposal_service) 
):
    """Delega toda la lógica de validación, extracción y análisis al servicio."""
    return await service.analyze(file=file)


@router.post(
    "/task/generate",
    summary="Generar documento de propuesta",
    description="Genera un documento Word con la propuesta comercial"
)
async def generate_proposal_document(
    proposal_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Genera un documento Word con la propuesta comercial.
    
    Args:
        proposal_data: Datos del análisis de la propuesta
        current_user: Usuario autenticado
        db: Sesión de base de datos
        
    Returns:
        Documento Word generado
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """
    
    try:
        return document_service.generate_document(proposal_data)
        logger.info(f"Documento de propuesta generado por usuario: {current_user.email}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al generar documento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el documento: {str(e)}"
        )

@router.post(
    "/task/respond",
    summary="Responder consulta general con IA, pregunta y respuesta simple",
    description="Responde a una consulta general usando IA"
)
async def respond_chat(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
):
    """
    Responde a una consulta general usando IA.
    
    Args:
        query: Pregunta del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        
    Returns:
        Respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt simple
    prompt = f"""
    Responde de manera clara y concisa a las
    preguntas basada en el contexto proporcionado.
    """
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        return llm_service.generate_response_stream(full_prompt, relevant_chunks, chat_model)
    except Exception as e:
        logger.error(f"Error al generar respuesta de chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )


@router.post(
    "/task/analyze",
    summary="Analizar documentos y generar propuestas con IA",
    description="Analiza documentos y genera propuestas basadas en el contexto"
)
async def analyze_document(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
):
    """
    Analiza documentos y genera propuestas basadas en el contexto.
    
    Args:
        query: Pregunta/solicitud del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        workspace_instructions: Instrucciones del workspace
        
    Returns:
        Stream de respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt para análisis y propuestas
    prompt = f"""
    Eres un asistente especializado en análisis de documentos y generación de propuestas.
    
    Analiza la información proporcionada y genera una propuesta detallada y profesional.
    Incluye:
    - Análisis del alcance
    - Recomendaciones técnicas
    - Riesgos identificados
    - Próximos pasos sugeridos
    """
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        return llm_service.generate_response_stream(full_prompt, relevant_chunks, chat_model)
    except Exception as e:
        logger.error(f"Error al generar análisis de documento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el análisis: {str(e)}"
        )


# async def get_profiles()

#  TOMAR EN CUENTA QUE EL ENDPOINT DE GENERAR DOCUMENTO
#  SE GENERE A PARTIR DE LA ULTIMA PROPUESTA ANALIZADA
#  EN EL CHAT