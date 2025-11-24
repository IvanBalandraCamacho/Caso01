"""
Endpoints para análisis y generación de propuestas comerciales.

Este módulo proporciona endpoints para:
- Analizar documentos RFP con IA
- Generar propuestas en formato Word
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from models import database
from models.user import User
from core.auth import get_current_active_user
from core.llm_service import get_provider
import logging
import json
import tempfile
import os
import pdfplumber

# Configurar logger
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/proposals/analyze",
    response_model=Dict[str, Any],
    summary="Analizar RFP con IA",
    description="Analiza un documento PDF de RFP y extrae información clave usando IA"
)
async def analyze_proposal(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Analiza un documento RFP (PDF) y extrae:
    - Información del cliente
    - Alcance económico
    - Tecnologías requeridas
    - Riesgos detectados
    - Preguntas sugeridas
    - Equipo sugerido
    
    Args:
        file: Archivo PDF del RFP
        current_user: Usuario autenticado
        db: Sesión de base de datos
        
    Returns:
        Análisis estructurado del RFP
        
    Raises:
        HTTPException 400: Si el archivo no es PDF o está vacío
        HTTPException 500: Si hay error en el análisis
    """
    
    # Validar que sea un PDF
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se aceptan archivos PDF"
        )
    
    try:
        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Extraer texto del PDF
        pdf_text = ""
        try:
            with pdfplumber.open(tmp_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        pdf_text += page_text + "\n"
        except Exception as e:
            logger.error(f"Error al extraer texto del PDF: {str(e)}")
            os.unlink(tmp_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al leer el PDF: {str(e)}"
            )
        
        # Validar que el PDF tenga contenido
        if not pdf_text.strip():
            os.unlink(tmp_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El PDF no contiene texto extraíble"
            )
        
        # Limpiar archivo temporal
        os.unlink(tmp_path)
        
        # Preparar prompt para el LLM
        prompt = f"""Analiza el siguiente documento RFP y extrae la siguiente información en formato JSON estricto:

DOCUMENTO RFP:
{pdf_text[:8000]}

Debes retornar un JSON con esta estructura EXACTA (sin markdown, sin explicaciones adicionales):
{{
  "cliente": "nombre de la empresa cliente",
  "fecha_entrega": "fecha límite en formato YYYY-MM-DD o 'No especificada'",
  "alcance_economico": {{
    "presupuesto": "monto numérico o 'No especificado'",
    "moneda": "USD/EUR/MXN/etc o 'No especificada'"
  }},
  "tecnologias_requeridas": ["tecnología1", "tecnología2", ...],
  "riesgos_detectados": ["riesgo1", "riesgo2", ...],
  "preguntas_sugeridas": ["pregunta1", "pregunta2", ...],
  "equipo_sugerido": [
    {{
      "nombre": "Rol del profesional",
      "rol": "Descripción del rol",
      "skills": ["skill1", "skill2"],
      "experiencia": "X+ años"
    }}
  ]
}}

INSTRUCCIONES:
1. Extrae ÚNICAMENTE la información presente en el documento
2. Si algo no está especificado, usa "No especificado" o arrays vacíos
3. Para riesgos, identifica problemas potenciales del proyecto
4. Para preguntas, sugiere clarificaciones necesarias para el cliente
5. Para el equipo, sugiere perfiles basados en las tecnologías y alcance
6. Retorna SOLO el JSON, sin texto adicional"""

        # Usar el LLM para analizar
        try:
            llm_provider = get_provider(task_type="analyze")
            # GeminiProvider usa generate_response sin chunks de contexto
            response = llm_provider.generate_response(query=prompt, context_chunks=[])
            
            # Limpiar respuesta (remover markdown si existe)
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parsear JSON
            analysis = json.loads(response_text)
            
            logger.info(f"RFP analizado exitosamente por usuario: {current_user.email}")
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Error al parsear respuesta del LLM: {str(e)}")
            logger.error(f"Respuesta recibida: {response[:500]}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al procesar la respuesta del análisis. Por favor intenta de nuevo."
            )
        
    except HTTPException:
        raise
        logger.error(f"Error al analizar RFP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al analizar el documento: {str(e)}"
        )


@router.post(
    "/proposals/generate",
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
        # TODO: Implementar generación de documento Word
        # Por ahora, retornamos error indicando que está en desarrollo
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Generación de documentos Word en desarrollo"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al generar documento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el documento: {str(e)}"
        )
