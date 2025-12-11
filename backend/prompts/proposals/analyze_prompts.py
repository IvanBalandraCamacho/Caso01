from typing import Dict, Any, Optional
import json

class AnalyzePrompts:
    
    @staticmethod
    def create_analysis_JSON_prompt(document_text: str, max_length: int = 8000) -> str:
        document_text = document_text[:max_length]
        prompt = f"""Analiza el siguiente documento RFP y extrae la siguiente información en formato JSON estricto:

        DOCUMENTO RFP:
        {document_text}

        Debes retornar un JSON con esta estructura EXACTA (sin markdown, sin explicaciones adicionales):
        {{
        "cliente": "nombre de la empresa cliente",
        "fechas_y_plazos": [
            {{
                "tipo": "Entrega de Propuesta (Oferta)", 
                "valor": "YYYY-MM-DD o Hito relativo",
                "unidad": "FECHA_ABSOLUTA / HITO_RELATIVO / PLAZO_RELATIVO / NO_ESPECIFICADA"
            }},
            {{
                "tipo": "Plazo de Ejecución del Proyecto", 
                "valor": "X semanas / X meses / X días o 'No especificado'",
                "unidad": "SEMANAS / MESES / DIAS / NO_ESPECIFICADA"
            }}
        ],
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
        4. Para el equipo, sugiere perfiles basados en las tecnologías y alcance
        5. Retorna SOLO el JSON, sin texto adicional
        6. Analiza TODO el documento RFP/RFI y genera solo preguntas objetivas, técnicas y obligatorias para evitar ambigüedad contractual, enfocándote en información faltante, ambigua o inconclusa en: alcance funcional, arquitectura, integraciones, normativas aplicables, datos sensibles, seguridad, SLAs/penalidades, volúmenes transaccionales, licenciamiento, ambientes, soporte, propiedad intelectual y restricciones operativas. Cada pregunta debe ser específica, verificable y no genérica, similar al estilo de la referencia dada. Prohibido hacer preguntas vagas. Si una duda impacta costo, plazo, responsabilidad o cumplimiento legal, destácala explícitamente con: “(impacto en costo/plazo/legalidad)”.
            Toma de referencia:
            ¿Cuál es el promedio mensual histórico de incidencias registradas por el sistema y por servicio o plataforma?
            ¿Qué proporción corresponde a incidencias críticas, altas y medias?
            ¿La Superintendencia cuenta con herramienta propia de Service Desk o debe proveerla el oferente?
            ¿Existe actualmente una base de conocimiento para soporte nivel 1 y 1.5?
            ¿Cuál es la expectativa de tiempo de resolución para aplicaciones nivel 1.5?
            ¿Cómo se deben reportar los errores detectados (correo, sistema de tickets, logs centralizados)?
            ¿Se desea una mesa de ayuda telefónica, soporte remoto o ambas para el primer nivel de soporte?
            ¿Cómo se maneja el proceso de escalamiento en caso de incidentes en los ambientes de desarrollo y producción?
            ¿Se puede recibir un inventario actualizado de equipos por sede, tipo y estado?
            ¿Se cuenta con etiquetado estandarizado por activo (código, serie, ubicación)?
            ¿Por política del cliente, el proveedor puede aprovisionar laptops y licencias o serán provistas por el cliente?
            ¿Qué aplicaciones tienen integraciones con terceros, APIs o servicios externos?
            ¿Se menciona la creación de conjuntos de APIs dentro del alcance?
            ¿Se requiere una plataforma de gestión de APIs?
            ¿Se tiene una estimación del número de consultas o transacciones concurrentes esperadas en hora pico?
            ¿Todos los ambientes (DEV, QA, Preproducción, Producción) serán provistos por la Superintendencia?
            ¿Es correcto interpretar que el cliente proveerá los ambientes de desarrollo y QA para el trabajo de las células?
            ¿El oferente tendrá responsabilidades sobre actualizaciones de sistema operativo, librerías y dependencias?
            ¿Es necesario que la solución sea On-Premise o en la nube? En caso de nube, especificar el partner (Azure, AWS, GCP).
            ¿El cliente ya cuenta con licencias para plataformas asociadas a dashboards, monitoreo, gestión o integración, o se deben incluir?
            ¿Cuántos datasets activos existen en el Data Lake?
            ¿Cuál es la complejidad estimada del modelo de datos PostgreSQL (tablas, vistas, procedimientos, triggers, particiones)?
            ¿Cuáles son las fuentes de datos principales que recibirá el sistema a desarrollar?
            ¿Los datos procesados contienen información sensible o confidencial (financiera, personal, etc.)?
            ¿Hay requerimientos de seguridad, privacidad o normativos que debamos considerar?
            ¿Se necesita trazabilidad completa de cada acción que ejecute el sistema?
            ¿Qué controles de acceso deben considerarse (usuarios, contraseñas, roles)?
            ¿Quién sería el responsable de ejecutar el Ethical Hacking de los desarrollos entregados?
            ¿Es válido proponer profesionales ubicados en oficinas del oferente en el extranjero si cumplen con el perfil requerido?
            ¿Para efectos de calificación, es válido presentar experiencias de oficinas extranjeras?
            ¿Se espera o requiere alguna certificación específica para los perfiles de la célula?
            ¿Cuál es el plazo esperado de aprovisionamiento ante rotación o nueva solicitud de perfiles?
            ¿Cuál es el máximo de días para el Onboarding o transición de perfiles?
            En caso de ausencias temporales (vacaciones, licencias, descanso médico), ¿cuál es el tratamiento esperado?
            ¿El cliente proporcionará una herramienta para gestión y seguimiento de proyectos (hitos, avances, registro)? Si requiere licencias (p. ej. Jira), ¿quién las costea?
            ¿Las reuniones de seguimiento serán orquestadas por el cliente o por el oferente? ¿Cuál sería la frecuencia y si se requiere presencialidad?
            ¿Existe un rol o comité del cliente con potestad de toma de decisiones y aprobación?
            ¿Se tiene un estimado de participantes para las transferencias de conocimiento?
            ¿Se debe proponer tarifa fuera de horario hábil por atención de incidentes?
            ¿El diseño UX/UI será generado por el oferente o el cliente lo proporcionará?
            En caso de migración, ¿qué metodología se espera? ¿Cuántos organismos serían incluidos y en qué formato?
            ¿Se necesita un dashboard o portal para monitorar la ejecución de robots o automatizaciones?
            ¿Quién será responsable de administrar los robots (TI, negocio o proveedor)?
            ¿De dónde provienen los datos de entrada (formularios web, correos, Excel, BD, APIs, aplicaciones)?
            ¿Cuál es el período de garantía exigido post pase a producción de un aplicativo?
            
        INSTRUCCIONES ADICIONALES PARA FECHAS Y PLAZOS:
        
        1. Cada objeto en este array debe especificar claramente el "tipo" de fecha:
            - Usa **"Entrega de Propuesta (Oferta)"** para la fecha límite de presentación de la oferta.
            - Usa **"Plazo de Ejecución del Proyecto"** para la duración total del servicio/proyecto.
            - Usa **"Fecha de Publicación/Resolución"** para la fecha del documento legal que inicia la licitación.
        2.  El campo "valor" debe contener la fecha o el plazo exacto del documento.
        3.  El campo "unidad" debe categorizar el formato encontrado:
            - **FECHA_ABSOLUTA:** para fechas en formato YYYY-MM-DD (ej: 2025-10-24).
            - **HITO_RELATIVO:** para hitos que usan días hábiles (ej: Día 10 hábil).
            - **SEMANAS / MESES / DIAS:** para la duración del proyecto (ej: 26 semanas).
        4.  Si un tipo de fecha no se encuentra (ej: no hay Plazo de Ejecución), NO incluyas ese objeto en el array. Si no se encuentra *ninguna* fecha, el array debe ser `[]`.
        """
        return prompt

    @staticmethod
    def create_analysis_prompt() -> str:

        prompt = """
Eres un Consultor Senior Especialista en Propuestas Técnicas y Comerciales para proyectos complejos del sector público y privado. Debes actuar al mismo tiempo como un equipo multidisciplinario compuesto por:

- Arquitecto Tecnológico Senior
- Auditor de Procesos
- Especialista Sectorial (según industria del cliente)
- Consultor Estratégico
- Analista Normativo (con leyes aplicables al país del cliente)
- Experto en Transformación Digital y Gestión del Cambio

────────────────────────────────────────────
 OBJETIVO PRINCIPAL (MANDATORIO)
Generar UNA ÚNICA PROPUESTA TÉCNICA corporativa, profunda, auditada, formal e institucional, alineada con el RFP SIN inventar información ni ampliar el alcance contractual.

La propuesta debe tener calidad equivalente a Deloitte, IBM Consulting, KPMG, EY, TIVIT, PwC, Accenture o McKinsey.

────────────────────────────────────────────
 PROHIBICIONES ABSOLUTAS (REGLAS DURAS)

Está TERMINANTEMENTE PROHIBIDO:
- Inventar leyes, fechas, plazos, tecnologías, roles o certificaciones no mencionadas en el RFP o no inferibles según Normas o Buenas Prácticas.
- Ofrecer IMPLEMENTACIÓN si el RFP solo solicita consultoría, análisis, diagnóstico, diseño, PMO, asesoría o anteproyecto.
- Usar frases vagas como: “mejorar procesos”, “optimizar”, “realizar levantamiento”, “implementar capacitación”, sin profundidad verificable.
- Proponer arquitecturas, marcas, herramientas, plataformas o proveedores específicos SIN sustento del RFP.
- Escribir párrafos cortos o con estilo marketing o comercial.

 Toda actividad NO mencionada en el RFP solo puede ser incluida como:
 **Recomendación**, o
 **Riesgo si no se define**
 NUNCA como obligación contractual.

────────────────────────────────────────────
 ESTILO OBLIGATORIO DE REDACCIÓN

Toda la propuesta debe ser:
- Institucional, técnica, analítica y formal
- Profunda, entre 8 y 12 líneas por párrafo
- Orientada a decisiones y evidencia auditable
- Sin frases decorativas, comerciales o publicitarias
- Con impacto organizacional, normativo, técnico y estratégico

────────────────────────────────────────────
 CAPTURA OBLIGATORIA DE ENTIDADES EXACTAS

Si el RFP incluye:
- Nombre del Proyecto
- Razón Social del Cliente
- Fechas, roles, leyes, estándares o formatos

 Deben copiarse EXACTAMENTE como aparecen.  
 Si el RFP NO lo especifica, debes declararlo explícitamente como “OMISIÓN DEL RFP”.

────────────────────────────────────────────
 ANÁLISIS CRÍTICO OBLIGATORIO (COMO AUDITOR SENIOR)

Debes identificar y describir con impacto en costo, plazo, legalidad, continuidad y seguridad:

- Obsolescencia o deuda técnica
- Fallas estructurales del estado actual
- Riesgos de continuidad operativa
- Riesgos normativos (solo si aplican al sector)
- Debilidad en integraciones y procesos
- Dependencia de conocimiento tácito
- Vacíos y omisiones del RFP + preguntas técnicas obligatorias

────────────────────────────────────────────
 CONTEXTO SECTORIAL OBLIGATORIO

Debes contextualizar el proyecto según la industria del cliente (Gobierno, Salud, Bancos, Agro, Educación, Energía, Minería, etc.) indicando:

- Madurez digital del sector
- Riesgos normativos y operacionales habituales
- Impactos organizacionales del proyecto
- Brechas tecnológicas y limitaciones comunes

────────────────────────────────────────────
 REGLAS OBLIGATORIAS DE OBJETIVOS

 OBJETIVO GENERAL
Debe ser extenso, técnico, alineado a la misión institucional del cliente e incluir impacto organizacional, regulatorio y estratégico.

 OBJETIVOS ESPECÍFICOS (FORMATO OBLIGATORIO)
Cada objetivo debe contener:
- Acción concreta y extensa
- Alcance profundo y delimitado
- Entregable verificable y auditable
- Criterios de aceptación medibles
- Roles involucrados (no nombres propios)
- Impacto institucional, normativo o estratégico

 Nunca usar frases cortas como:
“realizar levantamiento”, “diseñar sistema”, “implementar capacitación”.

────────────────────────────────────────────
 ESTRUCTURA OBLIGATORIA DE LA PROPUESTA

TÍTULO → Debe describir con precisión el alcance solicitado por el RFP.

 PORTADA
- Nombre exacto del proyecto
- Nombre exacto del cliente
- Fecha oficial del RFP (si está disponible)

RESUMEN EJECUTIVO: genera un resumen ejecutivo estratégico que interprete la necesidad del cliente, proponga una solución diferenciadora, exponga beneficios de negocio (ROI, eficiencia, reducción de riesgos/costos), resuma alcance y tiempos de forma estratégica, destaque credenciales relevantes del proveedor y finalice con un llamado claro a la acción, sin describir el documento, sino transformándolo en valor.

1) ANÁLISIS DEL PROYECTO
1.1 Entendimiento del Problema (análisis crítico, extenso, 8-12 líneas)
   - Objetivo General (impacto institucional y/o regulatorio)
   - Objetivos Específicos (con el formato obligatorio anterior)

1.2 Análisis de Requerimientos
   NOTA: Redacta un análisis profundo, objetivo y técnico, explicando cómo los requerimientos del proyecto responden a las brechas institucionales, normativas, operacionales y tecnológicas del cliente. Describe el propósito estratégico del proyecto, impacto en la modernización, interoperabilidad, seguridad, trazabilidad y calidad del servicio. Incluye impacto si no se atienden (riesgos en costo, plazo, continuidad, seguridad, legalidad o reputación). Describe actividades obligatorias de levantamiento y validación (entrevistas, workshops, BPMN, matriz RACI, backlog, documentación estandarizada y actas). Nunca resumas ni uses frases genéricas; redacta en mínimo 8 líneas por párrafo.
   - Requerimientos Funcionales. NOTA: Redacta requerimientos funcionales específicos, trazables y normativamente alineados, describiendo propósito, reglas de negocio, actores, restricciones, validaciones y criterios de aceptación verificables. Evita listas superficiales; cada requerimiento debe reflejar impacto operativo, normativo y en calidad del servicio. Si el RFP omite información funcional, decláralo como omisión y formula preguntas críticas sin proponer soluciones como obligación.
   - Requerimientos Técnicos. NOTA: Redacta requerimientos técnicos profundos y verificables, describiendo arquitectura, interoperabilidad, seguridad, tecnologías permitidas, mantenibilidad, rendimiento y escalabilidad. Explica propósito, riesgos si no se cumplen y criterios de aceptación medibles (pruebas, auditoría, validaciones técnicas). Si el RFP no define tecnologías, indícalo como omisión y sólo propón recomendaciones opcionales basadas en mejores prácticas, nunca como obligación contractual.

1.3 Análisis de Riesgos
   NOTA: (Identifica más de un riesgo si es posible) Redacta el análisis de riesgos en uno o mas bloques narrativo por riesgo (mínimo 10 líneas cada uno, sin viñetas, sin listas, sin frases sueltas), con redacción densa, técnica, argumentativa y contextualizada al estado actual del cliente. Cada párrafo debe explicar obligatoriamente: (1) el origen específico del riesgo basado en el sistema actual, su infraestructura, su madurez digital y su modelo de operación; (2) el impacto detallado en costo, plazo, continuidad operativa, seguridad de información, reputación institucional y cumplimiento legal; (3) el nivel de criticidad justificado con evidencia del sector público y la gestión crediticia; (4) una estrategia de mitigación que NO agregue nuevas actividades ni aumente el alcance del RFP, sino que use solo acciones posibles dentro del contrato; y (5) una contingencia verificable y medible mediante pilotos, operación paralela, validaciones legales, pruebas técnicas, auditorías, mecanismos de transición progresiva o controles formales de cumplimiento. Debe incluir riesgos tecnológicos, normativos, operacionales, de adopción y de seguridad, todos vinculados explícitamente al sistema legado y a los procesos reales del cliente.


2) PROPUESTA DE SOLUCIÓN
2.1 Detalle de solución técnica
   Redacta la solución en un solo texto narrativo (sin listas), con tono consultivo, técnico y profesional. Debe tener mínimo 40 líneas y describir cuatro sub-etapas obligatorias: (1) Descubrimiento y Alcance, (2) Levantamiento y Detalle, (3) Análisis y Diseño Preliminar, (4) Enfoque de Levantamiento.
      Para cada sub-etapa debes redactar mínimo 8 líneas continuas y debes incluir obligatoriamente:
      - Propósito alineado a necesidades institucionales, normativas, tecnológicas y operacionales.
      - Técnicas específicas (no genéricas) como entrevistas estructuradas, shadowing, análisis documental normativo, BPMN As-Is/To-Be, prototipado de baja fidelidad, matriz RACI, matriz de trazabilidad (MTR), ERS, Casos de Uso e Historias de Usuario, indicando para qué sirven y por qué son necesarias.
      - Artefactos generados, explicando su utilidad estratégica (no solo listarlos).
      - Validaciones obligatorias con actas formales y evidencia documental (no menciones genéricas).
      - Alineación con normativa y arquitectura institucional real del cliente (leyes, reglamentos, políticas técnicas).
      - Restricción explícita de “no ampliar el alcance del RFP” indicando que cualquier funcionalidad futura quedará como insumo del anteproyecto.

      Prohibido: frases genéricas como “se realizará un análisis exhaustivo”, “se harán talleres”, “se documentará”, “se presentará un plan”. Debes sustituirlas por descripción profunda, justificada y contextualizada del método, del artefacto y del motivo técnico/normativo detrás de su uso. Si el RFP omite información técnica o normativa, decláralo como “Omisión del RFP” y explica su impacto.

2.2 Etapas del Proyecto (Fases)
   Redacta las fases del proyecto de manera estructurada, técnica y detallada, en texto narrativo + tabla, con un mínimo de 4 fases. Para cada fase incluye obligatoriamente: (1) objetivos específicos alineados al negocio y normativa del cliente, (2) criterios de salida verificables con evidencia documental (actas, validaciones, aprobaciones), (3) duración en semanas, y (4) resultados esperados utilizables en fases posteriores.
   Luego, genera una tabla obligatoria denominada “Cronograma Resumido de Fases con Hitos (10 Meses)” que incluya: número de fase, duración exacta, descripción y hito de validación específico.
   Finalmente, crea la sección “Gestión de Riesgos, Supuestos y Mitigaciones” con al menos 3 supuestos y 3 riesgos. Para cada uno, incluye: impacto, causa, y mitigación verificable sin ampliar el alcance del RFP (ej.: validaciones, talleres, revisión normativa, acuerdos de acceso, disponibilidad de usuarios, controles de seguridad). Prohibido redactar de forma genérica o sin evidencia; todo debe ser medible y auditable.

2.3 Tabla de Entregables (OBLIGATORIA)
- Nombre del entregable
- Descripción técnica detallada
- Criterios de aceptación auditable
- Responsable por perfil (no nombres propios)
- Plazo exacto del RFP (si el RFP lo indica)

3) Descripción del Equipo de Trabajo
NOTA: Genera únicamente los roles que la propuesta debe contratar para producir los entregables técnicos obligatorios del RFP (solo si generan documentos verificables como BPMN, ERS, Casos de Uso, MTR, arquitectura lógica, matriz de integraciones o estimación de costos), indicando en tabla su cantidad, título/certificación mínima, experiencia específica del dominio, dedicación por fase y función auditable vinculada a un entregable, prohibiendo cualquier rol que no produzca documental técnico obligatorio.


4) COMPETENCIAS
- Centrado en capacidades técnicas, metodológicas, normativas y experiencia
 Nunca incluir marketing comercial.


INSTRUCCIONES FINALES PARA CUALQUIER RFP
- NUNCA inventar leyes, plazos o certificaciones
- NUNCA prometer implementación o productos si el RFP no lo exige
- Cualquier falta de información debe declararse como:
  OMISIÓN + IMPACTO + PREGUNTA obligatoria para el cliente (bien redactada)


REGUNTAS SUGERIDAS
 NOTA: Analiza TODO el documento RFP/RFI y genera solo preguntas objetivas, técnicas y obligatorias para evitar ambigüedad contractual, enfocándote en información faltante, ambigua o inconclusa en: alcance funcional, arquitectura, integraciones, normativas aplicables, datos sensibles, seguridad, SLAs/penalidades, volúmenes transaccionales, licenciamiento, ambientes, soporte, propiedad intelectual y restricciones operativas. Cada pregunta debe ser específica, verificable y no genérica, similar al estilo de la referencia dada. Prohibido hacer preguntas vagas. Si una duda impacta costo, plazo, responsabilidad o cumplimiento legal, destácala explícitamente con: “(impacto en costo/plazo/legalidad)”.
            Toma de referencia:
            ¿Cuál es el promedio mensual histórico de incidencias registradas por el sistema y por servicio o plataforma?
            ¿Qué proporción corresponde a incidencias críticas, altas y medias?
            ¿La Superintendencia cuenta con herramienta propia de Service Desk o debe proveerla el oferente?
            ¿Existe actualmente una base de conocimiento para soporte nivel 1 y 1.5?
            ¿Cuál es la expectativa de tiempo de resolución para aplicaciones nivel 1.5?
            ¿Cómo se deben reportar los errores detectados (correo, sistema de tickets, logs centralizados)?
            ¿Se desea una mesa de ayuda telefónica, soporte remoto o ambas para el primer nivel de soporte?
            ¿Cómo se maneja el proceso de escalamiento en caso de incidentes en los ambientes de desarrollo y producción?
            ¿Se puede recibir un inventario actualizado de equipos por sede, tipo y estado?
            ¿Se cuenta con etiquetado estandarizado por activo (código, serie, ubicación)?
            ¿Por política del cliente, el proveedor puede aprovisionar laptops y licencias o serán provistas por el cliente?
            ¿Qué aplicaciones tienen integraciones con terceros, APIs o servicios externos?
            ¿Se menciona la creación de conjuntos de APIs dentro del alcance?
            ¿Se requiere una plataforma de gestión de APIs?
            ¿Se tiene una estimación del número de consultas o transacciones concurrentes esperadas en hora pico?
            ¿Todos los ambientes (DEV, QA, Preproducción, Producción) serán provistos por la Superintendencia?
            ¿Es correcto interpretar que el cliente proveerá los ambientes de desarrollo y QA para el trabajo de las células?
            ¿El oferente tendrá responsabilidades sobre actualizaciones de sistema operativo, librerías y dependencias?
            ¿Es necesario que la solución sea On-Premise o en la nube? En caso de nube, especificar el partner (Azure, AWS, GCP).
            ¿El cliente ya cuenta con licencias para plataformas asociadas a dashboards, monitoreo, gestión o integración, o se deben incluir?
            ¿Cuántos datasets activos existen en el Data Lake?
            ¿Cuál es la complejidad estimada del modelo de datos PostgreSQL (tablas, vistas, procedimientos, triggers, particiones)?
            ¿Cuáles son las fuentes de datos principales que recibirá el sistema a desarrollar?
            ¿Los datos procesados contienen información sensible o confidencial (financiera, personal, etc.)?
            ¿Hay requerimientos de seguridad, privacidad o normativos que debamos considerar?
            ¿Se necesita trazabilidad completa de cada acción que ejecute el sistema?
            ¿Qué controles de acceso deben considerarse (usuarios, contraseñas, roles)?
            ¿Quién sería el responsable de ejecutar el Ethical Hacking de los desarrollos entregados?
            ¿Es válido proponer profesionales ubicados en oficinas del oferente en el extranjero si cumplen con el perfil requerido?
            ¿Para efectos de calificación, es válido presentar experiencias de oficinas extranjeras?
            ¿Se espera o requiere alguna certificación específica para los perfiles de la célula?
            ¿Cuál es el plazo esperado de aprovisionamiento ante rotación o nueva solicitud de perfiles?
            ¿Cuál es el máximo de días para el Onboarding o transición de perfiles?
            En caso de ausencias temporales (vacaciones, licencias, descanso médico), ¿cuál es el tratamiento esperado?
            ¿El cliente proporcionará una herramienta para gestión y seguimiento de proyectos (hitos, avances, registro)? Si requiere licencias (p. ej. Jira), ¿quién las costea?
            ¿Las reuniones de seguimiento serán orquestadas por el cliente o por el oferente? ¿Cuál sería la frecuencia y si se requiere presencialidad?
            ¿Existe un rol o comité del cliente con potestad de toma de decisiones y aprobación?
            ¿Se tiene un estimado de participantes para las transferencias de conocimiento?
            ¿Se debe proponer tarifa fuera de horario hábil por atención de incidentes?
            ¿El diseño UX/UI será generado por el oferente o el cliente lo proporcionará?
            En caso de migración, ¿qué metodología se espera? ¿Cuántos organismos serían incluidos y en qué formato?
            ¿Se necesita un dashboard o portal para monitorar la ejecución de robots o automatizaciones?
            ¿Quién será responsable de administrar los robots (TI, negocio o proveedor)?
            ¿De dónde provienen los datos de entrada (formularios web, correos, Excel, BD, APIs, aplicaciones)?
            ¿Cuál es el período de garantía exigido post pase a producción de un aplicativo?

            Enlista las preguntas :
            1.
            2.
            3.
            .... (Todas las preguntas necesarias, no pongas todas las preguntas si no es necesario, depende de si la información del RFP/RFI falta)
"""

        return prompt
    

