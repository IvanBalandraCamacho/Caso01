Paso 1: Convertir ProposalWorkbench en el componente maestro
Este componente encapsulará toda la lógica de la "Mesa de Trabajo" (Workbench). Copia esto en front-v2/components/proposal/ProposalWorkbench.tsx:

TypeScript

"use client";

import React, { useState, useEffect } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { message, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "@copilotkit/react-ui/styles.css";

// API
import { 
  generateProposalDocumentApi,
  fetchWorkspaceDetails 
} from "@/lib/api";

// Componentes internos
import AnalysisActionsPanel from "@/components/rfp/AnalysisActionsPanel";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";

interface ProposalWorkbenchProps {
  workspaceId: string;
  initialData?: any; // Opcional, por si ya los tenemos
  onClose?: () => void; // Para cuando se use dentro del chat (modo modal)
}

export default function ProposalWorkbench({ workspaceId, initialData, onClose }: ProposalWorkbenchProps) {
  // Estados
  const [extractedData, setExtractedData] = useState<any>(initialData || {});
  const [loadingData, setLoadingData] = useState(!initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);

  // 1. Cargar Datos si no vienen en props
  useEffect(() => {
    if (initialData) return; // Si ya pasamos datos, no cargar de nuevo

    const loadData = async () => {
      try {
        setLoadingData(true);
        const workspace = await fetchWorkspaceDetails(workspaceId);
        
        setExtractedData({
          client_company: workspace.client_company || "",
          operation_name: workspace.operation_name || "",
          tvt: workspace.tvt || 0,
          country: workspace.country || "",
          tech_stack: Array.isArray(workspace.tech_stack) ? workspace.tech_stack.join(", ") : workspace.tech_stack || "",
          category: workspace.category || "",
          opportunity_type: workspace.opportunity_type || "RFP",
          estimated_price: workspace.estimated_price || "",
          estimated_time: workspace.estimated_time || "",
          resource_count: workspace.resource_count || "",
          objective: workspace.objective || ""
        });
      } catch (error) {
        console.error("Error cargando workspace:", error);
        message.error("No se pudieron cargar los datos del análisis.");
      } finally {
        setLoadingData(false);
      }
    };

    if (workspaceId) loadData();
  }, [workspaceId, initialData]);

  // 2. Manejar Generación
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const proposalData = {
        workspace_id: workspaceId,
        ...extractedData
      };

      const blob = await generateProposalDocumentApi(proposalData);
      
      // Descarga directa
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Propuesta_${extractedData.client_company || 'TIVIT'}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success("Propuesta generada exitosamente.");
      setProposalReady(true);
    } catch (error) {
      console.error(error);
      message.error("Error al generar el documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#131314] text-white min-h-[400px]">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#E31837' }} spin />} />
        <span className="ml-4">Cargando Workbench...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 h-full bg-[#F5F5F5] overflow-hidden font-sans relative">
      
      {/* Botón de cerrar si estamos en modo "Overlay" (desde el chat) */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
        >
          ✕
        </button>
      )}

      {/* --- COLUMNA IZQUIERDA (20%) --- */}
      <div className="col-span-2 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-10">
        <div className="p-4 border-b border-zinc-200">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
        </div>
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
           <div className="text-[10px] uppercase font-bold text-gray-400 p-2 text-center tracking-wider bg-white border-b border-zinc-100">
             Asistente
           </div>
           <div className="flex-1 relative custom-copilot-wrapper bg-white">
             <CopilotChat 
                className="h-full w-full"
                instructions={`Contexto: Propuesta para ${extractedData.client_company}. Datos: ${JSON.stringify(extractedData)}.`}
                labels={{
                  title: "Asistente",
                  initial: "¿Qué deseas ajustar antes de generar?",
                }}
             />
           </div>
        </div>
      </div>

      {/* --- COLUMNA CENTRAL (50%) --- */}
      <div className="col-span-6 bg-gray-100 p-6 overflow-hidden flex flex-col relative border-r border-zinc-200">
         <DocumentPreviewPanel 
           showProposal={proposalReady} 
           isLoading={isGenerating}
         />
      </div>

      {/* --- COLUMNA DERECHA (30%) --- */}
      <div className="col-span-4 bg-white h-full overflow-y-auto p-6 shadow-xl z-10 scrollbar-hide">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData} 
         />
      </div>
    </div>
  );
}
Paso 2: Limpiar la Página (app/workspace/[id]/quick-analysis/page.tsx)
Ahora la página queda limpísima, solo invoca al componente.

TypeScript

"use client";

import React, { use } from "react";
import ProposalWorkbench from "@/components/proposal/ProposalWorkbench";

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="h-screen w-screen">
      <ProposalWorkbench workspaceId={id} />
    </div>
  );
}
Resultado Final
Reutilización: Ahora puedes importar <ProposalWorkbench workspaceId={id} /> dentro de cualquier modal o drawer en tu página de chat (app/workspace/[id]/chat/[chatId]/page.tsx) cuando detectes la intención.

Consistencia: El código de generación y carga de datos está centralizado.

Flujo "Quick Analysis": Sigue funcionando perfecto porque redirige a esta página que ahora usa el componente maestro.