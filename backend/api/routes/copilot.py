from fastapi import APIRouter, Request, Depends, Header
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from core.llm_service import get_provider
from core.rag_client import rag_client
from models.schemas import DocumentChunk
from models.database import get_db
import logging
import json
from typing import Optional

router = APIRouter(prefix="/copilot", tags=["CopilotKit"])
logger = logging.getLogger(__name__)

# System prompt para el copiloto de análisis RFP
COPILOT_SYSTEM_PROMPT = """
Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.

Tu rol es ayudar a los usuarios a:
1. Analizar documentos RFP de manera estructurada
2. Identificar requisitos técnicos y funcionales
3. Detectar fechas límite y plazos importantes
4. Estimar presupuestos y alcances económicos
5. Sugerir equipos técnicos adecuados
6. Identificar riesgos y vacíos de información
7. Generar preguntas de aclaración para el cliente

Siempre basa tus respuestas en el contexto del documento proporcionado.
Sé preciso, profesional y estructurado en tus respuestas.
"""

@router.get("/info")
async def copilot_info():
    """
    Endpoint de descubrimiento para CopilotKit.
    Retorna la información del runtime según la especificación de CopilotKit.
    """
    return {
        "runtime": "fastapi-copilotkit",
        "version": "1.0.0",
        "agents": [
            {
                "name": "default",
                "description": "Asistente de Análisis RFP (TIVIT)",
                "model": "gemini-2.0-flash-exp"
            }
        ],
        "actions": []
    }

@router.post("/")
async def copilot_runtime(
    request: Request,
    content_type: Optional[str] = Header(None)
):
    """
    Endpoint runtime principal para CopilotKit.
    Maneja tanto solicitudes de chat como de acciones.
    """
    try:
        body = await request.json()
        logger.info(f"Copilot request received: {json.dumps(body, indent=2)}")
        
        # Manejar diferentes tipos de solicitudes de CopilotKit
        request_type = body.get("type", "chat")
        
        if request_type == "chat" or "messages" in body:
            return await handle_chat_request(body)
        elif request_type == "action":
            return await handle_action_request(body)
        else:
            return JSONResponse(
                content={"error": "Unknown request type"},
                status_code=400
            )
        
    except Exception as e:
        logger.error(f"Error in copilot_runtime: {e}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )


async def handle_chat_request(body: dict):
    """
    Maneja las solicitudes de chat del copiloto.
    """
    messages = body.get("messages", [])
    properties = body.get("properties", {})
    workspace_id = properties.get("workspace_id")
    
    if not messages:
        return JSONResponse(
            content={"error": "No messages provided"},
            status_code=400
        )

    last_message = messages[-1].get("content", "")
    chat_history = [m for m in messages[:-1] if m.get("role") != "system"]

    # Obtener contexto RAG si hay workspace
    rag_chunks = []
    if workspace_id:
        try:
            rag_results = await rag_client.search(
                query=last_message,
                workspace_id=workspace_id,
                limit=5
            )
            rag_chunks = [
                DocumentChunk(
                    document_id=r.document_id,
                    chunk_text=r.content,
                    chunk_index=r.metadata.get("chunk_index", 0) if r.metadata else 0,
                    score=r.score
                ) for r in rag_results
            ]
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
    
    # Generar respuesta con streaming
    def generate():
        try:
            provider = get_provider()
            enhanced_history = [{"role": "system", "content": COPILOT_SYSTEM_PROMPT}] + chat_history
            
            for chunk in provider.generate_response_stream(
                query=last_message,
                context_chunks=rag_chunks,
                chat_history=enhanced_history
            ):
                yield f"data: {chunk}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Error in streaming: {e}", exc_info=True)
            error_msg = json.dumps({"error": str(e)})
            yield f"data: {error_msg}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def handle_action_request(body: dict):
    """
    Maneja las solicitudes de acciones del copiloto.
    """
    action_name = body.get("action")
    parameters = body.get("parameters", {})
    
    logger.info(f"Action request: {action_name} with params: {parameters}")
    
    # Implementar acciones específicas aquí
    return JSONResponse(
        content={
            "success": True,
            "message": f"Action {action_name} processed"
        }
    )

@router.post("/action/{action_name}")
async def execute_action(
    action_name: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Ejecuta una acción del copiloto (Server-side actions).
    """
    try:
        body = await request.json()
        params = body.get("parameters", {})
        
        # Aquí se pueden implementar acciones específicas del backend
        # Por ahora, retornamos éxito ya que la mayoría de acciones las maneja el frontend
        
        logger.info(f"Copilot Action received: {action_name} with params: {params}")
        
        if action_name == "extractDates":
             # Ejemplo de implementación futura
             return {"success": True, "dates": []}
             
        return {"success": True, "message": f"Action {action_name} processed"}
        
    except Exception as e:
        logger.error(f"Error executing action {action_name}: {e}")
        return {"error": str(e)}
