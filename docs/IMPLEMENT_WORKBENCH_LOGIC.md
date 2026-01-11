# IMPLEMENT_WORKBENCH_LOGIC.md

## 🎯 Objetivo
Conectar la "Mesa de Trabajo" (Workbench) con la API real (`lib/api.ts`) para que cargue los datos del Workspace y genere la propuesta descargable.

---

## 🛠 Tarea 1: Actualizar la Página de Análisis (`workspace/[id]/quick-analysis/page.tsx`)

Reemplaza todo el contenido de `front-v2/app/workspace/[id]/quick-analysis/page.tsx` con el siguiente código.
**Mejoras clave:**
- Usa `fetchWorkspaceDetails` para traer los datos reales de la BD.
- Usa `generateProposalDocumentApi` para generar y descargar el Word.
- Maneja la descarga del BLOB correctamente.

```tsx
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { message, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

// API
import { 
  fetchWorkspaceDetails, 
  generateProposalDocumentApi,
  fetchDocumentContent 
} from "@/lib/api";

// Componentes
import AnalysisActionsPanel from "@/components/rfp/AnalysisActionsPanel";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Estados
  const [extractedData, setExtractedData] = useState<any>({});
  const [loadingData, setLoadingData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 1. Cargar Datos del Workspace al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const workspace = await fetchWorkspaceDetails(id);
        
        // Mapear datos del workspace al panel derecho
        setExtractedData({
          client_company: workspace.client_company || "",
          operation_name: workspace.operation_name || "",
          tvt: workspace.tvt || 0,
          country: workspace.country || "",
          tech_stack: workspace.tech_stack || [],
          category: workspace.category || "",
          opportunity_type: workspace.opportunity_type || "RFP"
        });

        // Intentar cargar el archivo original para preview (si existe)
        // Nota: Esto asume que tienes lógica para obtener el primer documento
        // Si no, el DocumentPreviewPanel mostrará un estado vacío o el documento por defecto
      } catch (error) {
        console.error("Error cargando workspace:", error);
        message.error("Error al cargar los datos del análisis.");
      } finally {
        setLoadingData(false);
      }
    };

    if (id) loadData();
  }, [id]);

  // 2. Manejar Generación de Propuesta (Descarga)
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Preparamos el payload combinando datos del panel
      const proposalData = {
        workspace_id: id,
        ...extractedData // Enviamos lo que el usuario haya corregido en el panel
      };

      // Llamada a la API que retorna un Blob (Word/PDF)
      const blob = await generateProposalDocumentApi(proposalData);
      
      // Crear URL temporal para descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Nombre del archivo sugerido
      link.download = `Propuesta_${extractedData.client_company || 'Comercial'}.docx`;
      document.body.appendChild(link);
      link.click();
      
      // Limpieza
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success("Propuesta generada y descargada exitosamente.");
      setProposalReady(true);
    } catch (error) {
      console.error("Error generando propuesta:", error);
      message.error("Hubo un error al generar el documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#131314] text-white">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#E31837' }} spin />} />
        <span className="ml-4">Cargando Workbench...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 h-screen bg-[#F5F5F5] overflow-hidden font-sans">
      
      {/* --- COLUMNA IZQUIERDA (20%) - Acciones y Chat --- */}
      <div className="col-span-2 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-10">
        <div className="p-4 border-b border-zinc-200">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
        </div>
        
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
           <div className="text-[10px] uppercase font-bold text-gray-400 p-2 text-center tracking-wider bg-white border-b border-zinc-100">
             Asistente IA
           </div>
           <div className="flex-1 relative custom-copilot-wrapper bg-white">
             <CopilotChat 
                className="h-full w-full"
                instructions={`Estás ayudando a analizar la RFP de ${extractedData.client_company}. Datos actuales: ${JSON.stringify(extractedData)}. Si el usuario pide cambios, sugiérele editar el panel derecho.`}
                labels={{
                  title: "Asistente TIVIT",
                  initial: "Los datos han sido extraídos. ¿Deseas revisar algún punto antes de generar la propuesta?",
                }}
             />
           </div>
        </div>
      </div>

      {/* --- COLUMNA CENTRAL (50%) - Documento --- */}
      <div className="col-span-6 bg-gray-100 p-6 overflow-hidden flex flex-col relative border-r border-zinc-200">
         <DocumentPreviewPanel 
           showProposal={proposalReady} 
           isLoading={isGenerating}
           fileUrl={previewUrl} // Pasar URL si se implementa la carga de preview
         />
      </div>

      {/* --- COLUMNA DERECHA (30%) - Datos --- */}
      <div className="col-span-4 bg-white h-full overflow-y-auto p-6 shadow-xl z-10 scrollbar-hide">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData} 
         />
      </div>

    </div>
  );
}
🔄 Tarea 2: Redirección Directa en "Análisis Rápido" (quick-analysis/page.tsx)
Modifica la función customRequest en front-v2/app/quick-analysis/page.tsx para que no se quede esperando selección, sino que vaya directo al Workbench.

Código a modificar:

TypeScript

  const customRequest = async ({ file, onSuccess, onError, onProgress }: any) => {
    setIsAnalyzing(true)
    try {
      onProgress({ percent: 10 })
      
      // Llamada real a la API
      const response = await analyzeDocumentApi(file, (percent) => {
         onProgress({ percent: Math.min(percent, 90) })
      });
      
      onProgress({ percent: 100 })
      onSuccess("ok")
      message.success("Análisis completado. Redirigiendo...")
      
      // REDIRECCIÓN INMEDIATA AL WORKBENCH
      if (response.workspace_id) {
         router.push(`/workspace/${response.workspace_id}/quick-analysis`);
      } else {
         throw new Error("No se recibió ID del workspace");
      }

    } catch (error) {
      console.error(error)
      onError(error)
      message.error("Error al analizar el documento.")
      setIsAnalyzing(false) // Solo desactivar loading si falla
    }
  }
(Nota: Puedes eliminar el paso 2 y 3 del Steps component en este archivo, ya que ahora el flujo es directo).

✅ Lista de Verificación Final
El usuario sube archivo -> Spinner -> Redirección automática.

En la nueva pantalla, ve los datos (TVT, Cliente) cargados desde la BD.

Al hacer clic en "Generar Propuesta", el botón muestra loading y finalmente descarga un .docx.