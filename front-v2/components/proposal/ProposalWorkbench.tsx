"use client";

import React, { useState } from "react";
import { Button, message } from "antd";
import { CopilotChat } from "@copilotkit/react-ui";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";
import "@copilotkit/react-ui/styles.css";

interface ProposalWorkbenchProps {
  workspaceId: string;
  initialData?: any;
}

export default function ProposalWorkbench({ workspaceId, initialData }: ProposalWorkbenchProps) {
  const [data, setData] = useState(initialData || {
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
    
    try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        
        const response = await fetch(`${apiBaseUrl}/task/generate?format=docx`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to generate");

        // Simular descarga o previsualización
        // const blob = await response.blob(); 
        
        setProposalReady(true);
        message.success("Propuesta generada correctamente");
        
    } catch (error) {
        console.error(error);
        message.error("Error al generar la propuesta");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#131314] text-white overflow-hidden">
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CENTER: Document Preview */}
        <div className="flex-1 bg-zinc-900 border-r border-white/10 p-4 relative">
          <DocumentPreviewPanel 
             showProposal={proposalReady} 
             isLoading={isGenerating} 
          />
        </div>

        {/* RIGHT: Extracted Data */}
        <div className="w-[400px] bg-[#1E1F20] overflow-y-auto border-l border-white/10 flex flex-col shadow-xl z-10">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1E1F20] sticky top-0 z-10">
            <h2 className="text-white font-semibold m-0 text-sm">Datos del Análisis</h2>
            <Button 
                type="primary" 
                onClick={handleGenerate} 
                loading={isGenerating}
                className="bg-[#E31837] hover:!bg-[#C41530] border-none shadow-lg"
            >
              Generar Propuesta
            </Button>
          </div>
          <div className="p-4 flex-1">
             <ExtractedDataPanel 
                data={data} 
                setData={setData} 
             />
          </div>
        </div>
      </div>

      {/* BOTTOM: Chat */}
      <div className="h-[300px] border-t border-white/10 bg-[#131314] flex flex-col shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="px-4 py-2 border-b border-white/5 bg-[#1E1F20] flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                Chat de Contexto
            </span>
        </div>
        <div className="flex-1 relative overflow-hidden custom-copilot-wrapper bg-[#131314]">
            <CopilotChat 
                className="h-full w-full border-none"
                instructions="Eres un asistente experto en propuestas. Ayuda al usuario a refinar los datos del panel derecho y a redactar secciones de la propuesta."
                labels={{
                    title: "Asistente de Propuesta",
                    initial: "Estoy aquí para ayudarte a refinar los detalles de la propuesta antes de generarla.",
                }}
            />
        </div>
      </div>
    </div>
  );
}
