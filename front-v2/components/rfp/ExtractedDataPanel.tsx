"use client";

import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { Input, Button, Typography, Select, Card } from "antd";
import { Save, Sparkles } from "lucide-react";

const { TextArea } = Input;
const { Text } = Typography;

interface ExtractedDataPanelProps {
  data: any;
  setData: (data: any) => void;
}

export default function ExtractedDataPanel({ data, setData }: ExtractedDataPanelProps) {
  
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
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 m-0">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Datos del RFP
        </h2>
        <span className="text-xs text-slate-400">Autocompletado por IA</span>
      </div>
      
      <div className="space-y-5">
        
        {/* TVT - Campo Destacado */}
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 ring-1 ring-blue-200 mb-4">
          <Text className="text-blue-900 font-bold text-xs uppercase tracking-wide block mb-1">TVT (Valor Total)</Text>
          <div className="flex items-center mt-1">
             <span className="text-blue-400 font-bold mr-2 text-lg">$</span>
             <Input 
                value={data.tvt} 
                onChange={(e) => handleChange("tvt", e.target.value)}
                className="font-mono text-xl font-bold text-blue-700 bg-transparent border-none p-0 focus:shadow-none placeholder:text-blue-200 !shadow-none"
                placeholder="0.00"
                style={{ background: "transparent", border: "none", boxShadow: "none" }}
             />
          </div>
        </div>

        {/* Datos Generales */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <Text className="text-xs text-slate-500 block mb-1">Fecha</Text>
            <Input value={data.fecha} onChange={(e) => handleChange("fecha", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Text className="text-xs text-slate-500 block mb-1">País</Text>
            <Input value={data.pais} onChange={(e) => handleChange("pais", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1 mb-4">
          <Text className="text-xs text-slate-500 block mb-1">Empresa Cliente</Text>
          <Input value={data.empresa_cliente} onChange={(e) => handleChange("empresa_cliente", e.target.value)} className="font-medium" />
        </div>

        <div className="space-y-1 mb-4">
          <Text className="text-xs text-slate-500 block mb-1">Nombre Operación</Text>
          <Input value={data.nombre_operacion} onChange={(e) => handleChange("nombre_operacion", e.target.value)} />
        </div>

        {/* Stack y Oportunidad */}
        <div className="space-y-1 mb-4">
           <Text className="text-xs text-slate-500 block mb-1">Stack Tecnológico</Text>
           <TextArea 
              value={data.stack_tecnologico} 
              onChange={(e) => handleChange("stack_tecnologico", e.target.value)} 
              autoSize={{ minRows: 3, maxRows: 6 }}
              className="text-sm"
           />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="space-y-1">
             <Text className="text-xs text-slate-500 block mb-1">Oportunidad</Text>
             <Select 
                className="w-full"
                value={data.oportunidad}
                onChange={(value) => handleChange("oportunidad", value)}
                options={[
                    { value: "RFP", label: "RFP" },
                    { value: "RFI", label: "RFI" },
                    { value: "Intencion", label: "Intención de Compra" },
                ]}
             />
           </div>
           <div className="space-y-1">
             <Text className="text-xs text-slate-500 block mb-1">Precio Estimado</Text>
             <Input value={data.precio} onChange={(e) => handleChange("precio", e.target.value)} />
           </div>
        </div>

        <div className="space-y-1 mb-4">
          <Text className="text-xs text-slate-500 block mb-1">Objetivo del Proyecto</Text>
          <TextArea 
            value={data.objetivo}
            onChange={(e) => handleChange("objetivo", e.target.value)}
            autoSize={{ minRows: 4, maxRows: 8 }}
            className="bg-slate-50"
          />
        </div>
      </div>

      <Button type="primary" className="w-full bg-emerald-600 hover:!bg-emerald-700 mt-6 h-10 flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> Guardar en Dashboard
      </Button>
    </div>
  );
}
