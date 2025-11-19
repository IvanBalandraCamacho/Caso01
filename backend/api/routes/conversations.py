from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from models import database, schemas
from models.conversation import Conversation, Message
from models import workspace as workspace_model
import json
from datetime import datetime

router = APIRouter()

@router.get(
    "/workspaces/{workspace_id}/conversations",
    response_model=list[schemas.ConversationPublic],
    summary="Obtener todas las conversaciones de un workspace"
)
def get_conversations(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Obtiene todas las conversaciones de un workspace específico.
    """
    # Verificar que el workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Obtener conversaciones con PREFETCH de mensajes (elimina N+1 queries)
    conversations = db.query(Conversation).options(
        joinedload(Conversation.messages)
    ).filter(
        Conversation.workspace_id == workspace_id
    ).order_by(Conversation.updated_at.desc()).all()
    
    # Agregar conteo de mensajes (ya prefetched, no genera query adicional)
    result = []
    for conv in conversations:
        message_count = len(conv.messages)  # Usa la relación ya cargada
        
        conv_dict = {
            "id": conv.id,
            "workspace_id": conv.workspace_id,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": message_count
        }
        result.append(schemas.ConversationPublic(**conv_dict))
    
    return result


@router.get(
    "/workspaces/{workspace_id}/conversations/{conversation_id}",
    response_model=schemas.ConversationWithMessages,
    summary="Obtener una conversación específica con todos sus mensajes"
)
def get_conversation(
    workspace_id: str,
    conversation_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Obtiene una conversación específica con todos sus mensajes.
    """
    # Verificar que la conversación existe y pertenece al workspace
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == workspace_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación no encontrada."
        )
    
    # Obtener mensajes
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()
    
    message_count = len(messages)
    
    return schemas.ConversationWithMessages(
        id=conversation.id,
        workspace_id=conversation.workspace_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=message_count,
        messages=[schemas.MessagePublic.from_orm(msg) for msg in messages]
    )


@router.post(
    "/workspaces/{workspace_id}/conversations",
    response_model=schemas.ConversationPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva conversación"
)
def create_conversation(
    workspace_id: str,
    conversation_data: schemas.ConversationCreate,
    db: Session = Depends(database.get_db)
):
    """
    Crea una nueva conversación en un workspace.
    """
    # Verificar que el workspace existe
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace con id {workspace_id} no encontrado."
        )
    
    # Crear conversación
    new_conversation = Conversation(
        workspace_id=workspace_id,
        title=conversation_data.title
    )
    
    db.add(new_conversation)
    db.commit()
    db.refresh(new_conversation)
    
    return schemas.ConversationPublic(
        id=new_conversation.id,
        workspace_id=new_conversation.workspace_id,
        title=new_conversation.title,
        created_at=new_conversation.created_at,
        updated_at=new_conversation.updated_at,
        message_count=0
    )


@router.put(
    "/workspaces/{workspace_id}/conversations/{conversation_id}",
    response_model=schemas.ConversationWithMessages,
    summary="Actualizar una conversación"
)
def update_conversation(
    workspace_id: str,
    conversation_id: str,
    conversation_data: schemas.ConversationUpdate,
    db: Session = Depends(database.get_db)
):
    """
    Actualiza el título de una conversación.
    """
    # Verificar que la conversación existe y pertenece al workspace
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == workspace_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación no encontrada."
        )
    
    # Actualizar título
    conversation.title = conversation_data.title
    conversation.updated_at = datetime.now()
    
    db.commit()
    db.refresh(conversation)
    
    # Obtener mensajes
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()
    
    return schemas.ConversationWithMessages(
        id=conversation.id,
        workspace_id=conversation.workspace_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=len(messages),
        messages=[schemas.MessagePublic.from_orm(msg) for msg in messages]
    )


@router.delete(
    "/workspaces/{workspace_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una conversación"
)
def delete_conversation(
    workspace_id: str,
    conversation_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Elimina una conversación y todos sus mensajes.
    """
    # Verificar que la conversación existe y pertenece al workspace
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == workspace_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación no encontrada."
        )
    
    db.delete(conversation)
    db.commit()
    
    return None
