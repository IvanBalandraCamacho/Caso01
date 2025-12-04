import json
import logging
from typing import Tuple
from core import llm_service

logger = logging.getLogger(__name__)

CHECKLIST_ANALYZER_PROMPT = """

"""


def analyze_document_for_suggestions(text: str, file_name: str) -> Tuple[str, str]:
    """
    Procesa el texto con el Checklist Analyzer y retorna:

    - short_message: mensaje breve para el chat inicial
    - full_message: mensaje largo y estructurado con todo el análisis

    Este análisis NO es JSON. Es texto bien formateado para mostrar al usuario.
    """

    # -----------------------------
    # ENVIAR PROMPT AL MODELO LLM
    # -----------------------------
    provider = llm_service.get_provider()
    logger.info("Checklist Analyzer: solicitando análisis al LLM...")

    # Truncar texto para evitar errores de tokens
    safe_text = text[:100000]
    prompt = CHECKLIST_ANALYZER_PROMPT.format(document=safe_text)

    response_text = provider.generate_response(
        query="Analiza este documento según el checklist.",
        context_chunks=[],
        custom_prompt=prompt
    )

    # Guardamos el resultado completo por si necesitamos revisar fallos
    full_message = response_text.strip()

    # -----------------------------
    #  EXTRAER RESUMEN GENERAL
    # -----------------------------
    resumen = "No se pudo extraer el resumen."
    try:
        if "RESUMEN GENERAL" in response_text:
            after_header = response_text.split("RESUMEN GENERAL")[1]
            # Saltamos primer salto de línea y tomamos el párrafo siguiente
            lines = after_header.strip().split("\n")
            # Buscar primera línea que no esté vacía
            for line in lines:
                if line.strip():
                    resumen = line.strip()
                    break
    except Exception as e:
        logger.warning("No se pudo extraer el resumen: %s", e)

    # -----------------------------
    #  CONTAR PREGUNTAS CRÍTICAS
    # -----------------------------
    preguntas_count = 0
    try:
        if "PREGUNTAS CRÍTICAS" in response_text:
            preguntas_section = response_text.split("PREGUNTAS CRÍTICAS")[1]
            # Cortar antes de la siguiente sección si existe
            if "SUPUESTOS RECOMENDADOS" in preguntas_section:
                preguntas_section = preguntas_section.split("SUPUESTOS RECOMENDADOS")[0]
            
            preguntas_lines = [
                line for line in preguntas_section.split("\n")
                if line.strip().startswith(("-", "*", "•", "⚫"))
            ]
            preguntas_count = len(preguntas_lines)
    except Exception as e:
        logger.warning("No se pudieron contar preguntas críticas: %s", e)

    # -----------------------------
    #   CONSTRUIR MENSAJE CORTO
    # -----------------------------
    short_message = (
        f"🔍 He analizado tu documento **{file_name}**.\n\n"
        f"📝 **Resumen breve:** {resumen}\n"
    )

    if preguntas_count > 0:
        short_message += (
            f"\nEncontré **{preguntas_count} vacíos importantes** en el documento "
            f"que podrían afectar la propuesta.\n"
            f"¿Deseas ver el análisis completo?"
        )
    else:
        short_message += (
            "\nNo encontré preguntas críticas relevantes, aunque sí realicé un análisis completo."
        )

    logger.info("Mensaje corto generado:\n%s", short_message)
    logger.info("Mensaje largo generado:\n%s", full_message)

    return short_message, full_message
