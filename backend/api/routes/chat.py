"""
Endpoints para gestión de historial de chat
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from models import database, chat_message as chat_model, workspace as workspace_model, schemas, user as user_model
from api.routes import auth
from datetime import datetime
import json
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from pathlib import Path
import tempfile

router = APIRouter()


@router.get(
    "/workspaces/{workspace_id}/chat/history",
    response_model=List[schemas.ChatMessagePublic],
    summary="Obtener historial de chat de un workspace"
)
def get_chat_history(
    workspace_id: str,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: user_model.User = Depends(auth.get_current_user)
):
    """
    Obtiene el historial de conversaciones de un workspace
    
    - **workspace_id**: ID del workspace
    - **limit**: Número máximo de mensajes a retornar (default: 100)
    """
    # Verificar que el workspace existe
    workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} no encontrado"
        )
    
    # Obtener mensajes ordenados por fecha
    messages = db.query(chat_model.ChatMessage).filter(
        chat_model.ChatMessage.workspace_id == workspace_id
    ).order_by(chat_model.ChatMessage.created_at.desc()).limit(limit).all()
    
    return messages[::-1]  # Invertir para orden cronológico


@router.post(
    "/workspaces/{workspace_id}/chat/save",
    response_model=schemas.ChatMessagePublic,
    summary="Guardar un mensaje en el historial"
)
def save_chat_message(
    workspace_id: str,
    message: schemas.ChatMessageCreate,
    db: Session = Depends(database.get_db)
):
    """
    Guarda un mensaje de chat en la base de datos
    """
    # Verificar que el workspace existe
    workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace {workspace_id} no encontrado"
        )
    
    # Crear nuevo mensaje
    db_message = chat_model.ChatMessage(
        workspace_id=workspace_id,
        role=message.role,
        content=message.content,
        sources=message.sources
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message


@router.get(
    "/workspaces/{workspace_id}/chat/export/txt",
    summary="Exportar historial de chat a TXT"
)
def export_chat_txt(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Exporta el historial de chat a un archivo TXT
    """
    # Obtener mensajes
    messages = db.query(chat_model.ChatMessage).filter(
        chat_model.ChatMessage.workspace_id == workspace_id
    ).order_by(chat_model.ChatMessage.created_at).all()
    
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay mensajes en este workspace"
        )
    
    # Generar contenido TXT
    content = f"HISTORIAL DE CHAT - Workspace {workspace_id}\n"
    content += f"Generado: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n"
    content += "=" * 80 + "\n\n"
    
    for msg in messages:
        timestamp = msg.created_at.strftime('%Y-%m-%d %H:%M:%S')
        role = "Usuario" if msg.role == "user" else "Asistente"
        content += f"[{timestamp}] {role}:\n{msg.content}\n"
        
        if msg.sources:
            content += f"\nFuentes:\n{msg.sources}\n"
        
        content += "\n" + "-" * 80 + "\n\n"
    
    # Crear archivo temporal
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt', encoding='utf-8') as f:
        f.write(content)
        temp_path = f.name
    
    return FileResponse(
        temp_path,
        media_type='text/plain',
        filename=f'chat_history_{workspace_id}_{datetime.utcnow().strftime("%Y%m%d")}.txt'
    )


@router.get(
    "/workspaces/{workspace_id}/chat/export/pdf",
    summary="Exportar historial de chat a PDF"
)
def export_chat_pdf(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Exporta el historial de chat a un archivo PDF
    """
    # Obtener mensajes
    messages = db.query(chat_model.ChatMessage).filter(
        chat_model.ChatMessage.workspace_id == workspace_id
    ).order_by(chat_model.ChatMessage.created_at).all()
    
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay mensajes en este workspace"
        )
    
    # Crear archivo temporal
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as f:
        temp_path = f.name
    
    # Generar PDF
    c = canvas.Canvas(temp_path, pagesize=letter)
    width, height = letter
    
    # Título
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"Historial de Chat - Workspace {workspace_id}")
    
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, f"Generado: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
    
    y = height - 100
    
    for msg in messages:
        # Verificar si necesitamos nueva página
        if y < 100:
            c.showPage()
            y = height - 50
        
        # Timestamp y rol
        timestamp = msg.created_at.strftime('%Y-%m-%d %H:%M:%S')
        role = "Usuario" if msg.role == "user" else "Asistente"
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, f"[{timestamp}] {role}:")
        y -= 20
        
        # Contenido (con wrapping básico)
        c.setFont("Helvetica", 10)
        words = msg.content.split()
        line = ""
        for word in words:
            test_line = line + word + " "
            if c.stringWidth(test_line, "Helvetica", 10) < width - 100:
                line = test_line
            else:
                c.drawString(60, y, line)
                y -= 15
                line = word + " "
                if y < 100:
                    c.showPage()
                    y = height - 50
        
        if line:
            c.drawString(60, y, line)
            y -= 25
    
    c.save()
    
    return FileResponse(
        temp_path,
        media_type='application/pdf',
        filename=f'chat_history_{workspace_id}_{datetime.utcnow().strftime("%Y%m%d")}.pdf'
    )


@router.delete(
    "/workspaces/{workspace_id}/chat/history",
    summary="Eliminar historial de chat"
)
def delete_chat_history(
    workspace_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Elimina todo el historial de chat de un workspace
    """
    deleted_count = db.query(chat_model.ChatMessage).filter(
        chat_model.ChatMessage.workspace_id == workspace_id
    ).delete()
    
    db.commit()
    
    return {"message": f"{deleted_count} mensajes eliminados"}
