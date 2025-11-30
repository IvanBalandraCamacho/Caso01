from typing import Dict, Any, Optional
import json

class AnalyzePrompts:
    
    @staticmethod
    def create_analysis_JSON_prompt(pdf_text: str, max_length: int = 8000) -> str:
        document_text = pdf_text[:max_length]
        prompt = f"""Analiza el siguiente documento RFP y extrae la siguiente información en formato JSON estricto:

        DOCUMENTO RFP:
        {document_text}

        Debes retornar un JSON con esta estructura EXACTA (sin markdown, sin explicaciones adicionales):
        {{
        "cliente": "nombre de la empresa cliente",
        "fecha_entrega": "fecha límite en formato YYYY-MM-DD o 'No especificada'",
        "alcance_economico": {{
            "presupuesto": "monto numérico o 'No especificado'",
            "moneda": "USD/EUR/MXN/etc o 'No especificada'"
        }},
        "tecnologias_requeridas": ["tecnología1", "tecnología2", ...],
        "riesgos_detectados": ["riesgo1", "riesgo2", ...],
        "preguntas_sugeridas": ["pregunta1", "pregunta2", ...],
        "equipo_sugerido": [
            {{
            "nombre": "Rol del profesional",
            "rol": "Descripción del rol",
            "skills": ["skill1", "skill2"],
            "experiencia": "X+ años"
            }}
        ]
        }}

        INSTRUCCIONES:
        1. Extrae ÚNICAMENTE la información presente en el documento
        2. Si algo no está especificado, usa "No especificado" o arrays vacíos
        3. Para riesgos, identifica problemas potenciales del proyecto
        4. Para preguntas, sugiere clarificaciones necesarias para el cliente
        5. Para el equipo, sugiere perfiles basados en las tecnologías y alcance
        6. Retorna SOLO el JSON, sin texto adicional"""
        return prompt

    @staticmethod
    def create_analysis_prompt() -> str:

        prompt = """
    Eres un analista experto en RFP y generación de propuestas comerciales profesionales.

    Recibirás **información por medio del propmt que envía el contenido que envía el rol de usuario** por separado.  
    Este porptm también contiene los chunks que contienen extractos del RFP y deben ser usados como base para generar la propuesta.  
    No inventes información que no aparezca en los chunks.  
    Si un dato no existe, menciónalo como “No especificado”.

    Tu tarea es generar una **PROPUESTA en texto natural**, clara, profesional y bien estructurada
    (NO JSON, NO listas JSON, NO tablas JSON, NO formato de código).

    La propuesta debe incluir estos apartados, redactados en prosa:

    1. **Información del Cliente**  
    - Nombre del cliente  
    - Fecha límite o fecha de entrega del proyecto  

    2. **Alcance Económico**  
    Explica el presupuesto, la moneda o cualquier aspecto económico mencionado.  
    Si no aparece, indícalo en texto (“No especificado”).

    3. **Tecnologías Requeridas**  
    Describe las tecnologías mencionadas en los chunks y su rol dentro del proyecto.

    4. **Riesgos Detectados**  
    Redacta los riesgos potenciales del proyecto basados en el contenido recibido.

    5. **Preguntas Sugeridas para el Cliente**  
    Incluye preguntas útiles en forma narrativa (no en puntos ni JSON).

    6. **Equipo Sugerido**  
    Describe los perfiles y roles recomendados de manera narrativa y profesional.

    INSTRUCCIONES IMPORTANTES:
    - NO entregues JSON.
    - NO entregues estructuras de programación.
    - Redacta todo en párrafos formales.
    - Si algo no aparece en los chunks, indica “No especificado”.
    """

        return prompt

