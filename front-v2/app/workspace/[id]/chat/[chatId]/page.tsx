"use client"

import type React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { use, useState, useRef, useEffect, useMemo, memo } from "react"
import { Button, Input, Drawer, Upload, Popover, Modal, App, Select } from "antd"
import type { UploadFile } from "antd"
import {
  SendHorizontal,
  Paperclip,
  Copy,
  LayoutGrid,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  X,
  Mic,
  Trash2,
  ChevronDown,
  Download,
  Loader2,
  ArrowLeft,
  FolderOpen,
  Bot,
  User,
  Sparkles,
  Plus
} from "lucide-react"
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
import { cn } from "@/lib/utils"
import { 
  parseVisualizationsFromMarkdown, 
  VisualizationsContainer,
  type VisualizationData 
} from "@/components/chat/VisualizationRenderer"

const { TextArea } = Input

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
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
  const isUser = message.role === "user"
  
  // Parsear visualizaciones del contenido del asistente (solo si no es mensaje de usuario)
  const parsedContent = useMemo(() => {
    if (isUser || !message.content) {
      return { textContent: message.content, visualizations: [] };
    }
    try {
      return parseVisualizationsFromMarkdown(message.content);
    } catch (e) {
      console.error("Error parsing visualizations:", e);
      return { textContent: message.content, visualizations: [] };
    }
  }, [message.content, isUser]);

  return (
    <div
      className={cn(
        "group w-full flex mb-8",
        isUser ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => onMouseEnter(message.id)}
      onMouseLeave={onMouseLeave}
    >
      <div className={cn(
        "flex gap-4 max-w-[85%] md:max-w-[75%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser 
            ? "bg-zinc-700 text-zinc-300" 
            : "bg-gradient-to-br from-[#E31837] to-[#FF6B00] text-white shadow-lg shadow-orange-500/20"
        )}>
          {isUser ? <User size={16} /> : <Sparkles size={16} />}
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className={cn(
            "relative rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed",
            isUser 
              ? "bg-[#2A2A2D] text-zinc-100 border border-white/5 rounded-tr-sm" 
              : "text-zinc-200 pl-0 pt-1"
          )}>
            {isUser ? (
               <p className="whitespace-pre-wrap m-0">{message.content}</p>
            ) : (
              <>
                {/* Texto Markdown */}
                <div className="markdown-content prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#1E1E21] prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl">
                  <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    components={markdownComponents}
                  >
                    {parsedContent.textContent || message.content}
                  </ReactMarkdown>
                </div>
                
                {/* Visualizaciones Generative UI */}
                {parsedContent.visualizations && parsedContent.visualizations.length > 0 && (
                  <VisualizationsContainer visualizations={parsedContent.visualizations} />
                )}
              </>
            )}
          </div>
          
          {/* Actions (Copy, etc) */}
          <div className={cn(
            "flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isUser ? "justify-end pr-1" : "justify-start pl-1"
          )}>
            <button
              onClick={() => onCopyMessage(message.content)}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-md transition-colors"
              title="Copiar mensaje"
            >
              <Copy size={14} />
            </button>
            <span className="text-[11px] text-zinc-600">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
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
  const lastScrollTimeRef = useRef<number>(0)

  // ============================================
  // CONFIGURACIONES ESTABLES DE REACTMARKDOWN
  // ============================================
  const remarkPlugins = useMemo(() => [remarkGfm], [])

  // Modern Markdown Components using Tailwind
  const markdownComponents = useMemo(() => ({
    p: ({ children }: { children: React.ReactNode }) => <p className="mb-4 text-zinc-300 leading-7 last:mb-0">{children}</p>,
    h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4">{children}</h1>,
    h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-xl font-bold text-white mt-5 mb-3">{children}</h2>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-lg font-bold text-white mt-4 mb-2">{children}</h3>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-zinc-300">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-zinc-300">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="pl-1">{children}</li>,
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
        <table className="w-full border-collapse bg-[#1A1A1C] text-sm text-left">{children}</table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => <thead className="bg-[#252528] text-zinc-200">{children}</thead>,
    tbody: ({ children }: { children: React.ReactNode }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
    tr: ({ children }: { children: React.ReactNode }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
    th: ({ children }: { children: React.ReactNode }) => <th className="px-4 py-3 font-semibold">{children}</th>,
    td: ({ children }: { children: React.ReactNode }) => <td className="px-4 py-3 text-zinc-400">{children}</td>,
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-[#2A2A2D] text-red-400 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
      ) : (
        <div className="relative group">
            <code className="block bg-[#1E1E21] p-4 rounded-xl text-sm font-mono overflow-x-auto text-zinc-300 my-2 border border-white/5">{children}</code>
        </div>
      );
    },
    pre: ({ children }: { children: React.ReactNode }) => <pre className="m-0 bg-transparent">{children}</pre>,
    blockquote: ({ children }: { children: React.ReactNode }) => <blockquote className="border-l-4 border-zinc-600 pl-4 my-4 italic text-zinc-500">{children}</blockquote>,
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-4">{children}</a>,
    strong: ({ children }: { children: React.ReactNode }) => <strong className="text-white font-semibold">{children}</strong>,
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
      return <FileText className="text-[#E31837]" size={20} />
    } else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <ImageIcon className="text-green-500" size={20} />
    } else if (type.includes('word') || type.includes('doc')) {
      return <FileText className="text-blue-600" size={20} />
    } else if (type.includes('powerpoint') || type.includes('ppt') || type.includes('presentation')) {
      return <FileText className="text-orange-600" size={20} />
    } else if (type.includes('excel') || type.includes('xls') || type.includes('sheet')) {
      return <FileText className="text-green-600" size={20} />
    } else if (type.includes('text') || type.includes('txt')) {
      return <FileText className="text-blue-400" size={20} />
    } else {
      return <FileIcon className="text-zinc-500" size={20} />
    }
  }

  // Cargar documentos del workspace y conversación
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoadingDocuments(true)
      try {
        const workspaceDocs = await fetchWorkspaceDocuments(id)
        setWorkspaceFiles(workspaceDocs)

        const conversationDocs = await fetchConversationDocuments({
          workspaceId: id,
          conversationId: chatId,
        })
        setChatFiles(conversationDocs)
      } catch (error: any) {
        const is404 = error?.response?.status === 404 || error?.status === 404
        if (!is404) console.error("Error loading documents:", error)
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
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDocumentApi(documentId)
          message.success('Documento eliminado correctamente')
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
        setConversationTitle(conversation.title)
        
        if (conversation.has_proposal) {
          setProposalGenerated(true)
          if (conversation.messages && conversation.messages.length > 0) {
            const lastAssistantMessage = [...conversation.messages].reverse().find(m => m.role === "assistant")
            if (lastAssistantMessage) setProposalMarkdown(lastAssistantMessage.content)
          }
        }
        
        if (conversation.messages && conversation.messages.length > 0) {
          const loadedMessages: Message[] = conversation.messages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }))
          setMessages(loadedMessages)
        } else if (initialMessage) {
          const userMessage: Message = {
            id: "1",
            role: "user",
            content: initialMessage,
            timestamp: new Date(),
          }
          setMessages([userMessage])
          router.replace(`/workspace/${id}/chat/${chatId}`, { scroll: false })
          
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
      } catch (error: any) {
        const is404 = error?.response?.status === 404 || error?.status === 404
        if (!is404) console.error("Error loading conversation history:", error)
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

  useEffect(() => {
    const now = Date.now()
    if (isStreaming) {
      if (now - lastScrollTimeRef.current > 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
        lastScrollTimeRef.current = now
      }
    } else {
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
          onContentUpdate: (content: string) => {
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
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId ? { ...msg, content } : msg
                )
              )
            }
          },
          onSourcesUpdate: (sources: DocumentChunk[]) => {
            setCurrentSources(sources)
          },
          onIntentDetected: (intent: string) => {
            detectedIntentRef.current = intent
          },
          onComplete: (conversationId: string) => {
            setIsStreaming(false)
            if (detectedIntentRef.current === "GENERATE_PROPOSAL") {
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1]
                if (lastMessage && lastMessage.role === "assistant") {
                  setProposalMarkdown(lastMessage.content)
                }
                return prev
              })
              setProposalGenerated(true)
            }
            if (!firstChunkReceived) setIsLoading(false)
          },
          onError: (error: Error) => {
            message.error("Error al enviar el mensaje.")
            setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
            setIsLoading(false)
            setIsStreaming(false)
          },
        }
      )
    } catch (error) {
      message.error("Error al enviar el mensaje.")
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== newUserMessage.id && msg.id !== assistantMessageId)
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

  const handleDownloadProposal = async () => {
    if (!proposalMarkdown) return message.error("No hay contenido de propuesta para descargar")
    setIsDownloadingProposal(true)
    try {
      const blob = await downloadProposalFromMarkdown(proposalMarkdown, "Propuesta_Comercial", "docx")
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
      message.error("Error al descargar la propuesta")
    } finally {
      setIsDownloadingProposal(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) return message.error("Tu navegador no soporta reconocimiento de voz")

      const recognition = new SpeechRecognition()
      recognition.lang = "es-ES"
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (event) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) finalTranscript += transcript
        }
        if (finalTranscript) setInputMessage((prev) => prev + finalTranscript)
      }
      recognition.onerror = () => {
        message.error("Error en el reconocimiento de voz")
        setIsRecording(false)
      }
      recognition.onend = () => setIsRecording(false)
      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    }
  }

  const getAttachmentIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf': return <FileText className="text-[#E31837]" size={16} />
      case 'doc': case 'docx': return <FileText className="text-blue-600" size={16} />
      case 'ppt': case 'pptx': return <FileText className="text-orange-600" size={16} />
      case 'xls': case 'xlsx': return <FileText className="text-green-600" size={16} />
      default: return <FileText className="text-zinc-500" size={16} />
    }
  }

  const handleRemoveAttachment = (uid: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.uid !== uid))
  }

  // Popover para subir archivos
  const fileUploadContent = (
    <div className="w-[280px]">
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
        onRemove={(file) => handleRemoveAttachment(file.uid)}
        showUploadList={false}
        className="bg-[#2A2A2D] border border-dashed border-white/10 rounded-xl hover:border-[#E31837]/50 transition-colors"
      >
        <div className="py-4">
          <Paperclip className="text-zinc-500 mb-2 mx-auto" size={32} />
          <p className="text-zinc-300 text-sm mb-1">Arrastra archivos o haz clic</p>
          <p className="text-zinc-600 text-xs m-0">PDF, Word, PowerPoint, Excel</p>
        </div>
      </Upload.Dragger>

      {attachedFiles.length > 0 && (
        <div className="mt-3 max-h-[150px] overflow-y-auto space-y-2">
          {attachedFiles.map((file) => (
            <div key={file.uid} className="flex items-center gap-2 p-2 bg-[#1E1F20] rounded-lg">
              {getAttachmentIcon(file.name)}
              <span className="flex-1 text-zinc-300 text-xs truncate">{file.name}</span>
              <button onClick={() => handleRemoveAttachment(file.uid)} className="p-1 text-zinc-500 hover:text-[#E31837]">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="primary"
        block
        onClick={() => setShowFilePopover(false)}
        className="mt-3 bg-[#E31837] hover:bg-[#c41530] border-none rounded-xl h-9"
      >
        Listo
      </Button>
    </div>
  )

  const renderFileSection = (title: string, files: DocumentPublic[]) => (
    <div className="mb-6">
      <h3 className="text-zinc-500 text-xs uppercase tracking-wider mb-3 px-2">{title}</h3>
      <div className="space-y-1">
        {files.length === 0 ? (
          <p className="text-zinc-600 text-sm italic px-2">No hay archivos</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              onClick={() => setPreviewDoc(file)}
              className="group flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
            >
              <div className="p-2 bg-[#1E1F20] rounded-lg border border-white/5">
                 {getFileIcon(file.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 text-sm truncate mb-0.5">{file.file_name}</p>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-zinc-600 uppercase">{file.file_type}</span>
                   {file.status === 'PROCESSING' && <Loader2 className="animate-spin text-orange-400" size={10} />}
                   {file.status === 'FAILED' && <span className="text-red-500 text-xs">Error</span>}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteDocument(file.id, file.file_name)
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-[#E31837] rounded-md transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#131314] overflow-hidden selection:bg-[#E31837]/30">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex justify-between items-center bg-[#131314]/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push(`/workspace/${id}`)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#E31837]" />
                {conversationTitle}
              </h1>
              <div className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                 <p className="text-xs text-zinc-500">Online • {selectedModel}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilesDrawerOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors relative"
              title="Ver archivos"
            >
              <LayoutGrid size={20} />
              {(workspaceFiles.length > 0 || chatFiles.length > 0) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#E31837] rounded-full border-2 border-[#0A0A0B]"></span>
              )}
            </button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <UserMenu user={user} />
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth chat-scrollbar">
          <div className="max-w-4xl mx-auto w-full pt-24 pb-10 px-4 md:px-6">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-[#E31837]" size={32} />
                <p className="text-zinc-500 text-sm">Cargando conversación...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#E31837]/20 to-[#FF6B00]/20 rounded-3xl flex items-center justify-center mb-6 border border-[#E31837]/20 shadow-[0_0_40px_-10px_rgba(227,24,55,0.3)]">
                  <Sparkles className="text-[#E31837]" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">¿En qué puedo ayudarte hoy?</h2>
                <p className="text-zinc-500 max-w-md">
                  Sube documentos, analiza propuestas o genera contenido nuevo utilizando IA avanzada.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
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
                ))}

                {isLoading && (
                  <div className="flex gap-4 max-w-[75%] mb-8 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E31837] to-[#FF6B00] flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <Loader2 size={16} className="text-white animate-spin" />
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                       <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                       <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                
                {/* Proposal Widget */}
                {proposalGenerated && !isLoading && (
                  <div className="ml-12 mb-8 max-w-md">
                    <div className="bg-[#1E1F20] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-[#E31837]/30 transition-colors shadow-lg shadow-black/20">
                      <div className="w-10 h-10 bg-[#E31837]/10 rounded-xl flex items-center justify-center text-2xl">
                        📄
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">Propuesta generada</p>
                        <p className="text-zinc-500 text-xs">Lista para descargar</p>
                      </div>
                      <Button
                        type="primary"
                        icon={isDownloadingProposal ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                        loading={isDownloadingProposal}
                        onClick={handleDownloadProposal}
                        className="bg-[#E31837] hover:bg-[#c41530] border-none rounded-lg h-8 text-xs font-medium"
                      >
                        Descargar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-6 bg-[#131314] z-20">
          <div className="max-w-4xl mx-auto w-full">
            {/* Attachments Preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-2">
                {attachedFiles.map((file) => (
                  <div key={file.uid} className="flex items-center gap-2 px-3 py-1.5 bg-[#1E1F20] rounded-lg border border-white/5 animate-fade-in-up group">
                    <div className="p-1 bg-white/5 rounded">
                      <FileText size={12} className="text-zinc-400" />
                    </div>
                    <span className="text-zinc-300 text-xs font-medium max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => handleRemoveAttachment(file.uid)} className="text-zinc-500 hover:text-[#E31837] transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Gemini-style Input Container */}
            <div 
              className={`
                relative flex items-end gap-3 p-3 bg-[#1E1F20] rounded-[28px] transition-all duration-200
                ${isRecording ? 'ring-1 ring-[#E31837]/50 bg-[#1E1F20]' : 'hover:bg-[#252528] focus-within:bg-[#252528]'}
              `}
            >
              
              {/* Left Action: Add / Attach */}
              <div className="flex-shrink-0 mb-0.5">
                <Popover
                  content={fileUploadContent}
                  trigger="click"
                  open={showFilePopover}
                  onOpenChange={setShowFilePopover}
                  placement="topLeft"
                  overlayClassName="dark-popover"
                >
                  <button 
                    className="w-10 h-10 rounded-full bg-[#2A2A2D] text-zinc-400 hover:text-white hover:bg-[#333] flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Adjuntar archivo"
                  >
                    <Plus size={20} strokeWidth={2} />
                  </button>
                </Popover>
              </div>

              {/* Text Area */}
              <div className="flex-1 min-w-0 py-2">
                <TextArea
                  placeholder={isRecording ? "Escuchando..." : "Escribe un mensaje..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  autoSize={{ minRows: 1, maxRows: 8 }}
                  variant="borderless"
                  className="w-full bg-transparent text-zinc-100 text-[16px] px-0 py-0 resize-none leading-relaxed placeholder:text-zinc-500 focus:ring-0 custom-textarea-no-focus"
                  style={{ minHeight: '24px' }}
                />
              </div>

              {/* Right Actions: Mic & Send */}
              <div className="flex items-center gap-2 mb-0.5 flex-shrink-0">
                {!inputMessage.trim() ? (
                  <button
                    onClick={toggleRecording}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isRecording 
                        ? 'bg-[#E31837] text-white animate-pulse shadow-lg shadow-[#E31837]/30' 
                        : 'text-zinc-400 hover:text-white hover:bg-[#333]'
                    }`}
                    title="Dictado por voz"
                  >
                    <Mic size={20} />
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Enviar mensaje"
                  >
                    <SendHorizontal size={20} className="ml-0.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Footer info */}
            <div className="flex justify-between items-center mt-3 px-2">
               <div className="flex items-center">
                  <Select
                    value={selectedModel}
                    onChange={setSelectedModel}
                    suffixIcon={<ChevronDown className="text-zinc-500" size={12} />}
                    size="small"
                    variant="borderless"
                    className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
                    classNames={{ popup: { root: "dark-select-dropdown" } }}
                    styles={{ popup: { root: { background: '#1E1F20', border: '1px solid #333' } } }}
                    options={[
                      { label: "ChatGPT 4o-mini", value: "gpt-4o-mini" },
                      { label: "Velvet 12B", value: "velvet-12b" },
                    ]}
                  />
               </div>
               <p className="text-[11px] text-zinc-600 text-center">
                  TIVIT AI puede cometer errores.
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers & Modals */}
      <Drawer
        title={<span className="text-zinc-200">Documentos del Chat</span>}
        placement="right"
        onClose={() => setFilesDrawerOpen(false)}
        open={filesDrawerOpen}
        styles={{
          header: { background: "#1E1F20", borderBottom: "1px solid rgba(255,255,255,0.05)" },
          body: { background: "#131314" },
          wrapper: { width: 350 },
        }}
        closeIcon={<X className="text-zinc-400 hover:text-white" />}
      >
        {isLoadingDocuments ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-zinc-500" /></div>
        ) : (
          <>
            {renderFileSection("Archivos del Workspace", workspaceFiles)}
            {renderFileSection("Archivos de esta conversación", chatFiles)}
          </>
        )}
      </Drawer>

      <Modal
        open={showProposalModal}
        onCancel={() => setShowProposalModal(false)}
        footer={null}
        centered
        width={400}
        closeIcon={<X className="text-zinc-500" />}
        styles={{ content: { background: '#1E1F20', padding: 32 } }}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🚧</div>
          <h3 className="text-white text-lg font-semibold mb-2">Próximamente</h3>
          <p className="text-zinc-500 text-sm mb-6">Esta funcionalidad estará disponible en la próxima actualización.</p>
          <Button type="primary" onClick={() => setShowProposalModal(false)} className="bg-[#E31837] border-none w-full">Entendido</Button>
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
