"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      onFinish: () => {
        // Verificar que este stream sigue activo
        if (activeStreamRef.current !== streamId) return;
        
        activeStreamRef.current = null;
        setIsStreaming(false);
        if (activeWorkspace) {
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

  return (
    <main className="flex-1 flex flex-col bg-brand-dark h-screen overflow-hidden">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-800 transition-all">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback>PC</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-300">PacoPruebas</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-brand-dark-secondary border-gray-700 text-gray-300">
              <DropdownMenuItem
                onClick={handleClearHistory}
                disabled={!activeWorkspace || chatHistory.length === 0}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Clear History
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-700">
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Área de Mensajes */}
      <ScrollArea className="flex-1 p-6 overflow-y-auto">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Avatar className="h-20 w-20 mx-auto mb-6 ring-4 ring-brand-red/20">
                <AvatarImage src="https://github.com/shadcn.png" alt="Velvet" />
                <AvatarFallback className="text-2xl">V</AvatarFallback>
              </Avatar>
              {activeWorkspace ? (
                <>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Bienvenido a {activeWorkspace.name}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Pregunta lo que necesites sobre tus documentos
                  </p>
                  <div
                    className={`flex flex-col space-y-3 transition-all duration-200 ${isDragging ? 'scale-105' : ''
                      }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const files = Array.from(e.dataTransfer.files);
                      if (files.length > 0) {
                        setIsModalOpen(true);
                      }
                    }}
                  >
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 transition-all ${isDragging
                        ? 'border-brand-red bg-brand-red/10 scale-105'
                        : 'border-gray-700 bg-transparent'
                        }`}
                    >
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-brand-red hover:bg-red-700 text-white font-medium py-6 text-base transition-all transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
                      >
                        📄 {isDragging ? 'Suelta tus archivos aquí' : 'Subir Documento'}
                      </Button>
                      <p className="text-sm text-gray-500 mt-3 text-center">
                        {isDragging ? 'Suelta para subir' : 'o arrastra archivos aquí'}
                      </p>
                    </div>
                  </div>
                  <QuickPrompts
                    onPromptSelect={handleQuickPrompt}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    ¡Empieza ahora!
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Crea o selecciona un workspace desde la barra lateral para comenzar a chatear con tus documentos
                  </p>
                  <div className="animate-pulse">
                    <div className="flex items-center justify-center space-x-2 text-brand-red">
                      <span className="text-3xl">←</span>
                      <span className="text-sm font-medium">Selecciona un workspace</span>
                    </div>
                  </div>
                </>
              )}
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
                  className={`max-w-[80%] break-words ${msg.role === "user"
                    ? "bg-brand-red text-white"
                    : "bg-gray-800 text-gray-200"
                    } rounded-lg p-4 relative group`}
                >
                  {/* Botón de copiar (solo para mensajes del asistente) */}
                  {msg.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
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
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800/50 border border-gray-700">
                        🤖 {msg.modelUsed}
                      </span>
                    </div>
                  )}

                  {/* Mostrar chunks relevantes si existen */}
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-400 mb-2">
                        Fragmentos relevantes ({msg.chunks.length}):
                      </p>
                      {msg.chunks.slice(0, 2).map((chunk, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded mb-2"
                        >
                          <p className="font-semibold mb-1">
                            Score: {chunk.score.toFixed(3)}
                          </p>
                          <p className="line-clamp-2">{chunk.chunk_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de "Escribiendo..." */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-200 rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Escribiendo...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Footer con el Input */}
      <footer className="p-6 border-t border-gray-800/50 flex-shrink-0 bg-brand-dark shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
        {/* Estado del reconocimiento de voz */}
        {listening && (
          <div className="mb-2 text-sm text-red-400 flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Escuchando... (di algo y aparecerá en el campo de texto)</span>
          </div>
        )}
        {voiceError && (
          <div className="mb-2 text-sm text-yellow-400">
            ⚠️ {voiceError}
          </div>
        )}
        {transcript && (
          <div className="mb-2 text-xs text-gray-400">
            🎤 Transcripción actual: "{transcript}"
          </div>
        )}

        {/* Model indicator */}
        <div className="mb-3 px-3 py-2 bg-gray-900/30 border border-gray-800 rounded-lg flex items-center justify-center text-xs">
          <span className="flex items-center gap-2 text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Modelo activo: <span className="font-semibold text-gray-300">
              {selectedModel === "gpt-4.1-nano" ? "OpenAI GPT-4.1 Nano" : "Gemini 2.0 Flash"}
            </span>
          </span>
        </div>

        {/* Archivos adjuntos */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">{attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 hover:border-gray-600 transition-all"
              >
                <FileText className="h-4 w-4 text-brand-red" />
                <span className="max-w-[200px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachedFile(index)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Eliminar archivo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-brand-dark-secondary rounded-lg border border-gray-700 hover:border-gray-600 focus-within:border-brand-red transition-all">
          {/* Contador de caracteres */}
          <div className="absolute top-2 right-2 text-xs text-gray-500 pointer-events-none z-10">
            {message.length} {message.length > 1000 && <span className="text-yellow-500">(largo)</span>}
          </div>

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent rounded-lg py-3 pl-4 pr-20 focus-visible:ring-0 focus-visible:outline-none text-gray-300 placeholder-gray-500 resize-none min-h-[3rem] max-h-40 leading-relaxed"
            placeholder="Escribe tu mensaje... (Shift + Enter para nueva línea, @ para mencionar documento)"
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
            style={{
              height: 'auto',
              minHeight: '3rem',
            }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className={`${listening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-gray-700/50 hover:bg-gray-600 text-gray-300'} transition-all transform hover:scale-110`}
              disabled={!activeWorkspace}
              onClick={listening ? stopListening : startListening}
              title={listening ? 'Detener grabación (grabando...)' : 'Iniciar reconocimiento de voz'}
            >
              <Mic className="h-5 w-5" />
            </Button>

            {/* Input oculto para archivos */}
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
              variant="secondary"
              className="bg-gray-700/50 hover:bg-gray-600 text-gray-300 transition-all relative group"
              disabled={!activeWorkspace}
              onClick={() => document.getElementById('file-attach')?.click()}
              title="Adjuntar archivos"
            >
              📎 Attach
              {attachedFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {attachedFiles.length}
                </span>
              )}
            </Button>
            <Button
              className="bg-brand-red text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              disabled={!activeWorkspace || !message.trim() || isStreaming}
              onClick={() => handleSendMessage()}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}
