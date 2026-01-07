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
      { name: "field", type: "string", description: "Campo a editar (ej: tvt, cliente, stack_tecnologico, pais, nombre_operacion, objetivo, precio, oportunidad, categoria)" },
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
      <div className="flex items-center justify-between border-b border-zinc-700 pb-4 mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 m-0">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Datos del RFP
        </h2>
        <span className="text-xs text-zinc-400">Autocompletado por IA</span>
      </div>
      
      <div className="space-y-5">
        
        {/* TVT - Campo Destacado */}
        <div className="bg-red-950/30 p-4 rounded-lg border border-red-900/50 ring-1 ring-red-800/30 mb-4">
          <Text className="text-[#E31837] font-bold text-xs uppercase tracking-wide block mb-1">TVT (Valor Total)</Text>
          <div className="flex items-center mt-1 gap-2">
             <Select
               value={data.moneda || "USD"}
               onChange={(value) => handleChange("moneda", value)}
               className="w-20"
               options={[
                 { value: "USD", label: "USD" },
                 { value: "EUR", label: "EUR" },
                 { value: "COP", label: "COP" },
                 { value: "MXN", label: "MXN" },
                 { value: "BRL", label: "BRL" },
               ]}
             />
             <Input 
                value={data.tvt} 
                onChange={(e) => handleChange("tvt", e.target.value)}
                className="font-mono text-xl font-bold text-[#FF6B00] bg-transparent border-none p-0 focus:shadow-none placeholder:text-red-700 !shadow-none flex-1"
                placeholder="0.00"
                style={{ background: "transparent", border: "none", boxShadow: "none" }}
             />
          </div>
        </div>

        {/* Datos Generales */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <Text className="text-xs text-zinc-400 block mb-1">Fecha</Text>
            <Input value={data.fecha} onChange={(e) => handleChange("fecha", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Text className="text-xs text-zinc-400 block mb-1">País</Text>
            <Input value={data.pais} onChange={(e) => handleChange("pais", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1 mb-4">
          <Text className="text-xs text-zinc-400 block mb-1">Cliente</Text>
          <Input value={data.cliente} onChange={(e) => handleChange("cliente", e.target.value)} className="font-medium" />
        </div>

        <div className="space-y-1 mb-4">
          <Text className="text-xs text-zinc-400 block mb-1">Nombre Operación</Text>
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
             <Text className="text-xs text-zinc-400 block mb-1">Oportunidad</Text>
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
             <Text className="text-xs text-zinc-400 block mb-1">Categoría</Text>
             <Input value={data.categoria} onChange={(e) => handleChange("categoria", e.target.value)} placeholder="Ej: Cloud, DevOps, Data..." />
           </div>
        </div>

        {/* Tiempo y Recursos */}
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="space-y-1">
             <Text className="text-xs text-zinc-400 block mb-1">Tiempo Aproximado</Text>
             <Input 
               value={data.tiempo_aproximado} 
               onChange={(e) => handleChange("tiempo_aproximado", e.target.value)} 
               placeholder="Ej: 6 meses"
             />
           </div>
           <div className="space-y-1">
             <Text className="text-xs text-zinc-400 block mb-1">Nro. Recursos</Text>
             <Input 
               type="number"
               value={data.nro_recursos} 
               onChange={(e) => handleChange("nro_recursos", e.target.value)} 
               placeholder="0"
             />
           </div>
        </div>

        <div className="space-y-1 mb-4">
          <Text className="text-xs text-zinc-400 block mb-1">Objetivo del Proyecto</Text>
          <TextArea 
            value={data.objetivo}
            onChange={(e) => handleChange("objetivo", e.target.value)}
            autoSize={{ minRows: 4, maxRows: 8 }}
            className="bg-[#131314]/50"
          />
        </div>
      </div>

      <Button type="primary" className="w-full bg-[#E31837] hover:!bg-[#C01530] mt-6 h-10 flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> Guardar en Dashboard
      </Button>
    </div>
  );
}
