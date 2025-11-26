import json
import logging
from typing import Optional
from models.conversation import Conversation, Message
from models import database
from core import llm_service
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


CHECKLIST_ANALYZER_PROMPT = """ Eres el **Checklist Analyzer de TIVIT Digital**, un asistente experto en análisis de RFPs, propuestas técnicas y documentos de licitación. 
Tu tarea es leer el documento proporcionado y compararlo contra el **Checklist Oficial de Proyectos Digitales de TIVIT**, identificando:

1. Información faltante  
2. Información incompleta  
3. Información ambigua  
4. Riesgos relevantes  
5. Preguntas que deben hacerse al cliente para completar la propuesta  
6. Supuestos necesarios en caso de que la información no exista  

Debes responder SIEMPRE en formato JSON estructurado, claro y consistente.

---

## 📌 **DOCUMENTO A ANALIZAR**
{documento}

---

## 📌 CHECKLIST OFICIAL – ÁREA DIGITAL TIVIT  
Evalúa si el documento cubre cada uno de estos puntos:

### 1. Alcance, Objetivos y Expectativas
- ¿Está claramente definido el objetivo central del proyecto?
- ¿Se detalla el alcance mínimo, deseado y opcional?
- ¿Qué resultados espera ver el cliente en términos funcionales o de negocio?
- ¿Se exige fecha de inicio, fin o hitos obligatorios?
- ¿Criterios de éxito o aceptación?

### 2. Requerimientos Funcionales
- ¿Las funcionalidades están completamente definidas?
- ¿Existen flujos, procesos o casos de uso documentados?
- ¿Requiere aprobaciones, validaciones o workflows?
- ¿El cliente espera prototipos, demos o pilotos?

### 3. Arquitectura, Infraestructura y Stack Tecnológico
**Preferencias tecnológicas**
- Lenguajes, frameworks, bases de datos requeridas
- Licencias existentes o necesarias

**Infraestructura**
- ¿Despliegue en nube, on-premise o híbrido?
- Si es nube: AWS/Azure/GCP
- Ambientes Dev/QA/Prod
- ¿Quién los provisiona?

**Integraciones y APIs**
- Documentación técnica disponible
- Protocolos requeridos (REST/SOAP/gRPC/etc.)
- ¿Se necesita API Management?

**DevOps / CI/CD**
- Herramientas de repositorio existentes
- CI/CD permitido
- Restricciones de seguridad

### 4. Datos, Integraciones y Migración
- Sistemas origen/destino
- Estado de los datos (limpios, sucios, estructurados)
- Volumen estimado
- Estándares de calidad
- Requerimientos de anonimización o encriptación

### 5. UX/UI
- Manual de marca o lineamientos
- Prototipos necesarios
- Accesibilidad (WCAG)

### 6. Seguridad, Riesgos y Cumplimiento
- Ethical Hacking: ¿requerido? ¿quién lo ejecuta?
- Normativas (ISO, PCI, GDPR)
- Restricciones para subcontratación o personal extranjero
- Requisitos de ingreso físico a oficinas
- Documentación de seguridad esperada

### 7. Operación, Soporte y Mantenimiento
- Horarios requeridos (8x5, 24x7…)
- SLAs esperados
- Backlog actual de tickets
- Herramientas de gestión (Jira, ServiceNow…)
- Necesidad de monitoreo/observabilidad
- Gestión de incidentes/problemas/cambios

### 8. Equipo, Roles y Modalidad de Trabajo
- Perfiles solicitados
- ¿Se permite talento de otras oficinas de TIVIT?
- ¿Se aceptan experiencias internacionales?
- Tiempo máximo de reposición ante rotación
- Modalidad (remoto, presencial, híbrido)
- ¿Exige PM, arquitecto, SM?

### 9. Gestión del Proyecto
- Metodología solicitada (Ágil / Cascada / Híbrida)
- ¿Se debe entregar un Plan de Proyecto formal?
- Entregables obligatorios (plan de calidad, pruebas, manuales)
- Interlocutores técnicos y funcionales
- Proceso de validación y aprobación

### 10. Aspectos Comerciales y Contractuales
- ¿Existe presupuesto referencial?
- Forma de facturación (hitos, mensual, T&M)
- Penalidades por SLA
- Boletas/pólizas requeridas
- Plazos de pago
- Condiciones de renovación


# 🎯 **INSTRUCCIONES DE RESPUESTA**
Debes generar un JSON con la siguiente estructura EXACTA:

{{"resumen_general": "...", "cumplimiento_por_categoria": {{ ... }} , "preguntas_criticas_para_el_cliente": [], "supuestos_recomendados": [], "riesgos_generales": []}}
"""

def analyze_text_and_save(
    text: str,
    document_id: str,
    file_name: str,
    workspace_id: str,
    user_id: Optional[str],
    db: Session,
    conversation_title: Optional[str] = None
):
    """
    Analiza el texto con el Checklist Analyzer y guarda el resultado como mensaje del asistente
    en una conversación del workspace.

    Args:
        text: Texto completo del documento.
        document_id: ID del documento en la BD.
        file_name: Nombre del archivo (para usar en el título).
        workspace_id: Workspace donde crear la conversación.
        user_id: ID del usuario dueño (puede ser None).
        db: SQLAlchemy Session abierta (se usa la sesión del worker).
        conversation_title: Título opcional de la conversación; si no, se genera uno.
    """
    
    
    try:
        prompt = CHECKLIST_ANALYZER_PROMPT.format(document=text)

        # Obtener provider directamente para pasar custom_prompt
        provider = llm_service.get_provider()
        logger.info("Checklist Analyzer: llamando al LLM para analizar documento")
        response_text = provider.generate_response(query="", context_chunks=[], custom_prompt=prompt)

        # Intentar parsear JSON (el prompt exige JSON)
        parsed = None
        try:
            parsed = json.loads(response_text)
        except Exception as e_json:
            # Si falla, guardamos el texto crudo y una nota de error de parseo
            logger.warning(f"Checklist Analyzer: no se pudo parsear JSON: {e_json}")
            parsed = {
                "resumen_general": response_text[:500],
                "error": "No se pudo parsear la respuesta como JSON. Revisar raw_response."
            }

        # Preparar mensaje breve para el chat (meta-resumen)
        resumen = parsed.get("resumen_general") if isinstance(parsed, dict) else None
        preguntas = parsed.get("preguntas_criticas_para_el_cliente", []) if isinstance(parsed, dict) else []
        preguntas_count = len(preguntas) if isinstance(preguntas, list) else (1 if preguntas else 0)

        short_text = f"Analicé el documento '{file_name}'. {('Resumen: ' + resumen) if resumen else 'Resumen corto no disponible.'} "
        # Añadir CTA para que el usuario pida ver las preguntas
        if preguntas_count > 0:
            short_text += f"He detectado {preguntas_count} preguntas sugeridas. ¿Quieres que te muestre las preguntas sugeridas ahora? Responde 'Sí' para verlas."
        else:
            short_text += "No pude identificar preguntas críticas automáticamente."

        # Crear (o buscar) una conversación automática para este documento
        conv_title = conversation_title or f"Checklist automático - {file_name}"
        conversation = Conversation(workspace_id=workspace_id, title=conv_title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        # Guardar el mensaje corto del asistente (visible en chat)
        assistant_short_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=short_text
        )
        db.add(assistant_short_msg)
        db.commit()

        # Guardar también el JSON completo como mensaje invisiblemente accesible
        # Lo guardamos en otro mensaje (puede ser usado por la UI para "mostrar checklist")
        full_json_msg_content = f"[CHECKLIST_JSON]\n{json.dumps(parsed, ensure_ascii=False, indent=2)}"
        assistant_full_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_json_msg_content
        )
        db.add(assistant_full_msg)
        db.commit()

        logger.info(f"Checklist Analyzer: resultados guardados en conversación {conversation.id} (doc {document_id})")
        return conversation.id

    except Exception as e:
        logger.error(f"Checklist Analyzer error: {e}", exc_info=True)
        return None
