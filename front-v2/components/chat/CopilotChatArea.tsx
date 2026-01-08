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
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
      
      const response = await fetch(`${apiBaseUrl}/copilot`, {
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
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
