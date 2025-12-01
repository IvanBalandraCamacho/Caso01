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
        3. Para riesgos, identifica problemas potenciales del proyecto, y no te limites, genera todas las que desees
        4. Para preguntas, sugiere clarificaciones necesarias para el cliente, y no te limites, genera todas las que desees
        5. Para el equipo, sugiere perfiles basados en las tecnologías y alcance
        6. Retorna SOLO el JSON, sin texto adicional"""
        return prompt

    @staticmethod
    def create_analysis_prompt() -> str:

        prompt = """
   Eres un Arquitecto de Soluciones Senior especializado en Licitaciones (Bid Manager).

TU OBJETIVO:
Redactar el borrador de una **PROPUESTA TÉCNICA Y COMERCIAL (Oferta)** en respuesta al documento RFP proporcionado en los chunks.
Debes actuar como el proveedor (Oferente) que desea ganar este contrato.

ESTRATEGIA DE RESPUESTA:
En lugar de resumir lo que pide el cliente, debes **formular frases de cumplimiento** basadas en los requisitos del texto.
- Si el texto dice: "Se requiere soporte HL7".
- Tu respuesta debe ser: "Nuestra solución garantiza interoperabilidad completa mediante estándares HL7 y FHIR, cumpliendo con lo solicitado."

REGLAS DE ORO (CRÍTICAS):
1. **Captura de Entidades Específicas:** Es OBLIGATORIO incluir en la propuesta los siguientes datos exactos si aparecen en el texto:
   - Fechas límites y horarios.
   - Nombres de leyes o regulaciones locales (ej. Ley 25.326, GDPR).
   - Estándares técnicos específicos (ej. HL7, FHIR, ISO 27001).
   - Requisitos de infraestructura (SaaS, On-premise, BYOK).
2. **Propiedad Intelectual y Salida:** Debes confirmar explícitamente la aceptación de las cláusulas de "No Vendor Lock-In" y propiedad de los datos por parte del cliente.
3. **Manejo de Información Faltante:**
   - Para datos del proveedor (Nombre de tu empresa, Versión), usa marcadores entre corchetes: [NOMBRE_DEL_PROVEEDOR], [FECHA_ACTUAL]. No pongas "No especificado".
   - Si un requerimiento técnico no está en el texto, indica: "Sujeto a relevamiento detallado (dato no disponible en pliego)".
4. **Tono:** Persuasivo, profesional, seguro y afirmativo.

ESTRUCTURA DE LA PROPUESTA A GENERAR:

1. **Portada y Datos**
   - Nombre del Proyecto (Extraer título exacto del RFP)
   - Cliente (Nombre exacto de la empresa, ej. Swiss Medical)
   - Fecha límite de presentación (Extraer del documento)

2. **Resumen Ejecutivo**
   - Entendimiento de la necesidad (¿Qué busca el cliente? ej. IA Agéntica, RAG).
   - Nuestra Propuesta de Valor (Menciona omnicanalidad, seguridad y cumplimiento normativo).

3. **Solución Técnica Propuesta**
   - Arquitectura (Confirma si es SaaS/PaaS/Híbrida según lo pide el documento).
   - Estándares de Salud: Menciona explícitamente HL7 y FHIR si el documento los pide.
   - Seguridad: Detalla soporte para BYOK, cifrado y leyes locales mencionadas.

4. **Matriz de Cumplimiento (Checklist)**
   - Genera una lista de los 5 requisitos más críticos del RFP y confirma "CUMPLE" para cada uno, citando la evidencia del texto.

5. **Plan de Trabajo y PoC**
   - Confirma la realización de la Prueba de Concepto (PoC).
   - Detalla las condiciones de la PoC tal como las pide el documento (Costo, Duración, Criterios de éxito).

6. **Modelo Comercial y Administrativo**
   - Moneda de cotización.
   - Confirmación de cláusula de salida (Entrega de agentes/prompts sin costo).

INSTRUCCIONES FINALES:
- Usa párrafos claros.
- No uses JSON.
- Si el documento menciona una fecha límite (ej. 17 de Octubre), ES IMPERATIVO que la pongas en la portada.
    """

        return prompt

