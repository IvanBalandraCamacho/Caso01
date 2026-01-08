# 💬 CopilotKit para Chat con Generación de Datos y Propuestas

## 🎯 Objetivo
Integrar CopilotKit en el sistema de chat para generar consultas de datos estructuradas y propuestas comerciales de manera interactiva y asistida por IA.

---

## 📋 Estado Actual

### Componentes Existentes
- **chat-area.tsx**: Área principal del chat con streaming
- **ProposalModal.tsx**: Modal para generación de propuestas
- **intention_task.py**: Backend con detección de intenciones
- **copilot.py**: Runtime de CopilotKit en el backend

### Intenciones Detectadas (Backend)
```python
# Intenciones soportadas:
- GENERAL_QUERY          # Consulta general
- GENERATE_PROPOSAL      # Generar propuesta comercial
- REQUIREMENTS_MATRIX    # Matriz de requisitos
- PREELIMINAR_PRICE_QUOTE # Cotización preliminar
- LEGAL_RISKS            # Riesgos legales
- SPECIFIC_QUERY         # Consulta específica
```

---

## 🚀 Pasos de Implementación

### PASO 1: Crear Hook de Chat con CopilotKit

**Archivo a crear**: `front-v2/hooks/useCopilotChat.ts`

```typescript
"use client";

import { useCopilotAction, useCopilotReadable, useCopilotChat } from "@copilotkit/react-core";
import { useState, useCallback } from "react";
import { message } from "antd";

interface UseCopilotChatProps {
  workspaceId: string;
  conversationId?: string;
  documentContext?: string;
  onDataGenerated?: (data: any, type: string) => void;
  onProposalGenerated?: (proposal: any) => void;
}

interface DataQuery {
  type: 'table' | 'chart' | 'summary' | 'comparison';
  title: string;
  data: any[];
  columns?: string[];
}

export function useCopilotChatActions({
  workspaceId,
  conversationId,
  documentContext,
  onDataGenerated,
  onProposalGenerated,
}: UseCopilotChatProps) {
  const [generatedData, setGeneratedData] = useState<DataQuery[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Exponer contexto del workspace a CopilotKit
  useCopilotReadable({
    description: "Contexto del documento del workspace actual para consultas y generación",
    value: documentContext || "No hay documento cargado en el workspace",
  });

  useCopilotReadable({
    description: "ID del workspace actual",
    value: workspaceId,
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES PARA CONSULTAS DE DATOS
  // ═══════════════════════════════════════════════════════════════

  // Acción: Generar tabla de datos
  useCopilotAction({
    name: "generateDataTable",
    description: "Genera una tabla de datos estructurada a partir del documento (requisitos, plazos, costos, etc.)",
    parameters: [
      {
        name: "dataType",
        type: "string",
        description: "Tipo de datos: requisitos, plazos, tecnologias, costos, equipo, riesgos",
        required: true,
      },
      {
        name: "columns",
        type: "string[]",
        description: "Columnas a incluir en la tabla",
        required: false,
      },
      {
        name: "filters",
        type: "object",
        description: "Filtros a aplicar",
        required: false,
      },
    ],
    handler: async ({ dataType, columns, filters }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        
        // Llamar al endpoint de análisis con el tipo específico
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces/${workspaceId}/extract-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data_type: dataType,
            columns,
            filters,
          }),
        });

        if (!response.ok) throw new Error('Error al extraer datos');
        
        const data = await response.json();
        
        const tableData: DataQuery = {
          type: 'table',
          title: `Tabla de ${dataType}`,
          data: data.rows || [],
          columns: data.columns || columns,
        };
        
        setGeneratedData(prev => [...prev, tableData]);
        onDataGenerated?.(tableData, 'table');
        
        return `✅ Tabla generada con ${data.rows?.length || 0} filas. Los datos están disponibles en la interfaz.`;
      } catch (error) {
        console.error('Error generating table:', error);
        return `❌ Error al generar tabla: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Generar matriz de requisitos
  useCopilotAction({
    name: "generateRequirementsMatrix",
    description: "Genera una matriz de requisitos funcionales y no funcionales del RFP",
    parameters: [
      {
        name: "includeTraceability",
        type: "boolean",
        description: "Incluir trazabilidad con secciones del documento",
        required: false,
      },
      {
        name: "prioritize",
        type: "boolean",
        description: "Incluir priorización de requisitos",
        required: false,
      },
    ],
    handler: async ({ includeTraceability = false, prioritize = true }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/task/requirements-matrix`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            include_traceability: includeTraceability,
            prioritize,
          }),
        });

        if (!response.ok) throw new Error('Error al generar matriz');
        
        const matrix = await response.json();
        
        const matrixData: DataQuery = {
          type: 'table',
          title: 'Matriz de Requisitos',
          data: matrix.requirements || [],
          columns: ['ID', 'Requisito', 'Tipo', 'Prioridad', 'Fuente'],
        };
        
        setGeneratedData(prev => [...prev, matrixData]);
        onDataGenerated?.(matrixData, 'requirements_matrix');
        
        return `✅ Matriz de requisitos generada con ${matrix.requirements?.length || 0} requisitos identificados.`;
      } catch (error) {
        return `❌ Error: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Generar resumen comparativo
  useCopilotAction({
    name: "generateComparison",
    description: "Genera una comparación o resumen de datos específicos del documento",
    parameters: [
      {
        name: "aspect",
        type: "string",
        description: "Aspecto a comparar: costos, tecnologías, plazos, recursos",
        required: true,
      },
      {
        name: "format",
        type: "string",
        description: "Formato: tabla, lista, resumen",
        required: false,
      },
    ],
    handler: async ({ aspect, format = "tabla" }) => {
      const token = localStorage.getItem('access_token');
      
      // Simular extracción y comparación
      const comparisonData: DataQuery = {
        type: 'comparison',
        title: `Comparación de ${aspect}`,
        data: [],
        columns: ['Aspecto', 'Valor Actual', 'Recomendado', 'Diferencia'],
      };
      
      setGeneratedData(prev => [...prev, comparisonData]);
      onDataGenerated?.(comparisonData, 'comparison');
      
      return `📊 Comparación de ${aspect} generada en formato ${format}.`;
    },
  });

  // Acción: Calcular cotización preliminar
  useCopilotAction({
    name: "calculatePreliminaryQuote",
    description: "Calcula una cotización preliminar basada en el análisis del RFP",
    parameters: [
      {
        name: "includeContingency",
        type: "boolean",
        description: "Incluir contingencia (15-20%)",
        required: false,
      },
      {
        name: "teamRates",
        type: "object",
        description: "Tarifas por rol del equipo",
        required: false,
      },
    ],
    handler: async ({ includeContingency = true, teamRates }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/task/preliminary-quote`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            include_contingency: includeContingency,
            team_rates: teamRates,
          }),
        });

        const quote = await response.json();
        
        const quoteData: DataQuery = {
          type: 'summary',
          title: 'Cotización Preliminar',
          data: [quote],
          columns: ['Concepto', 'Horas', 'Tarifa', 'Subtotal'],
        };
        
        setGeneratedData(prev => [...prev, quoteData]);
        onDataGenerated?.(quoteData, 'quote');
        
        return `💰 Cotización preliminar generada:\n\n- Total estimado: ${quote.total || 'Por calcular'}\n- Incluye contingencia: ${includeContingency ? 'Sí' : 'No'}`;
      } catch (error) {
        return `❌ Error al calcular cotización: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES PARA PROPUESTAS COMERCIALES
  // ═══════════════════════════════════════════════════════════════

  // Acción: Generar propuesta comercial completa
  useCopilotAction({
    name: "generateCommercialProposal",
    description: "Genera una propuesta comercial completa basada en el análisis del RFP",
    parameters: [
      {
        name: "sections",
        type: "string[]",
        description: "Secciones a incluir: resumen_ejecutivo, alcance, metodologia, equipo, cronograma, inversion, garantias",
        required: false,
      },
      {
        name: "tone",
        type: "string",
        description: "Tono de la propuesta: formal, persuasivo, tecnico",
        required: false,
      },
      {
        name: "outputFormat",
        type: "string",
        description: "Formato de salida: markdown, docx, pdf",
        required: false,
      },
    ],
    handler: async ({ sections, tone = "formal", outputFormat = "markdown" }) => {
      setIsGenerating(true);
      message.loading("Generando propuesta comercial...");
      
      try {
        const token = localStorage.getItem('access_token');
        
        const defaultSections = [
          'resumen_ejecutivo',
          'alcance',
          'metodologia',
          'equipo',
          'cronograma',
          'inversion',
          'garantias'
        ];
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/task/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            sections: sections || defaultSections,
            tone,
            output_format: outputFormat,
          }),
        });

        if (!response.ok) throw new Error('Error al generar propuesta');
        
        if (outputFormat === 'docx' || outputFormat === 'pdf') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `propuesta_comercial.${outputFormat}`;
          a.click();
          message.success("Documento descargado");
          return `✅ Propuesta comercial generada y descargada como ${outputFormat.toUpperCase()}`;
        }
        
        const proposal = await response.json();
        onProposalGenerated?.(proposal);
        message.success("Propuesta generada");
        
        return `✅ Propuesta comercial generada con las siguientes secciones:\n\n${(sections || defaultSections).map(s => `• ${s.replace('_', ' ')}`).join('\n')}\n\nEl documento está disponible para revisión y edición.`;
      } catch (error) {
        message.error("Error al generar propuesta");
        return `❌ Error al generar propuesta: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Generar sección específica de propuesta
  useCopilotAction({
    name: "generateProposalSection",
    description: "Genera una sección específica de la propuesta comercial",
    parameters: [
      {
        name: "sectionName",
        type: "string",
        description: "Nombre de la sección: resumen_ejecutivo, metodologia, equipo, cronograma, inversion",
        required: true,
      },
      {
        name: "customInstructions",
        type: "string",
        description: "Instrucciones adicionales para personalizar la sección",
        required: false,
      },
    ],
    handler: async ({ sectionName, customInstructions }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/task/generate-section`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            section_name: sectionName,
            custom_instructions: customInstructions,
          }),
        });

        const section = await response.json();
        
        return `## ${sectionName.replace('_', ' ').toUpperCase()}\n\n${section.content}\n\n---\n✅ Sección generada. Puedes editarla o solicitar modificaciones.`;
      } catch (error) {
        return `❌ Error al generar sección: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Mejorar/editar sección existente
  useCopilotAction({
    name: "improveSection",
    description: "Mejora o edita una sección de la propuesta con instrucciones específicas",
    parameters: [
      {
        name: "currentContent",
        type: "string",
        description: "Contenido actual de la sección",
        required: true,
      },
      {
        name: "improvementRequest",
        type: "string",
        description: "Qué mejora o cambio se solicita",
        required: true,
      },
    ],
    handler: async ({ currentContent, improvementRequest }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/copilot`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `Mejora el siguiente contenido según estas instrucciones: ${improvementRequest}\n\nContenido actual:\n${currentContent}`
              }
            ],
            properties: {
              workspace_id: workspaceId,
            }
          }),
        });

        const improved = await response.json();
        
        return `## Contenido Mejorado\n\n${improved.content}\n\n---\n✅ Sección mejorada según las instrucciones proporcionadas.`;
      } catch (error) {
        return `❌ Error al mejorar sección: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Analizar riesgos legales
  useCopilotAction({
    name: "analyzeLegalRisks",
    description: "Analiza los riesgos legales y contractuales del RFP",
    handler: async () => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/task/legal-risks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
          }),
        });

        const risks = await response.json();
        
        const riskData: DataQuery = {
          type: 'table',
          title: 'Análisis de Riesgos Legales',
          data: risks.risks || [],
          columns: ['Riesgo', 'Severidad', 'Mitigación', 'Cláusula'],
        };
        
        setGeneratedData(prev => [...prev, riskData]);
        onDataGenerated?.(riskData, 'legal_risks');
        
        return `⚖️ Análisis de riesgos completado:\n\n- Riesgos identificados: ${risks.risks?.length || 0}\n- Nivel de riesgo general: ${risks.overall_risk || 'Medio'}\n\nLos detalles están disponibles en la tabla generada.`;
      } catch (error) {
        return `❌ Error al analizar riesgos: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  return {
    generatedData,
    isGenerating,
    clearGeneratedData: () => setGeneratedData([]),
  };
}
```

---

### PASO 2: Crear Componente de Chat Mejorado

**Archivo a crear**: `front-v2/components/chat/CopilotChatArea.tsx`

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Input, Button, Space, Spin, Card, Table, Tag, Tooltip, Drawer } from "antd";
import {
  SendOutlined,
  TableOutlined,
  FileWordOutlined,
  DollarOutlined,
  AlertOutlined,
  BarChartOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { CopilotPopup } from "@copilotkit/react-ui";
import { useCopilotChatActions } from "@/hooks/useCopilotChat";
import "@copilotkit/react-ui/styles.css";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachedData?: any;
}

interface CopilotChatAreaProps {
  workspaceId: string;
  conversationId?: string;
  documentContext?: string;
}

export function CopilotChatArea({
  workspaceId,
  conversationId,
  documentContext,
}: CopilotChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataDrawerOpen, setDataDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { generatedData, isGenerating, clearGeneratedData } = useCopilotChatActions({
    workspaceId,
    conversationId,
    documentContext,
    onDataGenerated: (data, type) => {
      // Mostrar drawer con datos generados
      setDataDrawerOpen(true);
    },
    onProposalGenerated: (proposal) => {
      // Manejar propuesta generada
      console.log('Proposal generated:', proposal);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Comandos rápidos sugeridos
  const quickCommands = [
    {
      icon: <TableOutlined />,
      label: "Matriz de Requisitos",
      command: "Genera una matriz de requisitos funcionales y no funcionales",
    },
    {
      icon: <DollarOutlined />,
      label: "Cotización Preliminar",
      command: "Calcula una cotización preliminar basada en el análisis",
    },
    {
      icon: <FileWordOutlined />,
      label: "Propuesta Comercial",
      command: "Genera una propuesta comercial completa",
    },
    {
      icon: <AlertOutlined />,
      label: "Riesgos Legales",
      command: "Analiza los riesgos legales del documento",
    },
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/copilot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          properties: {
            workspace_id: workspaceId,
          },
        }),
      });

      // Manejar streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            assistantContent += data;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: assistantContent,
              };
              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#131314]">
      {/* Quick Commands Bar */}
      <div className="px-4 py-3 border-b border-white/5 bg-[#1E1F20]">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickCommands.map((cmd, i) => (
            <Tooltip key={i} title={cmd.command}>
              <Button
                icon={cmd.icon}
                size="small"
                className="flex-shrink-0"
                onClick={() => setInputValue(cmd.command)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#a1a1aa',
                }}
              >
                {cmd.label}
              </Button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-white text-lg mb-2">¿Qué te gustaría generar?</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Puedo ayudarte a extraer datos, generar propuestas y analizar el documento
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {quickCommands.map((cmd, i) => (
                <Card
                  key={i}
                  hoverable
                  className="bg-[#1E1F20] border-white/5 cursor-pointer"
                  onClick={() => setInputValue(cmd.command)}
                >
                  <div className="text-center">
                    <div className="text-2xl text-[#E31837] mb-2">{cmd.icon}</div>
                    <p className="text-white text-sm">{cmd.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#E31837] text-white'
                  : 'bg-[#1E1F20] text-zinc-200 border border-white/5'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1E1F20] rounded-2xl px-4 py-3 border border-white/5">
              <Spin size="small" />
              <span className="ml-2 text-zinc-400">Generando respuesta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Generated Data Indicator */}
      {generatedData.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-[#1E1F20]">
          <Button
            type="link"
            icon={<BarChartOutlined />}
            onClick={() => setDataDrawerOpen(true)}
            className="text-[#E31837]"
          >
            {generatedData.length} datos generados - Ver
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-[#1E1F20]">
        <div className="flex gap-2">
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe tu consulta o solicita generar datos..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
            style={{
              background: '#2A2A2D',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={isLoading || isGenerating}
            style={{
              background: '#E31837',
              borderColor: '#E31837',
            }}
          />
        </div>
      </div>

      {/* Data Drawer */}
      <Drawer
        title="Datos Generados"
        placement="right"
        width={600}
        open={dataDrawerOpen}
        onClose={() => setDataDrawerOpen(false)}
        extra={
          <Button 
            type="text" 
            icon={<CloseOutlined />}
            onClick={clearGeneratedData}
          >
            Limpiar
          </Button>
        }
      >
        <div className="space-y-6">
          {generatedData.map((data, i) => (
            <Card key={i} title={data.title} size="small">
              {data.type === 'table' && data.data.length > 0 && (
                <Table
                  dataSource={data.data.map((d, j) => ({ ...d, key: j }))}
                  columns={data.columns?.map(col => ({
                    title: col,
                    dataIndex: col.toLowerCase(),
                    key: col,
                  }))}
                  size="small"
                  pagination={false}
                />
              )}
              {data.type === 'summary' && (
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(data.data[0], null, 2)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      </Drawer>

      {/* CopilotKit Popup (floating) */}
      <CopilotPopup
        labels={{
          title: "Asistente de Propuestas",
          initial: "Puedo ayudarte a:\n\n• Generar propuestas comerciales\n• Extraer datos en tablas\n• Calcular cotizaciones\n• Analizar riesgos\n\n¿Qué necesitas?",
          placeholder: "Ej: Genera una propuesta en Word...",
        }}
        instructions={`
          Eres un experto asistente de TIVIT para generación de propuestas comerciales.
          
          Documento actual:
          ${documentContext?.substring(0, 2000) || "No hay documento cargado"}
          
          Workspace ID: ${workspaceId}
          
          Puedes:
          1. Generar propuestas comerciales completas
          2. Crear secciones específicas (metodología, cronograma, inversión)
          3. Extraer datos en formato tabla
          4. Calcular cotizaciones preliminares
          5. Analizar riesgos legales
          
          Usa las acciones disponibles cuando sea apropiado.
          Responde siempre en español y de forma profesional.
        `}
        shortcut="mod+shift+p"
      />
    </div>
  );
}
```

---

### PASO 3: Crear Endpoint de Extracción de Datos (Backend)

**Archivo a crear**: `backend/api/routes/data_extraction.py`

```python
"""
Endpoints para extracción de datos estructurados usando CopilotKit.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from models.database import get_db
from models.user import User
from core.auth import get_current_active_user
from core.llm_service import get_provider
from core.rag_client import rag_client
import logging
import json

router = APIRouter(prefix="/data", tags=["Data Extraction"])
logger = logging.getLogger(__name__)


class DataExtractionRequest(BaseModel):
    data_type: str  # requisitos, plazos, tecnologias, costos, equipo, riesgos
    columns: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None


class DataExtractionResponse(BaseModel):
    rows: List[Dict[str, Any]]
    columns: List[str]
    total: int


# Prompts para extracción de datos
EXTRACTION_PROMPTS = {
    "requisitos": """
Extrae los requisitos del documento en formato JSON con la siguiente estructura:
[
  {
    "id": "REQ-001",
    "requisito": "descripción del requisito",
    "tipo": "FUNCIONAL|NO_FUNCIONAL",
    "prioridad": "ALTA|MEDIA|BAJA",
    "fuente": "sección del documento"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "plazos": """
Extrae las fechas y plazos del documento en formato JSON:
[
  {
    "hito": "nombre del hito",
    "fecha": "fecha o plazo",
    "tipo": "ENTREGA|INICIO|FIN|HITO",
    "criticidad": "CRÍTICO|IMPORTANTE|NORMAL"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "tecnologias": """
Extrae las tecnologías mencionadas en formato JSON:
[
  {
    "tecnologia": "nombre",
    "categoria": "LENGUAJE|FRAMEWORK|BASE_DATOS|CLOUD|HERRAMIENTA",
    "obligatoria": true/false,
    "version": "versión si se menciona o null"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "equipo": """
Extrae el equipo requerido o sugerido en formato JSON:
[
  {
    "rol": "nombre del rol",
    "cantidad": número,
    "experiencia": "años de experiencia",
    "skills": ["skill1", "skill2"],
    "dedicacion": "FULL_TIME|PART_TIME|EVENTUAL"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
    "riesgos": """
Identifica riesgos del proyecto en formato JSON:
[
  {
    "riesgo": "descripción del riesgo",
    "categoria": "LEGAL|TÉCNICO|COMERCIAL|OPERATIVO",
    "severidad": "ALTO|MEDIO|BAJO",
    "mitigacion": "acción de mitigación sugerida"
  }
]
Solo devuelve el JSON, sin texto adicional.
""",
}


@router.post(
    "/workspaces/{workspace_id}/extract-data",
    response_model=DataExtractionResponse,
    summary="Extraer datos estructurados del documento"
)
async def extract_data(
    workspace_id: str,
    request: DataExtractionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Extrae datos estructurados del documento del workspace.
    """
    try:
        # Obtener contexto del documento
        rag_results = await rag_client.search(
            query=f"información de {request.data_type}",
            workspace_id=workspace_id,
            limit=10
        )
        
        context = "\n\n".join([r.content for r in rag_results])
        
        if not context:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró contenido en el workspace"
            )
        
        # Obtener prompt de extracción
        extraction_prompt = EXTRACTION_PROMPTS.get(
            request.data_type,
            f"Extrae información sobre {request.data_type} en formato JSON."
        )
        
        # Generar extracción con LLM
        provider = get_provider()
        
        full_prompt = f"""
{extraction_prompt}

DOCUMENTO:
{context}
"""
        
        response = provider.generate_response(
            query=full_prompt,
            context_chunks=[],
            chat_history=[]
        )
        
        # Parsear JSON de la respuesta
        try:
            # Limpiar respuesta
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            data = json.loads(json_str.strip())
            
            if not isinstance(data, list):
                data = [data]
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {e}")
            data = []
        
        # Determinar columnas
        columns = request.columns
        if not columns and data:
            columns = list(data[0].keys())
        
        return DataExtractionResponse(
            rows=data,
            columns=columns or [],
            total=len(data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al extraer datos: {str(e)}"
        )
```

---

### PASO 4: Integrar en el Router Principal del Backend

**Archivo a modificar**: `backend/main.py`

Agregar el import y registro del router:

```python
# Agregar import
from api.routes.data_extraction import router as data_extraction_router

# Agregar al registro de routers
app.include_router(data_extraction_router, prefix="/api/v1")
```

---

### PASO 5: Crear Componente de Visualización de Datos

**Archivo a crear**: `front-v2/components/chat/DataVisualization.tsx`

```tsx
"use client";

import { Table, Card, Tag, Button, Space, Tooltip, Empty } from "antd";
import {
  DownloadOutlined,
  CopyOutlined,
  ExpandOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { message } from "antd";

interface DataVisualizationProps {
  title: string;
  data: any[];
  columns: string[];
  type: 'table' | 'summary' | 'comparison';
  onExport?: (format: 'csv' | 'json') => void;
}

export function DataVisualization({
  title,
  data,
  columns,
  type,
  onExport,
}: DataVisualizationProps) {
  if (!data || data.length === 0) {
    return (
      <Card title={title} className="bg-zinc-900/40 border-zinc-800">
        <Empty description="No hay datos disponibles" />
      </Card>
    );
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    message.success("Datos copiados al portapapeles");
  };

  const handleExportCSV = () => {
    const headers = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => `"${row[col.toLowerCase()] || ''}"`).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    a.click();
    message.success("CSV descargado");
  };

  const tableColumns = columns.map(col => ({
    title: col,
    dataIndex: col.toLowerCase(),
    key: col,
    render: (text: any) => {
      if (typeof text === 'boolean') {
        return text ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>;
      }
      if (Array.isArray(text)) {
        return (
          <Space wrap size={[4, 4]}>
            {text.map((item, i) => (
              <Tag key={i} color="blue">{item}</Tag>
            ))}
          </Space>
        );
      }
      if (text === 'ALTO' || text === 'ALTA' || text === 'CRÍTICO') {
        return <Tag color="red">{text}</Tag>;
      }
      if (text === 'MEDIO' || text === 'MEDIA' || text === 'IMPORTANTE') {
        return <Tag color="orange">{text}</Tag>;
      }
      if (text === 'BAJO' || text === 'BAJA' || text === 'NORMAL') {
        return <Tag color="green">{text}</Tag>;
      }
      return text;
    },
  }));

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <TableOutlined className="text-[#E31837]" />
          <span>{title}</span>
          <Tag color="blue">{data.length} registros</Tag>
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Copiar JSON">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopyToClipboard}
            />
          </Tooltip>
          <Tooltip title="Exportar CSV">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
            />
          </Tooltip>
        </Space>
      }
      className="bg-zinc-900/40 border-zinc-800"
    >
      <Table
        dataSource={data.map((d, i) => ({ ...d, key: i }))}
        columns={tableColumns}
        size="small"
        pagination={data.length > 10 ? { pageSize: 10 } : false}
        scroll={{ x: 'max-content' }}
        className="dark-table"
      />
    </Card>
  );
}
```

---

## 📝 Checklist de Implementación

### Frontend
- [ ] Crear `useCopilotChat.ts`
- [ ] Crear `CopilotChatArea.tsx`
- [ ] Crear `DataVisualization.tsx`
- [ ] Integrar en la página de chat existente
- [ ] Agregar estilos para componentes

### Backend
- [ ] Crear `data_extraction.py`
- [ ] Registrar router en `main.py`
- [ ] Crear endpoints de extracción
- [ ] Probar con diferentes tipos de datos

### Pruebas
- [ ] Probar generación de tablas
- [ ] Probar generación de propuestas
- [ ] Probar cotización preliminar
- [ ] Probar análisis de riesgos
- [ ] Verificar streaming de respuestas

---

## 🎯 Resultado Esperado

1. **Chat Inteligente**: El chat puede detectar intenciones y ejecutar acciones automáticamente
2. **Generación de Datos**: 
   - Tablas de requisitos
   - Matrices de trazabilidad
   - Cronogramas
   - Estimaciones de costos
3. **Propuestas Comerciales**:
   - Generación completa o por secciones
   - Exportación a Word/PDF
   - Edición asistida
4. **Panel de Datos**: Drawer lateral con todos los datos generados
5. **Comandos Rápidos**: Botones para acciones frecuentes

---

## 🔧 Configuración Adicional

### Variables de Entorno (Frontend)

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_COPILOT_ENABLED=true
```

### Variables de Entorno (Backend)

```env
# .env
OPENAI_API_KEY=sk-...
# O para Gemini:
GOOGLE_API_KEY=...
LLM_PROVIDER=gemini  # o openai
```

---

## 📚 Referencias

- [CopilotKit Chat](https://docs.copilotkit.ai/reference/hooks/useCopilotChat)
- [CopilotKit Actions](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [Backend Integration](https://docs.copilotkit.ai/reference/backend/fastapi)
- [Componentes existentes](./COPILOTKIT_IMPLEMENTATION_ROADMAP.md)
- [Análisis RFP](./COPILOTKIT_RFP_ANALYSIS_RESULTS.md)

---

**Última actualización**: 4 de enero de 2026  
**Estado**: Pendiente de implementación  
**Dependencias**: CopilotKit 1.50.1, FastAPI, React 18
