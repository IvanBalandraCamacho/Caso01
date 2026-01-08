from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from core.llm_service import get_provider
from core.rag_client import rag_client
from models.schemas import DocumentChunk
import logging
import json
import asyncio
import uuid

router = APIRouter(prefix="/copilot", tags=["CopilotKit"])
logger = logging.getLogger(__name__)

# System prompt para el copiloto
COPILOT_SYSTEM_PROMPT = """
Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.
Tu objetivo es ayudar a analizar documentos, extraer datos y generar propuestas.
Usa el contexto proporcionado para responder con precisión.
Siempre basa tus respuestas en los documentos y datos disponibles en el sistema.

IMPORTANTE: Tienes acceso a acciones de Generative UI para mostrar datos de forma visual:
- renderTable: Para mostrar datos en tablas (requisitos, tecnologías, equipo, etc.)
- renderBarChart: Para comparar valores (costos por fase, recursos, etc.)
- renderLineChart: Para mostrar tendencias temporales (costos mensuales, cronogramas)
- renderPieChart: Para distribuciones (proporción de costos, tipos de requisitos)
- renderMetrics: Para mostrar KPIs y métricas clave
- renderTimeline: Para mostrar cronogramas y fechas importantes

Cuando el usuario pida ver datos en forma de tabla, gráfico, métricas o timeline, 
DEBES usar estas acciones para renderizar los datos de forma visual directamente en el chat.
"""

@router.options("")
@router.options("/")
@router.options("/info")
async def copilot_options():
    """
    Handle CORS preflight for Copilot endpoints.
    """
    return JSONResponse(
        content="OK",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.post("")
@router.post("/")
async def copilot_chat(request: Request):
    """
    Endpoint principal para CopilotKit - Compatible con el protocolo de CopilotKit Runtime.
    Maneja el protocolo de chat y streaming usando Server-Sent Events.
    """
    try:
        try:
            body = await request.json()
        except Exception:
            body = {}
            
        logger.info(f"Copilot Request Body: {json.dumps(body, default=str)[:500]}")
        
        # Manejar solicitud de info vía POST
        if body.get("method") == "info" or not body.get("messages"):
            logger.info("Handling POST info request")
            info_data = await copilot_info()
            return JSONResponse(content=info_data)
        
        messages = body.get("messages", [])
        
        if not messages:
            return JSONResponse(
                status_code=400,
                content={"error": "No messages provided"}
            )

        # Extraer el último mensaje del usuario
        last_user_message = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                content = msg.get("content", "")
                # Manejar contenido que puede ser string o lista
                if isinstance(content, list):
                    # Extraer texto de partes de contenido
                    text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
                    last_user_message = " ".join(text_parts)
                else:
                    last_user_message = content
                break
        
        if not last_user_message:
            last_user_message = ""
        
        # Historial de chat (todos excepto el último mensaje de usuario)
        chat_history = []
        for m in messages[:-1] if messages else []:
            role = m.get("role", "user")
            content = m.get("content", "")
            if isinstance(content, list):
                text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
                content = " ".join(text_parts)
            if role in ["user", "assistant", "system"]:
                chat_history.append({"role": role, "content": content})

        # Extraer propiedades adicionales (contexto del frontend)
        properties = body.get("properties", {})
        workspace_id = properties.get("workspace_id") or properties.get("workspaceId")

        # 1. Recuperar Contexto RAG (si hay workspace)
        rag_chunks = []
        rag_context_text = ""
        if workspace_id and workspace_id != "general":
            try:
                rag_results = await rag_client.search(
                    query=last_user_message,
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
                # Construir contexto de texto para el LLM
                if rag_chunks:
                    rag_context_text = "\n\n--- CONTEXTO DE DOCUMENTOS ---\n"
                    for i, chunk in enumerate(rag_chunks, 1):
                        rag_context_text += f"\n[Documento {i}]: {chunk.chunk_text}\n"
                    rag_context_text += "\n--- FIN DEL CONTEXTO ---\n"
                    
                logger.info(f"Retrieved {len(rag_chunks)} RAG chunks for workspace {workspace_id}")
            except Exception as e:
                logger.error(f"Error retrieving RAG context: {e}")

        # 2. Generar respuesta con streaming usando protocolo SSE de CopilotKit
        async def generate_copilotkit_stream():
            try:
                provider = get_provider()
                
                # Construir el prompt con contexto RAG
                system_content = COPILOT_SYSTEM_PROMPT
                if rag_context_text:
                    system_content += f"\n\nUtiliza el siguiente contexto para responder:\n{rag_context_text}"
                
                # Construir historial con system prompt
                formatted_history = [
                    {"role": "system", "content": system_content}
                ]
                formatted_history.extend(chat_history)

                # ID único para este mensaje
                message_id = str(uuid.uuid4())
                
                # Iniciar stream con evento de inicio
                yield f"data: {json.dumps({'type': 'text-message-start', 'id': message_id, 'role': 'assistant'})}\n\n"

                # Generar respuesta
                full_response = ""
                iterator = provider.generate_response_stream(
                    query=last_user_message,
                    context_chunks=rag_chunks,
                    chat_history=formatted_history
                )

                for chunk in iterator:
                    if chunk:
                        full_response += chunk
                        # Enviar chunk de contenido
                        yield f"data: {json.dumps({'type': 'text-message-content', 'id': message_id, 'content': chunk})}\n\n"
                        await asyncio.sleep(0.01)
                
                # Finalizar mensaje
                yield f"data: {json.dumps({'type': 'text-message-end', 'id': message_id})}\n\n"
                
                # Evento de finalización del stream
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                error_id = str(uuid.uuid4())
                yield f"data: {json.dumps({'type': 'text-message-start', 'id': error_id, 'role': 'assistant'})}\n\n"
                yield f"data: {json.dumps({'type': 'text-message-content', 'id': error_id, 'content': f'Error: {str(e)}'})}\n\n"
                yield f"data: {json.dumps({'type': 'text-message-end', 'id': error_id})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

        return StreamingResponse(
            generate_copilotkit_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        logger.error(f"Error in copilot_chat: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@router.get("/info")
@router.post("/info")
async def copilot_info():
    """
    Endpoint de información para CopilotKit.
    Devuelve la lista de agentes y acciones disponibles.
    """
    logger.info("Copilot /info endpoint called")
    return {
        "actions": [
            {
                "name": "searchDocuments",
                "description": "Busca información en los documentos del workspace actual usando RAG",
                "parameters": [
                    {
                        "name": "query",
                        "type": "string",
                        "description": "La consulta de búsqueda",
                        "required": True
                    },
                    {
                        "name": "workspaceId",
                        "type": "string",
                        "description": "ID del workspace donde buscar",
                        "required": False
                    }
                ]
            },
            {
                "name": "analyzeRFP",
                "description": "Analiza un documento RFP y extrae información clave",
                "parameters": [
                    {
                        "name": "documentId",
                        "type": "string",
                        "description": "ID del documento a analizar",
                        "required": True
                    }
                ]
            }
        ],
        "agents": [
            {
                "name": "rfp_assistant",
                "description": "Asistente de análisis de RFPs de TIVIT con acceso a documentos y RAG"
            }
        ]
    }