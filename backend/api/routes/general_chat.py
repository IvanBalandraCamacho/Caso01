from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from models import database, schemas
from models.conversation import Conversation, Message
from models.user import User
from core.auth import get_current_active_user
from api.routes import intention_task
import json
import logging

# Rate Limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/chat/general",
    summary="Chat General (Sin Workspace)",
    description="Endpoint para consultas generales fuera de un workspace (Landing page)."
)
@limiter.limit("10/minute")
async def general_chat(
    request: Request,
    chat_request: schemas.ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Endpoint para chat general sin contexto de documentos de workspace.
    
    Flujo:
    1. Crea/Recupera conversación con workspace_id=None (Requiere cambio en BD).
    2. Guarda mensaje del usuario.
    3. Llama a LLM con prompt general.
    4. Guarda respuesta del asistente.
    """
    
    # 1. Obtener o crear conversación (Sin workspace_id)
    conversation = None
    if chat_request.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == chat_request.conversation_id,
                Conversation.workspace_id == None  # Filtrar por null
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    else:
        title = (
            chat_request.query[:50] + "..."
            if len(chat_request.query) > 50
            else chat_request.query
        )
        # Guardar user_id para tracking de ownership en chats generales
        conversation = Conversation(
            workspace_id=None, 
            user_id=current_user.id,
            title=title
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Guardar mensaje del usuario
    user_message = Message(
        conversation_id=conversation.id, role="user", content=chat_request.query
    )
    db.add(user_message)
    db.commit()

    # 3. Recuperar historial
    past_messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation.id,
            Message.id != user_message.id 
        )
        .order_by(Message.created_at.desc())
        .limit(10) 
        .all()
    )
    
    chat_history = []
    for msg in reversed(past_messages):
        chat_history.append({
            "role": msg.role,
            "content": msg.content
        })

    # 4. Streaming de respuesta
    async def stream_response_generator(conversation_id):
        yield (
            json.dumps(
                {
                    "type": "conversation_id",
                    "id": conversation_id,
                }
            )
            + "\n"
        )
        
        full_response_text = ""
        
        # Usar la nueva función de intención para chat sin workspace
        response_stream = intention_task.general_query_no_workspace_chat(
            query=chat_request.query,
            chat_model=chat_request.model or "gpt-4o-mini",
            chat_history=chat_history
        )

        try:
            for token in response_stream:
                full_response_text += token
                yield json.dumps({"type": "content", "text": token}) + "\n"

        except Exception as e:
            yield json.dumps({"type": "error", "detail": str(e)}) + "\n"
            return

        # Guardar respuesta del asistente
        with database.SessionLocal() as db_session:
            msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response_text,
            )
            db_session.add(msg)
            db_session.commit()

    return StreamingResponse(
        stream_response_generator(conversation.id),
        media_type="application/x-ndjson",
    )
