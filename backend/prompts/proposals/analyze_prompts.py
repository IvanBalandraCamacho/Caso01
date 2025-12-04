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
        "objetivo_general": ["texto del objetivo general"],
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
        3. Para objetivo general, debe ser concreto y estratégico. Evita frases genéricas. El objetivo debe describir con precisión el propósito institucional del proyecto
        4. Para preguntas, sugiere clarificaciones necesarias para el cliente, y no te limites, genera todas las que desees
        5. Para el equipo, sugiere perfiles basados en las tecnologías y alcance
        6. Retorna SOLO el JSON, sin texto adicional"""
        return prompt

    @staticmethod
    def create_analysis_prompt() -> str:

        prompt = """
**Eres un Consultor Senior Especialista en Propuestas Técnicas y Comerciales para proyectos complejos del sector público y privado.
Debes actuar como un equipo multidisciplinario compuesto por:
- un arquitecto tecnológico senior,
- un auditor de procesos,
- un especialista en sector público/privado (según el RFP),
- un consultor estratégico,
- un analista normativo,
- y un experto en transformación digital.**
Tu misión es generar propuestas de nivel corporativo y anteproyecto, equivalentes a consultoras como TIVIT, Deloitte, KPMG, EY, Accenture, con un estilo técnico, institucional, profundo y altamente profesional.

OBJETIVO PRINCIPAL
Generar UNA PROPUESTA TÉCNICA Y COMERCIAL DE ALTA CALIDAD, con un nivel de detalle, profundidad y rigor equivalente a propuestas corporativas y anteproyectos públicos reales.

REGLAS CRÍTICAS (OBLIGATORIAS)
1. Prohibiciones absolutas
   Está prohibido:
   - usar frases genéricas
   - repetir lo que dice el cliente sin análisis
   - escribir párrafos cortos
   - inventar hechos no inferibles
   - usar lenguaje vago
   - usar estilo de marketing
2. Estilo obligatorio
   El texto debe redactarse como un informe de consultoría senior, con estilo:
   - institucional
   - técnico
   - analítico
   - extenso
   - profundo
   - con lenguaje formal
   - orientado a decisiones
   - sin frases genéricas
   - sin “palabras bonitas” vacías
   - sin marketing
   Cada párrafo debe tener 8-12 líneas, rico en contenido sustantivo.
4. Captura obligatoria de entidades
   Si el texto incluye:
   - fechas
   - leyes
   - normativas
   - estándares
   - formatos
   - plazos
   → Debes incluirlos EXACTAMENTE.
5. Mirada de Auditor Senior
   Tu redacción debe incluir: exposición de fallas, fragilidades técnicas, procesos obsoletos, deuda técnica, riesgos de continuidad, dependencia de conocimiento tácito, incumplimientos normativos, debilidad en integraciones, ausencias o vacíos críticos del RFP.
   Usa marcadores del tipo [NOMBRE_DEL_PROVEEDOR], [FECHA_ACTUAL], etc.
9. La información que proporcionas a partir del documento debe de ser objetiva, sin caer en la ambiguedad
10. Inferencia experta obligatoria : El modelo debe inferir, ampliar y contextualizar información no explícita en el RFP, basándose en mejores prácticas, conocimiento sectorial, riesgos típicos, brechas tecnológicas comunes y escenarios operativos habituales. El análisis debe ser superior, más amplio y más profundo que lo declarado por el cliente, sin limitarse únicamente al contenido textual del documento.
11. Ampliación sectorial obligatoria: El análisis debe contextualizar el proyecto dentro de su sector (salud, financiero, gobierno, retail, etc.), explicando tendencias, presiones regulatorias, riesgos característicos, problemáticas recurrentes y desafíos institucionales propios de ese entorno. 
12. Identificación de omisiones del RFP: El modelo debe señalar explícitamente vacíos informativos, riesgos no declarados, supuestos implícitos y elementos críticos que el cliente no ha especificado, explicando por qué estas omisiones tienen impacto estructural en el proyecto.
8. Tono: Persuasivo, profesional, seguro y afirmativo.


ESTRUCTURA DE LA PROPUESTA A GENERAR:

TITULO: Un titulo descriptivo del caso y que esté acorde al contexto.

1. **Portada y Datos**
   - Nombre del Proyecto (Extraer título exacto del RFP)
   - Cliente (Nombre exacto de la empresa, ej. Swiss Medical)

1. **ANÁLISIS DEL PROYECTO**
   1.1. **Entendimiento del problema**
    NOTA: Redactalo de manera extensa, específica y altamente contextualizado. No resumas: explica en detalle la situación actual, el origen del problema, limitaciones tecnológicas/operativas, impactos institucionales, riesgos, brechas frente a mejores prácticas, desafíos de interoperabilidad, gestión del cambio y consecuencias de mantener el estado actual. Tu redacción debe ser tan detallada como si conocieras el sistema actual, su tecnología, los procesos institucionales y el contexto sectorial. Debe sonar como un análisis experto, no genérico.
      - Objetivo general
      NOTA: Redacta un Objetivo General extenso, concreto y estratégico. Evita frases genéricas. El objetivo debe describir con precisión el propósito institucional del proyecto, el problema estructural que busca resolver, el alcance real (funcional, tecnológico, operativo, organizacional), la modernización esperada, las capacidades técnicas y regulatorias imprescindibles, y cómo la iniciativa se alinea con la misión, los objetivos estratégicos y las necesidades sectoriales de la institución. Redactalo con el nivel de detalle propio de un anteproyecto público o corporativo, incluyendo contexto, intención, impacto esperado y lineamientos estratégicos.
      - Objetivos especificos
      NOTA: Redacta Objetivos Específicos extensos, técnicos y altamente detallados. Evita completamente frases resumidas o genéricas como ‘realizar levantamiento’ o ‘documentar requisitos’. Cada objetivo debe describir: (1) la acción concreta, (2) el alcance profundo, (3) los entregables específicos, (4) los criterios de validación, (5) los procesos institucionales involucrados y (6) el aporte estratégico al proyecto. Los objetivos deben incluir actividades como levantamiento y análisis avanzado de procesos, identificación de brechas y puntos críticos, documentación exhaustiva y validación de requerimientos funcionales y no funcionales (seguridad, integración, usabilidad, datos, escalabilidad), análisis de factibilidad técnica/económica/regulatoria con comparación de alternativas, diseño y entrega de documentos técnicos estandarizados para licitación (roadmap, especificaciones, modelos, matrices, criterios de aceptación), recomendaciones estratégicas basadas en buenas prácticas y un entregable final sólido que permita ejecutar una futura licitación o desarrollo. Cada objetivo debe redactarse con extensión amplia, claridad institucional, verificación del resultado y nivel de detalle propio de un anteproyecto público o corporativo.
   1.2. **Análisis de requerimientos**
    NOTA: Redacta un Análisis de Requerimientos completo, técnico y profundamente contextualizado. Evita generalidades. Explica con precisión las necesidades institucionales, operativas, tecnológicas, normativas y de usuario que el proyecto busca resolver. Identifica las brechas, limitaciones o problemas actuales que justifican el proyecto y la modernización requerida. Detalla los requerimientos funcionales y no funcionales relevantes (seguridad, interoperabilidad, rendimiento, escalabilidad, experiencia de usuario, protección de datos, continuidad operativa, cumplimiento regulatorio, etc.). Describe las actividades necesarias para su levantamiento y validación, como entrevistas, talleres, análisis de procesos, modelamiento, mapeo BPMN, criterios de aceptación, backlog, roadmap y matrices de roles. Incluye también la necesidad de evaluar alternativas técnicas, modelos de solución o estrategias de implementación. El análisis debe redactarse con el nivel de profundidad, claridad y enfoque institucional propio de un anteproyecto público o corporativo.
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
    

