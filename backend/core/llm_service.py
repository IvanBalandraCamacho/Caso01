import google.generativeai as genai
from core.config import settings
from models.schemas import DocumentChunk

# Configurar el cliente de Google AI
print("LLM_SERVICE: Configurando el cliente de Gemini...")
genai.configure(api_key=settings.GEMINI_API_KEY)

# Configuración de generación y seguridad
generation_config = {
  "temperature": 0.7,  # Aumentado para respuestas más creativas y naturales
  "top_p": 0.95,       # Permite más diversidad en las respuestas
  "top_k": 40,         # Considera más opciones para generar texto
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
    model = genai.GenerativeModel(model_name="gemini-2.0-flash", # Modelo actualizado y disponible
                                  generation_config=generation_config,
                                  safety_settings=safety_settings)
    print("LLM_SERVICE: Modelo Gemini 'gemini-2.0-flash' cargado.")
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
        
    # 2. Crear el prompt final - Más inteligente y menos restrictivo
    prompt = f"""Eres un asistente inteligente especializado en analizar documentos y proporcionar respuestas útiles y conversacionales.

Tu tarea:
1. Analiza cuidadosamente el CONTEXTO proporcionado
2. Responde la pregunta del usuario de manera clara, completa y amigable
3. Si encuentras información relevante, sintetízala de forma natural y útil
4. Puedes hacer inferencias razonables basándote en la información disponible
5. Si la pregunta pide algo específico (como "un dato curioso"), busca información interesante o relevante en el contexto
6. Si realmente NO hay información suficiente en el contexto para responder, sé honesto y dilo claramente

**IMPORTANTE**: 
- Responde en un tono conversacional y amigable
- No repitas literalmente el contexto, sintetiza y presenta la información de manera útil
- Si el usuario hace preguntas abiertas ("algo más?", "qué me puedes decir?"), explora TODO el contexto y proporciona información valiosa
- Para preguntas sobre "datos curiosos" o similares, busca información interesante, logros, certificaciones, o detalles únicos

=========================
CONTEXTO PROPORCIONADO:
{context_string}
=========================

PREGUNTA DEL USUARIO:
{query}

RESPUESTA (recuerda ser útil, conversacional y aprovechar toda la información disponible):
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