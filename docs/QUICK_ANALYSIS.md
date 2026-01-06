# Implementación de Diseño: Análisis RFP (Quick Analysis)

## 📋 Descripción General
Reestructuración de la página de Análisis Rápido (`quick-analysis`) para optimizar el flujo de trabajo del usuario. El diseño se basa en un **Grid de 3 columnas fijas**:

1.  **Columna Izquierda (20%)**: Acciones principales y Asistente IA (Chat) embebido para control.
2.  **Columna Central (50%)**: Visor de documentos y visualización de la propuesta generada.
3.  **Columna Derecha (30%)**: Formulario de datos extraídos (TVT, Fechas, Stack) editable manualmente o mediante IA.

---

## 📂 1. Página Principal (`page.tsx`)

**Ubicación:** `front-v2/app/workspace/[id]/quick-analysis/page.tsx`

Define la estructura del Grid y gestiona el estado global de los datos para que Copilot pueda acceder a ellos desde cualquier parte.

```tsx
"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

// Componentes
import AnalysisActionsPanel from "@/components/rfp/AnalysisActionsPanel";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";

export default function AnalysisPage({ params }: { params: { id: string } }) {
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
    <CopilotKit publicApiKey={process.env.NEXT_PUBLIC_COPILOT_KEY}>
      <div className="grid grid-cols-12 h-screen bg-gray-50 overflow-hidden">
        
        {/* --- COLUMNA IZQUIERDA (20%) --- */}
        <div className="col-span-2 border-r bg-white flex flex-col h-full shadow-sm z-10">
          {/* Panel de Acciones Superior */}
          <div className="p-4 border-b">
             <AnalysisActionsPanel 
               onGenerate={handleGenerate}
               isGenerating={isGenerating}
             />
          </div>
          
          {/* Mini Chat Copilot (Ocupa el resto del alto) */}
          <div className="flex-1 flex flex-col bg-gray-50">
             <div className="text-[10px] uppercase font-bold text-gray-400 p-2 text-center tracking-wider">
               Asistente de Análisis
             </div>
             <div className="flex-1 overflow-hidden relative custom-copilot-wrapper">
               <CopilotChat 
                  className="h-full w-full"
                  instructions="Eres un asistente experto en licitaciones (RFP). Tu objetivo es ayudar al usuario a revisar y corregir los datos extraídos en el panel derecho. Si el usuario te dice 'Cambia el TVT a 500k', usa la herramienta updateExtractedData."
               />
             </div>
          </div>
        </div>

        {/* --- COLUMNA CENTRAL (50%) --- */}
        <div className="col-span-6 bg-gray-100/50 p-6 overflow-y-auto flex flex-col relative">
           <DocumentPreviewPanel 
             showProposal={proposalReady} 
             isLoading={isGenerating} 
           />
        </div>

        {/* --- COLUMNA DERECHA (30%) --- */}
        <div className="col-span-4 bg-white border-l h-full overflow-y-auto p-6 shadow-xl z-10">
           <ExtractedDataPanel 
              data={extractedData} 
              setData={setExtractedData} 
           />
        </div>

      </div>
    </CopilotKit>
  );
}
📝 2. Panel de Datos Extraídos (ExtractedDataPanel.tsx)
Ubicación: front-v2/components/rfp/ExtractedDataPanel.tsx

Este componente conecta los campos del formulario con la IA. Permite que el chat de la izquierda "lea" y "escriba" en estos campos.

TypeScript

"use client";

import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Sparkles } from "lucide-react";

export default function ExtractedDataPanel({ data, setData }: any) {
  
  // 1. READABLE: La IA ve el estado actual del formulario
  useCopilotReadable({
    description: "Formulario con los datos extraídos del RFP (Cliente, TVT, Stack, etc.)",
    value: data,
  });

  // 2. ACTION: La IA puede modificar los campos
  useCopilotAction({
    name: "updateExtractedData",
    description: "Actualiza un campo específico de los datos del RFP.",
    parameters: [
      { name: "field", type: "string", description: "Campo a editar (ej: tvt, empresa_cliente, stack_tecnologico)" },
      { name: "value", type: "string", description: "Nuevo valor para el campo" }
    ],
    handler: async ({ field, value }) => {
      setData((prev: any) => ({ ...prev, [field]: value }));
      return `✅ Campo '${field}' actualizado correctamente.`;
    },
  });

  const handleChange = (field: string, value: string) => {
    setData({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Datos del RFP
        </h2>
        <span className="text-xs text-slate-400">Autocompletado por IA</span>
      </div>
      
      <div className="space-y-5">
        
        {/* TVT - Campo Destacado */}
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 ring-1 ring-blue-200">
          <Label className="text-blue-900 font-bold text-xs uppercase tracking-wide">TVT (Valor Total)</Label>
          <div className="flex items-center mt-1">
             <span className="text-blue-400 font-bold mr-2 text-lg">$</span>
             <Input 
                value={data.tvt} 
                onChange={(e) => handleChange("tvt", e.target.value)}
                className="font-mono text-xl font-bold text-blue-700 bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-blue-200"
                placeholder="0.00"
             />
          </div>
        </div>

        {/* Datos Generales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Fecha</Label>
            <Input value={data.fecha} onChange={(e) => handleChange("fecha", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">País</Label>
            <Input value={data.pais} onChange={(e) => handleChange("pais", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Empresa Cliente</Label>
          <Input value={data.empresa_cliente} onChange={(e) => handleChange("empresa_cliente", e.target.value)} className="font-medium" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Nombre Operación</Label>
          <Input value={data.nombre_operacion} onChange={(e) => handleChange("nombre_operacion", e.target.value)} />
        </div>

        {/* Stack y Oportunidad */}
        <div className="space-y-1">
           <Label className="text-xs text-slate-500">Stack Tecnológico</Label>
           <Textarea 
              value={data.stack_tecnologico} 
              onChange={(e) => handleChange("stack_tecnologico", e.target.value)} 
              className="min-h-[80px] text-sm"
           />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1">
             <Label className="text-xs text-slate-500">Oportunidad</Label>
             <select 
                className="w-full flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={data.oportunidad}
                onChange={(e) => handleChange("oportunidad", e.target.value)}
             >
                <option value="RFP">RFP</option>
                <option value="RFI">RFI</option>
                <option value="Intencion">Intención de Compra</option>
             </select>
           </div>
           <div className="space-y-1">
             <Label className="text-xs text-slate-500">Precio Estimado</Label>
             <Input value={data.precio} onChange={(e) => handleChange("precio", e.target.value)} />
           </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Objetivo del Proyecto</Label>
          <Textarea 
            value={data.objetivo}
            onChange={(e) => handleChange("objetivo", e.target.value)}
            className="min-h-[100px] bg-slate-50"
          />
        </div>
      </div>

      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-6 gap-2">
        <Save className="w-4 h-4" /> Guardar en Dashboard
      </Button>
    </div>
  );
}
🕹️ 3. Panel de Acciones (AnalysisActionsPanel.tsx)
Ubicación: front-v2/components/rfp/AnalysisActionsPanel.tsx

Botón principal que inicia el proceso de generación de propuesta.

TypeScript

"use client";

import { Button } from "@/components/ui/button";
import { FileText, Loader2, ArrowRight } from "lucide-react";

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
        className={`
           w-full h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all
           ${isGenerating ? "bg-slate-100 text-slate-400 border-2 border-slate-200" : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"}
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs font-medium">Analizando documento...</span>
          </>
        ) : (
          <>
            <FileText className="w-6 h-6" />
            <div className="flex flex-col items-center">
               <span className="font-bold">Generar Propuesta</span>
               <span className="text-[10px] opacity-80 font-normal">Comercial & Técnica</span>
            </div>
          </>
        )}
      </Button>

      {!isGenerating && (
        <p className="text-xs text-slate-400 text-center px-2">
          La IA analizará el documento cargado y rellenará la tabla de datos automáticamente.
        </p>
      )}
    </div>
  );
}
📄 4. Panel de Documentos (DocumentPreviewPanel.tsx)
Ubicación: front-v2/components/rfp/DocumentPreviewPanel.tsx

Muestra el PDF original o la propuesta generada con un estado de carga intermedio.

TypeScript

"use client";

import { FileText, CheckCircle2 } from "lucide-react";

interface Props {
  showProposal: boolean;
  isLoading: boolean;
}

export default function DocumentPreviewPanel({ showProposal, isLoading }: Props) {
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
           <FileText className="w-8 h-8 text-blue-500 animate-bounce" />
        </div>
        <h3 className="text-lg font-medium text-slate-600">Generando Propuesta Comercial...</h3>
        <p className="text-sm text-slate-400 max-w-xs text-center">Analizando requerimientos, calculando TVT y redactando alcance.</p>
      </div>
    );
  }

  if (showProposal) {
    return (
      <div className="w-full h-full bg-white rounded-xl shadow-sm border p-8 overflow-y-auto">
         <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h1 className="text-2xl font-bold text-slate-800">Propuesta Comercial Generada</h1>
         </div>
         
         <div className="prose max-w-none text-slate-600">
            <p>Aquí se renderizaría el contenido completo de la propuesta generada por la IA...</p>
            <h3>1. Alcance del Proyecto</h3>
            <p>Lorem ipsum dolor sit amet...</p>
            <h3>2. Estimación Económica</h3>
            <p>Detalle del TVT y breakdown de costos...</p>
            {/* Aquí iría el componente MarkdownRenderer real */}
         </div>
      </div>
    );
  }

  // Estado inicial: Muestra el documento subido (Placeholder)
  return (
    <div className="w-full h-full bg-white rounded-xl shadow-sm border flex flex-col">
       <div className="bg-slate-100 p-3 border-b flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600">RFP_Cliente_2024.pdf</span>
          <span className="text-xs bg-slate-200 px-2 py-1 rounded">Solo Lectura</span>
       </div>
       <div className="flex-1 bg-slate-50 flex items-center justify-center text-slate-300">
          {/* Aquí iría el <iframe /> o visor de PDF */}
          <div className="text-center">
             <FileText className="w-16 h-16 mx-auto mb-2 opacity-20" />
             <p>Previsualización del Documento</p>
          </div>
       </div>
    </div>
  );
}