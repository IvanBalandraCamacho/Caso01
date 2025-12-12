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
    file: UploadFile = File(...)
):
    analysis = await get_analyze(file=file)
    return analysis


async def get_analyze(
    file: UploadFile = File(...)
):
    """Delega toda la lógica de validación, extracción y análisis al servicio."""
    if file:
        logger.info(f"Nombre: {file.filename}")
        logger.info(f"Tipo: {file.content_type}")

        try:
            analysis = await service.analyze(
                file=file,
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
        response = llm_service.generate_response_stream(
            full_prompt, 
            relevant_chunks, 
            chat_model,
            chat_history=chat_history
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
    prompt = f"""
    OBJETIVO: Generar los requerimientos funcionales y no funcionales.
    A TENER EN CUENTA: Analiza todo el documento RFP/RFI. Los requerimientos funcionales no son de proceso son del sistema, normalmente está especificado en alguna parte del documento .
    IMPORTANTE: Devuelveme los requermientos funcionales y no funcionales tal cual está en el documento.
    """
    
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
    prompt = f"""
    Proporciona una cotización preliminar o estimación de costos
    basada en la información del documento adjunto.
    Si no hay información suficiente, responde con "No hay información de costos en el documento adjunto".
    """
    
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
    prompt = f"""
    Analiza exclusivamente la información contenida en el documento proporcionado y no utilices conocimientos externos. Identifica únicamente los riesgos legales o regulatorios que se desprenden explícitamente del contenido del documento.
    Describe los riesgos de manera concreta, específica y basada en cláusulas, obligaciones o condiciones que puedan generar sanciones, multas, terminación anticipada, ejecución de garantías, incumplimientos normativos o responsabilidades legales.
    No inventes riesgos ni generalices. No incluyas recomendaciones, explicaciones teóricas ni definiciones.
    Entrega la salida como una lista clara de riesgos legales o regulatorios identificados dentro del documento.
    """
    
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
    prompt = f"""
Eres un asistente especializado en analizar documentos RFP (Request For Proposal).
Debes responder estrictamente y únicamente con información contenida en el documento proporcionado.

REGLAS:
- Responde solo con información explícitamente encontrada en el documento (NO inventes, NO asumas).
- La "Cita textual" debe usar las mismas palabras del documento, sin resumir, sin modificar y sin agregar texto adicional.
- Si NO existe información suficiente para responder:
  • Indica claramente que no está especificado.
  • Sugiere una pregunta que el BDM debería realizar.
- Si existe información parcial:
  • Menciona lo que sí se sabe.
  • Sugiere una pregunta para completar la información faltante.
- Si la respuesta es completa y no falta información:
  • La pregunta sugerida debe ser: "No aplica".

REGLAS PARA LA PREGUNTA SUGERIDA: (puede ser uno o más preguntas para profundizar más en detalle)
- Debe ser extremadamente específica, objetiva y enfocada solo en el punto faltante.
- Debe obligar al cliente a entregar información concreta, medible o verificable (números, tecnologías, versiones, usuarios, fechas, responsables, métodos, criterios, restricciones, licencias, etc.).
- Prohibido hacer preguntas generales o vagas como “¿Puede brindar más detalles?” o “¿Qué tecnologías usarán?”
- Debe mencionar explícitamente el aspecto faltante. Ejemplos correctos:
            ¿Cuál es el promedio mensual histórico de incidencias registradas por el sistema y por servicio o plataforma?
            ¿Qué proporción corresponde a incidencias críticas, altas y medias?
            ¿La Superintendencia cuenta con herramienta propia de Service Desk o debe proveerla el oferente?
            ¿Existe actualmente una base de conocimiento para soporte nivel 1 y 1.5?
            ¿Cuál es la expectativa de tiempo de resolución para aplicaciones nivel 1.5?
            ¿Cómo se deben reportar los errores detectados (correo, sistema de tickets, logs centralizados)?
            ¿Se desea una mesa de ayuda telefónica, soporte remoto o ambas para el primer nivel de soporte?
            ¿Cómo se maneja el proceso de escalamiento en caso de incidentes en los ambientes de desarrollo y producción?
            ¿Se puede recibir un inventario actualizado de equipos por sede, tipo y estado?
            ¿Se cuenta con etiquetado estandarizado por activo (código, serie, ubicación)?
            ¿Por política del cliente, el proveedor puede aprovisionar laptops y licencias o serán provistas por el cliente?
            ¿Qué aplicaciones tienen integraciones con terceros, APIs o servicios externos?
            ¿Se menciona la creación de conjuntos de APIs dentro del alcance?
            ¿Se requiere una plataforma de gestión de APIs?
            ¿Se tiene una estimación del número de consultas o transacciones concurrentes esperadas en hora pico?
            ¿Todos los ambientes (DEV, QA, Preproducción, Producción) serán provistos por la Superintendencia?
            ¿Es correcto interpretar que el cliente proveerá los ambientes de desarrollo y QA para el trabajo de las células?
            ¿El oferente tendrá responsabilidades sobre actualizaciones de sistema operativo, librerías y dependencias?
            ¿Es necesario que la solución sea On-Premise o en la nube? En caso de nube, especificar el partner (Azure, AWS, GCP).
            ¿El cliente ya cuenta con licencias para plataformas asociadas a dashboards, monitoreo, gestión o integración, o se deben incluir?
            ¿Cuántos datasets activos existen en el Data Lake?
            ¿Cuál es la complejidad estimada del modelo de datos PostgreSQL (tablas, vistas, procedimientos, triggers, particiones)?
            ¿Cuáles son las fuentes de datos principales que recibirá el sistema a desarrollar?
            ¿Los datos procesados contienen información sensible o confidencial (financiera, personal, etc.)?
            ¿Hay requerimientos de seguridad, privacidad o normativos que debamos considerar?
            ¿Se necesita trazabilidad completa de cada acción que ejecute el sistema?
            ¿Qué controles de acceso deben considerarse (usuarios, contraseñas, roles)?
            ¿Quién sería el responsable de ejecutar el Ethical Hacking de los desarrollos entregados?
            ¿Es válido proponer profesionales ubicados en oficinas del oferente en el extranjero si cumplen con el perfil requerido?
            ¿Para efectos de calificación, es válido presentar experiencias de oficinas extranjeras?
            ¿Se espera o requiere alguna certificación específica para los perfiles de la célula?
            ¿Cuál es el plazo esperado de aprovisionamiento ante rotación o nueva solicitud de perfiles?
            ¿Cuál es el máximo de días para el Onboarding o transición de perfiles?
            En caso de ausencias temporales (vacaciones, licencias, descanso médico), ¿cuál es el tratamiento esperado?
            ¿El cliente proporcionará una herramienta para gestión y seguimiento de proyectos (hitos, avances, registro)? Si requiere licencias (p. ej. Jira), ¿quién las costea?
            ¿Las reuniones de seguimiento serán orquestadas por el cliente o por el oferente? ¿Cuál sería la frecuencia y si se requiere presencialidad?
            ¿Existe un rol o comité del cliente con potestad de toma de decisiones y aprobación?
            ¿Se tiene un estimado de participantes para las transferencias de conocimiento?
            ¿Se debe proponer tarifa fuera de horario hábil por atención de incidentes?
            ¿El diseño UX/UI será generado por el oferente o el cliente lo proporcionará?
            En caso de migración, ¿qué metodología se espera? ¿Cuántos organismos serían incluidos y en qué formato?
            ¿Se necesita un dashboard o portal para monitorar la ejecución de robots o automatizaciones?
            ¿Quién será responsable de administrar los robots (TI, negocio o proveedor)?
            ¿De dónde provienen los datos de entrada (formularios web, correos, Excel, BD, APIs, aplicaciones)?
            ¿Cuál es el período de garantía exigido post pase a producción de un aplicativo?

FORMATO OBLIGATORIO DE RESPUESTA (RESPETA EXACTAMENTE ESTE FORMATO):

 **Respuesta:**
<texto claro, corto y directo>

 **Cita textual:**
"<cita exacta del documento o escribir: No aplica>"

 **Pregunta Sugerida:**
<solo si falta información, caso contrario escribir: "No aplica"> 


NOTA:
- NO unir todo en un solo párrafo.
- Mantén los saltos de línea exactamente como se muestra.
- No cambies los títulos, negritas ni estructura.

    """
    
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
        
# QUEDA PENDIENTE IMPLEMENTAR ESTE ENDPOINT DE OBTENER PERFILES
# async def get_profiles()