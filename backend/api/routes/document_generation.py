"""
Rutas para generación de documentos descargables sin OAuth.
Sistema simplificado que genera documentos en TXT, Markdown o PDF.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from models import database, schemas
from models.conversation import Conversation, Message
from models.document import Document
from models import workspace as workspace_model
from core import llm_service
from core.pdf_service import pdf_export_service
from core.auth import get_current_active_user
from models.user import User
from datetime import datetime
import io

router = APIRouter()


def _get_conversation_context(conversation: Conversation, db: Session) -> str:
    """Obtiene el contexto completo de una conversación en formato texto."""
    messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.asc()).all()
    
    context = f"# Conversación: {conversation.title}\n\n"
    
    for msg in messages:
        role_label = "Usuario" if msg.role == "user" else "Asistente"
        context += f"**{role_label}**: {msg.content}\n\n"
    
    return context


def _get_workspace_documents_summary(workspace_id: str, db: Session) -> str:
    """Obtiene un resumen de los documentos del workspace."""
    documents = db.query(Document).filter(
        Document.workspace_id == workspace_id,
        Document.status == "COMPLETED"
    ).all()
    
    if not documents:
        return "No hay documentos procesados en este workspace."
    
    content = "## Documentos Analizados\n\n"
    for doc in documents:
        content += f"- **{doc.file_name}** ({doc.file_type}): {doc.chunk_count} fragmentos procesados\n"
    
    return content


def _generate_document_content(
    conversation: Conversation,
    workspace_id: str,
    document_type: str,
    custom_instructions: str | None,
    db: Session
) -> str:
    """Genera el contenido del documento usando el LLM."""
    
    # Obtener contexto de la conversación
    conversation_context = _get_conversation_context(conversation, db)
    
    # Obtener información de documentos
    documents_context = _get_workspace_documents_summary(workspace_id, db)
    
    # Determinar el tipo de documento a generar
    if document_type == "summary":
        doc_instructions = """
Crea un RESUMEN EJECUTIVO conciso de la conversación:
- Máximo 500 palabras
- Enfócate en los puntos más importantes
- Conclusiones principales
- Recomendaciones clave
"""
    elif document_type == "key_points":
        doc_instructions = """
Extrae y organiza los PUNTOS CLAVE de la conversación:
- Lista los temas principales discutidos
- Hallazgos importantes
- Decisiones tomadas
- Acciones recomendadas
- Formato: listas con viñetas y secciones claras
"""
    else:  # complete
        doc_instructions = """
Crea un DOCUMENTO COMPLETO Y PROFESIONAL con toda la información de la conversación:
- Mínimo 1000 palabras
- Incluye TODAS las ideas, análisis y recomendaciones discutidas
- Estructura profesional con múltiples secciones
- Detalles técnicos y ejemplos específicos
- Formato Markdown profesional
"""
    
    # Construir prompt para el LLM
    synthesis_prompt = f"""Eres un experto en crear documentos profesionales editables. Tu tarea es sintetizar el contenido de esta conversación en un documento bien estructurado.

=== CONTEXTO DE DOCUMENTOS ===
{documents_context}

=== CONVERSACIÓN COMPLETA ===
{conversation_context}

=== TIPO DE DOCUMENTO SOLICITADO ===
{doc_instructions}

=== INSTRUCCIONES DE FORMATO ===
1. Usa formato Markdown profesional:
   - # para título principal
   - ## para secciones principales
   - ### para subsecciones
   - **Negrita** para énfasis
   - Listas numeradas para procedimientos
   - Listas con viñetas para puntos clave
   - Tablas si es apropiado
   - Bloques de código con ```

2. Estructura sugerida (ajusta según el tipo):
   - **Título del Documento**
   - **Resumen Ejecutivo / Introducción**
   - **Desarrollo / Análisis Principal**
   - **Hallazgos / Resultados**
   - **Recomendaciones**
   - **Conclusiones**
   - **Próximos Pasos** (si aplica)

3. REGLAS IMPORTANTES:
   ✅ Base tu contenido en TODA la conversación anterior
   ✅ NO omitas información relevante
   ✅ Sé específico y detallado
   ✅ El documento debe ser EDITABLE por el usuario
   ✅ Mantén un tono profesional pero accesible
   ✅ Incluye ejemplos y datos específicos mencionados

"""
    
    if custom_instructions:
        synthesis_prompt += f"\n=== INSTRUCCIONES ADICIONALES DEL USUARIO ===\n{custom_instructions}\n"
    
    synthesis_prompt += "\n=== GENERA EL DOCUMENTO AHORA (solo el contenido en Markdown, sin meta-comentarios) ===\n"
    
    # Generar contenido con el LLM usando generate_response sin chunks
    content = llm_service.generate_response(
        query=synthesis_prompt,
        context_chunks=[]
    )
    
    return content


def _add_metadata_header(content: str, conversation: Conversation, format: str) -> str:
    """Agrega metadata al inicio del documento."""
    
    metadata = f"""{'='*80}
DOCUMENTO GENERADO AUTOMÁTICAMENTE
{'='*80}

Título: {conversation.title}
Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Formato: {format.upper()}

NOTA: Este documento es completamente editable. Siéntete libre de modificar,
      agregar o eliminar cualquier sección según tus necesidades.

{'='*80}

"""
    return metadata + content


@router.post(
    "/workspaces/{workspace_id}/conversations/{conversation_id}/generate-downloadable",
    response_model=schemas.DownloadableDocumentResponse,
    summary="Generar documento descargable (TXT/Markdown/PDF) sin OAuth"
)
def generate_downloadable_document(
    workspace_id: str,
    conversation_id: str,
    request: schemas.GenerateDownloadableDocRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Genera un documento descargable en formato TXT, Markdown o PDF.
    
    - **Requiere autenticación** - Solo el owner puede generar documentos
    - **Descarga directa** - El usuario recibe el archivo inmediatamente
    - **Totalmente editable** - El usuario puede modificar el contenido
    
    Formatos disponibles:
    - `txt`: Texto plano sin formato (máxima compatibilidad)
    - `markdown`: Texto con formato Markdown (recomendado para edición)
    - `pdf`: Documento PDF profesional (solo lectura, pero imprimible)
    
    Tipos de documento:
    - `complete`: Documento completo con todos los detalles (1000+ palabras)
    - `summary`: Resumen ejecutivo conciso (500 palabras)
    - `key_points`: Lista de puntos clave y recomendaciones
    """
    
    # Validar formato
    valid_formats = ["txt", "markdown", "pdf"]
    if request.format not in valid_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato inválido. Usa: {', '.join(valid_formats)}"
        )
    
    # Verificar workspace
    workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    # Verificar ownership
    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para generar documentos en este workspace."
        )
    
    # Verificar conversación
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == workspace_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada"
        )
    
    # Validar que haya mensajes
    message_count = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).count()
    
    if message_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La conversación no tiene mensajes. Debes chatear primero."
        )
    
    try:
        # Generar contenido del documento
        content = _generate_document_content(
            conversation=conversation,
            workspace_id=workspace_id,
            document_type=request.document_type,
            custom_instructions=request.custom_instructions,
            db=db
        )
        
        # Validar contenido generado
        if len(content.strip()) < 100:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="El contenido generado es demasiado corto. Intenta nuevamente."
            )
        
        # Generar archivo final según formato
        # Generar archivo final según formato
        if request.format == "pdf":
            # Generar PDF real usando el servicio
            pdf_buffer = pdf_export_service.export_text_to_pdf(
                title=f"{conversation.title} - {request.document_type.replace('_', ' ').title()}",
                content=content
            )
            return Response(
                content=pdf_buffer.getvalue(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        else:
            # Texto o Markdown
            final_content = content
            # Agregar metadata si se solicita (solo para texto/md)
            if request.include_metadata:
                final_content = _add_metadata_header(final_content, conversation, request.format)
            word_count = len(final_content.split())
        
            return schemas.DownloadableDocumentResponse(
                content=final_content,
                filename=filename,
                format=request.format,
                word_count=word_count,
                message=f"Documento {request.format.upper()} generado exitosamente ({word_count} palabras)"
            )
        
    except Exception as e:
        print(f"Error generando documento descargable: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar documento: {str(e)}"
        )


@router.get(
    "/workspaces/{workspace_id}/conversations/{conversation_id}/download/{format}",
    summary="Descargar documento en formato específico"
)
def download_document_direct(
    workspace_id: str,
    conversation_id: str,
    format: str,
    document_type: str = "complete",
    include_metadata: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Endpoint alternativo que devuelve el archivo directamente para descarga.
    Útil para usar con <a href="..."> o window.open() en el frontend.
    
    Requiere autenticación. Solo el owner puede descargar documentos.
    """
    
    # Verificar workspace y ownership
    workspace = db.query(workspace_model.Workspace).filter(
        workspace_model.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    if workspace.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para descargar documentos de este workspace."
        )
    
    # Reutilizar la lógica del endpoint anterior
    request = schemas.GenerateDownloadableDocRequest(
        format=format,
        document_type=document_type,
        include_metadata=include_metadata
    )
    
    result = generate_downloadable_document(workspace_id, conversation_id, request, db)
    
    # Determinar el media type
    media_types = {
        "txt": "text/plain",
        "markdown": "text/markdown",
        "pdf": "application/pdf"
    }
    
    # Devolver como archivo descargable
    if format == "pdf":
        # Si es PDF, necesitamos regenerarlo o (idealmente) cachearlo.
        # Por simplicidad, aquí lo regeneramos llamando a la lógica interna,
        # pero generate_downloadable_document devuelve JSON.
        # Así que mejor llamamos a la lógica de generación directamente aquí o refactorizamos.
        
        # Refactorización rápida: Llamar a _generate_document_content y luego a export_text_to_pdf
        content = _generate_document_content(
            conversation=conversation,
            workspace_id=workspace_id,
            document_type=document_type,
            custom_instructions=None, # No soportado en GET directo por simplicidad URL
            db=db
        )
        
        pdf_buffer = pdf_export_service.export_text_to_pdf(
            title=f"{conversation.title} - {document_type.replace('_', ' ').title()}",
            content=content
        )
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={result.filename}"
            }
        )

    return Response(
        content=result.content,
        media_type=media_types.get(format, "text/plain"),
        headers={
            "Content-Disposition": f"attachment; filename={result.filename}"
        }
    )
