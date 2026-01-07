# 📋 Implementación: `/workspace/[id]/quick-analysis`

> Ruta específica: `front-v2/app/workspace/[id]/quick-analysis/page.tsx`

---

## 🎯 Resumen del Flujo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO COMPLETO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ENTRADA A:  Usuario sin workspace                                          │
│   ───────────────────────────────                                            │
│   1. Usuario toca "Análisis Rápido RFP" en Sidebar                          │
│   2. Va a `/quick-analysis` (página de upload)                               │
│   3. Sube archivo → API `/task/analyze` crea workspace                       │
│   4. Redirect a `/workspace/{id}/quick-analysis` ← ESTA PÁGINA               │
│                                                                              │
│   ENTRADA B:  Usuario con workspace existente                                │
│   ────────────────────────────────────────────                               │
│   1. Usuario está en `/workspace/{id}` (chat)                                │
│   2. Toca botón "Análisis Rápido" en chat-area                               │
│   3. Va directo a `/workspace/{id}/quick-analysis` ← ESTA PÁGINA             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Estado Actual

### ✅ Ya existe:
| Archivo | Estado |
|---------|--------|
| `front-v2/app/workspace/[id]/quick-analysis/page.tsx` | ✅ Creado (carga `ProposalWorkbench`) |
| `front-v2/components/proposal/ProposalWorkbench.tsx` | ✅ Implementado |
| `front-v2/components/rfp/DocumentPreviewPanel.tsx` | ✅ Básico |
| `front-v2/components/rfp/ExtractedDataPanel.tsx` | ✅ Con CopilotKit |
| `front-v2/components/rfp/AnalysisActionsPanel.tsx` | ✅ Básico |
| Backend `POST /task/analyze` | ✅ Funcional |
| Backend `POST /task/generate` | ✅ Funcional |
| API client `analyzeDocumentApi` | ✅ Funcional |
| API client `generateProposalDocumentApi` | ✅ Funcional |
| API client `fetchWorkspaceDocuments` | ✅ Funcional |
| API client `fetchDocumentContent` | ✅ Funcional |

### ❌ Falta implementar:
| Funcionalidad | Prioridad |
|---------------|-----------|
| Vista previa real del documento RFP en panel central | 🔴 Alta |
| Persistencia del archivo subido (localStorage/URL) | 🔴 Alta |
| Descarga real del archivo DOCX generado | 🟡 Media |
| Manejo de error si no hay documento | 🟡 Media |

---

## 📐 Arquitectura de la Página

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        /workspace/[id]/quick-analysis                         │
├────────────────┬──────────────────────────────┬──────────────────────────────┤
│   IZQUIERDA    │          CENTRO              │          DERECHA             │
│   (320px)      │       (Flexible)             │          (400px)             │
├────────────────┼──────────────────────────────┼──────────────────────────────┤
│                │                              │                              │
│  ┌──────────┐  │  ┌────────────────────────┐  │  ┌──────────────────────┐    │
│  │ ← Atrás  │  │  │                        │  │  │  📊 Datos del RFP    │    │
│  │ Ir Chat  │  │  │                        │  │  │                      │    │
│  └──────────┘  │  │   DOCUMENTO SUBIDO     │  │  │  TVT: $___________   │    │
│                │  │   (PDF/DOCX Preview)   │  │  │  Cliente: ________   │    │
│  ┌──────────┐  │  │                        │  │  │  País: ___________   │    │
│  │  GENERAR │  │  │   ─ o ─                │  │  │  Stack: __________   │    │
│  │ PROPUESTA│  │  │                        │  │  │  Objetivo: _______   │    │
│  │  🔴      │  │  │   PROPUESTA GENERADA   │  │  │                      │    │
│  └──────────┘  │  │   (después de generar) │  │  │  [Guardar Dashboard] │    │
│                │  │                        │  │  └──────────────────────┘    │
│  ┌──────────┐  │  └────────────────────────┘  │                              │
│  │ Chat IA  │  │                              │                              │
│  │ Copilot  │  │                              │                              │
│  └──────────┘  │                              │                              │
│                │                              │                              │
└────────────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## 🛠️ Tareas de Implementación

### **TAREA 1: Mejorar `DocumentPreviewPanel.tsx`** (30 min)

**Archivo:** `front-v2/components/rfp/DocumentPreviewPanel.tsx`

**Problema actual:** Solo muestra placeholder, no renderiza el PDF/DOCX real.

**Solución:** Usar `<iframe>` para PDF o librería `react-pdf` para mejor control.

```tsx
// Cambios necesarios:
// 1. Recibir fileUrl del documento original
// 2. Mostrar PDF con iframe (funciona para blob URLs)
// 3. Mostrar DOCX renderizado o usar Google Docs Viewer fallback
```

**Verificación:** El `ProposalWorkbench` ya pasa `fileUrl` correcto desde `fetchDocumentContent`.

---

### **TAREA 2: Verificar carga de documento original** (15 min)

**Archivo:** `front-v2/components/proposal/ProposalWorkbench.tsx`

**Verificar que funciona:**
```tsx
// Líneas 68-78 - Ya implementado
const docs = await fetchWorkspaceDocuments(workspaceId);
if (docs && docs.length > 0) {
    const mainDoc = docs[0]; 
    const blob = await fetchDocumentContent(workspaceId, mainDoc.id);
    const url = window.URL.createObjectURL(blob);
    setDocumentUrl(url);
}
```

**Si no hay documentos:** Mostrar mensaje "Sube un documento primero".

---

### **TAREA 3: Implementar descarga real del DOCX** (20 min)

**Archivo:** `front-v2/components/proposal/ProposalWorkbench.tsx`

**Estado actual:** `handleDownload` ya funciona.

**Verificar:**
```tsx
const handleDownload = () => {
    if (!lastBlob) return;
    const url = window.URL.createObjectURL(lastBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Propuesta_${extractedData.client_company || 'TIVIT'}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
```

---

### **TAREA 4: Manejar entrada desde workspace existente** (15 min)

**Archivo:** `front-v2/components/sidebar.tsx` (línea ~1317)

**Estado actual:** Ya redirige a `/quick-analysis` (página de upload).

**Cambio necesario:** Si ya hay `workspaceId` en contexto, ir directo a `/workspace/{id}/quick-analysis`.

```tsx
// En sidebar.tsx
onClick={() => {
  if (currentWorkspaceId) {
    router.push(`/workspace/${currentWorkspaceId}/quick-analysis`);
  } else {
    router.push('/quick-analysis');
  }
}}
```

---

### **TAREA 5: Validar API backend** (10 min)

**Endpoints a verificar:**
1. `GET /api/v1/workspaces/{id}/documents` - Lista documentos
2. `GET /api/v1/workspaces/{id}/documents/{doc_id}/content` - Descarga contenido
3. `POST /api/v1/task/generate` - Genera DOCX

---

## 📊 Evaluación de Dificultad

| Aspecto | Dificultad | Razón |
|---------|------------|-------|
| Frontend (componentes) | 🟢 **Baja** | Ya existen todos los componentes |
| Integración API | 🟢 **Baja** | APIs ya implementadas y conectadas |
| Vista previa documento | 🟡 **Media** | PDF funciona con iframe, DOCX requiere conversión |
| Lógica de navegación | 🟢 **Baja** | Solo ajustar rutas en sidebar |
| Testing E2E | 🟡 **Media** | Probar flujo completo |

### **Dificultad Total: 🟢 BAJA-MEDIA**

**Tiempo estimado: 1.5 - 2 horas**

---

## ✅ Checklist de Implementación

```
[ ] 1. Verificar que DocumentPreviewPanel renderiza el PDF correctamente
[ ] 2. Probar flujo: upload → redirect → ver documento en panel central
[ ] 3. Probar botón "Generar Propuesta" → ver DOCX generado
[ ] 4. Probar descarga del DOCX
[ ] 5. Ajustar sidebar para ir directo si ya hay workspace
[ ] 6. Manejar caso: workspace sin documentos
[ ] 7. Test desde workspace existente (entrada B)
```

---

## 🔗 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `front-v2/app/workspace/[id]/quick-analysis/page.tsx` | Página principal |
| `front-v2/components/proposal/ProposalWorkbench.tsx` | Componente maestro |
| `front-v2/components/rfp/DocumentPreviewPanel.tsx` | Panel central (preview) |
| `front-v2/components/rfp/ExtractedDataPanel.tsx` | Panel derecho (datos) |
| `front-v2/components/rfp/AnalysisActionsPanel.tsx` | Botones de acción |
| `front-v2/app/quick-analysis/page.tsx` | Página de upload inicial |
| `front-v2/lib/api.ts` | Funciones de API |
| `backend/api/routes/intention_task.py` | Endpoints backend |

---

## 🚀 Próximos Pasos

1. **Ejecutar** `docker-compose up -d` y probar flujo actual
2. **Identificar** qué falla específicamente en el preview
3. **Implementar** las tareas en orden de prioridad
4. **Testear** ambos flujos de entrada (A y B)
