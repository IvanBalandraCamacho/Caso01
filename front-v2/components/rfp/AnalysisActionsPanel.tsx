"use client";

import { Button } from "antd";
import { FileText, Loader2 } from "lucide-react";

interface Props {
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function AnalysisActionsPanel({ onGenerate, isGenerating }: Props) {
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="text-sm font-medium text-zinc-300">Acciones</div>
      
      <Button 
        onClick={onGenerate}
        disabled={isGenerating}
        type="primary"
        className={`
           w-full h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all border-none
           ${isGenerating ? "bg-zinc-800 text-zinc-500 border-2 border-zinc-700 !shadow-none" : "bg-[#E31837] hover:!bg-[#C01530] text-white shadow-lg shadow-red-900/50"}
        `}
        style={{ height: 'auto', padding: '16px' }}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            <span className="text-xs font-medium text-zinc-500">Analizando documento...</span>
          </>
        ) : (
          <>
            <FileText className="w-6 h-6" />
            <div className="flex flex-col items-center leading-tight">
               <span className="font-bold text-sm">Generar Propuesta</span>
               <span className="text-[10px] opacity-80 font-normal">Comercial & Técnica</span>
            </div>
          </>
        )}
      </Button>

      {!isGenerating && (
        <p className="text-xs text-zinc-400 text-center px-2 m-0">
          La IA analizará el documento cargado y rellenará la tabla de datos automáticamente.
        </p>
      )}
    </div>
  );
}
