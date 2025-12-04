"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mic,
  Loader2,
  FileText,
  Copy,
  Check,
  SendHorizontal,
  Plus,
  Download,
} from "lucide-react";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { UploadModal } from "./UploadModal";
import { ConversationDocumentList } from "./conversation-document-list";
import { DocumentUploadProgress } from "./DocumentUploadProgress";
import {
  useChat,
  useConversationWithMessages,
  useConversationDocuments,
  streamChatQuery,
  useGenerateProposalFromChat,
  GenerateProposalFromChatRequest,
} from "@/hooks/useApi";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocumentStatus, ProposalAnalysis } from "@/types/api";
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
  /** Extracted proposal data if this message contains a proposal analysis */
  proposalData?: ProposalAnalysis;
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
    uploadDocumentToConversation,
  } = useWorkspaces();

  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >(undefined);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploadingToConversation, setIsUploadingToConversation] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState<Array<{
    id: string;
    file_name: string;
    status: DocumentStatus;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeStreamRef = useRef<string | null>(null);
  // Ref to track detected intent during streaming (for auto-generating proposal)
  const detectedIntentRef = useRef<string | null>(null);

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

  // Hook para generar propuesta Word desde chat
  const generateProposalMutation = useGenerateProposalFromChat();

  // Hook de chat - solo se activa si hay workspace activo
  // const chatMutation = useChat(activeWorkspace?.id || ''); // Deprecated for streaming

  // Hook para cargar conversación con mensajes
  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useConversationWithMessages({
    workspaceId: activeWorkspace?.id,
    conversationId: activeConversation?.id,
  });

  // Hook para cargar documentos de la conversación
  const { data: conversationDocuments, refetch: refetchConversationDocuments } =
    useConversationDocuments(
      activeWorkspace?.id,
      activeConversation?.id,
    );

  // Si hay error 404, la conversación no existe - limpiar el estado
  useEffect(() => {
    if (conversationError && activeConversation) {
      console.warn("Conversación no encontrada, limpiando estado");
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

  // Ref para trackear qué conversación ya cargamos (evita recargas después del streaming)
  const lastLoadedConversationRef = useRef<string | null>(null);

  // Limpiar y preparar cuando cambia la conversación activa
  useEffect(() => {
    if (!activeConversation?.id) {
      setChatHistory([]);
      setCurrentConversationId(undefined);
      lastLoadedConversationRef.current = null;
      return;
    }

    // Solo resetear el estado cuando cambia de conversación
    activeStreamRef.current = null;
    setIsStreaming(false);
    setCurrentConversationId(activeConversation.id);
    lastLoadedConversationRef.current = null; // Resetear para permitir recarga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id]);

  // Cargar mensajes cuando llegan los datos - solo en carga inicial o cambio de conversación
  useEffect(() => {
    if (
      !conversationData?.messages ||
      !activeConversation?.id ||
      conversationData.id !== activeConversation.id
    ) {
      return;
    }

    // No recargar si ya cargamos esta conversación y estamos en streaming
    if (isStreaming) {
      return;
    }

    // No recargar si ya cargamos esta conversación (evita sobreescribir después del streaming)
    if (lastLoadedConversationRef.current === conversationData.id) {
      return;
    }

    lastLoadedConversationRef.current = conversationData.id;

    const loadedMessages: ChatMessage[] = conversationData.messages.map(
      (msg) => ({
        role: msg.role,
        content: msg.content,
        chunks: msg.chunk_references
          ? JSON.parse(msg.chunk_references)
          : undefined,
      }),
    );
    setChatHistory(loadedMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationData, activeConversation?.id]);

  const handleQuickPrompt = (prompt: string) => {
    setMessage(prompt);
    // Esperar un momento para que el state se actualice antes de enviar
    setTimeout(() => {
      if (activeWorkspace) {
        handleSendMessage(prompt);
      }
    }, 100);
  };

  const handleSendMessage = async (overrideMessage?: string) => {
    const query = overrideMessage || message;
    if (!query.trim() || !activeWorkspace) return;

    // Si hay archivos adjuntos pero aún no hay conversación activa, informar al usuario
    if (attachedFiles.length > 0 && !activeConversation) {
      showToast("Los archivos adjuntos se subirán después de crear la conversación", "info");
    }

    // Si hay archivos adjuntos y ya existe una conversación, subirlos primero
    if (attachedFiles.length > 0 && activeConversation) {
      setIsUploadingToConversation(true);
      const uploadedDocs: Array<{ id: string; file_name: string; status: DocumentStatus }> = [];
      
      try {
        for (const file of attachedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          
          const uploadedDoc = await uploadDocumentToConversation(activeWorkspace.id, activeConversation.id, formData);
          uploadedDocs.push({
            id: uploadedDoc.id,
            file_name: uploadedDoc.file_name,
            status: (uploadedDoc.status as DocumentStatus) || "PENDING",
          });
        }
        
        if (uploadedDocs.length > 0) {
          setUploadingDocuments((prev) => [...prev, ...uploadedDocs]);
          showToast(`${uploadedDocs.length} archivo(s) adjuntado(s), procesando...`, "success");
          refetchConversationDocuments();
        }
      } catch (error) {
        console.error("Error al subir archivos adjuntos:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        showToast(`Error al adjuntar archivos: ${errorMessage}`, "error");
        setIsUploadingToConversation(false);
        return; // No enviar el mensaje si falló la subida
      } finally {
        setIsUploadingToConversation(false);
      }
    }

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
    // Reset detected intent for this new stream
    detectedIntentRef.current = null;

    // Enviar consulta con streaming
    streamChatQuery({
      workspaceId: activeWorkspace.id,
      query: query,
      conversationId: currentConversationId,
      model: selectedModel,
      onChunk: (data: unknown) => {
        // Verificar que este stream sigue activo
        if (activeStreamRef.current !== streamId) {
          console.log("ChatArea: Stream cancelado, ignorando chunks");
          return;
        }

        const chunk = data as {
          type?: string;
          intent?: string;
          relevant_chunks?: unknown[];
          model_used?: string;
          conversation_id?: string;
          text?: string;
          detail?: string;
        };

        // Capturar el intent detectado por el backend
        if (chunk.type === "intent") {
          detectedIntentRef.current = chunk.intent || null;
          console.log("ChatArea: Intent detectado:", chunk.intent);
          return;
        }

        if (chunk.type === "sources") {
          setChatHistory((prev) => {
            const newHistory = [...prev];
            const lastMsg = { ...newHistory[newHistory.length - 1] };
            if (lastMsg.role === "assistant") {
              lastMsg.chunks = chunk.relevant_chunks as Array<{
                document_id: string;
                chunk_text: string;
                score: number;
              }>;
              lastMsg.modelUsed = chunk.model_used;
              newHistory[newHistory.length - 1] = lastMsg;
            }
            return newHistory;
          });
          if (chunk.conversation_id && !currentConversationId) {
            setCurrentConversationId(chunk.conversation_id);
          }
        } else if (chunk.type === "content") {
          setChatHistory((prev) => {
            const newHistory = [...prev];
            const lastMsg = { ...newHistory[newHistory.length - 1] };
            if (lastMsg.role === "assistant") {
              lastMsg.content = lastMsg.content + (chunk.text || "");
              newHistory[newHistory.length - 1] = lastMsg;
            }
            return newHistory;
          });
        } else if (chunk.type === "error") {
          setChatHistory((prev) => {
            const newHistory = [...prev];
            const lastMsg = { ...newHistory[newHistory.length - 1] };
            if (lastMsg.role === "assistant") {
              lastMsg.content =
                lastMsg.content +
                `\n\n⚠️ Error: ${chunk.detail || "Error desconocido"}`;
              newHistory[newHistory.length - 1] = lastMsg;
            }
            return newHistory;
          });
        }
      },
      onError: (err: unknown) => {
        // Verificar que este stream sigue activo
        if (activeStreamRef.current !== streamId) return;

        const error = err as { message?: string };
        setChatHistory((prev) => {
          const newHistory = [...prev];
          const lastMsg = { ...newHistory[newHistory.length - 1] };
          if (lastMsg.role === "assistant") {
            lastMsg.content =
              lastMsg.content +
              `\n\n❌ Error de conexión: ${error.message || "Error desconocido"}`;
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

        // Actualizar lista de conversaciones
        if (activeWorkspace) {
          fetchConversations(activeWorkspace.id);
        }

        // Si el intent fue GENERATE_PROPOSAL, auto-generar el documento Word
        if (detectedIntentRef.current === "GENERATE_PROPOSAL") {
          console.log("ChatArea: Auto-generando documento Word para propuesta...");
          
          // Obtener el último mensaje del asistente para extraer datos de propuesta
          setChatHistory((prevHistory) => {
            const lastMessage = prevHistory[prevHistory.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              const proposalData = detectProposalInMessage(lastMessage.content);
              if (proposalData) {
                // Ejecutar generación de propuesta de forma asíncrona
                setTimeout(async () => {
                  await handleAutoGenerateProposal(proposalData);
                }, 100);
              } else {
                console.warn("ChatArea: No se pudo extraer datos de propuesta del mensaje");
              }
            }
            return prevHistory;
          });
        }
      },
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
      // Limpiar el input para que se pueda seleccionar el mismo archivo de nuevo
      event.target.value = '';
    }
  };

  const handleDocumentStatusChange = useCallback((documentId: string, newStatus: DocumentStatus) => {
    setUploadingDocuments((prev) =>
      prev.map((doc) => (doc.id === documentId ? { ...doc, status: newStatus } : doc))
    );
  }, []);

  const handleAllDocumentsCompleted = useCallback(() => {
    // Refrescar lista de documentos cuando todos estén procesados
    refetchConversationDocuments();
    
    // Limpiar la lista después de 3 segundos para que el usuario vea los estados finales
    setTimeout(() => {
      setUploadingDocuments([]);
    }, 3000);
  }, [refetchConversationDocuments]);

  /**
   * Detect if a message content contains a proposal/analysis response.
   * Looks for key markers that indicate it's a structured proposal.
   */
  const detectProposalInMessage = useCallback((content: string): ProposalAnalysis | null => {
    // Look for proposal indicators in the message
    const proposalIndicators = [
      "cliente:",
      "presupuesto:",
      "fecha de entrega:",
      "tecnologías requeridas:",
      "riesgos detectados:",
      "equipo sugerido:",
      "alcance económico:",
    ];
    
    const lowerContent = content.toLowerCase();
    const matchCount = proposalIndicators.filter(indicator => 
      lowerContent.includes(indicator)
    ).length;
    
    // If at least 3 indicators are present, try to extract proposal data
    if (matchCount >= 3) {
      try {
        // Try to extract structured data from the message
        // This is a best-effort extraction - the backend should send structured data
        const proposal: ProposalAnalysis = {
          cliente: extractField(content, "cliente") || "Cliente no especificado",
          fecha_entrega: extractField(content, "fecha de entrega") || extractField(content, "fecha entrega") || "No especificada",
          alcance_economico: {
            presupuesto: extractField(content, "presupuesto") || "No especificado",
            moneda: content.toLowerCase().includes("usd") ? "USD" : "CLP",
          },
          tecnologias_requeridas: extractListField(content, "tecnologías requeridas") || extractListField(content, "tecnologias requeridas") || [],
          riesgos_detectados: extractListField(content, "riesgos detectados") || extractListField(content, "riesgos") || [],
          preguntas_sugeridas: extractListField(content, "preguntas sugeridas") || extractListField(content, "preguntas") || [],
          equipo_sugerido: [], // Complex to extract, leave empty
        };
        
        return proposal;
      } catch {
        console.warn("Could not extract proposal data from message");
        return null;
      }
    }
    
    return null;
  }, []);

  /**
   * Extract a single field value from text
   */
  const extractField = (text: string, fieldName: string): string | null => {
    const regex = new RegExp(`${fieldName}[:\\s]+([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  /**
   * Extract a list field from text (items separated by commas or newlines with bullets)
   */
  const extractListField = (text: string, fieldName: string): string[] | null => {
    const regex = new RegExp(`${fieldName}[:\\s]+([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return null;
    
    const listContent = match[1];
    // Try to split by bullets, numbers, or commas
    const items = listContent
      .split(/[•\-\*\n,]/)
      .map(item => item.trim())
      .filter(item => item.length > 2 && !item.includes(':'));
    
    return items.length > 0 ? items : null;
  };

  /**
   * Handle generating Word document from a proposal in chat
   * Ensures explicit context (conversation_id, document_id) is passed to backend
   */
  const handleGenerateProposalWord = useCallback(async (proposalData: ProposalAnalysis, messageIndex: number) => {
    if (!currentConversationId && !activeConversation?.id) {
      showToast("Error: No hay conversación activa para generar el documento", "error");
      return;
    }

    const conversationId = currentConversationId || activeConversation?.id;
    if (!conversationId) {
      showToast("Error: ID de conversación no disponible", "error");
      return;
    }

    // Get the most recent document ID from conversation if available
    const lastDocumentId = conversationDocuments && conversationDocuments.length > 0
      ? conversationDocuments[conversationDocuments.length - 1].id
      : undefined;

    setIsGeneratingProposal(true);
    
    try {
      const request: GenerateProposalFromChatRequest = {
        proposal_data: proposalData,
        conversation_id: conversationId,
        document_id: lastDocumentId, // Pass explicit document context
      };

      const blob = await generateProposalMutation.mutateAsync(request);

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Propuesta_${proposalData.cliente.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("✅ Documento Word generado exitosamente", "success");
    } catch (error) {
      console.error("Error generating proposal document:", error);
      showToast("Error al generar el documento Word", "error");
    } finally {
      setIsGeneratingProposal(false);
    }
  }, [currentConversationId, activeConversation?.id, conversationDocuments, generateProposalMutation]);

  /**
   * Auto-generate Word document when GENERATE_PROPOSAL intent is detected
   * Called automatically after streaming completes
   */
  const handleAutoGenerateProposal = useCallback(async (proposalData: ProposalAnalysis) => {
    // Use currentConversationId which should be set from the stream's "sources" chunk
    const conversationId = currentConversationId || activeConversation?.id;
    
    if (!conversationId) {
      console.warn("ChatArea: No conversation ID available for auto-generating proposal");
      showToast("⚠️ No se pudo generar documento automáticamente: falta ID de conversación", "error");
      return;
    }

    // Get the most recent document ID from conversation if available
    const lastDocumentId = conversationDocuments && conversationDocuments.length > 0
      ? conversationDocuments[conversationDocuments.length - 1].id
      : undefined;

    console.log("ChatArea: Auto-generando propuesta Word con:", {
      conversationId,
      documentId: lastDocumentId,
      cliente: proposalData.cliente,
    });

    setIsGeneratingProposal(true);
    
    // Add a message indicating generation is in progress
    setChatHistory((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "⏳ Generando documento Word de la propuesta...",
      },
    ]);

    try {
      const request: GenerateProposalFromChatRequest = {
        proposal_data: proposalData,
        conversation_id: conversationId,
        document_id: lastDocumentId,
      };

      const blob = await generateProposalMutation.mutateAsync(request);

      // Download the file automatically
      const url = window.URL.createObjectURL(blob);
      const fileName = `Propuesta_${proposalData.cliente.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.docx`;
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update the last message to show success with download link
      setChatHistory((prev) => {
        const newHistory = [...prev];
        const lastIdx = newHistory.length - 1;
        if (lastIdx >= 0 && newHistory[lastIdx].content.includes("Generando documento")) {
          newHistory[lastIdx] = {
            ...newHistory[lastIdx],
            content: `✅ **Documento Word generado exitosamente**\n\n📄 Archivo descargado: \`${fileName}\`\n\nEl documento contiene la propuesta comercial completa basada en el análisis realizado.`,
          };
        }
        return newHistory;
      });

      showToast("✅ Propuesta Word generada y descargada automáticamente", "success");
    } catch (error) {
      console.error("Error auto-generating proposal document:", error);
      
      // Update message to show error
      setChatHistory((prev) => {
        const newHistory = [...prev];
        const lastIdx = newHistory.length - 1;
        if (lastIdx >= 0 && newHistory[lastIdx].content.includes("Generando documento")) {
          newHistory[lastIdx] = {
            ...newHistory[lastIdx],
            content: `❌ **Error al generar documento Word**\n\nPuedes intentar descargarlo manualmente usando el botón de descarga en el mensaje anterior.`,
          };
        }
        return newHistory;
      });
      
      showToast("Error al generar el documento Word automáticamente", "error");
    } finally {
      setIsGeneratingProposal(false);
    }
  }, [currentConversationId, activeConversation?.id, conversationDocuments, generateProposalMutation]);

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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop()); // Detener el stream de prueba

        // Iniciar reconocimiento de voz
        SpeechRecognition.startListening({
          continuous: true,
          language: "es-ES", // Español de España
        });
      } else {
        throw new Error("Tu navegador no soporta acceso al micrófono");
      }
    } catch (error: any) {
      console.error("❌ Error al iniciar reconocimiento de voz:", error);
      const errorMsg =
        error.name === "NotAllowedError"
          ? "Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador."
          : error.name === "NotFoundError"
            ? "No se detectó ningún micrófono. Conecta un micrófono e intenta nuevamente."
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
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#1B1C1D]">
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
              activeWorkspace &&
              exportChatToTxt(activeWorkspace.id, activeConversation?.id)
            }
            disabled={!activeWorkspace || !activeConversation}
          >
            Export to TXT
          </Button>
          <Button
            variant="outline"
            className="text-gray-300 border-gray-700 hover:bg-gray-800 transition-all"
            onClick={() =>
              activeWorkspace &&
              exportChatToPdf(activeWorkspace.id, activeConversation?.id)
            }
            disabled={!activeWorkspace || !activeConversation}
          >
            Export to PDF
          </Button>
        </div>
      </header>

      {/* Área de Mensajes con scroll */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="p-4">
            {!activeWorkspace ? (
              <div className="flex flex-col items-center justify-center min-h-[18rem] text-center space-y-6">
                <div className="p-6 bg-card rounded-full shadow-2xl mb-4">
                  <span className="text-6xl">👋</span>
                </div>
                <h2 className="text-3xl font-bold text-foreground">
                  Bienvenido al Asistente Inteligente Tivit
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Seleccione un espacio de trabajo en el panel lateral para
                  comenzar a interactuar con sus documentos corporativos
                  mediante IA conversacional.
                </p>
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[18rem] max-w-3xl mx-auto px-4">
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {activeWorkspace.name}
                  </h3>
                  <p className="text-muted-foreground">
                    Sistema listo para analizar y consultar su documentación
                    empresarial.
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
                      <h4 className="font-semibold text-foreground">
                        Cargar Documentos
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Agregue archivos PDF, DOCX, XLSX o TXT al contexto de
                        análisis.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      handleQuickPrompt(
                        "Genera un resumen ejecutivo completo de todos los documentos disponibles en este espacio de trabajo, destacando los puntos clave, conclusiones principales y recomendaciones.",
                      )
                    }
                    className="p-6 bg-card hover:bg-accent border border-border rounded-xl text-left transition-all hover:shadow-lg group flex flex-col gap-3"
                  >
                    <div className="p-2 bg-success/10 w-fit rounded-lg group-hover:bg-success/20 transition-colors">
                      <FileText className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Resumen Ejecutivo del Workspace
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Obtenga una síntesis inteligente de toda la
                        documentación disponible.
                      </p>
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
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] break-words ${
                        msg.role === "user"
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
                            showToast(
                              "Respuesta copiada al portapapeles",
                              "success",
                            );
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

                      {/* Model used badge and Proposal Download button for assistant messages */}
                      {msg.role === "assistant" && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                          {msg.modelUsed && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                              🤖 {msg.modelUsed}
                            </span>
                          )}
                          
                          {/* Proposal Download Button - shows if message contains proposal-like content */}
                          {(() => {
                            const proposalData = msg.proposalData || detectProposalInMessage(msg.content);
                            if (proposalData && msg.content.length > 200) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-xs bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400"
                                  onClick={() => handleGenerateProposalWord(proposalData, index)}
                                  disabled={isGeneratingProposal}
                                >
                                  {isGeneratingProposal ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Generando...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-3 w-3" />
                                      Descargar Propuesta (Word)
                                    </>
                                  )}
                                </Button>
                              );
                            }
                            return null;
                          })()}
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

            {/* Documentos de la conversación - Compacto */}
            {activeConversation && conversationDocuments && conversationDocuments.length > 0 && (
              <div className="border-t border-gray-800/50 pt-2 mt-4">
                <ConversationDocumentList
                  conversationId={activeConversation.id}
                  documents={conversationDocuments || []}
                  onDocumentsChange={() => refetchConversationDocuments()}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area Fija en el bottom */}
      <div
        className="flex-shrink-0 border-t border-gray-800/50 p-4"
        style={{ backgroundColor: "#1B1C1D" }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Model Badge */}
          {activeWorkspace && (
            <div className="flex justify-center mb-2">
              <span
                className="bg-gray-800/90 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-400 flex items-center gap-2 cursor-pointer hover:border-gray-600 hover:bg-gray-800 transition-all"
                onClick={() => router.push("/")}
                title="Ir al Dashboard"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Using:{" "}
                <span className="font-semibold text-gray-200">
                  {selectedModel === "gpt-4o-mini"
                    ? "GPT-4o Mini"
                    : selectedModel}
                </span>
              </span>
            </div>
          )}

          {/* Input Container */}
          <div
            className={`bg-[#2B2B2E] border border-gray-700 rounded-3xl flex flex-col  overflow-hidden transition-all duration-200 ${activeWorkspace ? "opacity-100" : "opacity-50 pointer-events-none"}`}
          >
            {/* Document Upload Progress */}
            {uploadingDocuments.length > 0 && (
              <div className="px-4 pt-3">
                <DocumentUploadProgress
                  documents={uploadingDocuments}
                  onDocumentStatusChange={handleDocumentStatusChange}
                  onAllCompleted={handleAllDocumentsCompleted}
                />
              </div>
            )}

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 flex flex-col gap-2 bg-muted/30 pb-2">
                {isUploadingToConversation && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Subiendo archivos adjuntos...</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
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
                        disabled={isUploadingToConversation}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center px-3 py-2 gap-2">
              <input
                type="file"
                id="file-attach"
                className="hidden"
                multiple
                accept=".pdf,.docx,.xlsx,.txt,.csv"
                onChange={handleFileAttach}
                disabled={!activeWorkspace || isUploadingToConversation}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl h-10 w-10"
                onClick={() => document.getElementById("file-attach")?.click()}
                title="Adjuntar archivos al mensaje"
                disabled={!activeWorkspace || isUploadingToConversation}
              >
                {isUploadingToConversation ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus />}
              </Button>

              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent border-0 outline-none focus:ring-0 resize-none py-2.5 max-h-40 text-foreground placeholder:text-muted-foreground leading-relaxed"
                placeholder="Escriba su consulta o solicitud al asistente inteligente..."
                disabled={!activeWorkspace || isStreaming}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 160) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                style={{ height: "auto", minHeight: "2.5rem" }}
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${listening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-white/5"} rounded-xl h-10 w-10`}
                  onClick={listening ? stopListening : startListening}
                  title="Entrada por voz (reconocimiento de audio)"
                >
                  <Mic className="h-5 w-5" />
                </Button>

                <Button
                  size="icon"
                  className="bg-brand-red text-white hover:bg-brand-red/80 rounded-xl h-10 w-10 transition-transform active:scale-95"
                  onClick={() => handleSendMessage()}
                  disabled={!activeWorkspace || !message.trim() || isStreaming || isUploadingToConversation}
                >
                  {isStreaming || isUploadingToConversation ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <SendHorizontal />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center mt-2 text-xs text-gray-500">
            La IA puede cometer errores. Por favor, verifique la información
            crítica para decisiones empresariales.
          </div>
        </div>
      </div>
    </main>
  );
}
