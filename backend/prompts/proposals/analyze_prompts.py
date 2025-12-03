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
Eres un modelo especializado en generar propuestas técnicas a partir de documentos RFI o RFP

TU OBJETIVO:
Redactar **UNA PROPUESTA TÉCNICA Y COMERCIAL (Oferta) PROFESIONAL** en respuesta al documento RFP proporcionado en los chunks.
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
   - En caso de no tener información para datos del proveedor (Nombre de tu empresa, Versión), usa marcadores entre corchetes: [NOMBRE_DEL_PROVEEDOR], [FECHA_ACTUAL]. No pongas "No especificado".
   - Si un requerimiento técnico no está en el texto, indica: "Sujeto a relevamiento detallado (dato no disponible en pliego)".
4. **Tono:** Persuasivo, profesional, seguro y afirmativo.
5- La información que proporcionas a partir del documento debe de ser objetiva, sin caer en la ambiguedad

ESTRUCTURA DE LA PROPUESTA A GENERAR:

TITULO: Un titulo descriptivo del caso y que esté acorde al contexto.

1. **Portada y Datos**
   - Nombre del Proyecto (Extraer título exacto del RFP)
   - Cliente (Nombre exacto de la empresa, ej. Swiss Medical)
   - Fecha límite de presentación (Extraer del documento)

1. **ANÁLISIS DEL PROYECTO**
   1.1. **Entendimiento del problema**
    NOTA: Redactalo de manera extensa, específica y altamente contextualizado. No resumas: explica en detalle la situación actual, el origen del problema, limitaciones tecnológicas/operativas, impactos institucionales, riesgos, brechas frente a mejores prácticas, desafíos de interoperabilidad, gestión del cambio y consecuencias de mantener el estado actual. Tu redacción debe ser tan detallada como si conocieras el sistema actual, su tecnología, los procesos institucionales y el contexto sectorial. Debe sonar como un análisis experto, no genérico.
      - Objetivo general
      NOTA: Redacta un Objetivo General extenso, concreto y estratégico. Evita frases genéricas. El objetivo debe describir con precisión el propósito institucional del proyecto, el problema estructural que busca resolver, el alcance real (funcional, tecnológico, operativo, organizacional), la modernización esperada, las capacidades técnicas y regulatorias imprescindibles, y cómo la iniciativa se alinea con la misión, los objetivos estratégicos y las necesidades sectoriales de la institución. Redactalo con el nivel de detalle propio de un anteproyecto público o corporativo, incluyendo contexto, intención, impacto esperado y lineamientos estratégicos.
      - Objetivos especificos
      NOTA: Redacta Objetivos Específicos completos, técnicos y detallados. Evita generalidades. Cada objetivo debe describir una acción concreta, un alcance claro y un resultado verificable. Incluye actividades como levantamiento y análisis de procesos, identificación de brechas, documentación exhaustiva de requerimientos funcionales y no funcionales, análisis de factibilidad técnica/económica/regulatoria, diseño técnico y modelamiento, elaboración de documentos para licitación, definición de estándares de calidad, integración, seguridad, cumplimiento normativo y recomendaciones estratégicas. Los objetivos deben estar orientados a entregables reales, medibles y alineados a la misión institucional. Redáctalos como los objetivos específicos de un anteproyecto público o corporativo.
   1.2. **Análisis de requerimientos**
      - Requerimientos funcionales
      - Requerimientos técnicos
   1.3. **Análisis de riesgos en el proyecto**


2. **PROPUESTA DE SOLUCIÓN**
   2.1.**Detalle de solución técnica**
      - Descubrimiento y Alcance (Definición del Negocio)
      - Levantamiento y Detalle (Captura Integral)
      - Análisis y Diseño Preliminar (Diseño del Anteproyecto)
      - Enfoque de levantamiento
   2.2 **Etapas del proyecto (Fases)**
      - Cronograma Resumido de Fases con Hitos (10 Meses)
      - Gestión de riesgos, supuestos y mitigaciones
   2.3. **Definición de entregables**
      En una tabla con : Entregable, descripción, Criterios de aceptación, responsable, fecha de entrega
   
3. **DESCRIPCIÓN DEL EQUIPO DE TRABAJO**
   - Nombramiento de un Coordinador Líder  - Proyecto 
   - Equipo de trabajo propuesto
   - Plan de onboarding y transferencia
   - Mecanismos de comunicación y seguimiento

4- **COMPETENCIAS DEL PROYECTO**

INSTRUCCIONES FINALES:
- Usa párrafos claros.
- No uses JSON.
- Si el documento menciona una fecha límite (ej. 17 de Octubre), ES IMPERATIVO que la pongas en la portada.


NOTA: 
PREGUNTAS QUE SI NO RESPONDE EL RFP SE VAN A TENER QUE CONSULTAR CON EL CLIENTE
- El cliente ya cuenta con licencia para una plataformas o se debe incluir? Si se habla de tema de dashboard o algo relacionado?
- Es necesario que sea en premis o en la nube? Especificar el partner donde se debe
desarrollar esta solución 
- Se menciona la creación de conjunto de APIs?
- Se requiere alguna plataforma de gestión de APIs?
- Se tiene una estimación del número de consultas o transacciones concurrentes que se
esperen a hora pico? (Esta pregunta va a asociada más que todo a la definición una arquitectura, para que cuando llegue el momento de bosquejar algo se tenga esta variable de concurrencia en el radar.)
- El cliente su entorno de trabajo propio o trabajaríamos en nuestros ambientes excepto producción en donde si se colocaría en la infraestructura del cliente
- En caso de migración, que metodología se implementaría para una migración, cuántos organismo serían, en qué formato...
- En cuanto al equipo, existe un nombre de rol de trabajo específico? Se puede presentar personal de Tivit fuera del país?
- Se estima frecuencia o cantidad de reuniones presenciales?
- Quien es responsable de la ejecución del Ethical Hacking?
- Creamos el UX/UI o ya el cliente lo tiene y nos lo va compartir durante el proyecto?
- Existe alguna herramienta de gestión para el desarrollo de software? (Ejemplo, si el cliente quiere que trabaje en Jira, quien va a pagar esa licencia Jira? Tivit no tiene licenciamiento de Jira para regalar, debería costearse y adquirirse dependiendo del cliente)
- Proceso de aprobación: quien son los que tienen potestad de tomar alguna decisión por parte del cliente?
ESTRUCTURA EN CASO DE FALTE INFORMACIÓN:
PREGUNTAS SUGERIDAS YA QUE NO HABÍA INFORMACIÓN EN EL RFP:
1. Pregunta 1
2. Pregunta 2
3. Pregunta 3
"""

        return prompt

