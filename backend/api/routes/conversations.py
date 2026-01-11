from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from models import database, schemas
from models.conversation import Conversation, Message
from models import workspace as workspace_model
from models import document as document_model
from core import document_service
from core.auth import get_current_active_user
from models.user import User
from core.rag_client import rag_client
from core.config import settings
from typing import Dict, Any, Optional
import json
from datetime import datetime
import logging
# Configurar logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/conversations/general",
    response_model=list[schemas.ConversationPublic],
    summary="Obtener todas las conversaciones generales (sin workspace)"
)
def get_general_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene todas las conversaciones que no pertenecen a ningún workspace.
    Requiere autenticación.
    """
    conversations = db.query(Conversation).filter(
        Conversation.workspace_id == None,
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    result = []
    for conv in conversations:
        message_count = len(conv.messages)
        
        conv_dict = {
            "id": conv.id,
            "workspace_id": None,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": message_count,
            "has_proposal": conv.has_proposal
        }
        result.append(schemas.ConversationPublic(**conv_dict))
    
    return result


@router.get(
    "/workspaces/{workspace_id}/conversations",
    response_model=list[schemas.ConversationPublic],
    summary="Obtener todas las conversaciones de un workspace"
)
def get_conversations(
    workspace_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene todas las conversaciones de un workspace específico.
    Requiere autenticación. Solo el owner puede ver las conversaciones.
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
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver las conversaciones de este workspace."
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
            "message_count": message_count,
            "has_proposal": conv.has_proposal
        }
        result.append(schemas.ConversationPublic(**conv_dict))
    
    return result


@router.get(
    "/conversations/{conversation_id}",
    response_model=schemas.ConversationWithMessages,
    summary="Obtener una conversación específica general"
)
def get_general_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene una conversación específica con sus mensajes.
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada."
        )
    
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
        has_proposal=conversation.has_proposal,
        proposal_content=conversation.proposal_content,
        messages=[schemas.MessagePublic.from_orm(msg) for msg in messages]
    )


@router.get(
    "/workspaces/{workspace_id}/conversations/{conversation_id}",
    response_model=schemas.ConversationWithMessages,
    summary="Obtener una conversación específica con todos sus mensajes"
)
def get_conversation(
    workspace_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Obtiene una conversación específica con todos sus mensajes.
    Requiere autenticación. Solo el owner puede ver la conversación.
    """
    # Verificar que el workspace existe y pertenece al usuario
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace no encontrado."
        )
    
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a este workspace."
        )
    
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
        has_proposal=conversation.has_proposal,
        proposal_content=conversation.proposal_content,
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Crea una nueva conversación en un workspace.
    Requiere autenticación. Solo el owner puede crear conversaciones.
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
    
    # Verificar ownership
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para crear conversaciones en este workspace."
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
        message_count=0,
        has_proposal=False
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Actualiza el título de una conversación.
    Requiere autenticación. Solo el owner puede actualizar conversaciones.
    """
    # Verificar que el workspace existe y pertenece al usuario
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace no encontrado."
        )
    
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar conversaciones en este workspace."
        )
    
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
        has_proposal=conversation.has_proposal,
        proposal_content=conversation.proposal_content,
        messages=[schemas.MessagePublic.from_orm(msg) for msg in messages]
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una conversación general"
)
async def delete_general_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Elimina una conversación general y todos sus mensajes.
    Requiere autenticación. Solo el owner puede eliminarla.
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada."
        )
    
    # Eliminar documentos asociados si los hay
    documents = db.query(document_model.Document).filter(
        document_model.Document.conversation_id == conversation_id
    ).all()

    for document in documents:
        if settings.RAG_SERVICE_ENABLED and rag_client:
            try:
                await rag_client.delete_document(document.id)
            except Exception:
                pass
        db.delete(document)
    
    db.delete(conversation)
    db.commit()
    return None


@router.delete(
    "/workspaces/{workspace_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una conversación"
)
async def delete_conversation(
    workspace_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Elimina una conversación y todos sus mensajes.
    Requiere autenticación. Solo el owner puede eliminar conversaciones.
    """
    # Verificar que el workspace existe y pertenece al usuario
    db_workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not db_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace no encontrado."
        )
    
    if db_workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar conversaciones en este workspace."
        )
    
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
    
    # Obtener documentos asociados y eliminarlos del servicio RAG y de la BD antes de eliminar la conversación
    documents = db.query(document_model.Document).filter(
        document_model.Document.conversation_id == conversation_id
    ).all()

    for document in documents:
        # Eliminar del servicio RAG externo (si está habilitado)
        if settings.RAG_SERVICE_ENABLED and rag_client:
            try:
                await rag_client.delete_document(document.id)
                print(f"Documento {document.id} eliminado del servicio RAG")
            except Exception as exc:
                print(f"ERROR eliminando del RAG {document.id}: {exc}")

        # Eliminar de la BD explícitamente (no confiar en cascada)
        try:
            db.delete(document)
        except Exception as exc:
            print(f"ERROR eliminando documento DB {document.id}: {exc}")
    
    # Eliminar conversación (mensajes y documentos ya manejados)
    db.delete(conversation)
    db.commit()
    
    return None

@router.post(
    "/conversations/proposals/download",
    summary="Generar documento de propuesta desde Markdown",
    description="Genera un documento Word o PDF utilizando el texto de la propuesta en formato Markdown."
)
async def download_proposal_document(
    request_data: schemas.ProposalDownloadRequest,
    format: str = "docx"
):
    """
    Genera un documento con la propuesta comercial a partir del texto en formato Markdown.
    
    Args:
        request_data: Datos del análisis de la propuesta
        format: Formato del documento ("docx" o "pdf")
        
    Returns:
        Documento generado como FileResponse (bytes)
        
    Raises:
        HTTPException 400: Si el formato no es válido
        HTTPException 500: Si hay error en la generación
    """
    
    try:

        raw_markdown = request_data.raw_markdown

        if not raw_markdown:
            logger.error("No se proporcionó el texto de la propuesta en formato Markdown.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se proporcionó el texto de la propuesta en formato Markdown. El campo raw_markdown es obligatorio."
            )
        
        # Validar formato
        if format.lower() not in ["docx", "pdf"]:
            logger.error("Formato no soportado: %s", format)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato no soportado: {format}. Use 'docx' o 'pdf'."
            )
        
        # Generar documento
        doc_bytes = document_service.generate_from_text(raw_markdown, format=format)
        
        # Determinar media type y extensión según formato
        if format.lower() == "pdf":
            media_type = "application/pdf"
            filename = f"Propuesta_{request_data.cliente.replace(' ', '_')}.pdf"
        else:  # docx
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"Propuesta_{request_data.cliente.replace(' ', '_')}.docx"
        
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
