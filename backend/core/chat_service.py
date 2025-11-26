from sqlalchemy.orm import Session
from models.conversation import Conversation, Message
from models.document import Document
import uuid


def send_ai_message_to_chat(db: Session, workspace_id: str, conversation_id: str | None, message: str):
    """
    Envía un mensaje del asistente.

    - Si viene conversation_id → se usa ese.
    - Si no viene → se obtiene o crea una conversación con ensure_conversation().
    """

    # Crear/buscar conversación si no existe
    if not conversation_id:
        conversation = ensure_conversation(db, workspace_id)
        conversation_id = conversation.id

    return create_message(
        db,
        conversation_id=conversation_id,
        content=message,
        role="assistant"
    )


def ensure_conversation(db: Session, workspace_id: str):
    """Devuelve o crea una sola conversación por workspace."""
    conversation = (
        db.query(Conversation)
        .filter(Conversation.workspace_id == workspace_id)
        .order_by(Conversation.created_at.asc())
        .first()
    )
    if conversation:
        return conversation

    conversation = Conversation(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        title="Sugerencias de aclaraciones"
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def create_message(db: Session, conversation_id: str, content: str, role: str):
    """Crea un mensaje en la BD."""
    msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role=role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


