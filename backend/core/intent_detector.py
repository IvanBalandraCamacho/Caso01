from core import llm_service
from prompts.chat_prompts import INTENT_CLASSIFICATION_PROMPT
import logging
import re

logger = logging.getLogger(__name__)

INTENT_PROMPT = INTENT_CLASSIFICATION_PROMPT

# Patrones para detección rápida sin LLM (ahorro de costos)
INTENT_PATTERNS = {
    "GENERATE_PROPOSAL": [
        r"genera.*propuesta",
        r"crear.*propuesta",
        r"nueva.*propuesta",
        r"elabora.*propuesta",
    ],
    "REQUIREMENTS_MATRIX": [
        r"matriz.*requisitos",
        r"requerimientos.*funcionales",
        r"lista.*requisitos",
        r"requerimientos.*no.*funcionales",
    ],
    "PREELIMINAR_PRICE_QUOTE": [
        r"cotizaci[oó]n",
        r"presupuesto",
        r"costo",
        r"precio",
        r"tarifa",
    ],
    "LEGAL_RISKS": [
        r"riesgos.*legales",
        r"riesgos.*regulatorios",
        r"cumplimiento.*legal",
        r"aspectos.*legales",
    ],
}


def classify_intent(user_query: str):
    """
    Clasifica la intención del usuario usando:
    1. Patrones regex (rápido, sin costo)
    2. LLM como fallback (más lento, con costo)
    """
    query_lower = user_query.lower()
    
    # 1. Intentar detección rápida con patrones
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, query_lower):
                logger.info(f"🎯 Intent detectado rápido: {intent}")
                return intent
    
    # 2. Si no hay coincidencia, usar LLM
    logger.info("🤖 Usando LLM para clasificar intención...")
    
    try:
        response = llm_service.generate_response(
            query=INTENT_PROMPT + user_query,
            context_chunks=[]
        ).strip()

        # Seguridad: normalizar
        response = response.replace(" ", "").upper()

        # Mapear respuesta a intención
        if "GENERATE_PROPOSAL" in response:
            return "GENERATE_PROPOSAL"
        elif "GENERAL_QUERY" in response:
            return "GENERAL_QUERY"
        elif "REQUIREMENTS_MATRIX" in response:
            return "REQUIREMENTS_MATRIX"
        elif "PREELIMINAR_PRICE_QUOTE" in response:
            return "PREELIMINAR_PRICE_QUOTE"
        elif "LEGAL_RISKS" in response:
            return "LEGAL_RISKS"
        elif "SPECIFIC_QUERY" in response:
            return "SPECIFIC_QUERY"
        else:
            return "GENERAL_QUERY"
            
    except Exception as e:
        logger.error(f"Error en clasificación de intent: {e}")
        return "GENERAL_QUERY"