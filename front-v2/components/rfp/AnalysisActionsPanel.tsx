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
      <div className="text-sm font-medium text-slate-600">Acciones</div>
      
      <Button 
        onClick={onGenerate}
        disabled={isGenerating}
        type="primary"
        className={`
           w-full h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all border-none
           ${isGenerating ? "bg-slate-100 text-slate-400 border-2 border-slate-200 !shadow-none" : "bg-blue-600 hover:!bg-blue-700 text-white shadow-lg shadow-blue-200"}
        `}
        style={{ height: 'auto', padding: '16px' }}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Analizando documento...</span>
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
        <p className="text-xs text-slate-400 text-center px-2 m-0">
          La IA analizará el documento cargado y rellenará la tabla de datos automáticamente.
        </p>
      )}
    </div>
  );
}
