# GEMINI_TASK_MASTERPLAN.md

## 🤖 Rol
Actúa como un **Arquitecto de Software Senior y Lead Developer** especializado en Python (FastAPI/SQLModel) y React (Next.js/TypeScript). Tu objetivo es ejecutar una refactorización mayor y una implementación de nuevas funcionalidades críticas en el proyecto `Caso01-dev`.

## 📂 Contexto del Proyecto
El sistema es un generador de propuestas técnicas basado en IA.
- **Backend:** FastAPI, SQLModel, Celery, LangChain/LLMs.
- **Frontend:** Next.js 14 (App Router), TailwindCSS, ShadcnUI.
- **Estado Actual:** Funcional pero básico. Necesitamos transformarlo en una plataforma estratégica con control de versiones y dashboards analíticos.

---

## 🚀 Hoja de Ruta de Implementación (Prioridad Alta)

Ejecuta estas tareas siguiendo estrictamente el orden de fases para mantener la integridad de la base de datos y la estabilidad del frontend.

### FASE 1: Cimientos de Datos y Dashboard (La "Landing")
*Objetivo: Preparar la BD para los nuevos KPIs y visualizar la nueva tabla estratégica.*

#### 1.1 Backend: Migración de Esquema (`backend/models/schemas.py`)
Modificar el modelo `Workspace` (o crear un modelo `Project` asociado) para incluir los siguientes campos estratégicos:
- `country` (str): País de la operación.
- `client_company` (str): Empresa cliente.
- `operation_name` (str): Nombre de la operación.
- `tvt` (float): Total Contract Value (Crítico).
- `tech_stack` (JSON/List): Lista de tecnologías involucradas.
- `opportunity_type` (Enum): RFP, RFI, Intención de Compra.
- `estimated_price` (float): Precio estimado.
- `estimated_time` (str): Duración del proyecto.
- `resource_count` (int): Cantidad de recursos/partners.
- `category` (str): Categoría de servicio.
- `objective` (Text): Objetivo principal.
- `created_at` (DateTime): Fecha de creación.

**Acción requerida:** Generar script de migración Alembic.

#### 1.2 Frontend: Rediseño del Dashboard (`front-v2/app/page.tsx`)
Reemplazar o aumentar la vista principal para incluir una **Tabla de Datos Maestra**.
- **Columnas:** Deben coincidir con los campos creados en 1.1.
- **UI:** Usar componentes de `Table` (Shadcn), con paginación y filtros por "Estado" y "País".
- **Lógica:** Conectar al endpoint `GET /workspaces` (asegurando que devuelva estos nuevos campos).

---

### FASE 2: Motor de Propuestas Inteligente
*Objetivo: Automatización y Feedback en Tiempo Real.*

#### 2.1 Backend: Cálculo de Completitud (`proposals_service.py`)
Implementar lógica para evaluar la salud del documento:
- Crear función `calculate_proposal_health(proposal_id) -> dict`:
    - Retorna: `{ "percentage": int, "missing_sections": List[str] }`.
    - Lógica: Compara campos requeridos vs. campos `null` o vacíos en la BD.

#### 2.2 Frontend: Barra de Progreso y Edición (`ProposalModal.tsx` / `Workspace`)
- **Visual:** Añadir una barra de progreso circular o lineal en la cabecera de la propuesta.
- **Feedback:** Si el % < 100, mostrar alerta: "Falta completar: [Sección X, Sección Y]".
- **Autogeneración:** Al llegar al 100% (o al guardar), disparar automáticamente la creación del entorno de trabajo (Workspace) si no existe.

---

### FASE 3: Flujo RFP y Escenarios (Workplace)
*Objetivo: UX Avanzada y Versionamiento.*

#### 3.1 UX: Nuevo Flujo de Carga RFP (`quick-analysis/page.tsx`)
Cambiar la experiencia de usuario actual:
1.  **Paso 1:** Usuario sube archivo (Drag & Drop).
2.  **Paso 2 (NUEVO):** Interrupción visual. Mostrar un menú tipo "Grid" con iconos grandes (Estilo imagen de referencia) para seleccionar el tipo de análisis:
    - *Opción A:* Análisis Rápido.
    - *Opción B:* Generación Completa.
    - *Opción C:* Extracción de Requisitos.
3.  **Paso 3:** Ejecutar la acción seleccionada.

#### 3.2 Backend: Versionamiento de Escenarios (`models.py`)
Habilitar "Escenarios" para una misma oportunidad.
- Relación `One-to-Many`: Un `Workspace` tiene muchas `Proposals` (Versiones).
- Permitir al usuario "Clonar" una propuesta para probar un escenario diferente (ej. cambiar Tech Stack o Precio) y compararlas en el Dashboard.

---

## 🛠 Directrices Técnicas (Definition of Done)

1.  **Tipado Estricto:** Todo el código Python debe usar Type Hints (`def funcion(a: int) -> str:`). Todo React debe usar Interfaces TypeScript.
2.  **Manejo de Errores:** Si `File Fetcher` falla o un campo es nulo, la UI no debe romperse (usar Optional Chaining `?.` y Error Boundaries).
3.  **Validación:** Usar Pydantic para validar los nuevos campos (TVT, Precio) asegurando que sean numéricos donde corresponda.
4.  **Estilo:** Mantener consistencia con TailwindCSS y el sistema de diseño actual.

---

## 📝 Instrucción para el Modelo

Gemini, por favor inicia analizando el archivo `backend/models/schemas.py` y `front-v2/app/page.tsx`. Propón primero el código para la **FASE 1 (Base de datos y Tabla Dashboard)**, ya que es el prerrequisito para todo lo demás.