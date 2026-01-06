"use client";

import React, { useState, use } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

// Componentes
import AnalysisActionsPanel from "@/components/rfp/AnalysisActionsPanel";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Estado centralizado de los datos del RFP
  const [extractedData, setExtractedData] = useState({
    fecha: "",
    pais: "",
    empresa_cliente: "",
    nombre_operacion: "",
    tvt: "",
    stack_tecnologico: "",
    oportunidad: "RFP",
    precio: "",
    tiempo_aproximado: "",
    nro_recursos: "",
    categoria: "",
    objetivo: ""
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulación de llamada al backend
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
    setProposalReady(true);
  };

  return (
    <div className="grid grid-cols-12 h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* --- COLUMNA IZQUIERDA (20%) --- */}
      <div className="col-span-2 border-r border-zinc-200 bg-white flex flex-col h-full shadow-sm z-10">
        {/* Panel de Acciones Superior */}
        <div className="p-4 border-b border-zinc-200">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
        </div>
        
        {/* Mini Chat Copilot (Ocupa el resto del alto) */}
        <div className="flex-1 flex flex-col bg-gray-50">
           <div className="text-[10px] uppercase font-bold text-gray-400 p-2 text-center tracking-wider bg-white border-b border-zinc-100">
             Asistente de Análisis
           </div>
           <div className="flex-1 overflow-hidden relative custom-copilot-wrapper bg-white">
             <CopilotChat 
                className="h-full w-full border-none shadow-none"
                instructions="Eres un asistente experto en licitaciones (RFP). Tu objetivo es ayudar al usuario a revisar y corregir los datos extraídos en el panel derecho. Si el usuario te dice 'Cambia el TVT a 500k', usa la herramienta updateExtractedData."
                labels={{
                  title: "Chat Assistant",
                  initial: "Hola, puedo ayudarte a corregir los datos extraídos o analizar el RFP.",
                }}
             />
           </div>
        </div>
      </div>

      {/* --- COLUMNA CENTRAL (50%) --- */}
      <div className="col-span-6 bg-gray-100/50 p-6 overflow-y-auto flex flex-col relative border-r border-zinc-200">
         <DocumentPreviewPanel 
           showProposal={proposalReady} 
           isLoading={isGenerating} 
         />
      </div>

      {/* --- COLUMNA DERECHA (30%) --- */}
      <div className="col-span-4 bg-white h-full overflow-y-auto p-6 shadow-xl z-10">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData} 
         />
      </div>

    </div>
  );
}