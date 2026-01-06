"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat } from "@copilotkit/react-ui";
import { message, Spin, Button, Tooltip } from "antd";
import { 
  LoadingOutlined, 
  ArrowLeftOutlined, 
  DownloadOutlined, 
  MessageOutlined,
  FileTextOutlined
} from "@ant-design/icons";
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
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string | null>(null);

  // 1. Cargar Datos y Documento
  useEffect(() => {
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
            const mainDoc = docs[0]; 
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
    
    return () => {
        if (documentUrl) window.URL.revokeObjectURL(documentUrl);
        if (generatedDocUrl) window.URL.revokeObjectURL(generatedDocUrl);
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
      
      // Crear URL para visualización inmediata en el panel central
      const url = window.URL.createObjectURL(blob);
      setGeneratedDocUrl(url);

      message.success("Propuesta actualizada con los nuevos datos.");
      setProposalReady(true);
    } catch (error) {
      console.error(error);
      message.error("Error al generar el documento.");
    } finally {
      setIsGenerating(false);
    }
  };

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

  const goToChat = () => {
      router.push(`/workspace/${workspaceId}`);
  };

  if (loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#131314] text-white">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#E31837' }} spin />} />
        <span className="ml-4">Cargando Mesa de Trabajo...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F5F5F5] overflow-hidden font-sans relative">
      
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
        >
          ✕
        </button>
      )}

      {/* --- COLUMNA IZQUIERDA (Acciones y Chat) - Ancho Fijo --- */}
      <div className="w-[320px] flex-shrink-0 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-20">
        
        {/* Cabecera / Navegación */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white">
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.push('/quick-analysis')}
                className="text-slate-500 hover:text-slate-800 p-0 flex items-center"
            >
                Atrás
            </Button>
            
            <Tooltip title="Ir al chat completo del proyecto">
                <Button 
                    type="default"
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={goToChat}
                    className="text-blue-600 border-blue-200 hover:border-blue-400 bg-blue-50"
                >
                    Ir al Chat
                </Button>
            </Tooltip>
        </div>

        {/* Panel de Acciones Principal */}
        <div className="p-5 border-b border-zinc-200 bg-slate-50/80">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
           
           {/* Botón de descarga condicional */}
           {proposalReady && (
               <div className="mt-3 pt-3 border-t border-slate-200 animate-fade-in-up">
                   <Button 
                     block 
                     type="dashed"
                     icon={<DownloadOutlined />} 
                     onClick={handleDownload}
                     className="text-slate-600 border-slate-300 hover:text-blue-600 hover:border-blue-400"
                   >
                     Descargar .DOCX
                   </Button>
                   <p className="text-[10px] text-center text-slate-400 mt-2">
                       Generado: {new Date().toLocaleTimeString()}
                   </p>
               </div>
           )}
        </div>
        
        {/* Chat Copilot */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
           <div className="text-[10px] uppercase font-bold text-gray-400 p-2 text-center tracking-wider bg-white border-b border-zinc-100 flex items-center justify-center gap-2">
             <MessageOutlined /> Asistente de Análisis
           </div>
           <div className="flex-1 relative custom-copilot-wrapper">
             <CopilotChat 
                className="h-full w-full border-none shadow-none"
                instructions={`
                    Estás en la Mesa de Trabajo de Propuestas.
                    Contexto: Propuesta para ${extractedData.client_company}.
                    Datos actuales: ${JSON.stringify(extractedData)}.
                    
                    TU OBJETIVO: Ayudar al usuario a completar o corregir los datos de la columna derecha.
                    
                    SI EL USUARIO PIDE UN CAMBIO (ej: "El TVT es 1M"):
                    1. Usa la herramienta "updateExtractedData" para cambiarlo visualmente.
                    2. Dile al usuario: "He actualizado el dato. Dale a 'Generar Propuesta' para ver el cambio en el documento."
                `}
                labels={{
                  title: "Asistente",
                  initial: "Revisa los datos a la derecha. ¿Necesitas corregir algo antes de generar?",
                }}
             />
           </div>
        </div>
      </div>

      {/* --- COLUMNA CENTRAL (Previsualización) - Flexible --- */}
      <div className="flex-1 bg-gray-100 p-6 overflow-hidden flex flex-col relative">
         <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
             {/* Cabecera del visor */}
             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    {proposalReady ? (
                        <>
                            <FileTextOutlined className="text-green-500" />
                            <span className="font-semibold text-slate-700 text-sm">Propuesta Generada (Preview)</span>
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">NUEVO</span>
                        </>
                    ) : (
                        <>
                            <FileTextOutlined className="text-slate-500" />
                            <span className="font-semibold text-slate-700 text-sm">Documento Original (RFP)</span>
                            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium">SOLO LECTURA</span>
                        </>
                    )}
                </div>
                {proposalReady && (
                    <Button 
                        size="small" 
                        type="text" 
                        className="text-slate-500 hover:text-slate-800 text-xs"
                        onClick={() => setProposalReady(false)}
                    >
                        Ver original
                    </Button>
                )}
             </div>

             {/* Contenido del visor */}
             <div className="flex-1 relative bg-slate-100/50">
                 <DocumentPreviewPanel 
                   showProposal={proposalReady} 
                   isLoading={isGenerating}
                   fileUrl={proposalReady ? generatedDocUrl : documentUrl}
                 />
             </div>
         </div>
      </div>

      {/* --- COLUMNA DERECHA (Datos) - Ancho Fijo --- */}
      <div className="w-[400px] flex-shrink-0 bg-white h-full overflow-y-auto p-6 shadow-xl z-20 border-l border-zinc-200">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData} 
         />
      </div>
    </div>
  );
}