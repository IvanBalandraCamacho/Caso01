"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mic, Loader2, FileText, Copy, Check } from "lucide-react";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { UploadModal } from "./UploadModal";
import { useChat, useConversationWithMessages, streamChatQuery } from "@/hooks/useApi";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { QuickPrompts } from "./QuickPrompts";
import { showToast } from "./Toast";
import { UserMenu } from "./UserMenu";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  chunks?: Array<{
    document_id: string;
    chunk_text: string;
    score: number;
  }>;
  modelUsed?: string;
}

export function ChatArea() {
  const router = useRouter();
  const {
    activeWorkspace,
    activeConversation,
    fetchConversations,
    exportChatToPdf,
    exportChatToTxt,
    deleteChatHistory,
    fetchDocuments,
    selectedModel,
  } = useWorkspaces();

  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeStreamRef = useRef<string | null>(null);

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debug: Log cuando cambia el modelo seleccionado
  useEffect(() => {
    console.log("ChatArea: selectedModel recibido:", selectedModel);
  }, [selectedModel]);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Hook de chat - solo se activa si hay workspace activo
  // const chatMutation = useChat(activeWorkspace?.id || ''); // Deprecated for streaming

  // Hook para cargar conversación con mensajes
  const { data: conversationData, isLoading: isLoadingConversation, error: conversationError } = useConversationWithMessages({
    workspaceId: activeWorkspace?.id || '',
    conversationId: activeConversation?.id,
  });

  // Si hay error 404, la conversación no existe - limpiar el estado
  useEffect(() => {
    if (conversationError && activeConversation) {
      console.warn('Conversación no encontrada, limpiando estado');
      setChatHistory([]);
      setCurrentConversationId(undefined);
    }
  }, [conversationError, activeConversation]);

  // Actualizar el mensaje con el transcript
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Limpiar historial cuando cambia el workspace
  useEffect(() => {
    setChatHistory([]);
    setCurrentConversationId(undefined);
    activeStreamRef.current = null; // Cancelar stream activo
    setIsStreaming(false);
  }, [activeWorkspace?.id]);

  // Usar activeConversation si está disponible
  useEffect(() => {
    if (activeConversation) {
      // Cancelar stream activo si hay uno
      activeStreamRef.current = null;
      setIsStreaming(false);
      
      setCurrentConversationId(activeConversation.id);
      // Cargar mensajes de la conversación si están disponibles
      if (conversationData?.messages) {
        const loadedMessages: ChatMessage[] = conversationData.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          chunks: msg.chunk_references ? JSON.parse(msg.chunk_references) : undefined,
        }));
        setChatHistory(loadedMessages);
      }
    }
  }, [activeConversation, conversationData]);

  const handleQuickPrompt = (prompt: string) => {
    setMessage(prompt);
    // Esperar un momento para que el state se actualice antes de enviar
    setTimeout(() => {
      if (activeWorkspace) {
        handleSendMessage(prompt);
      }
    }, 100);
  };

  const handleSendMessage = (overrideMessage?: string) => {
    const query = overrideMessage || message;
    if (!query.trim() || !activeWorkspace) return;

    // Detectar si es el primer mensaje de la conversación
    const isFirstMessage = chatHistory.length === 0;

    // Agregar mensaje del usuario al historial
    const userMessage: ChatMessage = {
      role: "user",
      content: query,
    };
    setChatHistory((prev) => [...prev, userMessage]);

    // Agregar mensaje placeholder del asistente
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      chunks: [],
    };
    setChatHistory((prev) => [...prev, assistantMessage]);

    setIsStreaming(true);
    
    // Generar ID único para este stream
    const streamId = Date.now().toString();
    activeStreamRef.current = streamId;

    console.log("ChatArea: Enviando query con modelo:", selectedModel);

    // Enviar consulta con streaming
    streamChatQuery({
      workspaceId: activeWorkspace.id,
      query: query,
      conversationId: currentConversationId,
      model: selectedModel,
      onChunk: (data) => {
        // Verificar que este stream sigue activo
        if (activeStreamRef.current !== streamId) {
          console.log("ChatArea: Stream cancelado, ignorando chunks");
          return;
        }
        
        if (data.type === 'sources') {
          setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMsg = { ...newHistory[newHistory.length - 1] };
            if (lastMsg.role === 'assistant') {
              lastMsg.chunks = data.relevant_chunks;
              lastMsg.modelUsed = data.model_used;
              newHistory[newHistory.length - 1] = lastMsg;
            }
            return newHistory;
          });
          if (data.conversation_id && !currentConversationId) {
            setCurrentConversationId(data.conversation_id);
          }
        } else if (data.type === 'content') {
          setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMsg = { ...newHistory[newHistory.length - 1] };
            if (lastMsg.role === 'assistant') {
              lastMsg.content = lastMsg.content + data.text;
              newHistory[newHistory.length - 1] = lastMsg;
            }
            return newHistory;
          });
        } else if (data.type === 'error') {
          setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMsg = { ...newHistory[newHistory.length - 1] };
            if (lastMsg.role === 'assistant') {
              lastMsg.content = lastMsg.content + `\n\n⚠️ Error: ${data.detail}`;
              newHistory[newHistory.length - 1] = lastMsg;
            }
            return newHistory;
          });
        }
      },
      onError: (err: any) => {
        // Verificar que este stream sigue activo
        if (activeStreamRef.current !== streamId) return;
        
        setChatHistory(prev => {
          const newHistory = [...prev];
          const lastMsg = { ...newHistory[newHistory.length - 1] };
          if (lastMsg.role === 'assistant') {
            lastMsg.content = lastMsg.content + `\n\n❌ Error de conexión: ${err.message}`;
            newHistory[newHistory.length - 1] = lastMsg;
          }
          return newHistory;
        });
        activeStreamRef.current = null;
        setIsStreaming(false);
      },
      onFinish: async () => {
        // Verificar que este stream sigue activo
        if (activeStreamRef.current !== streamId) return;
        
        activeStreamRef.current = null;
        setIsStreaming(false);
        
        // Si es el primer mensaje y tenemos conversation_id, generar título automáticamente
        if (isFirstMessage && currentConversationId && activeWorkspace) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
            const token = localStorage.getItem("access_token");
            const response = await fetch(
              `${apiUrl}/workspaces/${activeWorkspace.id}/conversations/${currentConversationId}/generate-title`,
              { 
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                }
              }
            );
            if (response.ok) {
              // Actualizar lista de conversaciones
              fetchConversations(activeWorkspace.id);
            }
          } catch (error) {
            console.error("Error generando título:", error);
          }
        } else if (activeWorkspace) {
          fetchConversations(activeWorkspace.id);
        }
      }
    });

    // Limpiar input y archivos adjuntos
    setMessage("");
    setAttachedFiles([]);
    resetTranscript();
  };

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (
      activeWorkspace &&
      confirm("¿Estás seguro de que quieres limpiar el historial de chat?")
    ) {
      setChatHistory([]);
      deleteChatHistory(activeWorkspace.id);
    }
  };

  const startListening = async () => {
    setVoiceError(null);
    try {
      // Verificar permisos de micrófono
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Detener el stream de prueba

        // Iniciar reconocimiento de voz
        SpeechRecognition.startListening({
          continuous: true,
          language: 'es-ES', // Español de España
        });
      } else {
        throw new Error('Tu navegador no soporta acceso al micrófono');
      }
    } catch (error: any) {
      console.error('❌ Error al iniciar reconocimiento de voz:', error);
      const errorMsg = error.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador.'
        : error.name === 'NotFoundError'
          ? 'No se detectó ningún micrófono. Conecta un micrófono e intenta nuevamente.'
          : `Error: ${error.message}`;
      setVoiceError(errorMsg);
      alert(errorMsg);
    }
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setVoiceError(null);
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>El navegador no soporta reconocimiento de voz.</span>;
  }

  // Prevenir error de hidratación
  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#1B1C1D' }}>
      <UploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          // Refrescar documentos del workspace activo
          if (activeWorkspace) {
            fetchDocuments(activeWorkspace.id);
          }
        }}
      />

      <header className="p-6 border-b border-gray-800/50 flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-semibold text-white">
          {activeWorkspace ? activeWorkspace.name : "Chat"}
        </h2>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="text-gray-300 border-gray-700 hover:bg-gray-800 transition-all"
            onClick={() =>
              activeWorkspace && exportChatToTxt(activeWorkspace.id, activeConversation?.id)
            }
            disabled={!activeWorkspace || !activeConversation}
          >
            Export to TXT
          </Button>
          <Button
            variant="outline"
            className="text-gray-300 border-gray-700 hover:bg-gray-800 transition-all"
            onClick={() =>
              activeWorkspace && exportChatToPdf(activeWorkspace.id, activeConversation?.id)
            }
            disabled={!activeWorkspace || !activeConversation}
          >
            Export to PDF
          </Button>
          <UserMenu 
            size="sm" 
            showName={true} 
            showClearHistory={true}
            onClearHistory={handleClearHistory}
            disableClearHistory={!activeWorkspace || chatHistory.length === 0}
          />
        </div>
      </header>

      {/* Área de Mensajes con scroll */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="p-4">
            {!activeWorkspace ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="p-6 bg-card rounded-full shadow-2xl mb-4">
                  <span className="text-6xl">👋</span>
                </div>
                <h2 className="text-3xl font-bold text-foreground">
                  Bienvenido al Asistente Inteligente Tivit
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Seleccione un espacio de trabajo en el panel lateral para comenzar a interactuar con sus documentos corporativos mediante IA conversacional.
                </p>
              </div>
            ) : chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
            <div className="mb-8 text-center">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {activeWorkspace.name}
              </h3>
              <p className="text-muted-foreground">
                Sistema listo para analizar y consultar su documentación empresarial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="p-6 bg-card hover:bg-accent border border-border rounded-xl text-left transition-all hover:shadow-lg group flex flex-col gap-3"
              >
                <div className="p-2 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Cargar Documentos</h4>
                  <p className="text-sm text-muted-foreground mt-1">Agregue archivos PDF, DOCX, XLSX o TXT al contexto de análisis.</p>
                </div>
              </button>

              <button 
                onClick={() => handleQuickPrompt("Genera un resumen ejecutivo completo de todos los documentos disponibles en este espacio de trabajo, destacando los puntos clave, conclusiones principales y recomendaciones.")}
                className="p-6 bg-card hover:bg-accent border border-border rounded-xl text-left transition-all hover:shadow-lg group flex flex-col gap-3"
              >
                <div className="p-2 bg-success/10 w-fit rounded-lg group-hover:bg-success/20 transition-colors">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Resumen Ejecutivo del Workspace</h4>
                  <p className="text-sm text-muted-foreground mt-1">Obtenga una síntesis inteligente de toda la documentación disponible.</p>
                </div>
              </button>
            </div>

            <div className="w-full">
              <QuickPrompts onPromptSelect={handleQuickPrompt} />
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] break-words ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border border-border"
                    } rounded-2xl p-5 relative group shadow-sm`}
                >
                  {/* Botón de copiar (solo para mensajes del asistente) */}
                  {msg.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                        setCopiedMessageId(`${index}`);
                        showToast('Respuesta copiada al portapapeles', 'success');
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }}
                      title="Copiar respuesta"
                    >
                      {copiedMessageId === `${index}` ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Model used badge for assistant messages */}
                  {msg.role === "assistant" && msg.modelUsed && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                        🤖 {msg.modelUsed}
                      </span>
                    </div>
                  )}

                  {/* Mostrar chunks relevantes si existen */}
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                        Sources ({msg.chunks.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {msg.chunks.slice(0, 3).map((chunk, idx) => (
                          <div
                            key={idx}
                            className="min-w-[200px] max-w-[250px] text-xs bg-muted/50 p-3 rounded-lg border border-border/50"
                          >
                            <p className="font-semibold mb-1 text-foreground truncate">
                              Score: {chunk.score.toFixed(2)}
                            </p>
                            <p className="line-clamp-3 text-muted-foreground">{chunk.chunk_text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de "Escribiendo..." */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-card border border-border text-muted-foreground rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area Fija en el bottom */}
      <div className="flex-shrink-0 border-t border-gray-800/50 p-4" style={{ backgroundColor: '#1B1C1D' }}>
        <div className="max-w-4xl mx-auto">
           {/* Model Badge */}
           {activeWorkspace && (
             <div className="flex justify-center mb-2">
                <span 
                  className="bg-gray-800/90 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-400 flex items-center gap-2 cursor-pointer hover:border-gray-600 hover:bg-gray-800 transition-all"
                  onClick={() => router.push('/')}
                  title="Ir al Dashboard"
                >
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   Using: <span className="font-semibold text-gray-200">{selectedModel === "gpt-4o-mini" ? "Velvet" : selectedModel === "gpt-4.1-nano" ? "GPT-4.1 Nano" : "Gemini 2.0 Flash"}</span>
                </span>
             </div>
           )}

           {/* Input Container */}
           <div className={`bg-gray-900 border border-gray-700 rounded-2xl flex flex-col overflow-hidden transition-all duration-200 ${activeWorkspace ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              {/* Attached Files */}
              {attachedFiles.length > 0 && (
                 <div className="px-4 pt-3 flex flex-wrap gap-2 bg-muted/30 pb-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground shadow-sm"
                      >
                        <FileText className="h-3 w-3 text-primary" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          onClick={() => removeAttachedFile(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                 </div>
              )}
              
              <div className="flex items-end p-3 gap-2">
                 <input
                    type="file"
                    id="file-attach"
                    className="hidden"
                    multiple
                    accept=".pdf,.docx,.xlsx,.txt,.csv"
                    onChange={handleFileAttach}
                    disabled={!activeWorkspace}
                  />
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-10 w-10" 
                    onClick={() => document.getElementById('file-attach')?.click()}
                      title="Adjuntar archivos al contexto"
                 >
                    <span className="text-2xl leading-none">+</span>
                 </Button>
                 
                 <textarea
                    ref={textareaRef}
                    className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2.5 max-h-40 text-foreground placeholder:text-muted-foreground leading-relaxed"
                    placeholder="Escriba su consulta o solicitud al asistente inteligente..."
                    disabled={!activeWorkspace || isStreaming}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    style={{ height: 'auto', minHeight: '2.5rem' }}
                 />
                 
                 <div className="flex items-center gap-1">
                   <Button
                      variant="ghost"
                      size="icon"
                      className={`${listening ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-foreground'} rounded-xl h-10 w-10`}
                      onClick={listening ? stopListening : startListening}
                      title="Entrada por voz (reconocimiento de audio)"
                   >
                      <Mic className="h-5 w-5" />
                   </Button>

                   <Button 
                      size="icon" 
                      className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl h-10 w-10 transition-transform active:scale-95"
                      onClick={() => handleSendMessage()}
                      disabled={!activeWorkspace || !message.trim() || isStreaming}
                   >
                      {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-lg font-bold">↑</span>}
                   </Button>
                 </div>
              </div>
           </div>
           <div className="text-center mt-2 text-xs text-gray-500">
              La IA puede cometer errores. Por favor, verifique la información crítica para decisiones empresariales.
           </div>
        </div>
      </div>
    </main>
  );
}
