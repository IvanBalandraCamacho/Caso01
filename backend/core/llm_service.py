import json
import time
import google.generativeai as genai
from core.config import settings
from models.schemas import DocumentChunk

# Inicializar cliente Gemini
print("LLM_SERVICE: Configurando el cliente de Gemini...")
genai.configure(api_key=settings.GEMINI_API_KEY)

# Configuración (preferimos esta variante stashed)
generation_config = {
    "temperature": 0.8,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

try:
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=generation_config,
        safety_settings=safety_settings,
    )
    print("LLM_SERVICE: Modelo Gemini cargado correctamente.")
except Exception as e:
    from typing import List
    import time
    import google.generativeai as genai
    from core.config import settings
    from models.schemas import DocumentChunk

    # Configurar el cliente Gemini
    genai.configure(api_key=settings.GEMINI_API_KEY)

    # Configuración recomendada (Stashed)
    generation_config = {
        "temperature": 0.8,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "text/plain",
    }

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            safety_settings=safety_settings,
        )
    except Exception:
        model = None


    def _build_prompt(query: str, context_chunks: List[DocumentChunk]) -> str:
        if context_chunks:
            context_string = "=== CONTEXTO DE LOS DOCUMENTOS ===\n\n"
            for i, chunk in enumerate(context_chunks):
                score = getattr(chunk, "score", 0.0)
                context_string += f"📄 Fragmento {i+1} (Relevancia: {score:.2f}):\n"
                context_string += chunk.chunk_text.strip() + "\n"
                context_string += "\n" + ("=" * 80) + "\n\n"
        else:
            context_string = "=== CONTEXTO ===\nNo hay documentos disponibles para esta consulta.\n\n"

        prompt = f"""Eres un asistente de IA profesional, preciso y detallado especializado en análisis de documentos.

    {context_string}

    === PREGUNTA DEL USUARIO ===
    {query}

    === INSTRUCCIONES ===
    - Responde usando solo la información provista en el contexto cuando exista.
    - Organiza la respuesta en secciones claras; usa listas cuando sea apropiado.
    - Proporciona recomendaciones accionables si corresponde.

    === RESPUESTA ===
    """
        return prompt


    def generate_response(query: str, context_chunks: List[DocumentChunk]) -> str:
        if model is None:
            raise RuntimeError("El modelo LLM no se inicializó correctamente.")

        prompt = _build_prompt(query, context_chunks)

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                text = getattr(response, "text", None)
                if not text:
                    raise ValueError("Respuesta vacía del modelo")
                return text
            except Exception as e:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Fallo al generar respuesta: {e}") from e
                time.sleep(1)


    def generate_response_stream(query: str, context_chunks: List[DocumentChunk]):
        if model is None:
            raise RuntimeError("El modelo LLM no se inicializó correctamente.")

        prompt = _build_prompt(query, context_chunks)

        try:
            stream = model.generate_content(prompt, stream=True)
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yield text
        except Exception as e:
            raise RuntimeError(f"Error en streaming: {e}") from e


    def _build_summary_prompt(text: str, instructions_text: str | None = None) -> str:
        if instructions_text:
            instr = instructions_text.strip()
        else:
            instr = (
                "Eres un asistente experto en análisis de propuestas comerciales. "
                "Genera un resumen estructurado en las secciones: Administrativo, Posibles competidores, Técnico, Viabilidad del alcance."
            )

        prompt = f"""{instr}\n\nDOCUMENTO:\n{text}\n\nSALIDA:"""
        return prompt


    def generate_summary_from_text(text: str, instructions_text: str | None = None) -> dict:
        if model is None:
            return {"error": "LLM no inicializado"}
        prompt = _build_summary_prompt(text, instructions_text=instructions_text)
        try:
            response = model.generate_content(prompt)
            raw = getattr(response, "text", "")
            return {"summary_raw": raw}
        except Exception as e:
            return {"error": str(e)}