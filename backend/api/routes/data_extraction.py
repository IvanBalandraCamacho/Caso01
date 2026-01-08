"""
Endpoints para extracción de datos estructurados usando CopilotKit.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from models.database import get_db
from models.user import User
from core.auth import get_current_active_user
from core.llm_service import get_provider
from core.rag_client import rag_client
import logging
import json

router = APIRouter(prefix="/data", tags=["Data Extraction"])
logger = logging.getLogger(__name__)


class DataExtractionRequest(BaseModel):
    data_type: str  # requisitos, plazos, tecnologias, costos, equipo, riesgos
    columns: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None


class DataExtractionResponse(BaseModel):
    rows: List[Dict[str, Any]]
    columns: List[str]
    total: int


# Prompts para extracción de datos
EXTRACTION_PROMPTS = {
    "requisitos": """
Extrae los requisitos del documento en formato JSON con la siguiente estructura:
[
  {
    "id": "REQ-001",
    "requisito": "descripción del requisito",
    "tipo": "FUNCIONAL|NO_FUNCIONAL",
    "prioridad": "ALTA|MEDIA|BAJA",
    "fuente": "sección del documento"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "plazos": """
Extrae las fechas y plazos del documento en formato JSON:
[
  {
    "hito": "nombre del hito",
    "fecha": "fecha o plazo",
    "tipo": "ENTREGA|INICIO|FIN|HITO",
    "criticidad": "CRÍTICO|IMPORTANTE|NORMAL"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "tecnologias": """
Extrae las tecnologías mencionadas en formato JSON:
[
  {
    "tecnologia": "nombre",
    "categoria": "LENGUAJE|FRAMEWORK|BASE_DATOS|CLOUD|HERRAMIENTA",
    "obligatoria": true/false,
    "version": "versión si se menciona o null"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "equipo": """
Extrae el equipo requerido o sugerido en formato JSON:
[
  {
    "rol": "nombre del rol",
    "cantidad": número,
    "experiencia": "años de experiencia",
    "skills": ["skill1", "skill2"],
    "dedicacion": "FULL_TIME|PART_TIME|EVENTUAL"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "riesgos": """
Identifica riesgos del proyecto en formato JSON:
[
  {
    "riesgo": "descripción del riesgo",
    "categoria": "LEGAL|TÉCNICO|COMERCIAL|OPERATIVO",
    "severidad": "ALTO|MEDIO|BAJO",
    "mitigacion": "acción de mitigación sugerida"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
}


@router.post(
    "/workspaces/{workspace_id}/extract-data",
    response_model=DataExtractionResponse,
    summary="Extraer datos estructurados del documento"
)
async def extract_data(
    workspace_id: str,
    request: DataExtractionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Extrae datos estructurados del documento del workspace.
    """
    try:
        # Obtener contexto del documento
        rag_results = await rag_client.search(
            query=f"información de {request.data_type}",
            workspace_id=workspace_id,
            limit=10
        )
        
        context = "\n\n".join([r.content for r in rag_results])
        
        if not context:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró contenido en el workspace"
            )
        
        # Obtener prompt de extracción
        extraction_prompt = EXTRACTION_PROMPTS.get(
            request.data_type,
            f"Extrae información sobre {request.data_type} en formato JSON."
        )
        
        # Generar extracción con LLM
        provider = get_provider()
        
        full_prompt = f"""
{extraction_prompt}

DOCUMENTO:
{context}
"""
        
        response = provider.generate_response(
            query=full_prompt,
            context_chunks=[],
            chat_history=[]
        )
        
        # Parsear JSON de la respuesta
        try:
            # Limpiar respuesta
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            data = json.loads(json_str.strip())
            
            if not isinstance(data, list):
                data = [data]
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {e}")
            data = []
        
        # Determinar columnas
        columns = request.columns
        if not columns and data:
            columns = list(data[0].keys())
        
        return DataExtractionResponse(
            rows=data,
            columns=columns or [],
            total=len(data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al extraer datos: {str(e)}"
        )
