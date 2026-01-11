# Prompt para Generación de Servidor MCP: Buscador de Talento Semántico

**Rol:** Eres un Ingeniero de Software Senior experto en Python, Protocolo MCP (Model Context Protocol) y Bases de Datos Vectoriales (RAG).

**Objetivo:** Crear un servidor MCP completo y funcional (`server.py`) que permita a una IA buscar candidatos idóneos dentro de una base de datos de certificaciones (originalmente un CSV).

**Stack Tecnológico:**
- `mcp` (Librería oficial, usar `FastMCP`)
- `pandas` (Para manipulación de datos)
- `lancedb` (Base de datos vectorial local)
- `sentence-transformers` (Para embeddings)

---

## 1. Contexto de los Datos
El archivo fuente se llama `Capital Intelectual.csv`. Está en **Portugués**, pero las consultas se harán en **Español**.
El CSV tiene una estructura específica con encabezados que incluyen corchetes.

**Muestra de columnas y datos:**
- `Certificação`: "ZSCALER INTERNET ACCESS (ZIA)..." (Esta es la habilidad principal)
- `Instituição`: "ZSCALER"
- `Status`: "Verificado" o "Reprovado" (**CRÍTICO**)
- `[Colaborador] Nome`: "JUAN PEREZ"
- `[Colaborador] Cargo`: "ANALISTA SENIOR"
- `[Colaborador] País`: "Brasil" / "Colombia" / "Chile"
- `Data de emissão`: "2025-03-01" (Formato YYYY-MM-DD o similar)

## 2. Requerimientos Funcionales (Lógica de Negocio)

1.  **Filtro de Seguridad:** Debes filtrar el DataFrame al inicio. **SOLO** procesar filas donde `Status == 'Verificado'`. Ignorar "Reprovado" o vacíos.
2.  **Modelo Multilingüe:** Dado que los datos están en Portugués y las preguntas serán en Español, DEBES usar el modelo de embeddings: `paraphrase-multilingual-MiniLM-L12-v2`.
3.  **Persistencia:** Utiliza `lancedb` localmente para guardar los vectores. Si la tabla ya existe, debe poder abrirla sin re-procesar todo (o tener un modo de re-ingesta controlada).
4.  **Columnas Sucias:** El código debe manejar los nombres de columnas exactos del CSV (ej: `[Colaborador] Nome`).

## 3. Especificación de la Herramienta (Tool)

Define una herramienta llamada `buscar_talento`.
- **Argumentos:** `consulta` (string).
- **Comportamiento:**
    - Recibe una intención en lenguaje natural (ej: "Busco experto en seguridad cloud en Colombia").
    - Convierte la consulta a vector usando el modelo multilingüe.
    - Busca en LanceDB los 5-10 vecinos más cercanos.
    - Devuelve un JSON string con los candidatos encontrados (Nombre, Cargo, Certificación, País).

## 4. Instrucciones de Salida

Por favor, genera dos archivos:

### A. `requirements.txt`
Incluye `mcp`, `pandas`, `lancedb`, `sentence-transformers`, `tantivy` y `torch`.

### B. `server.py`
El código completo en Python.
- Usa `FastMCP`.
- Incluye manejo de errores (try/except) al cargar el CSV.
- **Importante:** Al crear el texto para vectorizar (el "contexto"), concatena: Cargo + Certificación + Institución + País.
- Asegúrate de limpiar los valores `NaN` con `fillna("")` antes de procesar.

---

**Nota para el desarrollador (Claude):** El usuario final ejecutará esto en un entorno local o VM, así que optimiza para que la carga inicial se haga una sola vez al arrancar el script.