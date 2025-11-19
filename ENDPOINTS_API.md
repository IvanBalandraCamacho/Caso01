# API Endpoints - Sistema RAG con Generación de Documentos

**Base URL:** `http://localhost:8000/api/v1`

**Última actualización:** Noviembre 19, 2025

---

## 📋 Tabla de Contenidos

1. [Workspaces](#-workspaces)
2. [Documentos](#-documentos)
3. [Chat y Conversaciones](#-chat-y-conversaciones)
4. [Generación de Documentos Descargables](#-generación-de-documentos-descargables)
5. [Exportación de Conversaciones](#-exportación-de-conversaciones)
6. [Health Check](#-health-check)
7. [Códigos de Respuesta](#-códigos-de-respuesta)
8. [Ejemplos de Uso](#-ejemplos-de-uso)

---

## 📁 WORKSPACES

### Crear Workspace
```http
POST /workspaces
```

**Body:**
```json
{
  "name": "Proyecto Marketing",
  "description": "Análisis de campañas Q4 2025",
  "instructions": "Instrucciones opcionales para el LLM"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Proyecto Marketing",
  "description": "Análisis de campañas Q4 2025",
  "instructions": null,
  "created_at": "2025-11-19T10:30:00",
  "is_active": true
}
```

---

### Listar Workspaces
```http
GET /workspaces
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Proyecto Marketing",
    "description": "Análisis de campañas",
    "instructions": null,
    "created_at": "2025-11-19T09:00:00",
    "is_active": true
  }
]
```

---

### Obtener Workspace Específico
```http
GET /workspaces/{workspace_id}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Proyecto Marketing",
  "description": "Análisis de campañas",
  "instructions": "Analiza con enfoque en métricas",
  "created_at": "2025-11-19T09:00:00",
  "is_active": true
}
```

---

### Actualizar Workspace
```http
PUT /workspaces/{workspace_id}
```

**Body:**
```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "instructions": "Nuevas instrucciones"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "instructions": "Nuevas instrucciones",
  "created_at": "2025-11-19T09:00:00",
  "is_active": true
}
```

---

### Eliminar Workspace
```http
DELETE /workspaces/{workspace_id}
```

**Response 204:** Sin contenido

---

## 📄 DOCUMENTOS

### Subir Documento
```http
POST /workspaces/{workspace_id}/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
```
file: (archivo PDF, DOCX, TXT)
```

**Response 202:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "file_name": "documento.pdf",
  "file_type": "application/pdf",
  "file_path": "/temp_uploads/uuid_documento.pdf",
  "status": "PENDING",
  "chunk_count": 0,
  "created_at": "2025-11-19T10:45:00",
  "task_id": "celery-task-uuid"
}
```

> **Nota:** El procesamiento es asíncrono. El documento se procesa en background con Celery.

---

### Listar Documentos del Workspace
```http
GET /workspaces/{workspace_id}/documents
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "file_name": "informe.pdf",
    "file_type": "application/pdf",
    "status": "COMPLETED",
    "chunk_count": 45,
    "created_at": "2025-11-19T09:30:00"
  }
]
```

**Estados posibles:**
- `PENDING`: En cola de procesamiento
- `PROCESSING`: Siendo procesado
- `COMPLETED`: Procesamiento completado
- `FAILED`: Error en el procesamiento

---

### Eliminar Documento
```http
DELETE /documents/{document_id}
```

**Response 204:** Sin contenido

> **Nota:** También elimina los chunks del documento en Qdrant.

---

## 💬 CHAT Y CONVERSACIONES

### Chat con Workspace (Streaming NDJSON)
```http
POST /workspaces/{workspace_id}/chat
```

**Body:**
```json
{
  "query": "¿Cuáles son los puntos principales del documento?",
  "conversation_id": "uuid-opcional"
}
```

**Response 200 (Streaming NDJSON):**

El endpoint retorna un stream de eventos en formato NDJSON (Newline Delimited JSON):

```ndjson
{"type":"sources","relevant_chunks":[{"document_id":"uuid","chunk_text":"...","chunk_index":0,"score":0.95}],"conversation_id":"uuid"}
{"type":"content","text":"Los"}
{"type":"content","text":" puntos"}
{"type":"content","text":" principales"}
```

**Tipos de eventos:**
- `sources`: Metadatos iniciales (chunks relevantes + conversation_id)
- `content`: Fragmento de texto del LLM (streaming token a token)
- `error`: Mensaje de error si ocurre un problema

> **Nota:** Si no se proporciona `conversation_id`, se crea una nueva conversación automáticamente.

**Ejemplo JavaScript (consumir stream):**
```javascript
const response = await fetch(`/api/v1/workspaces/${workspaceId}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "Resume el documento" })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const data = JSON.parse(line);
    
    if (data.type === 'sources') {
      console.log('Conversation ID:', data.conversation_id);
      console.log('Chunks:', data.relevant_chunks);
    } else if (data.type === 'content') {
      // Agregar texto al UI
      appendText(data.text);
    } else if (data.type === 'error') {
      console.error('Error:', data.detail);
    }
  }
}
```

---

### Listar Conversaciones
```http
GET /workspaces/{workspace_id}/conversations
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "title": "Análisis de Marketing",
    "created_at": "2025-11-19T10:30:00",
    "updated_at": "2025-11-19T11:45:00"
  }
]
```

---

### Obtener Conversación con Mensajes
```http
GET /workspaces/{workspace_id}/conversations/{conversation_id}
```

**Response 200:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "title": "Análisis de Marketing",
  "created_at": "2025-11-19T10:30:00",
  "updated_at": "2025-11-19T11:45:00",
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "user",
      "content": "¿Cuál es el resumen del documento?",
      "created_at": "2025-11-19T10:30:00"
    },
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "assistant",
      "content": "El resumen del documento es...",
      "created_at": "2025-11-19T10:30:05"
    }
  ]
}
```

---

### Crear Conversación Manualmente
```http
POST /workspaces/{workspace_id}/conversations
```

**Body:**
```json
{
  "title": "Nueva conversación personalizada"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "title": "Nueva conversación personalizada",
  "created_at": "2025-11-19T12:00:00",
  "updated_at": "2025-11-19T12:00:00"
}
```

---

### Renombrar Conversación
```http
PUT /workspaces/{workspace_id}/conversations/{conversation_id}
```

**Body:**
```json
{
  "title": "Análisis de Ventas Q4"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "title": "Análisis de Ventas Q4",
  "created_at": "2025-11-19T10:30:00",
  "updated_at": "2025-11-19T12:15:00"
}
```

---

### Eliminar Conversación
```http
DELETE /workspaces/{workspace_id}/conversations/{conversation_id}
```

**Response 204:** Sin contenido

---

## 📥 GENERACIÓN DE DOCUMENTOS DESCARGABLES

### Generar Documento (TXT/Markdown/PDF)
```http
POST /workspaces/{workspace_id}/conversations/{conversation_id}/generate-downloadable
```

**Body:**
```json
{
  "format": "markdown",
  "document_type": "complete",
  "include_metadata": true,
  "custom_instructions": null
}
```

**Parámetros:**
- `format`: `"txt"` | `"markdown"` | `"pdf"`
- `document_type`: `"complete"` | `"summary"` | `"key_points"`
- `include_metadata`: `true` | `false` (opcional, default: true)
- `custom_instructions`: Instrucciones adicionales para el LLM (opcional)

**Response 200:**
```json
{
  "content": "# Documento Completo\n\n...",
  "filename": "Analisis_Marketing_20251119.md",
  "format": "markdown",
  "word_count": 1523,
  "message": "Documento MARKDOWN generado exitosamente (1523 palabras)"
}
```

**Tipos de documento:**
- `complete`: Documento completo con todos los detalles (1000+ palabras)
- `summary`: Resumen ejecutivo conciso (~500 palabras)
- `key_points`: Lista estructurada de puntos clave

**Formatos disponibles:**
- `txt`: Texto plano sin formato (máxima compatibilidad)
- `markdown`: Texto con formato Markdown (recomendado para edición)
- `pdf`: Documento PDF profesional (para impresión/presentación)

**Ejemplo de uso (descargar archivo):**
```javascript
const response = await fetch(
  `/api/v1/workspaces/${workspaceId}/conversations/${conversationId}/generate-downloadable`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'markdown',
      document_type: 'complete',
      include_metadata: true
    })
  }
);

const data = await response.json();

// Crear blob y descargar
const blob = new Blob([data.content], { 
  type: data.format === 'pdf' ? 'application/pdf' : 'text/plain' 
});
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = data.filename;
a.click();
window.URL.revokeObjectURL(url);
```

---

## 📊 EXPORTACIÓN DE CONVERSACIONES

### Exportar a TXT
```http
GET /workspaces/{workspace_id}/chat/export/txt?conversation_id={uuid}
```

**Response:** Archivo TXT descargable con el historial de la conversación.

---

### Exportar a PDF
```http
GET /workspaces/{workspace_id}/chat/export/pdf?conversation_id={uuid}
```

**Response:** Archivo PDF descargable con el historial de la conversación.

---

### Exportar a CSV
```http
GET /workspaces/{workspace_id}/chat/export/csv?conversation_id={uuid}
```

**Response:** Archivo CSV descargable con estructura:

```csv
role,content,created_at
user,"¿Cuál es el resumen?",2025-11-19T10:30:00
assistant,"El resumen es...",2025-11-19T10:30:05
```

---

## ⚡ HEALTH CHECK

### Verificar Estado del Sistema
```http
GET /health
```

**Response 200:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "qdrant": "connected",
  "timestamp": "2025-11-19T12:00:00"
}
```

**Posibles estados:**
- `connected`: Servicio funcionando correctamente
- `disconnected`: Servicio no disponible
- `error`: Error de conexión

---

## 📋 CÓDIGOS DE RESPUESTA

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado exitosamente |
| 202 | Accepted | Solicitud aceptada, procesamiento asíncrono |
| 204 | No Content | Operación exitosa sin contenido de respuesta |
| 400 | Bad Request | Datos de entrada inválidos |
| 404 | Not Found | Recurso no encontrado |
| 500 | Internal Server Error | Error interno del servidor |

---

## 🎯 EJEMPLOS DE USO

### Flujo Completo: Crear Workspace → Subir Documento → Chatear → Generar PDF

```javascript
// 1. Crear workspace
const workspace = await fetch('http://localhost:8000/api/v1/workspaces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Análisis Financiero Q4',
    description: 'Reportes trimestrales'
  })
}).then(r => r.json());

console.log('Workspace creado:', workspace.id);

// 2. Subir documento
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const document = await fetch(
  `http://localhost:8000/api/v1/workspaces/${workspace.id}/upload`,
  {
    method: 'POST',
    body: formData
  }
).then(r => r.json());

console.log('Documento subido:', document.id, 'Estado:', document.status);

// 3. Esperar a que el documento se procese (opcional)
await new Promise(resolve => setTimeout(resolve, 5000));

// 4. Chatear con streaming
const chatResponse = await fetch(
  `http://localhost:8000/api/v1/workspaces/${workspace.id}/chat`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '¿Cuáles son las métricas financieras clave?'
    })
  }
);

const reader = chatResponse.body.getReader();
const decoder = new TextDecoder();
let conversationId = null;
let fullText = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const lines = decoder.decode(value).split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const data = JSON.parse(line);
    
    if (data.type === 'sources') {
      conversationId = data.conversation_id;
      console.log('Conversación iniciada:', conversationId);
    } else if (data.type === 'content') {
      fullText += data.text;
      console.log('Token recibido:', data.text);
    }
  }
}

console.log('Respuesta completa:', fullText);

// 5. Generar documento PDF descargable
const pdfDoc = await fetch(
  `http://localhost:8000/api/v1/workspaces/${workspace.id}/conversations/${conversationId}/generate-downloadable`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'pdf',
      document_type: 'complete',
      include_metadata: true
    })
  }
).then(r => r.json());

console.log('PDF generado:', pdfDoc.filename, pdfDoc.word_count, 'palabras');

// Descargar PDF
const blob = new Blob([pdfDoc.content], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = pdfDoc.filename;
a.click();
```

---

## 💡 NOTAS IMPORTANTES

### Streaming NDJSON
- El endpoint `/chat` retorna un stream de eventos en tiempo real
- Usa `StreamingResponse` con media type `application/x-ndjson`
- Cada línea es un objeto JSON independiente
- Permite ver la respuesta del LLM token por token

### Procesamiento Asíncrono
- La subida de documentos retorna **202 Accepted**
- El procesamiento se ejecuta en background con **Celery**
- Consulta el `status` del documento para verificar completitud

### Generación de Documentos
- **Sin OAuth**: No requiere autenticación de Google
- **Totalmente editable**: El usuario puede modificar el contenido generado
- **Formatos flexibles**: TXT, Markdown y PDF según necesidad
- **LLM optimizado**: Gemini con 8192 tokens máximos

### Límites y Recomendaciones
- **Tamaño máximo de archivo**: Recomendado <50MB por documento
- **Chunks por consulta**: 10-15 según complejidad de la pregunta
- **Timeout LLM**: 60 segundos con 3 reintentos automáticos
- **Formato recomendado**: Markdown para documentos editables

---

**Última actualización:** Noviembre 19, 2025  
**Versión del API:** 1.0  
**Motor LLM:** Google Gemini 2.0-flash-exp
