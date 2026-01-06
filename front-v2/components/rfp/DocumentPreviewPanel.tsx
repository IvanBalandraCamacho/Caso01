"use client";

import { FileText, CheckCircle2 } from "lucide-react";

interface Props {
  showProposal: boolean;
  isLoading: boolean;
  fileUrl?: string | null;
}

export default function DocumentPreviewPanel({ showProposal, isLoading, fileUrl }: Props) {
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
           <FileText className="w-8 h-8 text-blue-500 animate-bounce" />
        </div>
        <h3 className="text-lg font-medium text-slate-600 m-0">Generando Propuesta Comercial...</h3>
        <p className="text-sm text-slate-400 max-w-xs text-center m-0">Analizando requerimientos, calculando TVT y redactando alcance.</p>
      </div>
    );
  }

  if (showProposal) {
    return (
      <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-y-auto">
         <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h1 className="text-2xl font-bold text-slate-800 m-0">Propuesta Comercial Generada</h1>
         </div>
         
         <div className="prose max-w-none text-slate-600">
            <p>Aquí se renderizaría el contenido completo de la propuesta generada por la IA...</p>
            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">1. Alcance del Proyecto</h3>
            <p>Lorem ipsum dolor sit amet...</p>
            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">2. Estimación Económica</h3>
            <p>Detalle del TVT y breakdown de costos...</p>
            {/* Aquí iría el componente MarkdownRenderer real */}
         </div>
      </div>
    );
  }

  if (fileUrl) {
      return (
        <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
           <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Documento Original</span>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">Vista Previa</span>
           </div>
           <iframe src={fileUrl} className="w-full h-full border-none" title="Documento Original" />
        </div>
      );
  }

  // Estado inicial: Muestra el documento subido (Placeholder)
  return (
    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
       <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600">Documento no disponible</span>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">Offline</span>
       </div>
       <div className="flex-1 bg-slate-50/50 flex items-center justify-center text-slate-300">
          <div className="text-center">
             <FileText className="w-16 h-16 mx-auto mb-2 opacity-20" />
             <p className="m-0">No se pudo cargar la vista previa</p>
          </div>
       </div>
    </div>
  );
}