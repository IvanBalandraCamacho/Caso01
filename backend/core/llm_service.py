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
    model = genai.GenerativeModel(model_name="gemini-2.5-flash", # Usamos el modelo estándar
                                  generation_config=generation_config,
                                  safety_settings=safety_settings)
    print("LLM_SERVICE: Modelo Gemini 'gemini-2.5-flash' cargado.")
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


def _build_summary_prompt(text: str, instructions_text: str | None = None) -> str:
    """
    Construye un prompt estrictamente enfocado a generar las 4 secciones
    requeridas por `summary_instructions.md`. El LLM debe usar únicamente el texto
    proporcionado y no inventar información.
    """
    # If an instructions file/text is provided, use it verbatim (trusted source).
    if instructions_text:
        instr = instructions_text.strip()
    else:
        instr = """
Eres un asistente experto en análisis de propuestas comerciales.
Analiza el siguiente documento y genera un resumen estructurado siguiendo EXACTAMENTE las cuatro secciones y criterios indicados:

1. Administrativo
 - Nivel de entendimiento de deadlines y cronograma (RFI/RFP).
 - Grado de cumplimiento con indicadores financieros y evidencia de experiencias pasadas relevantes al objeto del proceso licitatorio.
 - Certificaciones normativas, historial de cumplimiento, referencias de clientes y experiencias en operaciones similares.

2. Posibles competidores
 - Identifica competidores mencionados o inferidos, incluyendo incumbentes o proveedores actuales.

3. Técnico
 - Volumetría presentada o requerida.
 - Línea base de requisitos: parámetros necesarios para el proyecto (frameworks, requerimientos evolutivos, solicitudes adicionales).
 - Tecnologías, herramientas y recursos necesarios o propuestos.

4. Viabilidad del alcance
 - Ajuste entre lo propuesto y las necesidades del proyecto.
 - Riesgos evidentes.
 - Brechas críticas.
 - Factores que favorecen o limitan la ejecución realista del alcance.

INSTRUCCIONES IMPORTANTES:
- Utiliza ÚNICA Y EXCLUSIVAMENTE la información presente en el documento abajo. No inventes, no supongas nada que no esté explícito.
- Organiza la salida con los cuatro subtítulos: "Administrativo:", "Posibles competidores:", "Técnico:", "Viabilidad del alcance:".
- Sé conciso y directo.
"""

    prompt = f"""
{instr}

DOCUMENTO:
{text}

SALIDA:
"""
    return prompt


def generate_summary_from_text(text: str, instructions_text: str | None = None) -> dict:
    """Genera un resumen estructurado (4 secciones) a partir del texto completo del documento.

    If `instructions_text` is provided, it will be used verbatim as the instruction template
    (this allows using an external `summary_instructions.md` file to control the exact summary format).
    """
    if model is None:
        return {"error": "LLM no inicializado"}
    prompt = _build_summary_prompt(text, instructions_text=instructions_text)
    print(f"LLM_SERVICE: Enviando prompt de resumen a Gemini (longitud: {len(prompt)})...")
    try:
        response = model.generate_content(prompt)
        raw = response.text

        # Intentamos dividir la respuesta en secciones según los subtítulos esperados.
        # Esto no sustituye validación humana, pero ayuda a estructurar la salida.
        sections = {
            "administrativo": "",
            "posibles_competidores": "",
            "tecnico": "",
            "viabilidad_del_alcance": ""
        }

        # Buscamos los encabezados en la respuesta (caso-insensible)
        lower = raw.lower()
        def extract_between(start_marker, end_marker=None):
            s = lower.find(start_marker)
            if s == -1:
                return ""
            s += len(start_marker)
            if end_marker:
                e = lower.find(end_marker, s)
                if e == -1:
                    return raw[s:].strip()
                return raw[s:e].strip()
            else:
                return raw[s:].strip()

        sections["administrativo"] = extract_between("administrativo", "posibles competidores")
        sections["posibles_competidores"] = extract_between("posibles competidores", "técnico")
        sections["tecnico"] = extract_between("técnico", "viabilidad del alcance")
        sections["viabilidad_del_alcance"] = extract_between("viabilidad del alcance")

        return sections

    except Exception as e:
        print(f"LLM_SERVICE: Error al generar resumen: {e}")
        return {"error": str(e)}