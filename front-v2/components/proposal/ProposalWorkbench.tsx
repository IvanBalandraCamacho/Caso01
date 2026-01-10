"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { App, Spin, Button, Tooltip, Select } from "antd";
import {
  LoadingOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  MessageOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

// API
import {
  generateProposalDocumentApi,
  fetchWorkspaceDetails,
  fetchWorkspaceDocuments,
  fetchDocumentContent,
  updateWorkspaceApi
} from "@/lib/api";

// Componentes internos
import AnalysisActionsPanel from "@/components/rfp/AnalysisActionsPanel";
import DocumentPreviewPanel from "@/components/rfp/DocumentPreviewPanel";
import ExtractedDataPanel from "@/components/rfp/ExtractedDataPanel";

interface ProposalWorkbenchProps {
  workspaceId: string;
  initialData?: any; 
  onClose?: () => void; 
}

export default function ProposalWorkbench({ workspaceId, initialData, onClose }: ProposalWorkbenchProps) {
  const router = useRouter();
  const { message } = App.useApp();
  
  // Estados
  const [extractedData, setExtractedData] = useState<any>(initialData || {});
  const [loadingData, setLoadingData] = useState(!initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string | null>(null);

  // Refs para URLs - evitar memory leaks
  const documentUrlRef = useRef<string | null>(null);
  const generatedDocUrlRef = useRef<string | null>(null);

  // Actualizar refs cuando cambien las URLs
  useEffect(() => {
    documentUrlRef.current = documentUrl;
  }, [documentUrl]);

  useEffect(() => {
    generatedDocUrlRef.current = generatedDocUrl;
  }, [generatedDocUrl]);

  // Cleanup de URLs al desmontar el componente
  useEffect(() => {
    return () => {
      if (documentUrlRef.current) {
        window.URL.revokeObjectURL(documentUrlRef.current);
      }
      if (generatedDocUrlRef.current) {
        window.URL.revokeObjectURL(generatedDocUrlRef.current);
      }
    };
  }, []);

  // Exponer workspaceId al contexto de CopilotKit para que el backend pueda hacer RAG
  useCopilotReadable({
    description: "ID del workspace actual para búsqueda RAG en documentos",
    value: { workspace_id: workspaceId, workspaceId },
  });

  // Exponer datos extraídos actuales para que CopilotKit los conozca
  useCopilotReadable({
    description: "Datos extraídos actuales de la propuesta (cliente, TVT, stack, equipo, etc.)",
    value: extractedData,
  });

  // ==================== ACCIONES DE COPILOTKIT ====================
  
  // Función helper para actualizar campos (usada por múltiples acciones)
  const updateFieldHandler = useCallback(async (fieldName: string, newValue: string) => {
    // Mapeo de nombres alternativos
    const fieldMap: Record<string, string> = {
      "cliente": "cliente",
      "client": "cliente",
      "company": "cliente",
      "empresa": "cliente",
      "tvt": "tvt",
      "presupuesto": "tvt",
      "budget": "tvt",
      "precio": "tvt",
      "pais": "pais",
      "country": "pais",
      "país": "pais",
      "stack": "stack_tecnologico",
      "stack_tecnologico": "stack_tecnologico",
      "tecnologias": "stack_tecnologico",
      "tech_stack": "stack_tecnologico",
      "objetivo": "objetivo",
      "objective": "objetivo",
      "categoria": "categoria",
      "category": "categoria",
      "nombre_operacion": "nombre_operacion",
      "operacion": "nombre_operacion",
      "proyecto": "nombre_operacion",
      "tiempo_aproximado": "tiempo_aproximado",
      "tiempo": "tiempo_aproximado",
      "nro_recursos": "nro_recursos",
      "recursos": "nro_recursos",
      "moneda": "moneda",
      "currency": "moneda",
      "oportunidad": "oportunidad",
    };
    
    const normalizedField = fieldMap[fieldName.toLowerCase()] || fieldName;
    
    console.log(`[CopilotAction] updateField llamado: ${normalizedField} = ${newValue}`);
    
    setExtractedData((prev: any) => ({
      ...prev,
      [normalizedField]: newValue
    }));
    
    message.success(`Campo "${normalizedField}" actualizado`);
    
    return `✅ Campo "${normalizedField}" actualizado a: "${newValue}". Los cambios se reflejan en el panel derecho.`;
  }, [message]);
  
  // Acción para actualizar un campo específico
  useCopilotAction({
    name: "updateField",
    description: "OBLIGATORIO usar para cambiar cualquier dato de la propuesta. Campos: cliente, tvt, pais, stack_tecnologico, objetivo, categoria, nombre_operacion, tiempo_aproximado, nro_recursos, moneda",
    parameters: [
      {
        name: "fieldName",
        type: "string",
        description: "Campo: cliente|tvt|pais|stack_tecnologico|objetivo|categoria|nombre_operacion|tiempo_aproximado|nro_recursos|moneda",
        required: true,
      },
      {
        name: "newValue",
        type: "string",
        description: "Nuevo valor",
        required: true,
      },
    ],
    render: ({ status, args }) => {
      if (status === "executing" || status === "complete") {
        return (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-green-300 text-sm">
                {status === "executing" ? "Actualizando" : "Actualizado"}: <strong>{args.fieldName}</strong> → {args.newValue}
              </span>
            </div>
          </div>
        );
      }
      return null;
    },
    handler: async ({ fieldName, newValue }) => {
      return updateFieldHandler(fieldName, newValue);
    },
  });

  // Acción para actualizar múltiples campos a la vez
  useCopilotAction({
    name: "updateMultipleFields",
    description: "Actualiza varios campos a la vez. Ej: {cliente:'ACME', tvt:'500000', pais:'Chile'}",
    parameters: [
      {
        name: "updates",
        type: "object",
        description: "Objeto con campos y valores: {cliente?, tvt?, pais?, stack_tecnologico?, objetivo?}",
        required: true,
      },
    ],
    render: ({ status, args }) => {
      if (status === "executing" || status === "complete") {
        const fields = args.updates ? Object.keys(args.updates).join(", ") : "";
        return (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span className="text-blue-300 text-sm">
                {status === "executing" ? "Actualizando" : "Actualizados"}: <strong>{fields}</strong>
              </span>
            </div>
          </div>
        );
      }
      return null;
    },
    handler: async ({ updates }) => {
      console.log(`[CopilotAction] updateMultipleFields llamado:`, updates);
      
      setExtractedData((prev: any) => ({
        ...prev,
        ...updates
      }));
      
      const fieldsUpdated = Object.keys(updates).join(", ");
      message.success(`Campos actualizados: ${fieldsUpdated}`);
      return `✅ Campos actualizados: ${fieldsUpdated}. Los cambios se reflejan en el panel derecho.`;
    },
  });

  // Acción para agregar un miembro al equipo sugerido
  useCopilotAction({
    name: "addTeamMember",
    description: "Agrega persona al equipo. Ej: Tech Lead, Desarrollador Senior, QA",
    parameters: [
      {
        name: "nombre",
        type: "string",
        description: "Rol o nombre (ej: 'Tech Lead', 'Desarrollador Senior')",
        required: true,
      },
      {
        name: "experiencia",
        type: "string",
        description: "Nivel: Senior, Mid, Junior, o años de experiencia",
        required: false,
      },
      {
        name: "rol",
        type: "string",
        description: "Rol específico en el proyecto",
        required: false,
      },
    ],
    render: ({ status, args }) => {
      if (status === "executing" || status === "complete") {
        return (
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2">
              <span className="text-purple-400">👤</span>
              <span className="text-purple-300 text-sm">
                {status === "executing" ? "Agregando" : "Agregado"}: <strong>{args.nombre}</strong>
                {args.experiencia && ` (${args.experiencia})`}
              </span>
            </div>
          </div>
        );
      }
      return null;
    },
    handler: async ({ nombre, experiencia = "Por definir", rol = nombre }) => {
      console.log(`[CopilotAction] addTeamMember llamado: ${nombre}, ${experiencia}, ${rol}`);
      
      let newCount = 0;
      setExtractedData((prev: any) => {
        newCount = (prev.nro_recursos || 0) + 1;
        return {
          ...prev,
          equipo_sugerido: [
            ...(prev.equipo_sugerido || []),
            { nombre, experiencia, rol }
          ],
          nro_recursos: newCount
        };
      });
      
      message.success(`Agregado al equipo: ${nombre}`);
      return `✅ Agregado al equipo: ${nombre} (${experiencia}). Total recursos actualizado.`;
    },
  });

  // Acción para agregar una tecnología al stack
  useCopilotAction({
    name: "addTechnology",
    description: "Agrega tecnología al stack (React, Python, AWS, etc)",
    parameters: [
      {
        name: "technology",
        type: "string",
        description: "Tecnología a agregar",
        required: true,
      },
    ],
    render: ({ status, args }) => {
      if (status === "executing" || status === "complete") {
        return (
          <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">💻</span>
              <span className="text-cyan-300 text-sm">
                Tecnología: <strong>{args.technology}</strong>
              </span>
            </div>
          </div>
        );
      }
      return null;
    },
    handler: async ({ technology }) => {
      console.log(`[CopilotAction] addTechnology llamado: ${technology}`);
      
      setExtractedData((prev: any) => {
        const currentStack = prev.stack_tecnologico || "";
        const stackArray = currentStack.split(",").map((t: string) => t.trim()).filter(Boolean);
        
        if (!stackArray.includes(technology)) {
          stackArray.push(technology);
        }
        
        return {
          ...prev,
          stack_tecnologico: stackArray.join(", ")
        };
      });
      
      message.success(`Tecnología agregada: ${technology}`);
      return `✅ Tecnología "${technology}" agregada al stack.`;
    },
  });

  // Acción para agregar una pregunta sugerida
  useCopilotAction({
    name: "addQuestion",
    description: "Agrega una pregunta a la lista de preguntas sugeridas para aclarar con el cliente",
    parameters: [
      {
        name: "question",
        type: "string",
        description: "La pregunta a agregar",
        required: true,
      },
    ],
    handler: async ({ question }) => {
      console.log(`[CopilotAction] addQuestion llamado: ${question}`);
      
      setExtractedData((prev: any) => ({
        ...prev,
        preguntas_sugeridas: [
          ...(prev.preguntas_sugeridas || []),
          question
        ]
      }));
      
      message.success("Pregunta agregada");
      return `✅ Pregunta agregada: "${question}"`;
    },
  });

  // Acción para limpiar/resetear un campo
  useCopilotAction({
    name: "clearField",
    description: "Limpia o resetea un campo específico",
    parameters: [
      {
        name: "fieldName",
        type: "string",
        description: "Nombre del campo a limpiar",
        required: true,
      },
    ],
    handler: async ({ fieldName }) => {
      console.log(`[CopilotAction] clearField llamado: ${fieldName}`);
      
      const defaultValues: Record<string, any> = {
        equipo_sugerido: [],
        preguntas_sugeridas: [],
        fechas_y_plazos: [],
        stack_tecnologico: "",
        nro_recursos: 0,
        tvt: 0,
      };
      
      setExtractedData((prev: any) => ({
        ...prev,
        [fieldName]: defaultValues[fieldName] ?? ""
      }));
      
      message.success(`Campo "${fieldName}" limpiado`);
      return `✅ Campo "${fieldName}" limpiado.`;
    },
  });

  // 1. Cargar Datos y Documento
  useEffect(() => {
    const loadAll = async () => {
      try {
        if (!initialData) setLoadingData(true);
        
        // Cargar detalles del workspace solo si no tenemos datos iniciales
        if (!initialData) {
            const workspace = await fetchWorkspaceDetails(workspaceId);
            
            // Intentar parsear los datos del análisis desde instructions
            let analysisData: any = {};
            if (workspace.instructions) {
              try {
                analysisData = JSON.parse(workspace.instructions);
              } catch (e) {
                console.warn("No se pudo parsear instructions como JSON");
              }
            }
            
            // Combinar datos del workspace con datos del análisis
            setExtractedData({
              // Datos básicos del workspace
              cliente: workspace.client_company || analysisData.cliente || "",
              nombre_operacion: workspace.operation_name || analysisData.nombre_operacion || "",
              tvt: workspace.tvt || analysisData.alcance_economico?.presupuesto || 0,
              pais: workspace.country || analysisData.pais || "",
              stack_tecnologico: Array.isArray(workspace.tech_stack) 
                ? workspace.tech_stack.join(", ") 
                : (Array.isArray(analysisData.stack_tecnologico) 
                  ? analysisData.stack_tecnologico.join(", ") 
                  : ""),
              categoria: workspace.category || analysisData.categoria || "",
              oportunidad: workspace.opportunity_type || analysisData.tipo_oportunidad || "RFP",
              objetivo: workspace.objective || analysisData.objetivo_general || "",
              fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
              // Tiempo y recursos
              tiempo_aproximado: workspace.estimated_time || analysisData.tiempo_aproximado || "",
              nro_recursos: workspace.resource_count || analysisData.nro_recursos || 0,
              // Datos adicionales del análisis
              equipo_sugerido: analysisData.equipo_sugerido || [],
              fechas_y_plazos: analysisData.fechas_y_plazos || [],
              preguntas_sugeridas: analysisData.preguntas_sugeridas || [],
              moneda: analysisData.alcance_economico?.moneda || "USD"
            });
        }

        // Cargar documentos del workspace
        const docs = await fetchWorkspaceDocuments(workspaceId);
        setDocuments(docs || []);
        
        if (docs && docs.length > 0) {
            // Seleccionar el primero por defecto (que debería ser el más reciente por la corrección en backend)
            const mainDoc = docs[0]; 
            setSelectedDocId(mainDoc.id);
            setDocumentType(mainDoc.file_type);
            
            try {
                const blob = await fetchDocumentContent(workspaceId, mainDoc.id);
                const url = window.URL.createObjectURL(blob);
                setDocumentUrl(url);
            } catch (err) {
                console.error("Error cargando contenido del documento:", err);
                message.warning("No se pudo cargar la vista previa del documento.");
            }
        }

      } catch (error) {
        console.error("Error cargando datos del workbench:", error);
        if (!initialData) message.error("No se pudieron cargar los datos.");
      } finally {
        setLoadingData(false);
      }
    };

    loadAll();
  }, [workspaceId, initialData]);

  const handleDocumentChange = async (docId: string) => {
      setSelectedDocId(docId);
      const selectedDoc = documents.find(d => d.id === docId);
      if (!selectedDoc) return;
      
      setDocumentType(selectedDoc.file_type);
      setProposalReady(false); // Volver a ver original si se cambia
      
      try {
          // Revocar URL anterior para liberar memoria
          if (documentUrl) window.URL.revokeObjectURL(documentUrl);
          
          const blob = await fetchDocumentContent(workspaceId, docId);
          const url = window.URL.createObjectURL(blob);
          setDocumentUrl(url);
      } catch (err) {
          console.error("Error cambiando documento:", err);
          message.error("Error al cargar el documento seleccionado.");
      }
  };

  // 2. Manejar Generación
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Transformar datos del formulario al formato esperado por el backend
      const proposalData = {
        workspace_id: workspaceId,
        cliente: extractedData.cliente || "",
        nombre_operacion: extractedData.nombre_operacion || "",
        pais: extractedData.pais || "",
        categoria: extractedData.categoria || "",
        // Alcance económico como objeto estructurado
        alcance_economico: {
          presupuesto: extractedData.tvt || extractedData.precio || "",
          moneda: extractedData.moneda || "USD"
        },
        // Objetivo general (el backend acepta string o lista)
        objetivo_general: extractedData.objetivo || "",
        objetivo_proyecto: extractedData.objetivo || "",
        // Tecnologías como array
        tecnologias_requeridas: typeof extractedData.stack_tecnologico === 'string'
          ? extractedData.stack_tecnologico.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (extractedData.stack_tecnologico || []),
        // Equipo y preguntas - Usar equipo_seleccionado si existe, sino equipo_sugerido
        equipo_sugerido: extractedData.equipo_seleccionado?.length > 0 
          ? extractedData.equipo_seleccionado 
          : (extractedData.equipo_sugerido || []),
        preguntas_sugeridas: extractedData.preguntas_sugeridas || [],
        // Fecha de entrega
        fecha_entrega: extractedData.fecha || new Date().toISOString().split('T')[0]
      };

      const blob = await generateProposalDocumentApi(proposalData);
      setLastBlob(blob);
      
      // Crear URL para visualización inmediata en el panel central
      const url = window.URL.createObjectURL(blob);
      setGeneratedDocUrl(url);

      message.success("Propuesta actualizada con los nuevos datos.");
      setProposalReady(true);
    } catch (error) {
      console.error(error);
      message.error("Error al generar el documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
      if (!lastBlob) return;
      const url = window.URL.createObjectURL(lastBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Propuesta_${extractedData.cliente || 'TIVIT'}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
  };

  const goToChat = () => {
      router.push(`/workspace/${workspaceId}`);
  };

  // Guardar datos del workspace en el Dashboard
  const handleSaveToWorkspace = async (data: any) => {
    setIsSaving(true);
    try {
      // Preparar datos para actualizar el workspace
      const updateData = {
        client_company: data.cliente || null,
        operation_name: data.nombre_operacion || null,
        country: data.pais || null,
        tvt: parseFloat(data.tvt) || null,
        tech_stack: typeof data.stack_tecnologico === 'string' 
          ? data.stack_tecnologico.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (data.stack_tecnologico || null),
        opportunity_type: data.oportunidad || null,
        category: data.categoria || null,
        objective: data.objetivo || null,
        estimated_time: data.tiempo_aproximado || null,
        resource_count: parseInt(data.nro_recursos) || null,
        // Guardar datos adicionales en instructions como JSON
        instructions: JSON.stringify({
          ...data,
          saved_at: new Date().toISOString()
        })
      };

      await updateWorkspaceApi(workspaceId, updateData);
      message.success("Datos guardados exitosamente en el Dashboard");
    } catch (error) {
      console.error("Error guardando datos:", error);
      message.error("Error al guardar los datos");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#131314] text-white">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#E31837' }} spin />} />
        <span className="ml-4">Cargando Mesa de Trabajo...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#131314] overflow-hidden font-sans relative">
      
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
        >
          ✕
        </button>
      )}

      {/* --- COLUMNA IZQUIERDA (Acciones y Chat) - Ancho Fijo --- */}
      <div className="w-[320px] flex-shrink-0 border-r border-zinc-800 bg-[#1E1F20] flex flex-col h-full shadow-sm z-20">
        
        {/* Cabecera / Navegación */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#1E1F20]">
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.push('/quick-analysis')}
                className="text-zinc-400 hover:text-white p-0 flex items-center"
            >
                Atrás
            </Button>
            
            <Tooltip title="Ir al chat completo del proyecto">
                <Button 
                    type="default"
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={goToChat}
                    className="text-[#E31837] border-red-900/30 hover:border-[#E31837] bg-red-950/20"
                >
                    Ir al Chat
                </Button>
            </Tooltip>
        </div>

        {/* Panel de Acciones Principal */}
        <div className="p-5 border-b border-zinc-800 bg-[#131314]/80">
           <AnalysisActionsPanel 
             onGenerate={handleGenerate}
             isGenerating={isGenerating}
           />
           
           {/* Botón de descarga condicional */}
           {proposalReady && (
               <div className="mt-3 pt-3 border-t border-zinc-700 animate-fade-in-up">
                   <Button 
                     block 
                     type="dashed"
                     icon={<DownloadOutlined />} 
                     onClick={handleDownload}
                     className="text-zinc-300 border-zinc-700 hover:text-[#E31837] hover:border-[#E31837]"
                   >
                     Descargar .DOCX
                   </Button>
                   <p className="text-[10px] text-center text-zinc-500 mt-2">
                       Generado: {new Date().toLocaleTimeString()}
                   </p>
               </div>
           )}
        </div>
        
         {/* Chat Copilot */}
         <div className="flex-1 flex flex-col bg-[#1E1F20] overflow-hidden relative">
            <div className="text-[10px] uppercase font-bold text-zinc-400 p-2 text-center tracking-wider bg-[#131314] border-b border-zinc-800 flex items-center justify-center gap-2">
              <MessageOutlined /> Asistente de Análisis
            </div>
            <div className="flex-1 relative custom-copilot-wrapper">
 <CopilotChat 
                  className="h-full w-full border-none shadow-none"
                  instructions={`Eres un asistente de edición de propuestas. SIEMPRE usa las acciones disponibles para modificar datos.

ACCIONES DISPONIBLES:
- updateField(fieldName, newValue): Cambia un campo específico
- addTeamMember(nombre, experiencia, rol): Agrega persona al equipo  
- addTechnology(technology): Agrega tecnología al stack
- updateMultipleFields(updates): Cambia varios campos a la vez

EJEMPLOS DE USO:
- "El cliente es Banco Nacional" → updateField("cliente", "Banco Nacional")
- "El presupuesto es 500000" → updateField("tvt", "500000")
- "País: México" → updateField("pais", "México")
- "Agrega React y Node" → updateField("stack_tecnologico", "React, Node")
- "Agrega un Tech Lead senior" → addTeamMember("Tech Lead", "Senior", "Líder técnico")

REGLA: Cuando el usuario mencione un valor para un campo, EJECUTA la acción inmediatamente. NO respondas solo con texto.`}
                  labels={{
                    title: "Asistente",
                    initial: "Puedo editar los datos. Dime qué cambiar: cliente, presupuesto, país, tecnologías, equipo...",
                  }}
               />
           </div>
        </div>
      </div>

      {/* --- COLUMNA CENTRAL (Previsualización) - Flexible --- */}
      <div className="flex-1 bg-[#0A0A0B] p-6 overflow-hidden flex flex-col relative">
         <div className="h-full bg-[#1E1F20] rounded-xl shadow-sm border border-zinc-800 overflow-hidden flex flex-col">
             {/* Cabecera del visor */}
             <div className="bg-[#131314] px-4 py-3 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {proposalReady ? (
                        <>
                            <FileTextOutlined className="text-green-500 flex-shrink-0" />
                            <span className="font-semibold text-white text-sm truncate">Propuesta Generada (Preview)</span>
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0">NUEVO</span>
                        </>
                    ) : (
                        <>
                            <FileTextOutlined className="text-zinc-400 flex-shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0 mr-4">
                                {documents.length > 1 ? (
                                    <Select
                                        value={selectedDocId}
                                        onChange={handleDocumentChange}
                                        bordered={false}
                                        className="text-white font-semibold min-w-[200px]"
                                        popupMatchSelectWidth={false}
                                        dropdownStyle={{ backgroundColor: '#1E1F20', border: '1px solid #303030' }}
                                        suffixIcon={<span className="text-zinc-500">▼</span>}
                                        options={documents.map(doc => ({
                                            value: doc.id,
                                            label: <span className="text-zinc-200">{doc.file_name}</span>
                                        }))}
                                    />
                                ) : (
                                    <span className="font-semibold text-white text-sm truncate">
                                        {documents.length > 0 ? documents[0].file_name : "Documento Original (RFP)"}
                                    </span>
                                )}
                            </div>
                            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0">SOLO LECTURA</span>
                        </>
                    )}
                </div>
                {proposalReady && (
                    <Button 
                        size="small" 
                        type="text" 
                        className="text-zinc-400 hover:text-white text-xs"
                        onClick={() => setProposalReady(false)}
                    >
                        Ver original
                    </Button>
                )}
             </div>

             {/* Contenido del visor */}
             <div className="flex-1 relative bg-[#0A0A0B]/50">
                 <DocumentPreviewPanel 
                   showProposal={proposalReady} 
                   isLoading={isGenerating}
                   fileUrl={proposalReady ? generatedDocUrl : documentUrl}
                   fileType={proposalReady ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : (documentType || undefined)}
                 />
             </div>
         </div>
      </div>

      {/* --- COLUMNA DERECHA (Datos) - Ancho Fijo --- */}
      <div className="w-[400px] flex-shrink-0 bg-[#1E1F20] h-full overflow-y-auto p-6 shadow-xl z-20 border-l border-zinc-800">
         <ExtractedDataPanel 
            data={extractedData} 
            setData={setExtractedData}
            workspaceId={workspaceId}
            onSave={handleSaveToWorkspace}
            isSaving={isSaving}
         />
      </div>
    </div>
  );
}