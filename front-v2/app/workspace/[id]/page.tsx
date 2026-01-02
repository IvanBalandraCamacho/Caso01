"use client"

import type React from "react"

import { use, useState, useEffect } from "react"
import { FolderOutlined, PlusOutlined, SendOutlined, LoadingOutlined } from "@ant-design/icons"
import { Button, Input, Typography, Spin, Upload, App } from "antd"
import type { UploadFile } from "antd"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import Sidebar from "@/components/sidebar"
import { UserMenu } from "@/components/UserMenu"
import { useUser } from "@/hooks/useUser"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { GlassCard } from "@/components/ui/GlassCard"
import { PrimaryButton } from "@/components/ui/PrimaryButton"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { dt } from "@/lib/design-tokens"

const { Text } = Typography

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

  // Cargar workspaces si no están cargados
  useEffect(() => {
    if (workspaces.length === 0) {
      fetchWorkspaces()
    }
  }, [workspaces.length, fetchWorkspaces])

  // Establecer el workspace activo cuando se carguen los workspaces
  useEffect(() => {
    if (workspaces.length > 0 && id) {
      const workspace = workspaces.find(ws => ws.id === id)
      if (workspace) {
        setActiveWorkspace(workspace)
        setIsInitialLoading(false)
      } else if (!isLoadingWorkspaces) {
        // Workspace no encontrado después de cargar
        setIsInitialLoading(false)
      }
    } else if (!isLoadingWorkspaces && workspaces.length === 0) {
      setIsInitialLoading(false)
    }
  }, [workspaces, id, setActiveWorkspace, isLoadingWorkspaces])

  // Cargar conversaciones cuando hay un workspace activo
  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchConversations(activeWorkspace.id)
    }
  }, [activeWorkspace?.id, fetchConversations])

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  const handleOpenChat = (conversationId: string, title: string) => {
    router.push(
      `/workspace/${id}/chat/${conversationId}`,
    )
  }

  // Mostrar spinner durante la carga inicial
  if (isInitialLoading || isLoadingWorkspaces) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#131314",
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#000000",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          minHeight: "100vh",
        }}
      >
        <header
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ cursor: "pointer" }} onClick={() => router.push('/')}>
            <img
              src="/logo.svg"
              alt="Logo"
              style={{ height: "40px" }}
            />
          </div>

          <UserMenu user={user} />
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            paddingBottom: "120px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "680px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FolderOutlined style={{ fontSize: "24px", color: "#888888" }} />
                <Text
                  style={{
                    fontSize: "24px",
                    fontWeight: 400,
                    color: "#FFFFFF",
                  }}
                >
                  {workspaceName}
                </Text>
              </div>
            </div>

            <div
              style={{
                background: "#2A2A2D",
                borderRadius: "28px",
                padding: "8px 8px 8px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "32px",
              }}
            >
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
                <PlusOutlined style={{ color: "#666666", fontSize: "18px", cursor: "pointer" }} />
              </Upload>

              <Input
                placeholder={`Nuevo chat en ${workspaceName}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                variant="borderless"
                style={{
                  flex: 1,
                  background: "transparent",
                  color: "#CCCCCC",
                  fontSize: "15px",
                  padding: "8px 0",
                }}
              />

              <Button
                type="text"
                icon={<SendOutlined style={{ fontSize: "18px" }} />}
                onClick={handleSendMessage}
                disabled={!message.trim()}
                style={{
                  color: message.trim() ? "#FFFFFF" : "#666666",
                  background: message.trim() ? "#E31837" : "#3A3A3D",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {isLoadingConversations ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: "#888" }} spin />} />
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px" }}>
                  <Text style={{ color: "#888888", fontSize: "14px" }}>
                    No hay conversaciones aún. ¡Inicia una nueva!
                  </Text>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleOpenChat(conversation.id, conversation.title)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "16px 0",
                      borderBottom: "1px solid #2A2A2D",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flex: 1, marginRight: "16px" }}>
                      <Text
                        style={{
                          display: "block",
                          color: "#FFFFFF",
                          fontSize: "15px",
                          fontWeight: 500,
                          marginBottom: "4px",
                        }}
                      >
                        {conversation.title}
                      </Text>
                      {/* WIP: Mostrar preview del último mensaje */}
                      <Text
                        style={{
                          display: "block",
                          color: "#888888",
                          fontSize: "14px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "600px",
                        }}
                      >
                        {conversation.message_count
                          ? `${conversation.message_count} mensaje${conversation.message_count !== 1 ? 's' : ''}`
                          : "Sin mensajes"}
                      </Text>
                    </div>
                    <Text
                      style={{
                        color: "#888888",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(conversation.updated_at || conversation.created_at)}
                    </Text>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
