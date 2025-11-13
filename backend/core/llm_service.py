import google.generativeai as genai
from core.config import settings
from models.schemas import DocumentChunk

# Configurar el cliente de Google AI
print("LLM_SERVICE: Configurando el cliente de Gemini...")
genai.configure(api_key=settings.GEMINI_API_KEY)

# Configuración de generación y seguridad
generation_config = {
  "temperature": 0.2, # Un valor bajo para respuestas más consistentes y basadas en hechos
  "top_p": 1,
  "top_k": 1,
  "max_output_tokens": 2048,
}

safety_settings = [
  {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
  {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
  {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
  {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# Inicializar el modelo
try:
    model = genai.GenerativeModel(model_name="gemini-1.5-flash", # Usamos el modelo estándar
                                  generation_config=generation_config,
                                  safety_settings=safety_settings)
    print("LLM_SERVICE: Modelo Gemini 'gemini-1.5-flash' cargado.")
except Exception as e:
    print(f"LLM_SERVICE: ERROR al cargar el modelo Gemini: {e}")
    model = None

def _build_prompt(query: str, context_chunks: list[DocumentChunk]) -> str:
    """
    Construye el prompt para el LLM, combinando la consulta y el contexto.
    """
    
    # 1. Formatear el contexto
    context_string = ""
    for i, chunk in enumerate(context_chunks):
        context_string += f"--- Contexto Chunk {i+1} (del Documento {chunk.document_id}) ---\n"
        context_string += chunk.chunk_text
        context_string += "\n--------------------------------------------------\n\n"
        
    # 2. Crear el prompt final
    prompt = f"""
    Eres un asistente de IA experto en analizar documentos. Tu tarea es responder la pregunta del usuario basándote ÚNICA Y EXCLUSIVAMENTE en el contexto proporcionado.
    
    No utilices ningún conocimiento externo. Si la respuesta no se encuentra en el contexto, di "No encontré información suficiente en los documentos para responder a esa pregunta."
    
    =========================
    CONTEXTO PROPORCIONADO:
    {context_string}
    =========================
    
    PREGUNTA DEL USUARIO:
    {query}
    
    RESPUESTA:
    """
    return prompt

def generate_response(query: str, context_chunks: list[DocumentChunk]) -> str:
    """
    Genera una respuesta de lenguaje natural usando el LLM.
    """
    if model is None:
        return "Error: El modelo LLM no se inicializó correctamente."

    # 1. Construir el prompt
    prompt = _build_prompt(query, context_chunks)
    
    print(f"LLM_SERVICE: Enviando prompt a Gemini (longitud: {len(prompt)})...")
    
    try:
        # 2. Llamar a la API de Gemini
        response = model.generate_content(prompt)
        
        print("LLM_SERVICE: Respuesta recibida de Gemini.")
        return response.text
    
    except Exception as e:
        print(f"LLM_SERVICE: Error durante la generación de contenido: {e}")
        return f"Error al contactar la API de Gemini: {e}"