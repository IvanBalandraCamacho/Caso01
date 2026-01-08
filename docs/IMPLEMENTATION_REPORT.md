# Reporte de Implementación: Sistema de Chat Multimodal

Se han implementado los cambios solicitados para soportar tres tipos de flujos de chat en la plataforma, ajustando la lógica del backend y centralizando los prompts para facilitar su edición.

## 1. Resumen de Cambios

- **Centralización de Prompts:** Se ha creado un nuevo archivo para gestionar todos los prompts del sistema de chat en un solo lugar.
- **Nuevo Endpoint de Chat General:** Se ha implementado un endpoint `/api/v1/chat/general` para consultas fuera de un workspace (Landing Page).
- **Ajuste en Base de Datos:** Se ha modificado el modelo `Conversation` para permitir conversaciones sin workspace asociado (requiere actualización de esquema).
- **Lógica de Intención:** Se ha integrado la lógica para distinguir entre consultas generales (con y sin workspace) y generación de propuestas.

## 2. Tipos de Chat Implementados

1.  **Consulta General (Landing Page - Sin Workspace):**
    -   **Ruta:** `/api/v1/chat/general`
    -   **Prompt:** `GENERAL_QUERY_NO_WORKSPACE_PROMPT`
    -   **Descripción:** Chat puramente conversacional con el LLM, sin acceso a documentos privados.

2.  **Consulta General (Dentro de Workspace):**
    -   **Ruta:** `/api/v1/workspaces/{id}/chat` (Intención: `GENERAL_QUERY`)
    -   **Prompt:** `GENERAL_QUERY_WITH_WORKSPACE_PROMPT`
    -   **Descripción:** Usa RAG para responder basándose en los documentos del workspace.

3.  **Propuesta Comercial (Dentro de Workspace):**
    -   **Ruta:** `/api/v1/workspaces/{id}/chat` (Intención: `GENERATE_PROPOSAL`)
    -   **Prompt:** Gestionado por el servicio de propuestas (existente).
    -   **Descripción:** Detecta la intención y genera una propuesta estructurada.

## 3. Ubicación de los Prompts

Para ajustar los prompts a su medida, edite el siguiente archivo:

**Ruta:** `backend/prompts/chat_prompts.py`

Contenido del archivo:
-   `GENERAL_QUERY_NO_WORKSPACE_PROMPT`: Para el chat del landing.
-   `GENERAL_QUERY_WITH_WORKSPACE_PROMPT`: Para preguntas generales dentro del workspace.
-   `REQUIREMENTS_MATRIX_PROMPT`: Para generación de matrices.
-   `PRELIMINARY_PRICE_QUOTE_PROMPT`: Para cotizaciones.
-   `LEGAL_RISKS_PROMPT`: Para análisis de riesgos.
-   `SPECIFIC_QUERY_PROMPT`: Para consultas específicas sobre RFPs.

## 4. Acción Requerida: Actualización de Base de Datos

Para que el chat "Sin Workspace" funcione, es necesario permitir que la columna `workspace_id` sea nula en la base de datos.

**Si tiene acceso a la base de datos, ejecute el siguiente comando SQL:**

```sql
ALTER TABLE conversations MODIFY workspace_id VARCHAR(36) NULL;
```

**Alternativamente**, si está en un entorno de desarrollo local con Python configurado, puede intentar ejecutar el script de migración manual incluido (asegúrese de que las variables de entorno `DATABASE_URL` estén configuradas):

```bash
python backend/update_db_schema.py
```

## 5. Nuevos Archivos Creados

-   `backend/prompts/chat_prompts.py`
-   `backend/api/routes/general_chat.py`
-   `backend/update_db_schema.py`
