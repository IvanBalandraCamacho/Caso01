# UNIFY_PROPOSAL_FLOW.md

## 🎯 Objetivo: La "Mesa de Trabajo" Unificada
Crear una vista única y potente (Workbench) que sirva como destino tanto para la "Carga Rápida de RFP" como para la intención de "Generar Propuesta" desde el chat.

**El Layout requerido es:**
- **Centro:** Previsualización del Documento (PDF/Word).
- **Derecha:** Panel de Datos Extraídos (Resultados del Análisis IA).
- **Abajo:** Chat (Contexto de la conversación).
- **Acción Principal:** Botón "Generar Propuesta" (que activa el spinner y la generación).

---

## 🛠 Tarea 1: Componente `ProposalWorkbench` (Frontend)

Crear un nuevo componente contenedor en `front-v2/components/proposal/ProposalWorkbench.tsx` que orqueste esta vista.

**Estructura Visual:**
```tsx
// Pseudo-código de estructura
<div className="flex h-screen flex-col">
  <div className="flex-1 flex overflow-hidden">
    {/* COLUMNA CENTRAL: Previsualización */}
    <div className="flex-1 bg-zinc-900 border-r border-white/10 p-4">
      <DocumentPreview file={fileUrl} />
      {/* Overlay de Spinner cuando isGenerating === true */}
    </div>

    {/* COLUMNA DERECHA: Datos de la IA */}
    <div className="w-[400px] bg-[#1E1F20] overflow-y-auto border-l border-white/10">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-white font-semibold">Datos del Análisis</h2>
        <Button type="primary" onClick={onGenerate} loading={isGenerating}>
          Generar Propuesta
        </Button>
      </div>
      {/* Reutilizar InteractiveAnalysisResults aquí, pero adaptado a columna */}
      <InteractiveAnalysisResults result={analysisData} mode="sidebar" />
    </div>
  </div>

  {/* SECCIÓN INFERIOR: Chat */}
  <div className="h-[300px] border-t border-white/10 bg-[#131314]">
    <ChatInterface workspaceId={workspaceId} />
  </div>
</div>
Acciones Clave:

onGenerate: Debe llamar al endpoint /task/generate (existente) y, al finalizar, mostrar la confirmación o descarga.

🔄 Tarea 2: Refactorizar Flujo "Análisis Rápido" (quick-analysis/page.tsx)
Modificar la página actual para eliminar el menú de 3 tarjetas (A, B, C) y redirigir directamente al Workbench.

Cambio de Lógica:

Usuario sube archivo -> handleUpload.

Backend analiza -> Retorna JSON.

ACCIÓN: Redirigir inmediatamente a: /workspace/[workspaceId]/proposal?mode=review (Pasando los datos analizados o cargándolos de nuevo en esa vista).

💬 Tarea 3: Integración con el Chat (ChatPage.tsx)
Modificar front-v2/app/workspace/[id]/chat/[chatId]/page.tsx para reaccionar a la intención detectada.

Lógica de Detección: Dentro de useChatStream o en el efecto de onComplete:

TypeScript

if (detectedIntent === "GENERATE_PROPOSAL") {
  // En lugar de solo mostrar un widget pequeño:
  // OPCIÓN A: Redirigir a la vista de propuesta
  router.push(`/workspace/${id}/proposal`);
  
  // OPCIÓN B (Mejor UX): Abrir el ProposalWorkbench en un Modal a pantalla completa
  // o un Drawer grande ("Menu") sobre el chat actual.
  setProposalMode(true); 
}
Instrucción Específica: El usuario pidió que salga "un menú como el de la imagen" (refiriéndose a la disposición visual descrita).

Si el usuario lo pide en el chat, el sistema debe transicionar la UI para mostrar el documento y los datos a los lados, transformando la vista de chat simple en el ProposalWorkbench.

✅ Definition of Done
Entro a "Análisis Rápido", subo un PDF.

Automáticamente veo el PDF (centro), los datos extraídos (derecha) y el chat (abajo).

Veo el botón "Generar Propuesta" destacado.

Si estoy chateando y escribo "Genera una propuesta comercial", la interfaz cambia a esta misma vista (Workbench) sin perder el contexto.