from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from core.llm_service import get_provider
from core.rag_client import rag_client
from models.schemas import DocumentChunk
import logging
import json
import asyncio

router = APIRouter(prefix="/copilot", tags=["CopilotKit"])
logger = logging.getLogger(__name__)

# System prompt para el copiloto
COPILOT_SYSTEM_PROMPT = """
Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.
Tu objetivo es ayudar a analizar documentos, extraer datos y generar propuestas.
Usa el contexto proporcionado para responder con precisión.
"""

@router.post("")
@router.post("/")
async def copilot_chat(request: Request):
    """
    Endpoint principal para CopilotKit.
    Maneja el protocolo de chat y streaming.
    """
    try:
        body = await request.json()
        messages = body.get("messages", [])
        
        # Extraer propiedades adicionales (contexto del frontend)
        properties = body.get("properties", {})
        workspace_id = properties.get("workspace_id")
        
        if not messages:
            raise HTTPException(status_code=400, detail="No messages provided")

        # Último mensaje del usuario
        last_message = messages[-1].get("content", "")
        
        # Historial de chat (excluyendo el último)
        chat_history = messages[:-1]

        # 1. Recuperar Contexto RAG (si hay workspace)
        rag_chunks = []
        if workspace_id and workspace_id != "general":
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
                logger.info(f"Retrieved {len(rag_chunks)} RAG chunks for workspace {workspace_id}")
            except Exception as e:
                logger.error(f"Error retrieving RAG context: {e}")

        # 2. Generar respuesta (Streaming)
        async def generate_stream():
            try:
                provider = get_provider()
                
                # Construir historial con system prompt
                formatted_history = [
                    {"role": "system", "content": COPILOT_SYSTEM_PROMPT}
                ]
                
                # Adaptar mensajes al formato del provider
                for m in chat_history:
                    role = m.get("role", "user")
                    if role not in ["user", "assistant", "system"]:
                        role = "user"
                    formatted_history.append({
                        "role": role,
                        "content": m.get("content", "")
                    })

                # Generar respuesta
                # Nota: generate_response_stream es síncrono en la implementación actual de llm_service
                # pero lo envolvemos para streaming asíncrono HTTP
                iterator = provider.generate_response_stream(
                    query=last_message,
                    context_chunks=rag_chunks,
                    chat_history=formatted_history
                )

                for chunk in iterator:
                    # Formato SSE estándar
                    yield f"data: {chunk}\n\n"
                    # Pequeña pausa para no saturar el event loop si fuera muy rápido
                    await asyncio.sleep(0.01)
                
                # Señal de terminación (opcional en algunos clientes, buena práctica)
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                # Enviar error como texto en el stream para que el usuario lo vea
                yield f"data: Error generating response: {str(e)}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )

    except Exception as e:
        logger.error(f"Error in copilot_chat: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@router.get("/info")
async def copilot_info():
    """Endpoint de información (Health check para CopilotKit)"""
    return {
        "status": "active",
        "provider": "python-fastapi",
        "capabilities": ["chat", "rag", "actions"]
    }