"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, FileText, Loader2, Bot, User, CornerDownLeft } from "lucide-react";
import { useToast, ToastContainer } from "@/components/toast";

// Define la estructura de un mensaje en el chat
interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toasts, addToast, removeToast } = useToast();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Desplazamiento automático al final del chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Autenticación inicial
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(user => setAuthUser(user.username))
      .catch(() => localStorage.removeItem("access_token"));
    }
  }, []);

  // Cargar historial cuando cambie el workspace
  useEffect(() => {
    const workspaceId = localStorage.getItem("selected_workspace_id");
    
    // Si cambió el workspace, cargar su historial
    if (workspaceId && workspaceId !== currentWorkspaceId) {
      setCurrentWorkspaceId(workspaceId);
      loadChatHistory(workspaceId);
    } else if (!workspaceId) {
      // No hay workspace seleccionado
      setCurrentWorkspaceId(null);
      setMessages([]);
    }
  }, [currentWorkspaceId]);

  // Escuchar evento personalizado de cambio de workspace
  useEffect(() => {
    const handleWorkspaceChange = (event: CustomEvent) => {
      const workspaceId = event.detail?.workspaceId;
      console.log("ChatArea: Workspace cambió a", workspaceId);
      
      if (workspaceId && workspaceId !== currentWorkspaceId) {
        setCurrentWorkspaceId(workspaceId);
        loadChatHistory(workspaceId);
      } else if (!workspaceId) {
        setCurrentWorkspaceId(null);
        setMessages([]);
      }
    };

    window.addEventListener("workspaceChanged", handleWorkspaceChange as EventListener);
    
    // Cargar workspace inicial
    const initialWorkspaceId = localStorage.getItem("selected_workspace_id");
    if (initialWorkspaceId && !currentWorkspaceId) {
      setCurrentWorkspaceId(initialWorkspaceId);
      loadChatHistory(initialWorkspaceId);
    }
    
    return () => {
      window.removeEventListener("workspaceChanged", handleWorkspaceChange as EventListener);
    };
  }, [currentWorkspaceId]);

  // Función para cargar el historial de chat
  const loadChatHistory = async (workspaceId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/chat/history?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const history = await response.json();
        // Convertir el formato del backend al formato del frontend
        const formattedMessages: Message[] = history.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          sources: msg.sources ? JSON.parse(msg.sources).map((s: any) => s.chunk_text) : undefined,
        }));
        setMessages(formattedMessages);
      } else {
        console.error("Error loading chat history");
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setMessages([]);
    }
  };

  // Maneja la selección de archivos desde el input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Maneja eventos de arrastrar y soltar para la carga de archivos
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Maneja el evento de soltar un archivo
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Validar extensión
      const validExtensions = [".pdf", ".docx", ".xlsx", ".pptx", ".txt"];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExt)) {
        addToast("Formato de archivo no soportado. Usa: PDF, DOCX, XLSX, PPTX o TXT", "error");
        return;
      }
      
      // Validar tamaño (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        addToast(`Archivo muy grande. Máximo: 50MB (Tu archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB)`, "error");
        return;
      }
      
      if (file.size === 0) {
        addToast("El archivo está vacío", "error");
        return;
      }
      
      setSelectedFile(file);
      addToast(`Archivo "${file.name}" seleccionado (${(file.size / 1024 / 1024).toFixed(2)}MB)`, "info");
    }
  };

  // Sube el archivo seleccionado al servidor
  const uploadFile = async () => {
    if (!selectedFile) return;
    
    // Validar nuevamente antes de subir
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      addToast("Archivo muy grande. Máximo: 50MB", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      addToast("Debes iniciar sesión para subir archivos", "error");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const workspaceId = localStorage.getItem("selected_workspace_id") || "1";
      const response = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Archivo "${selectedFile.name}" subido y procesado.`,
        }]);
        addToast("Archivo cargado correctamente", "success");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al subir el archivo");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      addToast(error instanceof Error ? error.message : "Error desconocido", "error");
    } finally {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    }
  };

  // Envía una pregunta al backend y recibe la respuesta
  const sendMessage = async () => {
    if (!input.trim()) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      addToast("Debes iniciar sesión para enviar mensajes", "error");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const workspaceId = localStorage.getItem("selected_workspace_id") || "1";
      const response = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: userInput }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.llm_response || "No se pudo obtener una respuesta.",
          sources: data.relevant_chunks?.map((c: any) => c.chunk_text) || [],
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al procesar la pregunta");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addToast(error instanceof Error ? error.message : "Error de conexión", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Renderiza el área de mensajes vacía o con la conversación
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="bg-background p-10 rounded-2xl shadow-md border border-border max-w-lg">
            <div className="mb-4">
              <span className="inline-block p-4 bg-primary/10 rounded-2xl">
                <Bot className="h-8 w-8 text-primary" />
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Hola, {authUser || 'invitado'}</h2>
            <p className="text-muted-foreground">
              Sube tus documentos y haz preguntas para obtener respuestas inteligentes basadas en su contenido.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className={`max-w-[75%] p-4 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background border border-border text-foreground'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-primary/20">
                  <h4 className="text-xs font-semibold mb-2">Fuentes:</h4>
                  <div className="space-y-2">
                    {msg.sources.slice(0, 2).map((src, idx) => (
                      <p key={idx} className="text-xs opacity-80 line-clamp-2">
                        "{src}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
             {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Pensando...</span>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-secondary h-screen">
      {/* Cabecera del chat */}
      <header className="bg-background border-b border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chat con Documentos</h2>
          <p className="text-sm text-muted-foreground">Interactúa con tus archivos subidos</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      </header>

      {/* Área de mensajes */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {renderMessages()}
      </div>

      {/* Área de entrada de texto y carga de archivos */}
      <div className="bg-background border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          <div
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={`relative flex items-center bg-secondary rounded-2xl transition-all ${dragActive ? "ring-2 ring-primary" : ""}`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.docx,.xlsx,.pptx,.txt" className="hidden"/>
            <Button onClick={() => fileInputRef.current?.click()} size="icon" variant="ghost" className="text-muted-foreground hover:text-primary ml-2">
              <Upload className="h-5 w-5" />
            </Button>
            <Textarea
              placeholder="Escribe tu pregunta o arrastra un archivo aquí..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 pl-4 pr-12 py-4 min-h-[56px] bg-transparent border-none focus-visible:ring-0 resize-none text-foreground"
            />
            <div className="absolute top-1/2 right-4 -translate-y-1/2">
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="w-10 h-10 rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {selectedFile && (
            <div className="mt-3 flex items-center justify-between bg-primary/5 p-2 rounded-lg">
              <span className="text-sm text-muted-foreground truncate flex-1">
                <FileText className="inline h-4 w-4 mr-2"/>{selectedFile.name}
              </span>
              <Button onClick={uploadFile} disabled={isUploading} size="sm" variant="ghost" className="h-8">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subir archivo"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
