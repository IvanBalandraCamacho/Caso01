"""
Endpoints para análisis,generación, respouesta general y retorno de perfiles según la intención del usuario.

Este módulo proporciona endpoints para:
- Analizar documentos RFP con IA
- Generar propuestas en formato Word
- Responder consultas generales usando IA
- Retornar perfiles de las APIS de Tivit según la intención del usuario
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from api.service.impl.proposals_service_impl import ProposalsServiceImpl
from api.service.proposals_service import ProposalsService
from models import database
from models.user import User
from core.auth import get_current_active_user
from core import llm_service
from core import document_service
from prompts.chat_prompts import (
    GENERAL_QUERY_WITH_WORKSPACE_PROMPT,
    GENERAL_QUERY_NO_WORKSPACE_PROMPT,
    REQUIREMENTS_MATRIX_PROMPT,
    PRELIMINARY_PRICE_QUOTE_PROMPT,
    LEGAL_RISKS_PROMPT,
    SPECIFIC_QUERY_PROMPT
)
import logging
import json
import os
import pdfplumber
import tempfile

# Configurar logger
logger = logging.getLogger(__name__)

router = APIRouter()

service = ProposalsServiceImpl()


@router.post(
    "/task/analyze", 
    summary="Analizar documento RFP", 
    description="Analiza un documento RFP y extrae información relevante usando IA"
)
async def analyze_document(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_active_user)
):
    analysis = await get_analyze(file=file, db=db, user=current_user)
    return analysis


async def get_analyze(
    file: UploadFile,
    db: Session,
    user: User
):
    """Delega toda la lógica de validación, extracción y análisis al servicio."""
    if file:
        logger.info(f"Nombre: {file.filename}")
        logger.info(f"Tipo: {file.content_type}")

        try:
            analysis = await service.analyze(
                file=file,
                db=db,
                user=user
            )
            logger.info(f"ANALYSIS OK: {analysis}")
            return analysis
        except Exception as e:
            logger.error(f"ERROR EN analyze(): {e}")
            raise
        
def get_analyze_stream(
    query: str,
    relevant_chunks: Dict[str,Any],
    chat_model: str,
    workspace_instructions: str,
):
    try:
        return service.analyze_stream(
            relevant_chunks=relevant_chunks, 
            query = query, 
            workspace_instructions = workspace_instructions
        )
    except Exception as e:
        logger.info(f"No se pudo completar el análisis con el documento adjunto {str(e)}")

    

@router.post(
    "/task/generate",
    summary="Generar documento de propuesta",
    description="Genera un documento Word o PDF con la propuesta comercial"
)
async def generate_proposal_document(
    proposal_data: Dict[str, Any],
    format: str = "docx",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Genera un documento con la propuesta comercial.
    
    Args:
        proposal_data: Datos del análisis de la propuesta
        format: Formato del documento ("docx" o "pdf")
        current_user: Usuario autenticado
        db: Sesión de base de datos
        
    Returns:
        Documento generado
        
    Raises:
        HTTPException 400: Si el formato no es válido
        HTTPException 500: Si hay error en la generación
    """
    
    try:
        # Validar formato
        if format.lower() not in ["docx", "pdf"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato no soportado: {format}. Use 'docx' o 'pdf'."
            )
        
        # Generar documento
        doc_bytes = document_service.generate_document(proposal_data, format=format)
        logger.info(f"Documento de propuesta ({format}) generado por usuario: {current_user.email}")
        
        # Determinar media type y extensión según formato
        if format.lower() == "pdf":
            media_type = "application/pdf"
            filename = f"Propuesta_{proposal_data.get('cliente', 'documento').replace(' ', '_')}.pdf"
        else:  # docx
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"Propuesta_{proposal_data.get('cliente', 'documento').replace(' ', '_')}.docx"
        
        return Response(
            content=doc_bytes, 
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al generar documento ({format}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el documento: {str(e)}"
        )

def general_query_chat(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
    chat_history: list[dict] = None,
    thinking_level: str = None
):
    """
    Responde a una consulta general usando IA.
    
    Args:
        query: Pregunta del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        workspace_instructions: Instrucciones del workspace
        chat_history: Historial de mensajes previos
        thinking_level: Nivel de thinking (OFF, LOW, MEDIUM, HIGH)
        
    Returns:
        Respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt simple
    prompt = GENERAL_QUERY_WITH_WORKSPACE_PROMPT
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        response = llm_service.generate_response_stream(
            full_prompt, 
            relevant_chunks, 
            chat_model,
            chat_history=chat_history,
            thinking_level=thinking_level
        )
        return response
    except Exception as e:
        logger.error(f"Error al generar respuesta de chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )
        
def requirements_matrix_chat(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
    chat_history: list[dict] = None
):
    """
    Responde a una consulta general usando IA.
    
    Args:
        query: Pregunta del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        workspace_instructions: Instrucciones del workspace
        chat_history: Historial de mensajes previos
        
    Returns:
        Respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt simple
    prompt = REQUIREMENTS_MATRIX_PROMPT
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        response = llm_service.generate_response_stream(
            full_prompt, 
            relevant_chunks, 
            chat_model,
            chat_history=chat_history
        )
        return response
    except Exception as e:
        logger.info(f"No se pudo completar el análisis con el documento adjunto {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )
   
def preeliminar_price_quote_chat(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
    chat_history: list[dict] = None
):
    """
    Responde a una consulta general usando IA.
    
    Args:
        query: Pregunta del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        workspace_instructions: Instrucciones del workspace
        chat_history: Historial de mensajes previos
        
    Returns:
        Respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt simple
    prompt = PRELIMINARY_PRICE_QUOTE_PROMPT
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        response = llm_service.generate_response_stream(
            full_prompt, 
            relevant_chunks, 
            chat_model,
            chat_history=chat_history
        )
        return response
    except Exception as e:
        logger.info(f"No se pudo completar el análisis con el documento adjunto {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )
        
def legal_risks_chat(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
    chat_history: list[dict] = None
):
    """
    Responde a una consulta general usando IA.
    
    Args:
        query: Pregunta del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        workspace_instructions: Instrucciones del workspace
        chat_history: Historial de mensajes previos
        
    Returns:
        Respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt simple
    prompt = LEGAL_RISKS_PROMPT
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        response = llm_service.generate_response_stream(
            full_prompt, 
            relevant_chunks, 
            chat_model,
            chat_history=chat_history
        )
        return response
    except Exception as e:
        logger.info(f"No se pudo completar el análisis con el documento adjunto {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )
        
def specific_query_chat(
    query: str,
    relevant_chunks: Dict[str, Any],
    chat_model: str,
    workspace_instructions: str,
    chat_history: list[dict] = None
):
    """
    Responde a una consulta general usando IA.
    
    Args:
        query: Pregunta del usuario
        relevant_chunks: Chunks de contexto relevantes
        chat_model: Modelo de chat a usar
        workspace_instructions: Instrucciones del workspace
        chat_history: Historial de mensajes previos
        
    Returns:
        Respuesta generada
        
    Raises:
        HTTPException 500: Si hay error en la generación
    """

    # Construir prompt simple
    prompt = SPECIFIC_QUERY_PROMPT
    
    # Construir prompt completo
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
        system_instructions: {workspace_instructions}
    """

    try:
        # Generar respuesta usando LLM service
        response = llm_service.generate_response_stream(
            full_prompt, 
            relevant_chunks, 
            chat_model,
            chat_history=chat_history
        )
        return response
    except Exception as e:
        logger.info(f"No se pudo completar el análisis con el documento adjunto {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )
        
def general_query_no_workspace_chat(
    query: str,
    chat_model: str,
    chat_history: list[dict] = None
):
    """
    Responde a una consulta general FUERA de un workspace (Landing).
    No usa contexto de documentos (relevant_chunks vacíos).
    
    Args:
        query: Pregunta del usuario
        chat_model: Modelo de chat a usar
        chat_history: Historial de mensajes previos
        
    Returns:
        Respuesta generada (stream)
    """

    # Usar el prompt específico para chats sin workspace
    prompt = GENERAL_QUERY_NO_WORKSPACE_PROMPT
    
    full_prompt = f"""
        prompt: {prompt}
        pregunta: {query}
    """

    try:
        # Generar respuesta usando LLM service (contexto vacío)
        response = llm_service.generate_response_stream(
            full_prompt, 
            [], # Sin chunks de documentos
            chat_model,
            chat_history=chat_history
        )
        return response
    except Exception as e:
        logger.error(f"Error al generar respuesta de chat general: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la respuesta: {str(e)}"
        )

# QUEDA PENDIENTE IMPLEMENTAR ESTE ENDPOINT DE OBTENER PERFILES
# async def get_profiles()