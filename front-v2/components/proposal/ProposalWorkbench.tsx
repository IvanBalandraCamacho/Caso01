"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat } from "@copilotkit/react-ui";
import { message, Spin, Button } from "antd";
import { LoadingOutlined, ArrowLeftOutlined, DownloadOutlined } from "@ant-design/icons";
import "@copilotkit/react-ui/styles.css";

// API
import { 
  generateProposalDocumentApi,
  fetchWorkspaceDetails,
  fetchWorkspaceDocuments,
  fetchDocumentContent
} from "@/lib/api";

// Componentes internos
import AnalysisActionsPanel from "@/components/rfp/AnalysisActionsPanel";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";

interface ProposalWorkbenchProps {
  workspaceId: string;
  initialData?: any; 
  onClose?: () => void; 
}

export default function ProposalWorkbench({ workspaceId, initialData, onClose }: ProposalWorkbenchProps) {
  const router = useRouter();
  
  // Estados
  const [extractedData, setExtractedData] = useState<any>(initialData || {});
  const [loadingData, setLoadingData] = useState(!initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  // 1. Cargar Datos y Documento
  useEffect(() => {
    // Definir la función de carga fuera del condicional para poder llamarla aunque haya initialData
    // (necesitamos el documento de todas formas)
    
    const loadAll = async () => {
      try {
        if (!initialData) setLoadingData(true);
        
        // Cargar detalles del workspace solo si no tenemos datos iniciales
        if (!initialData) {
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
              objetivo: workspace.objective || ""
            });
        }

        // Cargar documento original para previsualización
        const docs = await fetchWorkspaceDocuments(workspaceId);
        if (docs && docs.length > 0) {
            // Tomamos el primero (o el más reciente)
            const mainDoc = docs[0]; 
            // Obtenemos el contenido como Blob
            const blob = await fetchDocumentContent(workspaceId, mainDoc.id);
            const url = window.URL.createObjectURL(blob);
            setDocumentUrl(url);
        }

      } catch (error) {
        console.error("Error cargando datos del workbench:", error);
        if (!initialData) message.error("No se pudieron cargar los datos.");
      } finally {
        setLoadingData(false);
      }
    };

    loadAll();
    
    // Cleanup de la URL del documento al desmontar
    return () => {
        if (documentUrl) window.URL.revokeObjectURL(documentUrl);
    };
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
      setLastBlob(blob);
      
      // Descarga directa
      downloadBlob(blob, `Propuesta_${extractedData.client_company || 'TIVIT'}.docx`);

      message.success("Propuesta generada exitosamente.");
      setProposalReady(true);
    } catch (error) {
      console.error(error);
      message.error("Error al generar el documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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
      
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
        >
          ✕
        </button>
      )}

      {/* --- COLUMNA IZQUIERDA (3 Cols - Acciones y Chat) --- */}
      <div className="col-span-3 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-10">
        
        {/* Cabecera con Volver */}
        <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.back()}
                className="text-slate-500 hover:text-slate-800"
            >
                Volver
            </Button>
            <span className="font-semibold text-slate-700">Mesa de Trabajo</span>
        </div>

        {/* Panel de Acciones Principal */}
        <div className="p-4 border-b border-zinc-200 bg-slate-50/50">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
           
           {/* Botón de descarga extra si ya se generó */}
           {proposalReady && lastBlob && (
               <Button 
                 block 
                 icon={<DownloadOutlined />} 
                 onClick={() => downloadBlob(lastBlob, `Propuesta_${extractedData.client_company || 'TIVIT'}.docx`)}
                 className="mt-3 text-slate-600 border-slate-300 hover:border-blue-500 hover:text-blue-600"
               >
                 Descargar Nuevamente
               </Button>
           )}
        </div>
        
        {/* Chat Copilot */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden border-t border-zinc-100">
           <div className="text-[10px] uppercase font-bold text-gray-400 p-2 text-center tracking-wider bg-slate-50 border-b border-zinc-100">
             Asistente de Propuestas
           </div>
           <div className="flex-1 relative custom-copilot-wrapper">
             <CopilotChat 
                className="h-full w-full border-none shadow-none"
                instructions={`
                    Contexto: Generando propuesta para ${extractedData.client_company}.
                    Datos actuales: ${JSON.stringify(extractedData)}.
                    
                    IMPORTANTE: 
                    Si el usuario pide cambiar un dato (ej: "cambia el TVT"), usa la herramienta updateExtractedData.
                    AVISA SIEMPRE al usuario que debe pulsar "Generar Propuesta" nuevamente para ver los cambios reflejados en el documento final.
                `}
                labels={{
                  title: "Asistente",
                  initial: "¿Necesitas ajustar algún dato antes de generar la propuesta?",
                }}
             />
           </div>
        </div>
      </div>

      {/* --- COLUMNA CENTRAL (5 Cols - Previsualización) --- */}
      <div className="col-span-5 bg-gray-100 p-6 overflow-hidden flex flex-col relative border-r border-zinc-200">
         <DocumentPreviewPanel 
           showProposal={proposalReady} 
           isLoading={isGenerating}
           fileUrl={documentUrl}
         />
      </div>

      {/* --- COLUMNA DERECHA (4 Cols - Datos) --- */}
      <div className="col-span-4 bg-white h-full overflow-y-auto p-6 shadow-xl z-10 scrollbar-hide border-l border-zinc-200">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData} 
         />
      </div>
    </div>
  );
}
