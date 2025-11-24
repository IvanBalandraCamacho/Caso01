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
import logging
import json
import tempfile
import os

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
        
        # TODO: Implementar extracción de texto del PDF
        # Por ahora, retornamos datos de ejemplo
        
        # Limpiar archivo temporal
        os.unlink(tmp_path)
        
        # Análisis simulado
        analysis = {
            "cliente": "Empresa XYZ S.A.",
            "fecha_entrega": "2025-12-31",
            "alcance_economico": {
                "presupuesto": "500000",
                "moneda": "USD"
            },
            "tecnologias_requeridas": [
                "Python",
                "FastAPI",
                "React",
                "PostgreSQL",
                "Docker"
            ],
            "riesgos_detectados": [
                "Plazo ajustado para la complejidad del proyecto",
                "Integración con sistemas legacy sin documentación",
                "Requiere certificaciones de seguridad"
            ],
            "preguntas_sugeridas": [
                "¿Existe documentación de los sistemas legacy?",
                "¿Cuál es la disponibilidad del equipo del cliente para reuniones?",
                "¿Hay un entorno de desarrollo disponible?"
            ],
            "equipo_sugerido": [
                {
                    "nombre": "Tech Lead Senior",
                    "rol": "Líder Técnico",
                    "skills": ["Python", "Arquitectura", "DevOps"],
                    "experiencia": "8+ años"
                },
                {
                    "nombre": "Backend Developer",
                    "rol": "Desarrollador Backend",
                    "skills": ["FastAPI", "PostgreSQL", "REST APIs"],
                    "experiencia": "5+ años"
                },
                {
                    "nombre": "Frontend Developer",
                    "rol": "Desarrollador Frontend",
                    "skills": ["React", "TypeScript", "UI/UX"],
                    "experiencia": "4+ años"
                }
            ]
        }
        
        logger.info(f"RFP analizado exitosamente por usuario: {current_user.email}")
        return analysis
        
    except Exception as e:
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
