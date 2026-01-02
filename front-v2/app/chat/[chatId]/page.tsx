"use client"

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { use, useState, useRef, useEffect, useCallback, useMemo, memo } from "react"
import {
  SendOutlined,
  PlusOutlined,
  CopyOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  CloseOutlined,
  AudioOutlined,
  DeleteOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileExcelOutlined,
  LoadingOutlined,
  DownOutlined,
} from "@ant-design/icons"
import { Button, Input, Typography, Drawer, message, Upload, Popover, Select } from "antd"
import type { UploadFile } from "antd"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Sidebar from "@/components/sidebar"
import { UserMenu } from "@/components/UserMenu"
import { useUser } from "@/hooks/useUser"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { sendChatMessageStream, sendGeneralChatMessageStream } from "@/lib/api"
import type { ChatStreamEvent, DocumentChunk } from "@/types/api"

const { Text } = Typography
const { TextArea } = Input

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  chunks?: DocumentChunk[]
  modelUsed?: string
}

interface FileItem {
  id: string
  name: string
  type: string
  size: string
}

// ============================================
// COMPONENTE MESSAGEITEM MEMOIZADO
// ============================================
interface MessageItemProps {
  message: Message
  hoveredMessageId: string | null
  onMouseEnter: (id: string) => void
  onMouseLeave: () => void
  onCopyMessage: (content: string) => void
  remarkPlugins: any[]
  markdownComponents: any
  isStreaming: boolean
  isLastMessage: boolean
  showLoadingIndicator: boolean
}

const MessageItem = memo<MessageItemProps>(({ 
  message, 
  hoveredMessageId, 
  onMouseEnter, 
  onMouseLeave, 
  onCopyMessage,
  remarkPlugins,
  markdownComponents,
  isStreaming,
  isLastMessage,
  showLoadingIndicator
}) => {
  return (
    <div
      style={{
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: message.role === "user" ? "flex-end" : "flex-start",
      }}
    >
      {message.role === "user" ? (
        <div
          style={{
            background: "#2A2A2D",
            borderRadius: "20px",
            padding: "16px 20px",
            maxWidth: "80%",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: "15px", lineHeight: "1.6" }}>{message.content}</Text>
        </div>
      ) : (
        <div 
          style={{ width: "100%", maxWidth: "90%" }}
          onMouseEnter={() => onMouseEnter(message.id)}
          onMouseLeave={onMouseLeave}
        >
          {/* Mostrar indicador de escritura si es el último mensaje y está vacío durante streaming */}
          {showLoadingIndicator ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
              <LoadingOutlined style={{ color: "#E31837", fontSize: "16px" }} />
              <Text style={{ color: "#AAAAAA", fontSize: "14px" }}>Generando respuesta...</Text>
            </div>
          ) : (
            <div 
              className="markdown-content"
              style={{ 
                color: "#E3E3E3", 
                fontSize: "15px", 
                lineHeight: "1.8" 
              }}
            >
              <ReactMarkdown
                remarkPlugins={remarkPlugins}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {hoveredMessageId === message.id && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "16px",
              }}
            >
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => onCopyMessage(message.content)}
                style={{ color: "#888888", fontSize: "14px" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Comparación personalizada para React.memo
  // Solo re-renderizar si:
  // 1. El contenido del mensaje cambió
  // 2. El ID cambió
  // 3. El hoveredMessageId cambió
  // 4. Los indicadores de loading/showing cambiaron
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.hoveredMessageId === nextProps.hoveredMessageId &&
    prevProps.showLoadingIndicator === nextProps.showLoadingIndicator &&
    prevProps.isLastMessage === nextProps.isLastMessage
  )
})

MessageItem.displayName = "MessageItem"

export default function GeneralChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialMessage = searchParams.get("message") || ""
  const chatTitle = searchParams.get("title") || "Nuevo Chat"

  // Usar el contexto de workspaces
  const { 
    activeWorkspace, 
    selectedModel, 
    setSelectedModel,
    fetchGeneralConversations,
    fetchConversationMessages 
  } = useWorkspaceContext()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

  // Estados para micrófono y grabación de voz
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messageCounterRef = useRef(0)
  
  // Refs para streaming
  const activeStreamRef = useRef<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  // ============================================
  // CONFIGURACIONES ESTABLES DE REACTMARKDOWN
  // ============================================
  // Memoizar remarkPlugins para evitar recrear la referencia en cada render
  const remarkPlugins = useMemo(() => [remarkGfm], [])

  // Memoizar componentes de ReactMarkdown para evitar recrear objetos en cada render
  const markdownComponents = useMemo(() => ({
    p: ({ children }: { children: React.ReactNode }) => <p style={{ margin: "0 0 16px 0" }}>{children}</p>,
    h1: ({ children }: { children: React.ReactNode }) => <h1 style={{ color: "#FFFFFF", fontSize: "24px", fontWeight: "bold", margin: "24px 0 16px 0" }}>{children}</h1>,
    h2: ({ children }: { children: React.ReactNode }) => <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: "bold", margin: "20px 0 12px 0" }}>{children}</h2>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: "bold", margin: "16px 0 8px 0" }}>{children}</h3>,
    ul: ({ children }: { children: React.ReactNode }) => <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li style={{ margin: "4px 0" }}>{children}</li>,
    table: ({ children }: { children: React.ReactNode }) => (
      <div style={{ overflowX: "auto", margin: "16px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#1E1E21", borderRadius: "8px", overflow: "hidden" }}>{children}</table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => <thead style={{ background: "#2A2A2D" }}>{children}</thead>,
    tbody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children: React.ReactNode }) => <tr style={{ borderBottom: "1px solid #3A3A3D" }}>{children}</tr>,
    th: ({ children }: { children: React.ReactNode }) => <th style={{ padding: "12px 16px", textAlign: "left", color: "#FFFFFF", fontWeight: "bold", fontSize: "14px" }}>{children}</th>,
    td: ({ children }: { children: React.ReactNode }) => <td style={{ padding: "12px 16px", color: "#E3E3E3", fontSize: "14px" }}>{children}</td>,
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      return isInline ? (
        <code style={{ background: "#2A2A2D", padding: "2px 6px", borderRadius: "4px", fontSize: "14px" }}>{children}</code>
      ) : (
        <code style={{ display: "block", background: "#1E1E21", padding: "16px", borderRadius: "8px", fontSize: "14px", overflowX: "auto", margin: "8px 0" }}>{children}</code>
      );
    },
    pre: ({ children }: { children: React.ReactNode }) => <pre style={{ margin: "16px 0", background: "#1E1E21", borderRadius: "8px", overflow: "hidden" }}>{children}</pre>,
    blockquote: ({ children }: { children: React.ReactNode }) => <blockquote style={{ borderLeft: "4px solid #3A3A3D", paddingLeft: "16px", margin: "16px 0", color: "#AAAAAA" }}>{children}</blockquote>,
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "underline" }}>{children}</a>,
    strong: ({ children }: { children: React.ReactNode }) => <strong style={{ color: "#FFFFFF", fontWeight: "bold" }}>{children}</strong>,
    em: ({ children }: { children: React.ReactNode }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
  }), [])

  // Estados para archivos adjuntos
  const [attachedFiles, setAttachedFiles] = useState<UploadFile[]>([])
  const [showFilePopover, setShowFilePopover] = useState(false)

  // Tipos de archivo permitidos
  const allowedFileTypes = [
    '.pdf',
    '.doc', '.docx',
    '.ppt', '.pptx',
    '.xls', '.xlsx'
  ]
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  const [chatFiles] = useState<FileItem[]>([
    { id: "1", name: "imagen_adjunta.png", type: "image", size: "1.2 MB" },
    { id: "2", name: "documento.pdf", type: "pdf", size: "3.5 MB" },
  ])

  const [generatedFiles] = useState<FileItem[]>([
    { id: "3", name: "resumen_generado.txt", type: "text", size: "45 KB" },
  ])

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FilePdfOutlined style={{ color: "#E31837", fontSize: "20px" }} />
      case "image":
        return <FileImageOutlined style={{ color: "#52C41A", fontSize: "20px" }} />
      case "text":
        return <FileTextOutlined style={{ color: "#1890FF", fontSize: "20px" }} />
      default:
        return <FileOutlined style={{ color: "#888888", fontSize: "20px" }} />
    }
  }

  // Efecto para cargar historial de conversación existente
  useEffect(() => {
    const loadHistory = async () => {
      // Si no hay mensaje inicial, es probable que estemos abriendo un chat existente
      if (!initialMessage && chatId) {
        setIsLoadingHistory(true)
        try {
          // Intentar cargar mensajes como chat general (workspaceId = null)
          const loadedMessages = await fetchConversationMessages(null, chatId)
          
          if (loadedMessages && loadedMessages.length > 0) {
            const formattedMessages: Message[] = loadedMessages.map((msg) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }))
            setMessages(formattedMessages)
            setCurrentConversationId(chatId)
          }
        } catch (error) {
          console.error("Error al cargar historial general:", error)
        } finally {
          setIsLoadingHistory(false)
        }
      }
    }

    loadHistory()
  }, [chatId, initialMessage, fetchConversationMessages])

  // Efecto para enviar mensaje inicial
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      // Enviar mensaje inicial con streaming real
      handleSendMessageWithStreaming(initialMessage)
      
      // Limpiar la URL removiendo los query params
      router.replace(`/chat/${chatId}`, { scroll: false })
    }
  }, [initialMessage, messages.length, chatId, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /**
   * Handle streaming events from the backend
   */
  const handleStreamEvent = useCallback((event: ChatStreamEvent, streamId: string) => {
    // Verificar que este stream sigue activo
    if (activeStreamRef.current !== streamId) {
      console.log("Stream cancelado, ignorando eventos")
      return
    }

    // Handle content events
    if (event.type === "content" && "text" in event) {
      setMessages((prev) => {
        const newHistory = [...prev]
        const lastMsg = newHistory[newHistory.length - 1]
        if (lastMsg && lastMsg.role === "assistant") {
          newHistory[newHistory.length - 1] = {
            ...lastMsg,
            content: lastMsg.content + (event.text || ""),
          }
        }
        return newHistory
      })
      return
    }

    // Handle sources events
    if (event.type === "sources" && "relevant_chunks" in event) {
      setMessages((prev) => {
        const newHistory = [...prev]
        const lastMsg = newHistory[newHistory.length - 1]
        if (lastMsg && lastMsg.role === "assistant") {
          newHistory[newHistory.length - 1] = {
            ...lastMsg,
            chunks: event.relevant_chunks,
          }
        }
        return newHistory
      })
      
      // Extraer conversation_id si está disponible
      if ("conversation_id" in event && event.conversation_id) {
        setCurrentConversationId(event.conversation_id)
      }
      return
    }

    // Handle intent events
    if (event.type === "intent" && "intent" in event) {
      console.log("Intent detectado:", event.intent)
      return
    }
  }, [])

  /**
   * Send message with streaming support
   */
  const handleSendMessageWithStreaming = async (messageText: string) => {
    if (!messageText.trim()) return

    // Agregar mensaje del usuario
    messageCounterRef.current += 1
    const userMessage: Message = {
      id: `msg-${Date.now()}-${messageCounterRef.current}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Agregar mensaje placeholder del asistente
    messageCounterRef.current += 1
    const assistantMessage: Message = {
      id: `msg-${Date.now()}-${messageCounterRef.current}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      chunks: [],
    }
    setMessages((prev) => [...prev, assistantMessage])

    setIsLoading(true)
    setIsStreaming(true)

    // Generar ID único para este stream
    const streamId = Date.now().toString()
    activeStreamRef.current = streamId

    try {
      if (activeWorkspace?.id) {
        // Chat con Workspace (RAG)
        await sendChatMessageStream(
          activeWorkspace.id,
          {
            query: messageText,
            conversation_id: currentConversationId || undefined,
            model: selectedModel || undefined,
          },
          // onChunk
          (event: ChatStreamEvent) => {
            handleStreamEvent(event, streamId)
          },
                  // onComplete
                  (conversationId: string) => {
                    if (activeStreamRef.current === streamId) {
                      activeStreamRef.current = null
                      setIsStreaming(false)
                      setIsLoading(false)
                      if (conversationId) {
                        setCurrentConversationId(conversationId)
                        // Refrescar lista de chats generales en el sidebar
                        fetchGeneralConversations()
                      }
                    }
                  },
          
          // onError
          (error: Error) => {
            if (activeStreamRef.current === streamId) {
              console.error("Error en streaming:", error)
              setMessages((prev) => {
                const newHistory = [...prev]
                const lastMsg = newHistory[newHistory.length - 1]
                if (lastMsg && lastMsg.role === "assistant") {
                  newHistory[newHistory.length - 1] = {
                    ...lastMsg,
                    content: lastMsg.content + `\n\n❌ Error: ${error.message || "Error desconocido"}`,
                  }
                }
                return newHistory
              })
              activeStreamRef.current = null
              setIsStreaming(false)
              setIsLoading(false)
            }
          }
        )
      } else {
        // Chat General (Sin Workspace / Landing)
        await sendGeneralChatMessageStream(
          {
            query: messageText,
            conversation_id: currentConversationId || undefined,
            model: selectedModel || undefined,
          },
          // onChunk
          (event: ChatStreamEvent) => {
            handleStreamEvent(event, streamId)
          },
          // onComplete
          (conversationId: string) => {
            if (activeStreamRef.current === streamId) {
              activeStreamRef.current = null
              setIsStreaming(false)
              setIsLoading(false)
              if (conversationId) {
                setCurrentConversationId(conversationId)
              }
            }
          },
          // onError
          (error: Error) => {
            if (activeStreamRef.current === streamId) {
              console.error("Error en streaming general:", error)
              setMessages((prev) => {
                const newHistory = [...prev]
                const lastMsg = newHistory[newHistory.length - 1]
                if (lastMsg && lastMsg.role === "assistant") {
                  newHistory[newHistory.length - 1] = {
                    ...lastMsg,
                    content: lastMsg.content + `\n\n❌ Error: ${error.message || "Error desconocido"}`,
                  }
                }
                return newHistory
              })
              activeStreamRef.current = null
              setIsStreaming(false)
              setIsLoading(false)
            }
          }
        )
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error)
      activeStreamRef.current = null
      setIsStreaming(false)
      setIsLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isStreaming) return
    
    const messageToSend = inputMessage
    setInputMessage("")
    handleSendMessageWithStreaming(messageToSend)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    message.success("Copiado al portapapeles")
  }

  // Función para iniciar/detener grabación de voz
  const toggleRecording = () => {
    if (isRecording) {
      // Detener grabación
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsRecording(false)
    } else {
      // Iniciar grabación
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        message.error("Tu navegador no soporta reconocimiento de voz")
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = "es-ES"
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setInputMessage((prev) => prev + finalTranscript)
        }
      }

      recognition.onerror = (event) => {
        console.error("Error en reconocimiento de voz:", event.error)
        message.error("Error en el reconocimiento de voz")
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    }
  }

  // Función para obtener ícono de archivo por extensión
  const getAttachmentIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return <FilePdfOutlined style={{ fontSize: "16px", color: "#E31837" }} />
      case 'doc':
      case 'docx':
        return <FileWordOutlined style={{ fontSize: "16px", color: "#2B579A" }} />
      case 'ppt':
      case 'pptx':
        return <FilePptOutlined style={{ fontSize: "16px", color: "#D24726" }} />
      case 'xls':
      case 'xlsx':
        return <FileExcelOutlined style={{ fontSize: "16px", color: "#217346" }} />
      default:
        return <FileTextOutlined style={{ fontSize: "16px", color: "#888888" }} />
    }
  }

  // Función para remover archivo adjunto
  const handleRemoveAttachment = (uid: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.uid !== uid))
  }

  // Contenido del popover de archivos
  const fileUploadContent = (
    <div style={{ width: 280 }}>
      <Upload.Dragger
        multiple
        accept={allowedFileTypes.join(',')}
        fileList={attachedFiles}
        beforeUpload={(file) => {
          const isAllowed = allowedMimeTypes.includes(file.type) || 
            allowedFileTypes.some(ext => file.name.toLowerCase().endsWith(ext))
          if (!isAllowed) {
            message.error("Solo se permiten archivos PDF, Word, PowerPoint y Excel")
            return Upload.LIST_IGNORE
          }
          setAttachedFiles((prev) => [...prev, {
            uid: file.uid,
            name: file.name,
            status: 'done',
            originFileObj: file,
          }])
          return false
        }}
        onRemove={(file) => {
          handleRemoveAttachment(file.uid)
        }}
        showUploadList={false}
        style={{
          background: "#2A2A2D",
          border: "1px dashed #3A3A3D",
          borderRadius: "8px",
        }}
      >
        <p style={{ color: "#888888", marginBottom: "8px" }}>
          <PlusOutlined style={{ fontSize: "24px" }} />
        </p>
        <p style={{ color: "#E3E3E3", fontSize: "13px", margin: 0 }}>
          Arrastra archivos o haz clic
        </p>
        <p style={{ color: "#666666", fontSize: "11px", margin: "4px 0 0" }}>
          PDF, Word, PowerPoint, Excel
        </p>
      </Upload.Dragger>

      {attachedFiles.length > 0 && (
        <div style={{ marginTop: "12px", maxHeight: "150px", overflowY: "auto" }}>
          {attachedFiles.map((file) => (
            <div
              key={file.uid}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                background: "#1E1E21",
                borderRadius: "6px",
                marginBottom: "6px",
              }}
            >
              {getAttachmentIcon(file.name)}
              <span style={{ flex: 1, color: "#E3E3E3", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </span>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveAttachment(file.uid)}
                style={{ color: "#888888", padding: "2px" }}
              />
            </div>
          ))}
        </div>
      )}

      <Button
        type="primary"
        block
        onClick={() => setShowFilePopover(false)}
        style={{
          marginTop: "12px",
          background: "#E31837",
          borderColor: "#E31837",
        }}
      >
        Listo
      </Button>
    </div>
  )

  const renderFileSection = (title: string, files: FileItem[]) => (
    <div style={{ marginBottom: "24px" }}>
      <Text style={{ color: "#888888", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
        {title}
      </Text>
      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {files.length === 0 ? (
          <Text style={{ color: "#666666", fontSize: "13px", fontStyle: "italic" }}>No hay archivos</Text>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                background: "#2A2A2D",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {getFileIcon(file.type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "#E3E3E3", fontSize: "13px", display: "block" }} ellipsis>
                  {file.name}
                </Text>
                <Text style={{ color: "#666666", fontSize: "11px" }}>{file.size}</Text>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#131314",
      }}
    >
      <Sidebar />

      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#E3E3E3", fontSize: "16px", fontWeight: 500 }}>Archivos</Text>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setFilesDrawerOpen(false)}
              style={{ color: "#888888" }}
            />
          </div>
        }
        placement="right"
        onClose={() => setFilesDrawerOpen(false)}
        open={filesDrawerOpen}
        closable={false}
        styles={{
          wrapper: { width: 320 },
          header: { background: "#1E1E21", borderBottom: "1px solid #2A2A2D", padding: "16px" },
          body: { background: "#1E1E21", padding: "16px" },
        }}
      >
        {renderFileSection("Archivos del Chat", chatFiles)}
        {renderFileSection("Archivos Generados", generatedFiles)}
      </Drawer>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#131314",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #2A2A2D",
            flexShrink: 0,
          }}
        >
          <div style={{ cursor: "pointer" }} onClick={() => router.push('/')}>
            <img 
              src="/logo.svg" 
              alt="Logo" 
              style={{ height: "40px" }} 
            />
          </div>

          {/* Chat Name - center */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Text style={{ color: "#FFFFFF", fontSize: "16px" }}>{chatTitle}</Text>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Button
              type="text"
              icon={<AppstoreOutlined style={{ fontSize: "20px" }} />}
              onClick={() => setFilesDrawerOpen(true)}
              style={{
                color: "#888888",
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
            <UserMenu user={user} />
          </div>
        </header>

        {/* Messages area */}
        <main
          className="chat-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minHeight: 0,
          }}
        >
          <div style={{ width: "100%", maxWidth: "800px" }}>
            {isLoadingHistory ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <LoadingOutlined style={{ color: "#E31837", fontSize: "20px" }} />
                  <Text style={{ color: "#AAAAAA" }}>Cargando conversación...</Text>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <Text style={{ color: "#888888" }}>No hay mensajes en esta conversación</Text>
              </div>
            ) : (
              messages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  hoveredMessageId={hoveredMessageId}
                  onMouseEnter={setHoveredMessageId}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  onCopyMessage={handleCopyMessage}
                  remarkPlugins={remarkPlugins}
                  markdownComponents={markdownComponents}
                  isStreaming={isStreaming}
                  isLastMessage={index === messages.length - 1}
                  showLoadingIndicator={msg.content === "" && isStreaming && index === messages.length - 1}
                />
              ))
            )}

            {isLoading && !isStreaming && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <LoadingOutlined style={{ color: "#E31837" }} />
                  <Text style={{ color: "#AAAAAA", fontSize: "14px" }}>Conectando...</Text>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input area at bottom */}
        <div
          style={{
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexShrink: 0,
            background: "#131314",
          }}
        >
          <div style={{ width: "100%", maxWidth: "800px" }}>
            {/* Mostrar archivos adjuntos */}
            {attachedFiles.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "8px",
                  padding: "8px 12px",
                  background: "#1E1E21",
                  borderRadius: "12px",
                }}
              >
                {attachedFiles.map((file) => (
                  <div
                    key={file.uid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      background: "#2A2A2D",
                      borderRadius: "8px",
                    }}
                  >
                    {getAttachmentIcon(file.name)}
                    <span style={{ color: "#E3E3E3", fontSize: "12px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined style={{ fontSize: "10px" }} />}
                      onClick={() => handleRemoveAttachment(file.uid)}
                      style={{ color: "#888888", padding: "0", width: "16px", height: "16px", minWidth: "16px" }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                background: "#2A2A2D",
                borderRadius: "28px",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                border: isRecording ? "2px solid #E31837" : "2px solid transparent",
                boxShadow: isRecording ? "0 0 20px rgba(227, 24, 55, 0.3)" : "none",
                transition: "all 0.3s ease",
              }}
            >
              <TextArea
                placeholder={
                  isRecording 
                    ? "Escuchando..." 
                    : "Escribe tu mensaje..."
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                autoSize={{ minRows: 1, maxRows: 4 }}
                variant="borderless"
                disabled={isStreaming}
                style={{
                  background: "transparent",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  padding: "4px 8px",
                  resize: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Popover
                    content={fileUploadContent}
                    trigger="click"
                    open={showFilePopover}
                    onOpenChange={setShowFilePopover}
                    placement="topLeft"
                    styles={{
                      container: {
                        background: "#1E1E21",
                        border: "1px solid #3A3A3D",
                        borderRadius: "12px",
                        padding: "16px",
                      }
                    }}
                  >
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      style={{
                        color: attachedFiles.length > 0 ? "#E31837" : "#888888",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#3A3A3D",
                      }}
                    />
                  </Popover>

                  <Select
                    value={selectedModel}
                    onChange={setSelectedModel}
                    suffixIcon={<DownOutlined style={{ color: "#888888", fontSize: "10px" }} />}
                    size="small"
                    variant="borderless"
                    style={{ 
                      width: "140px",
                      color: "#888888",
                    }}
                    options={[
                      { label: "ChatGPT 4o-mini", value: "gpt-4o-mini" },
                      { label: "Velvet 12B", value: "velvet-12b" },
                    ]}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Mostrar micrófono si no hay texto, enviar si hay texto */}
                  {!inputMessage.trim() ? (
                    <Button
                      type="text"
                      icon={<AudioOutlined style={{ fontSize: "18px" }} />}
                      onClick={toggleRecording}
                      disabled={isStreaming}
                      style={{
                        color: isRecording ? "#FFFFFF" : "#888888",
                        background: isRecording ? "#E31837" : "#3A3A3D",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: isRecording ? "pulse 1.5s infinite" : "none",
                        opacity: isStreaming ? 0.5 : 1,
                      }}
                    />
                  ) : (
                    <Button
                      type="text"
                      icon={isStreaming ? <LoadingOutlined style={{ fontSize: "16px" }} /> : <SendOutlined style={{ fontSize: "16px" }} />}
                      onClick={handleSendMessage}
                      disabled={isStreaming}
                      style={{
                        color: "#FFFFFF",
                        background: isStreaming ? "#666666" : "#E31837",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <Text
              style={{
                display: "block",
                textAlign: "center",
                color: "#666666",
                fontSize: "12px",
                marginTop: "12px",
              }}
            >
              Velvet puede cometer errores, asi que verifica sus respuestas.
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
