"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, FileText, Loader2 } from "lucide-react";
import { useToast, ToastContainer } from "@/components/toast";

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
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast, removeToast } = useToast();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // En producción el workspace seleccionado vendrá del Sidebar; aquí usamos localStorage como puente simple

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if ([".pdf", ".docx", ".xlsx", ".pptx", ".txt"].some(ext => file.name.endsWith(ext))) {
        setSelectedFile(file);
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const workspaceIdLocal = localStorage.getItem("selected_workspace_id") || "1";
      const response = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceIdLocal}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages([
          ...messages,
          {
            role: "assistant",
            content: `Documento "${selectedFile.name}" subido exitosamente. Procesamiento iniciado.`,
          },
        ]);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        addToast("Archivo cargado correctamente", "success");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      addToast("Error al cargar el archivo", "error");
      setMessages([
        ...messages,
        {
          role: "assistant",
          content: "Error al subir el documento. Por favor intente nuevamente.",
        },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const workspaceIdLocal = localStorage.getItem("selected_workspace_id") || "1";
      const response = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceIdLocal}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: input }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.llm_response || "No se pudo generar una respuesta.",
          sources: data.relevant_chunks?.map((chunk: any) => chunk.chunk_text) || [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        addToast("Respuesta generada exitosamente", "success");
      } else {
        addToast("Error al procesar la pregunta", "error");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addToast("Error de conexión. Verifica la conexión con el servidor", "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error al procesar la pregunta. Verifique la conexión con el backend.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--primary))] flex items-center gap-2">
              <span>💬 Chat con Documentos</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Sube documentos y haz preguntas sobre su contenido</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-600">Modelo Activo</p>
            <p className="text-sm font-bold text-[hsl(var(--primary))]">🤖 GEMINI</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[hsl(var(--secondary))] to-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 mb-4">
                    <FileText className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Bienvenido a Velvet AI</h3>
                  <p className="text-sm text-gray-600 mb-6">Comienza cargando documentos para hacer preguntas inteligentes</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Sube tu documento</p>
                      <p className="text-xs text-gray-600 mt-1">PDF, Word, Excel o PowerPoint</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Haz tu pregunta</p>
                      <p className="text-xs text-gray-600 mt-1">Nuestro modelo GEMINI la analiza</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Obtén respuestas precisas</p>
                      <p className="text-xs text-gray-600 mt-1">Con fuentes documentadas</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">💡 Tip: Usa el botón "Seleccionar archivo" abajo para comenzar</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold mb-1">Fuentes:</p>
                      {message.sources.slice(0, 2).map((source, idx) => (
                        <p key={idx} className="text-xs opacity-70 truncate">
                          • {source.substring(0, 100)}...
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-border rounded-lg p-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
              <span className="text-sm text-muted-foreground">Pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        {/* Error Display */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start">
            <span className="text-red-600 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* File Upload Section */}
        <div className="mb-3">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`p-4 rounded-lg border-2 border-dashed transition-all ${
              dragActive
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5"
                : "border-gray-300 bg-gray-50 hover:border-[hsl(var(--primary))]/50"
            }`}
          >
            <div className="flex gap-2 items-center mb-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.docx,.xlsx,.pptx,.txt"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 hover:bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30"
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar archivo
              </Button>
              {selectedFile && (
                <>
                  <span className="text-sm text-gray-600 truncate flex-1">
                    📄 {selectedFile.name}
                  </span>
                  <Button
                    onClick={uploadFile}
                    disabled={isUploading}
                    size="sm"
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(0_85%_45%)] text-white"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Subir"
                    )}
                  </Button>
                </>
              )}
            </div>
            {!selectedFile && (
              <p className="text-xs text-gray-500 text-center">
                O arrastra un archivo aquí (PDF, DOCX, XLSX, PPTX)
              </p>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Escribe tu pregunta sobre los documentos..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 min-h-[60px] max-h-[120px]"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(0_85%_45%)] self-end text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
