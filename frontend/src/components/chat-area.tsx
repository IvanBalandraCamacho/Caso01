"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, Loader2 } from "lucide-react";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { UploadModal } from "./UploadModal";
import { useChat } from "@/hooks/useApi";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  chunks?: Array<{
    document_id: string;
    chunk_text: string;
    score: number;
  }>;
}

export function ChatArea() {
  const {
    activeWorkspace,
    exportChatToPdf,
    exportChatToTxt,
    deleteChatHistory,
  } = useWorkspaces();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Hook de chat - solo se activa si hay workspace activo
  const chatMutation = useChat(activeWorkspace?.id || '');

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
  }, [activeWorkspace?.id]);

  // Debug: Verificar soporte de voz
  useEffect(() => {
    console.log('🔊 Browser supports speech recognition:', browserSupportsSpeechRecognition);
    console.log('🎤 Listening:', listening);
    console.log('💬 Transcript:', transcript);
  }, [browserSupportsSpeechRecognition, listening, transcript]);

  const handleSendMessage = () => {
    if (!message.trim() || !activeWorkspace) return;

    // Agregar mensaje del usuario al historial
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };
    setChatHistory((prev) => [...prev, userMessage]);

    // Enviar consulta al backend
    chatMutation.mutate(message, {
      onSuccess: (response) => {
        // Agregar respuesta del asistente
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.llm_response,
          chunks: response.relevant_chunks,
        };
        setChatHistory((prev) => [...prev, assistantMessage]);
      },
      onError: (error: any) => {
        // Agregar mensaje de error
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `Error al procesar la solicitud de chat: ${error.response?.data?.detail || error.message}`,
        };
        setChatHistory((prev) => [...prev, errorMessage]);
      },
    });

    // Limpiar input
    setMessage("");
    resetTranscript();
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
        console.log('✅ Reconocimiento de voz iniciado');
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
    console.log('⏸️ Reconocimiento de voz detenido');
    setVoiceError(null);
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>El navegador no soporta reconocimiento de voz.</span>;
  }

  return (
    <main className="flex-1 flex flex-col bg-brand-dark">
      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <header className="p-6 border-b border-gray-800/50 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">
          {activeWorkspace ? activeWorkspace.name : "Chat"}
        </h2>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="text-gray-300 border-gray-700 hover:bg-gray-800"
            onClick={() =>
              activeWorkspace && exportChatToPdf(activeWorkspace.id)
            }
            disabled={!activeWorkspace}
          >
            Export to PDF
          </Button>
          <Button
            variant="outline"
            className="text-gray-300 border-gray-700 hover:bg-gray-800"
            onClick={() =>
              activeWorkspace && exportChatToTxt(activeWorkspace.id)
            }
            disabled={!activeWorkspace}
          >
            Export to TXT
          </Button>
          <Button
            variant="destructive"
            className="text-red-500 border-red-500/50 hover:bg-red-500/10"
            onClick={handleClearHistory}
            disabled={!activeWorkspace || chatHistory.length === 0}
          >
            Clear History
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" alt="JD" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-300">PacoPruebas</span>
        </div>
      </header>

      {/* Área de Mensajes */}
      <ScrollArea className="flex-1 p-6">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <Avatar className="h-16 w-16 mx-auto mb-4">
                <AvatarImage src="https://github.com/shadcn.png" alt="Velvet" />
                <AvatarFallback>V</AvatarFallback>
              </Avatar>
              <p className="text-lg text-gray-400">
                {activeWorkspace
                  ? `Bienvenido a ${activeWorkspace.name}. ¿En qué puedo ayudarte?`
                  : "Selecciona un workspace para comenzar."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-brand-red text-white"
                      : "bg-gray-800 text-gray-200"
                  } rounded-lg p-4`}
                >
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
            
            {/* Indicador de carga */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-200 rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Footer con el Input */}
      <footer className="p-6">
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
        <div className="relative bg-brand-dark-secondary rounded-lg">
          <Input
            className="w-full bg-transparent border border-gray-700 rounded-lg py-3 pl-4 pr-36 focus-visible:ring-brand-red text-gray-300 placeholder-gray-500 h-12"
            placeholder="Escribe tu mensaje..."
            disabled={!activeWorkspace || chatMutation.isPending}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <Button
              variant="secondary"
              className={`${listening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'}`}
              disabled={!activeWorkspace}
              onClick={listening ? stopListening : startListening}
              title={listening ? 'Detener grabación (grabando...)' : 'Iniciar reconocimiento de voz'}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300"
              disabled={!activeWorkspace}
              onClick={() => setIsModalOpen(true)}
            >
              Attach
            </Button>
            <Button
              className="ml-2 bg-brand-red text-white hover:bg-red-700"
              disabled={!activeWorkspace || !message.trim() || chatMutation.isPending}
              onClick={handleSendMessage}
            >
              {chatMutation.isPending ? (
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
