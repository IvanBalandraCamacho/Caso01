"use client"

import type React from "react"

import { useSearchParams, useRouter } from "next/navigation"
import { use, useState, useRef, useEffect, useMemo, memo } from "react"
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
  DownOutlined,
  DownloadOutlined,
  LoadingOutlined,
} from "@ant-design/icons"
import { Button, Input, Typography, Drawer, Upload, Popover, Modal, App, Select } from "antd"
import type { UploadFile } from "antd"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Sidebar from "@/components/sidebar"
import { UserMenu } from "@/components/UserMenu"
import { useUser } from "@/hooks/useUser"
import { useChatStream } from "@/hooks/useChatStream"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { fetchConversationMessages, fetchConversationDocuments, fetchWorkspaceDocuments, deleteDocumentApi, downloadProposalFromMarkdown } from "@/lib/api"
import { FilePreviewModal } from "@/components/FilePreviewModal"
import type { DocumentPublic, DocumentChunk } from "@/types/api"

const { Text } = Typography
const { TextArea } = Input

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
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
}

const MessageItem = memo<MessageItemProps>(({ 
  message, 
  hoveredMessageId, 
  onMouseEnter, 
  onMouseLeave, 
  onCopyMessage,
  remarkPlugins,
  markdownComponents
}) => {
  return (
    <div
      style={{
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: message.role === "user" ? "flex-end" : "flex-start",
      }}
      onMouseEnter={() => onMouseEnter(message.id)}
      onMouseLeave={onMouseLeave}
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
        <div style={{ width: "100%", maxWidth: "90%" }}>
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
  // Solo re-renderizar si el contenido del mensaje cambió
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.hoveredMessageId === nextProps.hoveredMessageId
  )
})

MessageItem.displayName = "MessageItem"

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>
}) {
  const { id, chatId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialMessage = searchParams.get("message") || ""
  const { message, modal } = App.useApp()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationTitle, setConversationTitle] = useState("Chat")
  const { user } = useUser()
  const { sendMessage: sendChatMessage } = useChatStream()
  const { selectedModel, setSelectedModel } = useWorkspaceContext()
  
  // Sources from the current streaming response (separate from message content)
  const [currentSources, setCurrentSources] = useState<DocumentChunk[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  // Estados para micrófono y grabación de voz
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messageCounterRef = useRef(0)
  const detectedIntentRef = useRef<string | null>(null)

  // ============================================
  // REFS PARA SCROLL THROTTLING
  // ============================================
  // lastScrollTimeRef: Timestamp del último scroll para throttling durante streaming
  const lastScrollTimeRef = useRef<number>(0)

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

  const [workspaceFiles, setWorkspaceFiles] = useState<DocumentPublic[]>([])
  const [chatFiles, setChatFiles] = useState<DocumentPublic[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [proposalGenerated, setProposalGenerated] = useState(false)
  const [proposalMarkdown, setProposalMarkdown] = useState<string>('')
  const [isDownloadingProposal, setIsDownloadingProposal] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentPublic | null>(null)

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase()
    if (type.includes('pdf')) {
      return <FilePdfOutlined style={{ color: "#E31837", fontSize: "20px" }} />
    } else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <FileImageOutlined style={{ color: "#52C41A", fontSize: "20px" }} />
    } else if (type.includes('word') || type.includes('doc')) {
      return <FileWordOutlined style={{ color: "#2B579A", fontSize: "20px" }} />
    } else if (type.includes('powerpoint') || type.includes('ppt') || type.includes('presentation')) {
      return <FilePptOutlined style={{ color: "#D24726", fontSize: "20px" }} />
    } else if (type.includes('excel') || type.includes('xls') || type.includes('sheet')) {
      return <FileExcelOutlined style={{ color: "#217346", fontSize: "20px" }} />
    } else if (type.includes('text') || type.includes('txt')) {
      return <FileTextOutlined style={{ color: "#1890FF", fontSize: "20px" }} />
    } else {
      return <FileOutlined style={{ color: "#888888", fontSize: "20px" }} />
    }
  }

  // Cargar documentos del workspace y conversación
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoadingDocuments(true)
      try {
        // Cargar documentos del workspace
        const workspaceDocs = await fetchWorkspaceDocuments(id)
        setWorkspaceFiles(workspaceDocs)

        // Cargar documentos de la conversación actual
        const conversationDocs = await fetchConversationDocuments({
          workspaceId: id,
          conversationId: chatId,
        })
        setChatFiles(conversationDocs)
      } catch (error) {
        console.error("Error loading documents:", error)
      } finally {
        setIsLoadingDocuments(false)
      }
    }

    loadDocuments()
  }, [id, chatId])

  // Función para eliminar documento
  const handleDeleteDocument = (documentId: string, fileName: string) => {
    modal.confirm({
      title: '¿Eliminar documento?',
      content: `¿Estás seguro de que deseas eliminar "${fileName}"? Esta acción no se puede deshacer.`,
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await deleteDocumentApi(documentId)
          message.success('Documento eliminado correctamente')
          
          // Recargar ambas listas de documentos
          const workspaceDocs = await fetchWorkspaceDocuments(id)
          setWorkspaceFiles(workspaceDocs)
          
          const conversationDocs = await fetchConversationDocuments({
            workspaceId: id,
            conversationId: chatId,
          })
          setChatFiles(conversationDocs)
        } catch (error) {
          console.error('Error deleting document:', error)
          message.error('Error al eliminar el documento')
        }
      },
    })
  }

  // Cargar historial de la conversación desde la API
  useEffect(() => {
    const loadConversationHistory = async () => {
      try {
        setIsLoadingHistory(true)
        const conversation = await fetchConversationMessages(id, chatId)
        
        // Establecer el título de la conversación
        setConversationTitle(conversation.title)
        
        // Restaurar estado de propuesta si existe
        if (conversation.has_proposal) {
          setProposalGenerated(true)
          // Buscar el último mensaje del asistente para obtener el markdown
          if (conversation.messages && conversation.messages.length > 0) {
            const lastAssistantMessage = [...conversation.messages].reverse().find(m => m.role === "assistant")
            if (lastAssistantMessage) {
              setProposalMarkdown(lastAssistantMessage.content)
            }
          }
        }
        
        // Convertir mensajes de la API al formato local
        if (conversation.messages && conversation.messages.length > 0) {
          const loadedMessages: Message[] = conversation.messages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }))
          setMessages(loadedMessages)
        } else if (initialMessage) {
          // Si no hay mensajes pero hay un mensaje inicial (nuevo chat)
          const userMessage: Message = {
            id: "1",
            role: "user",
            content: initialMessage,
            timestamp: new Date(),
          }
          setMessages([userMessage])
          
          // Limpiar la URL removiendo los query params
          router.replace(`/workspace/${id}/chat/${chatId}`, { scroll: false })
          
          // Simular respuesta (esto debería ser reemplazado por llamada real a la API)
          setTimeout(() => {
            const aiResponse: Message = {
              id: "2",
              role: "assistant",
              content: "¡Hola! He recibido tu mensaje. ¿En qué puedo ayudarte?",
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiResponse])
          }, 1000)
        }
      } catch (error) {
        console.error("Error loading conversation history:", error)
        // Si hay error y hay mensaje inicial, mostrar ese
        if (initialMessage) {
          const userMessage: Message = {
            id: "1",
            role: "user",
            content: initialMessage,
            timestamp: new Date(),
          }
          setMessages([userMessage])
        }
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadConversationHistory()
  }, [id, chatId, initialMessage, router])

  // Scroll optimizado con throttling
  useEffect(() => {
    const now = Date.now()
    
    if (isStreaming) {
      // Durante streaming, hacer scroll sin animación y con throttle
      if (now - lastScrollTimeRef.current > 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
        lastScrollTimeRef.current = now
      }
    } else {
      // Fuera de streaming, scroll smooth normal
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isStreaming])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    messageCounterRef.current += 1
    const newUserMessage: Message = {
      id: `msg-${Date.now()}-${messageCounterRef.current}`,
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    const currentMessage = inputMessage
    setInputMessage("")
    setIsLoading(true)
    setProposalGenerated(false)
    detectedIntentRef.current = null
    setCurrentSources([])
    setIsStreaming(true)

    // Crear ID para el mensaje del asistente
    messageCounterRef.current += 1
    const assistantMessageId = `msg-${Date.now()}-${messageCounterRef.current}`
    let firstChunkReceived = false

    try {
      await sendChatMessage(
        id,
        {
          query: currentMessage,
          conversation_id: chatId,
          model: "string",
        },
        {
          // Llamado cuando recibimos contenido del asistente
          onContentUpdate: (content: string) => {
            // En la primera actualización, agregar el mensaje al chat
            if (!firstChunkReceived) {
              firstChunkReceived = true
              setIsLoading(false)
              const assistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content,
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, assistantMessage])
            } else {
              // Actualizar contenido del mensaje existente
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content }
                    : msg
                )
              )
            }
          },

          // Llamado cuando recibimos sources/referencias
          onSourcesUpdate: (sources: DocumentChunk[]) => {
            setCurrentSources(sources)
          },

          // Llamado cuando detectamos intención
          onIntentDetected: (intent: string) => {
            // Guardar la intención en ref, pero no mostrar el botón hasta que termine
            detectedIntentRef.current = intent
          },

          // Llamado cuando finaliza el streaming
          onComplete: (conversationId: string) => {
            console.log("Streaming completed, conversation_id:", conversationId)
            setIsStreaming(false)
            
            // Mostrar el botón de propuesta solo cuando termine el streaming
            if (detectedIntentRef.current === "GENERATE_PROPOSAL") {
              // Guardar el contenido del último mensaje (que es la propuesta)
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1]
                if (lastMessage && lastMessage.role === "assistant") {
                  setProposalMarkdown(lastMessage.content)
                }
                return prev
              })
              setProposalGenerated(true)
            }
            
            // Solo apagar loading si no se recibió ningún chunk
            if (!firstChunkReceived) {
              setIsLoading(false)
            }
          },

          // Llamado si hay error
          onError: (error: Error) => {
            console.error("Error sending message:", error)
            message.error("Error al enviar el mensaje. Inténtalo de nuevo.")
            // Remover el mensaje del asistente si falla
            setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
            setIsLoading(false)
            setIsStreaming(false)
          },
        }
      )
    } catch (error) {
      console.error("Error sending message:", error)
      message.error("Error al enviar el mensaje. Inténtalo de nuevo.")

      // Remover mensajes si falla
      setMessages((prev) =>
        prev.filter(
          (msg) => msg.id !== newUserMessage.id && msg.id !== assistantMessageId
        )
      )
      setIsLoading(false)
      setIsStreaming(false)
    }
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

  // Handler para descargar propuesta
  const handleDownloadProposal = async () => {
    if (!proposalMarkdown) {
      message.error("No hay contenido de propuesta para descargar")
      return
    }

    setIsDownloadingProposal(true)
    try {
      const blob = await downloadProposalFromMarkdown(
        proposalMarkdown,
        "Propuesta_Comercial",
        "docx"
      )

      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Propuesta_Comercial_${new Date().toISOString().split('T')[0]}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      message.success("Propuesta descargada exitosamente")
    } catch (error) {
      console.error("Error al descargar propuesta:", error)
      message.error("Error al descargar la propuesta")
    } finally {
      setIsDownloadingProposal(false)
    }
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

  const renderFileSection = (title: string, files: DocumentPublic[]) => (
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
              onClick={() => setPreviewDoc(file)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 12px",
                background: "#2A2A2D",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                {getFileIcon(file.file_type)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: "#E3E3E3", fontSize: "13px", display: "block" }} ellipsis>
                    {file.file_name}
                  </Text>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Text style={{ color: "#666666", fontSize: "11px" }}>
                      {file.status === 'COMPLETED' ? `${file.chunk_count} chunks` : file.status}
                    </Text>
                    {file.status === 'COMPLETED' && (
                      <span style={{ color: "#52C41A", fontSize: "10px" }}>✓</span>
                    )}
                    {file.status === 'PROCESSING' && (
                      <span style={{ color: "#FFA940", fontSize: "10px" }}>⟳</span>
                    )}
                    {file.status === 'FAILED' && (
                      <span style={{ color: "#E31837", fontSize: "10px" }}>✗</span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined style={{ fontSize: "12px" }} />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteDocument(file.id, file.file_name)
                }}
                style={{
                  color: "#E31837",
                  padding: "4px",
                  minWidth: "auto",
                }}
              />
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
        {isLoadingDocuments ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <Text style={{ color: "#888888" }}>Cargando documentos...</Text>
          </div>
        ) : (
          <>
            {renderFileSection("Archivos del Workspace", workspaceFiles)}
            {renderFileSection("Archivos del Chat", chatFiles)}
          </>
        )}
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
            <Text style={{ color: "#FFFFFF", fontSize: "16px" }}>
              {conversationTitle}
            </Text>
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
                <Text style={{ color: "#888888" }}>Cargando conversación...</Text>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <Text style={{ color: "#888888" }}>No hay mensajes en esta conversación</Text>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  hoveredMessageId={hoveredMessageId}
                  onMouseEnter={setHoveredMessageId}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  onCopyMessage={handleCopyMessage}
                  remarkPlugins={remarkPlugins}
                  markdownComponents={markdownComponents}
                />
              ))
            )}

            {isLoading && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Text style={{ color: "#AAAAAA", fontSize: "14px" }}>Pensando...</Text>
                </div>
              </div>
            )}

            {/* Mensaje de propuesta generada */}
            {proposalGenerated && !isLoading && (
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    background: "#1E1E21",
                    border: "1px solid #3A3A3D",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>📄</span>
                    <div>
                      <Text style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: 500, display: "block" }}>
                        Propuesta generada
                      </Text>
                      <Text style={{ color: "#888888", fontSize: "13px", display: "block" }}>
                        Tu propuesta está lista para descargar
                      </Text>
                    </div>
                  </div>
                  <Button
                    type="primary"
                    icon={isDownloadingProposal ? <LoadingOutlined /> : <DownloadOutlined />}
                    loading={isDownloadingProposal}
                    onClick={handleDownloadProposal}
                    style={{
                      background: "#E31837",
                      borderColor: "#E31837",
                      borderRadius: "8px",
                      height: "36px",
                      padding: "0 20px",
                    }}
                  >
                    {isDownloadingProposal ? "Descargando..." : "Descargar"}
                  </Button>
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
                placeholder={isRecording ? "Escuchando..." : "Escribe tu mensaje..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                autoSize={{ minRows: 1, maxRows: 4 }}
                variant="borderless"
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
                      }}
                    />
                  ) : (
                    <Button
                      type="text"
                      icon={<SendOutlined style={{ fontSize: "16px" }} />}
                      onClick={handleSendMessage}
                      style={{
                        color: "#FFFFFF",
                        background: "#E31837",
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

      {/* Modal de propuesta (por implementar) */}
      <Modal
        title={null}
        open={showProposalModal}
        onCancel={() => setShowProposalModal(false)}
        footer={null}
        centered
        width={500}
        styles={{
          mask: { background: "rgba(0, 0, 0, 0.7)" },
          header: { background: "#1E1E21", borderBottom: "1px solid #2A2A2D" },
          body: { background: "#1E1E21", padding: "32px" },
        }}
        style={{ background: "#1E1E21", borderRadius: "16px", border: "1px solid #2A2A2D" }}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚧</div>
          <Text style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 600, display: "block", marginBottom: "12px" }}>
            Función por implementar
          </Text>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "24px" }}>
            La descarga de propuestas estará disponible próximamente.
            <br />
            El backend aún no ha implementado esta funcionalidad.
          </Text>
          <Button
            type="primary"
            onClick={() => setShowProposalModal(false)}
            style={{
              background: "#E31837",
              borderColor: "#E31837",
              borderRadius: "8px",
              height: "40px",
              padding: "0 24px",
            }}
          >
            Entendido
          </Button>
        </div>
      </Modal>

      <FilePreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        workspaceId={id}
        documentId={previewDoc?.id || null}
        fileName={previewDoc?.file_name || ""}
        fileType={previewDoc?.file_type || ""}
      />
    </div>
  )
}
