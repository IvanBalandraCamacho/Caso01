from core import llm_service

INTENT_PROMPT = """
Clasifica la siguiente petición del usuario en una INTENCIÓN.

Responde ÚNICAMENTE con uno de estos valores (sin texto extra):

- GENERATE_PROPOSAL  → Si el usuario quiere crear, generar o redactar una propuesta, documento, informe, reporte o similar.
- GENERAL_QUERY    → Para preguntas generales o conversación normal o si el usuario quiere revisar, examinar, comparar, evaluar o resumir un documento.
- REQUIREMENTS_MATRIX → Si el usuario quiere generar un plan de requisitos, matriz de requisitos o requisitos funcionales.
- PREELIMINAR_PRICE_QUOTE → Si el usuario quiere obtener una cotización preliminar o estimación de costos.
- LEGAL_RISKS → Si el usuario quiere identificar los riesgos legales o regulatorios asociados a un proyecto.
- SPECIFIC_QUERY → Si el usuario tiene una pregunta específica o requiere información adicional.

Ejemplo:
Usuario: "Genera una propuesta comercial"
Respuesta: GENERATE_PROPOSAL

Usuario: "Realiza un resumen del documento adjunto/ analiza este informe/ indicame el personal necesario para el proyecto/ de que trata el documento/ realiza un resumen ejecutivo del documento"
Respuesta: GENERAL_QUERY

Usuario: "Crea una matriz de requisitos según el archivo proporcionado"
Respuesta: REQUIREMENTS_MATRIX

Usuario: "Quiero saber el costo preelimiar de la propuesta"
Respuesta: PREELIMINAR_PRICE_QUOTE

Usuario: "¿Cuáles son los riesgos legales asociados a este proyecto?"
Respuesta: LEGAL_RISKS

Usuario: (Si es un RFP de desarrollo de software) "¿Cuál es la tecnlogía en la que se desarrollará el software?"
Respuesta: SPECIFIC_QUERY
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