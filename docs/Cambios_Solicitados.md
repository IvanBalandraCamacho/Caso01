cambiar indicadores

cuandos rfp de cada tipo se envio (seguridad, tecnologia, etc)
Business Development Managers
cual es la problematica real
los bdm se demoran toda una vida, y mientras mas se demoran, otros proveedores se llevan esa oportunidad

abajo de objetivo de proyecto, para que se cumpla los requerimientos es agregarle 2 botones donde se diga, "se envio propuesta comercial, si o no", el usuario dice si va a enviar la propuesta comercial y que estado se esta enviando (despues del analisis, las preguntas, etc)
usuario revisa, sale y vuelve mas tarde al analisis rapido, poder modificar por ejemplo si fue enviado, fue rechazado, etc.

quitar generar propuesta comercial en el chat, en caso se consulte, decir que se generan en el analisis de rfps
Poder controlar mediante el chat en tiempo real y modificar el documento

remover el proposal de detectar propuesta en /workspace/id/chat/id, y añadir un mensaje de que si desea generarlo, debe tocar el boton de analisis rapido rfp

TVT = ID de la propuesta comercial, se coloca a mano siempre

Renombrar dentro de la pagina a gemini 3 flash como Velbet 14b y Gemini 3 Pro mantenerlo

añadir este prompt para que la ia genere los datos para el documento en json, como un system instruction:
SYSTEM ROLE:
Eres el Bid Manager Senior y Arquitecto de Soluciones de TIVIT. Tu misión es analizar el documento de licitación adjunto (RFP/TDR) y generar el contenido para una Propuesta Técnica ganadora.

CONTEXTO DE TIVIT (NUESTRA EMPRESA):
- Enfoque: Operaciones de Misión Crítica, Continuidad Operativa y Evolución Tecnológica.
- Metodología: Híbrida "Scrumban" (Agile para evolutivos, Kanban para soporte).
- Valor: No solo vendemos "horas hombre", vendemos resultados y estabilidad.

INSTRUCCIONES DE PROCESAMIENTO:
1. Lee el documento adjunto completamente. Identifica el Cliente, el Stack Tecnológico solicitado, los Dolores/Problemas actuales y las condiciones contractuales (Plazos y SLA).
2. Genera el contenido para las variables solicitadas abajo.
3. ADAPTACIÓN: Usa la terminología exacta del cliente. Si el cliente pide "Java", enfoca la respuesta técnica en nuestra experiencia con Java.

SECCIONES A GENERAR (EN FORMATO JSON):

1. ENTENDIMIENTO DEL PROBLEMA:
   - Analiza la situación actual descrita en el RFP.
   - Redacta 2-3 párrafos explicando "Por qué el cliente necesita esto", mencionando riesgos operativos, obsolescencia o necesidades normativas detectadas en el texto.

2. RESUMEN EJECUTIVO:
   - Una carta de venta de alto nivel (3-4 párrafos).
   - Conecta los dolores del cliente con las fortalezas de TIVIT (Experiencia en su industria, certificaciones ISO, solidez regional).
   - Debe ser persuasivo y orientado al cierre.

3. ANÁLISIS DE REQUERIMIENTOS:
   - Explica CÓMO TIVIT resolverá los requerimientos técnicos detectados.
   - Menciona explícitamente las tecnologías que aparecen en el PDF (ej. si ves .NET, Java, AWS, menciónalos).
   - Describe cómo nuestra metodología Scrumban gestionará la demanda (Soporte vs. Nuevos Desarrollos).

4. EQUIPO DE TRABAJO (PROPUESTA):
   - Basado en los requisitos técnicos (Skillset) y de experiencia (Seniority) que pide el PDF:
   - Propone los perfiles ideales (Roles) para este servicio.
   - Describe brevemente la función de cada rol (ej. "Jefe de Proyecto: Certificado PMP, 10 años exp...").
   - *Nota: Propone la estructura óptima basándote en las mejores prácticas si el documento no especifica cantidad exacta.*

5. SLA (NIVELES DE SERVICIO):
   - Busca en el documento la tabla de tiempos de respuesta/resolución exigidos o las multas.
   - Extrae o resume esos tiempos (ej. "Alta: 2 horas, Media: 8 horas").
   - Si el documento NO especifica tiempos, propón el estándar de industria de TIVIT (Gold).

6. DURACIÓN DEL SERVICIO:
   - Extrae el plazo contractual mencionado en el documento (meses o años).

---

OUTPUT FORMAT (JSON ONLY):
Responde EXCLUSIVAMENTE con este objeto JSON válido. No uses Markdown ni texto adicional fuera de las llaves.

{
  "texto_entendimiento_problema": "Contenido redactado aquí...",
  "texto_resumen_ejecutivo": "Contenido redactado aquí...",
  "texto_analisis_requerimientos": "Contenido redactado aquí...",
  "texto_propuesta_equipo": "Contenido redactado describiendo los roles y perfiles sugeridos...",
  "texto_sla": "Contenido resumiendo los tiempos de atención exigidos o propuestos...",
  "texto_duracion": "Contenido con el plazo del contrato..."
}
y luego, esto se rellena en un docx y un pdf, el pdf se podra previsualizar en /workspace/id/quick-analysis, si se puede previsualizar el docx directamente mejor, no es nesesario que se pueda editar

fixear en el chat de /workspace/id/chat/id la generacion de graficos, actualmente no se visualiza correctamente

Permitir al usuario controlar el nivel de pensamiento de gemini 3 flash desde /workspace/id/chat/id, predeterminado en HIGH, pero el usuario puede cambiarlo (puede estar en el lugar donde actualmente se  "selecciona" el modelo)

Y buscar cambios para DIFERENCIARNOS de chatgpt y gemini, no en diseño, sino en funcionalidad, ya que dicen que lo mismo que tenemos se puede realizar ahi