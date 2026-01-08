"use client"

import type React from "react"

import { use, useState, useEffect } from "react"
import { Spin, Upload, App } from "antd"
import type { UploadFile } from "antd"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import Sidebar from "@/components/sidebar"
import { UserMenu } from "@/components/UserMenu"
import { useUser } from "@/hooks/useUser"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { 
  Paperclip, 
  SendHorizontal, 
  FolderOpen,
  MessageSquare,
  ChevronRight,
  Clock
} from "lucide-react"

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [message, setMessage] = useState("")
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<UploadFile[]>([])
  const { user } = useUser()
  const router = useRouter()
  const { message: antMessage } = App.useApp()

  const {
    activeWorkspace,
    setActiveWorkspace,
    conversations,
    isLoadingConversations,
    fetchConversations,
    workspaces,
    fetchWorkspaces,
    isLoadingWorkspaces,
  } = useWorkspaceContext()

  // Efecto optimizado para cargar datos
  useEffect(() => {
    let mounted = true

    const loadWorkspaceData = async () => {
      try {
        // Cargar workspaces si no están cargados
        if (workspaces.length === 0 && !isLoadingWorkspaces) {
          await fetchWorkspaces()
        }

        if (!mounted) return

        // Buscar y establecer workspace activo
        if (workspaces.length > 0 && id) {
          const workspace = workspaces.find(ws => ws.id === id)
          if (workspace) {
            setActiveWorkspace(workspace)
            // Cargar conversaciones del workspace
            if (workspace.id) {
              fetchConversations(workspace.id)
            }
          }
        }
      } finally {
        if (mounted) {
          setIsInitialLoading(false)
        }
      }
    }

    loadWorkspaceData()

    return () => {
      mounted = false
    }
  }, [id]) // Solo depender de id para evitar ciclos

  const workspaceName = activeWorkspace?.name || "Workspace"

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoy"
    if (diffDays === 1) return "Ayer"
    if (diffDays < 7) return `${diffDays} días`

    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      const chatId = uuidv4()
      router.push(
        `/workspace/${id}/chat/${chatId}?message=${encodeURIComponent(message)}`,
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Mostrar spinner durante la carga inicial
  if (isInitialLoading || isLoadingWorkspaces) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#131314]">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#131314] text-white overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Header with Logo and User Menu */}
        <header className="absolute top-0 left-0 right-0 px-6 py-6 z-20 flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => router.push('/')}>
            <img
              src="/logo.svg"
              alt="Logo"
              className="h-10"
            />
          </div>
          <UserMenu user={user} />
        </header>

        {/* Scrollable Container for Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 sm:px-8 py-12">
            
            {/* Workspace Header Section */}
            <div className="w-full text-center mb-8 mt-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="p-3 bg-[#1E1F20] rounded-2xl border border-white/5">
                  <FolderOpen size={28} className="text-[#E31837]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  {workspaceName}
                </h1>
              </div>
              <p className="text-lg text-zinc-400 font-medium">
                Comienza una nueva conversación o continúa donde lo dejaste
              </p>
            </div>

            {/* Modern Input Bar */}
            <div className="w-full mb-12 animate-fade-in-up delay-100">
              <div className="relative group w-full">
                <div className="relative bg-[#1E1F20] rounded-3xl shadow-lg border border-white/5 transition-all duration-300 focus-within:ring-1 focus-within:ring-[#E31837]/50 focus-within:bg-[#252627]">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Escribe tu mensaje en ${workspaceName}...`}
                    className="w-full bg-transparent text-base text-white placeholder-zinc-500 px-6 py-5 pr-32 rounded-3xl outline-none resize-none min-h-[72px] max-h-[160px] scrollbar-hide"
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                  />
                  
                  {/* Action Buttons inside Input */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <Upload
                      fileList={attachedFiles}
                      onChange={({ fileList }) => setAttachedFiles(fileList)}
                      beforeUpload={(file) => {
                        const isValidType = [
                          'application/pdf',
                          'application/msword',
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.ms-powerpoint',
                          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                          'application/vnd.ms-excel',
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        ].includes(file.type)

                        if (!isValidType) {
                          antMessage.error('Solo se permiten archivos PDF, Word, PowerPoint y Excel')
                          return Upload.LIST_IGNORE
                        }
                        return false
                      }}
                      showUploadList={false}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    >
                      <button 
                        className="p-2 text-zinc-400 hover:text-[#E31837] hover:bg-white/5 rounded-full transition-colors"
                        aria-label="Adjuntar archivo"
                      >
                        <Paperclip size={20} />
                      </button>
                    </Upload>
                    
                    {message.trim() && (
                      <button 
                        onClick={handleSendMessage}
                        className="p-2 bg-[#E31837] text-white rounded-full hover:bg-[#c41530] transition-colors shadow-md"
                        aria-label="Enviar mensaje"
                      >
                        <SendHorizontal size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conversations Section */}
            <div className="w-full animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-300 flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#E31837]" />
                  Conversaciones recientes
                </h2>
                {conversations.length > 0 && (
                  <span className="text-sm text-zinc-500 bg-[#1E1F20] px-3 py-1 rounded-full border border-white/5">
                    {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {isLoadingConversations ? (
                <div className="flex justify-center items-center py-16">
                  <Spin size="large" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1E1F20] rounded-2xl border border-white/5 mb-4">
                    <MessageSquare size={28} className="text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 text-base mb-2">No hay conversaciones aún</p>
                  <p className="text-zinc-600 text-sm">Comienza escribiendo un mensaje arriba</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => router.push(`/workspace/${id}/chat/${conversation.id}`)}
                      className="w-full group flex items-center justify-between p-4 bg-[#1E1F20] hover:bg-[#252627] border border-white/5 hover:border-[#E31837]/30 rounded-2xl transition-all duration-200"
                    >
                      <div className="flex-1 text-left mr-4">
                        <h3 className="text-white font-medium mb-1 line-clamp-1 group-hover:text-[#E31837] transition-colors">
                          {conversation.title}
                        </h3>
                        <p className="text-sm text-zinc-500">
                          {conversation.message_count
                            ? `${conversation.message_count} mensaje${conversation.message_count !== 1 ? 's' : ''}`
                            : "Sin mensajes"}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                          <Clock size={14} />
                          <span>{formatDate(conversation.updated_at || conversation.created_at)}</span>
                        </div>
                        <ChevronRight 
                          size={18} 
                          className="text-zinc-600 group-hover:text-[#E31837] transition-colors" 
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
