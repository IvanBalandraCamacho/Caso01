"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { App, Spin, Button, Tooltip, Select } from "antd";
import {
  LoadingOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  MessageOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import { CopilotChat } from "@copilotkit/react-ui";
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
  const { message } = App.useApp();
  
  // Estados
  const [extractedData, setExtractedData] = useState<any>(initialData || {});
  const [loadingData, setLoadingData] = useState(!initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string | null>(null);

  // 1. Cargar Datos y Documento
  useEffect(() => {
    const loadAll = async () => {
      try {
        if (!initialData) setLoadingData(true);
        
        // Cargar detalles del workspace solo si no tenemos datos iniciales
        if (!initialData) {
            const workspace = await fetchWorkspaceDetails(workspaceId);
            
            // Intentar parsear los datos del análisis desde instructions
            let analysisData: any = {};
            if (workspace.instructions) {
              try {
                analysisData = JSON.parse(workspace.instructions);
              } catch (e) {
                console.warn("No se pudo parsear instructions como JSON");
              }
            }
            
            // Combinar datos del workspace con datos del análisis
            setExtractedData({
              // Datos básicos del workspace
              cliente: workspace.client_company || analysisData.cliente || "",
              nombre_operacion: workspace.operation_name || analysisData.nombre_operacion || "",
              tvt: workspace.tvt || analysisData.alcance_economico?.presupuesto || 0,
              pais: workspace.country || analysisData.pais || "",
              stack_tecnologico: Array.isArray(workspace.tech_stack) 
                ? workspace.tech_stack.join(", ") 
                : (Array.isArray(analysisData.stack_tecnologico) 
                  ? analysisData.stack_tecnologico.join(", ") 
                  : ""),
              categoria: workspace.category || analysisData.categoria || "",
              oportunidad: workspace.opportunity_type || analysisData.tipo_oportunidad || "RFP",
              objetivo: workspace.objective || analysisData.objetivo_general || "",
              fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
              // Tiempo y recursos
              tiempo_aproximado: workspace.estimated_time || analysisData.tiempo_aproximado || "",
              nro_recursos: workspace.resource_count || analysisData.nro_recursos || 0,
              // Datos adicionales del análisis
              equipo_sugerido: analysisData.equipo_sugerido || [],
              fechas_y_plazos: analysisData.fechas_y_plazos || [],
              preguntas_sugeridas: analysisData.preguntas_sugeridas || [],
              moneda: analysisData.alcance_economico?.moneda || "USD"
            });
        }

        // Cargar documentos del workspace
        const docs = await fetchWorkspaceDocuments(workspaceId);
        setDocuments(docs || []);
        
        if (docs && docs.length > 0) {
            // Seleccionar el primero por defecto (que debería ser el más reciente por la corrección en backend)
            const mainDoc = docs[0]; 
            setSelectedDocId(mainDoc.id);
            setDocumentType(mainDoc.file_type);
            
            try {
                const blob = await fetchDocumentContent(workspaceId, mainDoc.id);
                const url = window.URL.createObjectURL(blob);
                setDocumentUrl(url);
            } catch (err) {
                console.error("Error cargando contenido del documento:", err);
                message.warning("No se pudo cargar la vista previa del documento.");
            }
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

  const handleDocumentChange = async (docId: string) => {
      setSelectedDocId(docId);
      const selectedDoc = documents.find(d => d.id === docId);
      if (!selectedDoc) return;
      
      setDocumentType(selectedDoc.file_type);
      setProposalReady(false); // Volver a ver original si se cambia
      
      try {
          // Revocar URL anterior para liberar memoria
          if (documentUrl) window.URL.revokeObjectURL(documentUrl);
          
          const blob = await fetchDocumentContent(workspaceId, docId);
          const url = window.URL.createObjectURL(blob);
          setDocumentUrl(url);
      } catch (err) {
          console.error("Error cambiando documento:", err);
          message.error("Error al cargar el documento seleccionado.");
      }
  };

  // 2. Manejar Generación
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Transformar datos del formulario al formato esperado por el backend
      const proposalData = {
        workspace_id: workspaceId,
        cliente: extractedData.cliente || "",
        nombre_operacion: extractedData.nombre_operacion || "",
        pais: extractedData.pais || "",
        categoria: extractedData.categoria || "",
        // Alcance económico como objeto estructurado
        alcance_economico: {
          presupuesto: extractedData.tvt || extractedData.precio || "",
          moneda: extractedData.moneda || "USD"
        },
        // Objetivo general (el backend acepta string o lista)
        objetivo_general: extractedData.objetivo || "",
        objetivo_proyecto: extractedData.objetivo || "",
        // Tecnologías como array
        tecnologias_requeridas: typeof extractedData.stack_tecnologico === 'string'
          ? extractedData.stack_tecnologico.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (extractedData.stack_tecnologico || []),
        // Equipo y preguntas - Usar equipo_seleccionado si existe, sino equipo_sugerido
        equipo_sugerido: extractedData.equipo_seleccionado?.length > 0 
          ? extractedData.equipo_seleccionado 
          : (extractedData.equipo_sugerido || []),
        preguntas_sugeridas: extractedData.preguntas_sugeridas || [],
        // Fecha de entrega
        fecha_entrega: extractedData.fecha || new Date().toISOString().split('T')[0]
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
      link.download = `Propuesta_${extractedData.cliente || 'TIVIT'}.docx`;
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
    <div className="flex h-screen w-full bg-[#131314] overflow-hidden font-sans relative">
      
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
        >
          ✕
        </button>
      )}

      {/* --- COLUMNA IZQUIERDA (Acciones y Chat) - Ancho Fijo --- */}
      <div className="w-[320px] flex-shrink-0 border-r border-zinc-800 bg-[#1E1F20] flex flex-col h-full shadow-sm z-20">
        
        {/* Cabecera / Navegación */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#1E1F20]">
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.push('/quick-analysis')}
                className="text-zinc-400 hover:text-white p-0 flex items-center"
            >
                Atrás
            </Button>
            
            <Tooltip title="Ir al chat completo del proyecto">
                <Button 
                    type="default"
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={goToChat}
                    className="text-[#E31837] border-red-900/30 hover:border-[#E31837] bg-red-950/20"
                >
                    Ir al Chat
                </Button>
            </Tooltip>
        </div>

        {/* Panel de Acciones Principal */}
        <div className="p-5 border-b border-zinc-800 bg-[#131314]/80">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
           
           {/* Botón de descarga condicional */}
           {proposalReady && (
               <div className="mt-3 pt-3 border-t border-zinc-700 animate-fade-in-up">
                   <Button 
                     block 
                     type="dashed"
                     icon={<DownloadOutlined />} 
                     onClick={handleDownload}
                     className="text-zinc-300 border-zinc-700 hover:text-[#E31837] hover:border-[#E31837]"
                   >
                     Descargar .DOCX
                   </Button>
                   <p className="text-[10px] text-center text-zinc-500 mt-2">
                       Generado: {new Date().toLocaleTimeString()}
                   </p>
               </div>
           )}
        </div>
        
        {/* Chat Copilot */}
        <div className="flex-1 flex flex-col bg-[#1E1F20] overflow-hidden relative">
           <div className="text-[10px] uppercase font-bold text-zinc-400 p-2 text-center tracking-wider bg-[#131314] border-b border-zinc-800 flex items-center justify-center gap-2">
             <MessageOutlined /> Asistente de Análisis
           </div>
           <div className="flex-1 relative custom-copilot-wrapper">
             <CopilotChat 
                className="h-full w-full border-none shadow-none"
                instructions={`
                    Estás en la Mesa de Trabajo de Propuestas.
                    Contexto: Propuesta para ${extractedData.cliente}.
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
      <div className="flex-1 bg-[#0A0A0B] p-6 overflow-hidden flex flex-col relative">
         <div className="h-full bg-[#1E1F20] rounded-xl shadow-sm border border-zinc-800 overflow-hidden flex flex-col">
             {/* Cabecera del visor */}
             <div className="bg-[#131314] px-4 py-3 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {proposalReady ? (
                        <>
                            <FileTextOutlined className="text-green-500 flex-shrink-0" />
                            <span className="font-semibold text-white text-sm truncate">Propuesta Generada (Preview)</span>
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0">NUEVO</span>
                        </>
                    ) : (
                        <>
                            <FileTextOutlined className="text-zinc-400 flex-shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0 mr-4">
                                {documents.length > 1 ? (
                                    <Select
                                        value={selectedDocId}
                                        onChange={handleDocumentChange}
                                        bordered={false}
                                        className="text-white font-semibold min-w-[200px]"
                                        popupMatchSelectWidth={false}
                                        dropdownStyle={{ backgroundColor: '#1E1F20', border: '1px solid #303030' }}
                                        suffixIcon={<span className="text-zinc-500">▼</span>}
                                        options={documents.map(doc => ({
                                            value: doc.id,
                                            label: <span className="text-zinc-200">{doc.file_name}</span>
                                        }))}
                                    />
                                ) : (
                                    <span className="font-semibold text-white text-sm truncate">
                                        {documents.length > 0 ? documents[0].file_name : "Documento Original (RFP)"}
                                    </span>
                                )}
                            </div>
                            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0">SOLO LECTURA</span>
                        </>
                    )}
                </div>
                {proposalReady && (
                    <Button 
                        size="small" 
                        type="text" 
                        className="text-zinc-400 hover:text-white text-xs"
                        onClick={() => setProposalReady(false)}
                    >
                        Ver original
                    </Button>
                )}
             </div>

             {/* Contenido del visor */}
             <div className="flex-1 relative bg-[#0A0A0B]/50">
                 <DocumentPreviewPanel 
                   showProposal={proposalReady} 
                   isLoading={isGenerating}
                   fileUrl={proposalReady ? generatedDocUrl : documentUrl}
                   fileType={proposalReady ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : (documentType || undefined)}
                 />
             </div>
         </div>
      </div>

      {/* --- COLUMNA DERECHA (Datos) - Ancho Fijo --- */}
      <div className="w-[400px] flex-shrink-0 bg-[#1E1F20] h-full overflow-y-auto p-6 shadow-xl z-20 border-l border-zinc-800">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData} 
         />
      </div>
    </div>
  );
}