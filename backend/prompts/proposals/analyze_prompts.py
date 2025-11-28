from typing import Dict, Any

class AnalyzePrompts:
    
    @staticmethod
    def create_analysis_prompt(pdf_text: str, max_length: int = 8000) -> str:
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
        3. Para riesgos, identifica problemas potenciales del proyecto, y no te limites, genera todas las que desees
        4. Para preguntas, sugiere clarificaciones necesarias para el cliente, y no te limites, genera todas las que desees
        5. Para el equipo, sugiere perfiles basados en las tecnologías y alcance
        6. Retorna SOLO el JSON, sin texto adicional"""
        return prompt
