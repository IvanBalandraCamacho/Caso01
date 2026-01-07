"use client";

import { useState, useEffect } from "react";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { Input, Button, Typography, Select, Tag, Tooltip } from "antd";
import { Save, Sparkles, Users, MapPin, Award, Briefcase, X } from "lucide-react";
import TalentModal from "./TalentModal";

const { TextArea } = Input;
const { Text } = Typography;

// Tipo para candidatos del MCP
interface MCPCandidate {
  nombre: string;
  cargo: string;
  certificacion: string;
  institucion: string;
  pais: string;
  fecha_emision: string;
  score: number;
}

interface ExtractedDataPanelProps {
  data: any;
  setData: (data: any) => void;
}

export default function ExtractedDataPanel({ data, setData }: ExtractedDataPanelProps) {
  
  // Estado para modal y candidatos seleccionados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<MCPCandidate[]>([]);

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

  // Cuando se seleccionan candidatos, actualizar el data
  const handleSelectCandidates = (candidates: MCPCandidate[]) => {
    setSelectedCandidates(candidates);
    // Guardar en data para enviar al documento
    setData({
      ...data,
      equipo_seleccionado: candidates.map(c => ({
        nombre: c.nombre,
        cargo: c.cargo,
        certificacion: c.certificacion,
        institucion: c.institucion,
        pais: c.pais
      }))
    });
  };

  // Remover un candidato
  const removeCandidate = (candidate: MCPCandidate) => {
    const newCandidates = selectedCandidates.filter(
      c => !(c.nombre === candidate.nombre && c.certificacion === candidate.certificacion)
    );
    handleSelectCandidates(newCandidates);
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
              <Text className="text-xs text-zinc-400 block mb-1">Personas Requeridas</Text>
              <Input 
                type="number"
                value={data.nro_recursos} 
                onChange={(e) => handleChange("nro_recursos", e.target.value)} 
                placeholder="Cantidad de personas"
              />
            </div>
        </div>

        {/* Candidatos Sugeridos del MCP - Boton + Lista */}
        <div className="bg-gradient-to-br from-green-950/30 to-emerald-950/20 p-4 rounded-lg border border-green-900/50 mb-4">
          {/* Boton para abrir modal */}
          <Button
            type="primary"
            icon={<Users className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-green-600 hover:bg-green-700 h-10 flex items-center justify-center gap-2 mb-3"
            disabled={!data.nro_recursos || data.nro_recursos < 1}
          >
            Buscar en Capital Intelectual
            {selectedCandidates.length > 0 && (
              <Tag color="white" className="ml-2 text-green-700 font-bold">
                {selectedCandidates.length}/{data.nro_recursos || 0}
              </Tag>
            )}
          </Button>

          {/* Info si no hay personas requeridas */}
          {(!data.nro_recursos || data.nro_recursos < 1) && (
            <div className="text-zinc-500 text-xs text-center py-2">
              Ingresa el numero de "Personas Requeridas" para buscar talento
            </div>
          )}

          {/* Lista de candidatos seleccionados */}
          {selectedCandidates.length > 0 && (
            <div className="space-y-2 mt-3">
              <Text className="text-xs text-green-400 block mb-2">
                Equipo Seleccionado ({selectedCandidates.length}):
              </Text>
              {selectedCandidates.map((candidate, idx) => (
                <div 
                  key={idx}
                  className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800 flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm truncate">
                        {candidate.nombre}
                      </span>
                      <Tag color="blue" className="text-xs">
                        {candidate.pais}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500 text-xs mt-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      <Tooltip title={`${candidate.certificacion} - ${candidate.institucion}`}>
                        <span className="truncate max-w-[200px]">
                          {candidate.certificacion}
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<X className="w-3 h-3" />}
                    onClick={() => removeCandidate(candidate)}
                    className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Talento */}
        <TalentModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stackTecnologico={data.stack_tecnologico || ""}
          personasRequeridas={parseInt(data.nro_recursos) || 5}
          onSelectCandidates={handleSelectCandidates}
          selectedCandidates={selectedCandidates}
        />

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
