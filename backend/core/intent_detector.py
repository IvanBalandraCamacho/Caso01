from core import llm_service

INTENT_PROMPT = """
Clasifica la siguiente petición del usuario en una INTENCIÓN.

Responde ÚNICAMENTE con uno de estos valores (sin texto extra):

- GENERATE_PROPOSAL  → Si el usuario quiere crear, generar o redactar una propuesta, documento, informe, reporte o similar.
- GENERAL_QUERY    → Para preguntas generales o conversación normal o si el usuario quiere revisar, examinar, comparar, evaluar o resumir un documento.

Ejemplo:
Usuario: "Genera una propuesta comercial"
Respuesta: GENERATE_PROPOSAL

Usuario: "Realiza un resumen del documento adjunto/ analiza este informe/ indicame el personal necesario para el proyecto"
Respuesta: GENERAL_QUERY
"""

def classify_intent(user_query: str):

    # Llamar al servicio LLM para clasificar intención
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
    
    return "GENERAL_QUERY"  # Default