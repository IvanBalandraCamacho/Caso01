"use client";

import React, { useState, useMemo } from "react";
import { FileText, CheckCircle2, Download, Eye, Maximize2, Copy, Check, Code } from "lucide-react";
import { Modal, Tabs, Tooltip, Button, Tag, Empty } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  showProposal: boolean;
  isLoading: boolean;
  fileUrl?: string | null;
  fileType?: string;
  // Nuevas props para preview de markdown (Fase 5.2)
  markdownContent?: string;
  onDownload?: (format: "pdf" | "docx") => Promise<void>;
  isDownloading?: boolean;
  metadata?: {
    cliente?: string;
    fecha?: string;
    tipo?: string;
  };
}

export default function DocumentPreviewPanel({ 
  showProposal, 
  isLoading, 
  fileUrl, 
  fileType,
  markdownContent,
  onDownload,
  isDownloading = false,
  metadata
}: Props) {
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const isPdf = fileType?.toLowerCase().includes("pdf");
  const isImage = fileType?.toLowerCase().includes("image");

  // Componentes de markdown estilizados para preview
  const markdownComponents = useMemo(() => ({
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-2xl font-bold text-white mt-6 mb-4 border-b border-zinc-700 pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xl font-bold text-white mt-5 mb-3 text-[#E31837]">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-lg font-semibold text-zinc-200 mt-4 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-zinc-300 leading-relaxed mb-4">
        {children}
      </p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-6 mb-4 space-y-1 text-zinc-300">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1 text-zinc-300">
        {children}
      </ol>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-zinc-700">
        <table className="w-full border-collapse bg-zinc-900/50 text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-zinc-800 text-zinc-200">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-zinc-700">{children}</tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
      <tr className="hover:bg-zinc-800/50 transition-colors">{children}</tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-4 py-3 text-left font-semibold text-zinc-200">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-4 py-3 text-zinc-400">{children}</td>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="text-white font-semibold">{children}</strong>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-[#E31837] pl-4 my-4 italic text-zinc-400 bg-zinc-900/30 py-2 rounded-r">
        {children}
      </blockquote>
    ),
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-zinc-800 text-orange-400 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      ) : (
        <code className="block bg-zinc-900 p-4 rounded-lg text-sm font-mono overflow-x-auto text-zinc-300 my-2 border border-zinc-700">
          {children}
        </code>
      );
    },
  }), []);

  const handleCopy = async () => {
    if (markdownContent) {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    if (onDownload) {
      await onDownload(format);
    }
  };
  
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

  // Vista de propuesta generada con contenido markdown
  if (showProposal) {
    return (
      <div className="w-full h-full bg-[#1E1F20] rounded-xl shadow-sm border border-zinc-800 flex flex-col overflow-hidden">
         <div className="flex items-center justify-between gap-2 p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-white m-0">Propuesta Comercial</h2>
            </div>
            <div className="flex items-center gap-2">
              {markdownContent && (
                <Tooltip title="Ver en pantalla completa">
                  <button 
                    onClick={() => setShowMarkdownModal(true)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>
         </div>
         
         {markdownContent ? (
           <div className="flex-1 overflow-y-auto p-6">
             <div className="prose prose-invert max-w-none">
               <ReactMarkdown
                 remarkPlugins={[remarkGfm]}
                 components={markdownComponents}
               >
                 {markdownContent}
               </ReactMarkdown>
             </div>
           </div>
         ) : (
           <div className="flex flex-col items-center justify-center flex-1 text-zinc-400">
               <FileText className="w-16 h-16 mb-4 opacity-50" />
               <p className="text-lg font-medium">Vista previa de DOCX no disponible</p>
               <p className="text-sm">Descarga el archivo para ver el contenido completo.</p>
           </div>
         )}

         {/* Footer con botones de descarga */}
         <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-[#131314]">
           <div className="flex items-center gap-2">
             {metadata?.tipo && <Tag color="blue">{metadata.tipo}</Tag>}
             {metadata?.cliente && <span className="text-xs text-zinc-500">Cliente: {metadata.cliente}</span>}
           </div>
           <div className="flex items-center gap-2">
             <button
               onClick={() => handleDownload("docx")}
               disabled={isDownloading}
               className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
             >
               <Download className="w-4 h-4" />
               Word
             </button>
             <button
               onClick={() => handleDownload("pdf")}
               disabled={isDownloading}
               className="flex items-center gap-2 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
             >
               <Download className="w-4 h-4" />
               PDF
             </button>
           </div>
         </div>

         {/* Modal para vista completa de markdown */}
         <Modal
           title={
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-[#E31837] to-[#FF6B00] rounded-xl flex items-center justify-center">
                 <Eye className="text-white w-5 h-5" />
               </div>
               <div>
                 <div className="text-white font-semibold">Vista Previa del Documento</div>
                 {metadata?.cliente && (
                   <div className="text-xs text-zinc-500">Cliente: {metadata.cliente}</div>
                 )}
               </div>
             </div>
           }
           open={showMarkdownModal}
           onCancel={() => setShowMarkdownModal(false)}
           width={isFullscreen ? "100%" : 900}
           style={{ 
             top: isFullscreen ? 0 : 20,
             maxWidth: isFullscreen ? "100vw" : undefined,
           }}
            styles={{
              body: { background: "#131314", padding: "0", height: isFullscreen ? "calc(100vh - 110px)" : "70vh", overflow: "hidden" },
              header: { background: "#1A1A1C", borderBottom: "1px solid #2A2A2D", padding: "16px 24px" }
            }}
           footer={
             <div className="flex justify-between items-center bg-[#1A1A1C] p-4 border-t border-zinc-800">
               <div className="flex items-center gap-2">
                 {metadata?.tipo && <Tag color="blue">{metadata.tipo}</Tag>}
                 {metadata?.fecha && <span className="text-xs text-zinc-500">{metadata.fecha}</span>}
               </div>
               <div className="flex items-center gap-3">
                 <Tooltip title="Pantalla completa">
                   <Button
                     type="text"
                     icon={<Maximize2 className="w-4 h-4" />}
                     onClick={() => setIsFullscreen(!isFullscreen)}
                     className="text-zinc-400 hover:text-white"
                   />
                 </Tooltip>
                 <Tooltip title={copied ? "Copiado!" : "Copiar Markdown"}>
                   <Button
                     type="text"
                     icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                     onClick={handleCopy}
                     className="text-zinc-400 hover:text-white"
                   />
                 </Tooltip>
                 <Button
                   icon={<Download className="w-4 h-4" />}
                   loading={isDownloading}
                   onClick={() => handleDownload("docx")}
                   className="bg-blue-600 hover:bg-blue-700 border-none text-white"
                 >
                   Word
                 </Button>
                 <Button
                   icon={<Download className="w-4 h-4" />}
                   loading={isDownloading}
                   onClick={() => handleDownload("pdf")}
                   className="bg-red-700 hover:bg-red-800 border-none text-white"
                 >
                   PDF
                 </Button>
               </div>
             </div>
           }
         >
           <Tabs
             activeKey={activeTab}
             onChange={setActiveTab}
             className="h-full"
             tabBarStyle={{
               background: "#1A1A1C",
               margin: 0,
               padding: "0 24px",
               borderBottom: "1px solid #2A2A2D"
             }}
             items={[
               {
                 key: "preview",
                 label: <span className="text-zinc-300"><Eye className="inline w-4 h-4 mr-2" />Vista Previa</span>,
                 children: (
                   <div className="p-8 overflow-y-auto" style={{ height: isFullscreen ? "calc(100vh - 220px)" : "calc(70vh - 60px)" }}>
                     {markdownContent ? (
                       <div className="prose prose-invert max-w-none">
                         <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                           {markdownContent}
                         </ReactMarkdown>
                       </div>
                     ) : (
                       <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-zinc-500">No hay contenido</span>} />
                     )}
                   </div>
                 )
               },
               {
                 key: "source",
                 label: <span className="text-zinc-300"><Code className="inline w-4 h-4 mr-2" />Markdown</span>,
                 children: (
                   <div className="p-4 overflow-y-auto" style={{ height: isFullscreen ? "calc(100vh - 220px)" : "calc(70vh - 60px)" }}>
                     <pre className="bg-zinc-900 p-4 rounded-lg text-sm font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto border border-zinc-800">
                       {markdownContent || "// Sin contenido"}
                     </pre>
                   </div>
                 )
               }
             ]}
           />
         </Modal>
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
                           Este formato de archivo ({fileType || 'desconocido'}) no se puede visualizar directamente.
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

  // Estado inicial
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
