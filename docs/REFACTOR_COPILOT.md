# Tarea de Refactorización: Unificación de Arquitectura CopilotKit (Frontend -> Python Backend)

## Rol
Actúa como un Arquitecto de Software Senior experto en **Next.js**, **FastAPI** y la integración de **CopilotKit**.

## Contexto del Problema ("Split Brain")
Actualmente, el proyecto tiene una arquitectura desconectada donde la IA del frontend no se comunica con la lógica de negocio del backend:

1.  **Frontend (Actual):** El componente `<CopilotKit>` en `front-v2` está apuntando a un Route Handler local de Next.js (`/api/copilotkit`). Este handler usa `OpenAIAdapter` directamente, ignorando por completo el backend.
2.  **Backend (Actual):** Existe una implementación rica en `backend/api/routes/copilot.py` con acceso a RAG, base de datos y herramientas personalizadas, pero **no está siendo utilizada** por el chat del frontend.

## Objetivo
Refactorizar la aplicación para que el Frontend se conecte **directamente** al Backend de Python (FastAPI). Esto permitirá que el chat tenga acceso al contexto RAG y a las acciones del servidor.

## Archivos Relevantes
* `front-v2/providers/CopilotProvider.tsx` (Configuración del cliente)
* `front-v2/app/api/copilotkit/route.ts` (Endpoint actual a eliminar/reemplazar)
* `backend/api/routes/copilot.py` (Lógica de negocio y RAG)
* `backend/requirements.txt` (Dependencias)
* `backend/main.py` (Configuración de CORS)

## Instrucciones Paso a Paso para la Refactorización

Por favor, genera el código necesario para realizar los siguientes cambios:

### 1. Backend: Preparar el Runtime en Python
Necesitamos que FastAPI exponga un endpoint compatible con el protocolo de CopilotKit.

* **Opción A (Recomendada - SDK):** Si es viable, sugiere agregar la librería oficial `copilotkit` al `requirements.txt` y usar `CopilotRuntime` en `copilot.py` para envolver la lógica de LangChain/OpenAI.
* **Opción B (Manual):** Si preferimos no agregar dependencias nuevas, refactoriza `backend/api/routes/copilot.py` para asegurar que el streaming de respuesta (SSE) cumpla estrictamente con lo que espera el frontend (simulando un endpoint compatible con OpenAI o el protocolo nativo de CopilotKit).
* **CORS:** Verifica en `backend/main.py` que se permitan peticiones desde `localhost:3000` (o el puerto del frontend).

### 2. Frontend: Redireccionar el Provider
Modifica `front-v2/providers/CopilotProvider.tsx`:
* Cambia la propiedad `runtimeUrl`. En lugar de apuntar a `/api/copilotkit`, debe apuntar a la URL completa del backend (ej: `http://localhost:8000/copilot` o `/copilot/chat` según definas la ruta).
* Asegúrate de que las credenciales (si hay auth) se pasen correctamente.

### 3. Limpieza
* Indica que el archivo `front-v2/app/api/copilotkit/route.ts` debe ser eliminado o marcado como obsoleto, ya que Next.js dejará de ser el intermediario de la IA.

## Entregable Esperado
1.  Código actualizado para `backend/requirements.txt` (si aplica).
2.  Código refactorizado completo para `backend/api/routes/copilot.py`.
3.  Código actualizado para `front-v2/providers/CopilotProvider.tsx`.
4.  Snippet de configuración CORS para `backend/main.py` si es necesario.