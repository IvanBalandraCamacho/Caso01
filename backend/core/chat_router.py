from core.chat_service import send_ai_message_to_chat
from models.document import Document

# Palabras clave para interpretar confirmación del usuario
AFFIRM = ["si", "sí", "ver", "ver más", "mostrar", "muéstrame", "ok", "dale", "quiero", "detallado"]


def process_incoming_user_message(db, workspace_id: str, conversation_id: str, content: str):
    """
    Router inteligente:
    - Si el usuario confirma -> envía ANALISIS COMPLETO del documento más reciente.
    - Si NO confirma -> no hace nada (chat normal).
    """

    normalized = content.lower().strip()

    # ¿El usuario no está pidiendo ver el análisis completo?
    if not any(k in normalized for k in AFFIRM):
        return None

    # Buscar el documento más reciente con sugerencias generadas
    doc = (
        db.query(Document)
        .filter(Document.workspace_id == workspace_id)
        .order_by(Document.created_at.desc())
        .first()
    )

    if not doc or not doc.suggestion_full:
        return send_ai_message_to_chat(
            db,
            workspace_id,
            conversation_id,
            "No encontré un análisis reciente para mostrar."
        )

    # Enviar el análisis completo al chat
    return send_ai_message_to_chat(
        db,
        workspace_id,
        conversation_id,
        f"📄 **Análisis completo del documento:**\n\n{doc.suggestion_full}"
    )


# ------------------------------------------------------------
# 👉 Función pública que usará tu endpoint
# ------------------------------------------------------------

def handle_user_message(db, workspace_id: str, conversation_id: str, content: str):
    """
    Punto de entrada oficial para el endpoint de chat.
    Simplemente llama al router inteligente.
    """
    return process_incoming_user_message(
        db=db,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
        content=content
    )
