"use client";

import { FileText, CheckCircle2, Download } from "lucide-react";

interface Props {
  showProposal: boolean;
  isLoading: boolean;
  fileUrl?: string | null;
  fileType?: string; // e.g. "application/pdf", "image/png", "docx", etc.
}

export default function DocumentPreviewPanel({ showProposal, isLoading, fileUrl, fileType }: Props) {
  
  const isPdf = fileType?.toLowerCase().includes("pdf");
  const isImage = fileType?.toLowerCase().includes("image");
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-red-950/50 rounded-full flex items-center justify-center">
           <FileText className="w-8 h-8 text-[#E31837] animate-bounce" />
        </div>
        <h3 className="text-lg font-medium text-zinc-300 m-0">Generando Propuesta Comercial...</h3>
        <p className="text-sm text-zinc-500 max-w-xs text-center m-0">Analizando requerimientos, calculando TVT y redactando alcance.</p>
      </div>
    );
  }

  if (showProposal) {
    return (
      <div className="w-full h-full bg-[#1E1F20] rounded-xl shadow-sm border border-zinc-800 p-8 overflow-y-auto">
         <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h1 className="text-2xl font-bold text-white m-0">Propuesta Comercial Generada</h1>
         </div>
         
         {/* Since we are generating a DOCX blob, we can't preview it easily in browser without conversion. 
             So we show a placeholder for the preview or iframe if it was PDF. 
             Assuming generated proposal is DOCX for now based on 'generateProposalDocumentApi' */}
         
         <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
             <FileText className="w-16 h-16 mb-4 opacity-50" />
             <p className="text-lg font-medium">Vista previa de DOCX no disponible</p>
             <p className="text-sm">Descarga el archivo para ver el contenido completo.</p>
         </div>
      </div>
    );
  }

  if (fileUrl) {
      return (
        <div className="w-full h-full bg-[#1E1F20] rounded-xl shadow-sm border border-zinc-800 flex flex-col overflow-hidden">
           <div className="bg-[#131314] p-3 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-300">Documento Original {fileType ? `(${fileType})` : ''}</span>
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">Vista Previa</span>
           </div>
           
           <div className="flex-1 bg-[#252526] relative overflow-hidden flex items-center justify-center">
               {isPdf ? (
                   <iframe src={fileUrl} className="w-full h-full border-none" title="Documento Original" />
               ) : isImage ? (
                   <img src={fileUrl} alt="Documento" className="max-w-full max-h-full object-contain" />
               ) : (
                   <div className="text-center p-6">
                       <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-500" />
                       <h3 className="text-zinc-300 font-medium mb-2">Vista previa no disponible</h3>
                       <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                           Este formato de archivo ({fileType || 'desconocido'}) no se puede visualizar directamente en el navegador.
                       </p>
                       <a 
                         href={fileUrl} 
                         download={`documento_original.${fileType?.split('/').pop()?.split('.').pop() || 'dat'}`}
                         className="inline-flex items-center gap-2 px-4 py-2 bg-[#E31837] hover:bg-[#c41530] text-white rounded-lg transition-colors text-sm font-medium"
                       >
                           <Download className="w-4 h-4" />
                           Descargar para ver
                       </a>
                   </div>
               )}
           </div>
        </div>
      );
  }

  // Estado inicial: Muestra el documento subido (Placeholder)
  return (
    <div className="w-full h-full bg-[#1E1F20] rounded-xl shadow-sm border border-zinc-800 flex flex-col overflow-hidden">
       <div className="bg-[#131314] p-3 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-sm font-medium text-zinc-300">Documento no disponible</span>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">Offline</span>
       </div>
       <div className="flex-1 bg-[#0A0A0B]/50 flex items-center justify-center text-zinc-600">
          <div className="text-center">
             <FileText className="w-16 h-16 mx-auto mb-2 opacity-20" />
             <p className="m-0">No hay documento disponible para visualizar.</p>
          </div>
       </div>
    </div>
  );
}