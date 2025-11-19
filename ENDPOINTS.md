# API Endpoints (Resumen para Frontend)

## Chat & Conversaciones
- **POST** `/workspaces/{workspace_id}/chat`
- **POST** `/workspaces/{workspace_id}/conversations/{conversation_id}/generate-downloadable`
- **GET** `/workspaces/{workspace_id}/conversations`  _(lista conversaciones)_
- **GET** `/workspaces/{workspace_id}/conversations/{conversation_id}`  _(detalle conversación)_
- **PUT** `/workspaces/{workspace_id}/conversations/{conversation_id}`  _(renombrar conversación)_
- **DELETE** `/workspaces/{workspace_id}/conversations/{conversation_id}`  _(eliminar conversación)_

## Workspaces
- **GET** `/workspaces`  _(lista workspaces)_
- **POST** `/workspaces`  _(crear workspace)_
- **PUT** `/workspaces/{workspace_id}`  _(actualizar workspace)_
- **DELETE** `/workspaces/{workspace_id}`  _(eliminar workspace)_

## Documentos
- **GET** `/workspaces/{workspace_id}/documents`  _(lista documentos del workspace)_
- **POST** `/workspaces/{workspace_id}/upload`  _(subir documento, multipart/form-data)_
- **DELETE** `/documents/{document_id}`  _(eliminar documento)_

## Exportación de Conversaciones
- **GET** `/workspaces/{workspace_id}/chat/export/txt?conversation_id={uuid}`  _(descargar TXT)_
- **GET** `/workspaces/{workspace_id}/chat/export/pdf?conversation_id={uuid}`  _(descargar PDF)_

## Salud del API
- **GET** `/health`  _(estado del servicio)_
