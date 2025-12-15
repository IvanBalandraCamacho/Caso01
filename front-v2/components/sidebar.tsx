"use client"

import type React from "react"
import type { UploadFile } from "antd"
import { useRouter, usePathname } from "next/navigation"

import {
  MenuOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  CommentOutlined,
  MoreOutlined,
  DeleteOutlined,
  FileOutlined,
  FormOutlined,
  RightOutlined,
  DownOutlined,
  PlusOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileExcelOutlined,
  CloseOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import { Button, Layout, Typography, Modal, Input, Upload, Dropdown, App, Tag } from "antd"
import { useState, useEffect, useRef, useCallback } from "react"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { fetchWorkspaceDocuments, deleteDocumentApi, uploadDocumentApi } from "@/lib/api"
import type { DocumentPublic } from "@/types/api"
import { ArrowDown, ArrowRight, ChevronDown, ChevronRight, Rocket } from "lucide-react"

const { Sider } = Layout
const { Text } = Typography
const { TextArea } = Input

interface Chat {
  key: string
  label: string
}

interface WorkspaceWithChats {
  key: string
  label: string
  chats: Chat[]
}

interface SidebarItem {
  key: string
  label: string
  icon: React.ReactNode
  isNested?: boolean
  type: "workspace" | "chat"
  parentKey?: string
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { message, modal } = App.useApp()

  // Cargar estado del sidebar desde localStorage
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [additionalContext, setAdditionalContext] = useState("")
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<"idle" | "uploading" | "processing" | "completed">("idle");
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState<string[]>([]);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [rfpFile, setRfpFile] = useState<UploadFile | null>(null)

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [currentEditItem, setCurrentEditItem] = useState<SidebarItem | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [editContext, setEditContext] = useState("")
  const [existingDocuments, setExistingDocuments] = useState<DocumentPublic[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [isRfpModalOpen, setIsRfpModalOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)


  const handleDownloadDocument = useCallback(async (format: 'docx' | 'pdf') => {
    if (!analysisResult) return

    setIsDownloading(true)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`http://localhost:8000/api/v1/task/generate?format=${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(analysisResult),
      })

      if (!response.ok) {
        throw new Error("Error al generar el documento")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `analisis_rfp.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      message.success(`Documento ${format.toUpperCase()} descargado exitosamente`)
    } catch (error) {
      console.error("Error:", error)
      message.error("Error al descargar el documento. Inténtalo de nuevo.")
    } finally {
      setIsDownloading(false)
    }
  }, [analysisResult, message])

  const handleRfpAnalysis = useCallback(async () => {
    if (!rfpFile) {
      message.error("Por favor selecciona un archivo")
      return
    }

    setIsAnalyzing(true)

    try {
      const token = localStorage.getItem('access_token')
      const formData = new FormData()
      const file = rfpFile.originFileObj || rfpFile
      formData.append("file", file as File)

      const response = await fetch("http://localhost:8000/api/v1/task/analyze", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error al analizar el documento")
      }

      const result = await response.json()
      setAnalysisResult(result)
      setIsRfpModalOpen(false)
      setIsResultModalOpen(true)
      message.success("Análisis completado exitosamente")
    } catch (error) {
      console.error("Error:", error)
      message.error("Error al analizar el documento. Inténtalo de nuevo.")
    } finally {
      setIsAnalyzing(false)
    }
  }, [rfpFile, message])

  const [workspacesSectionCollapsed, setWorkspacesSectionCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workspacesSectionCollapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [chatsSectionCollapsed, setChatsSectionCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatsSectionCollapsed')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedWorkspace')
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Ref para rastrear el último workspace para el que se cargaron conversaciones
  const lastLoadedWorkspaceRef = useRef<string | null>(null)

  // Guardar estado del sidebar en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed))
    }
  }, [collapsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspacesSectionCollapsed', JSON.stringify(workspacesSectionCollapsed))
    }
  }, [workspacesSectionCollapsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatsSectionCollapsed', JSON.stringify(chatsSectionCollapsed))
    }
  }, [chatsSectionCollapsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('expandedWorkspace', JSON.stringify(expandedWorkspace))
    }
  }, [expandedWorkspace])

  // Usar el contexto de workspaces
  const {
    workspaces,
    conversations,
    activeWorkspace,
    setActiveWorkspace,
    fetchConversations,
    isLoadingConversations,
    fetchWorkspaces,
    createWorkspace: createWorkspaceApi,
    updateWorkspace: updateWorkspaceApi,
    deleteWorkspace: deleteWorkspaceApi,
    deleteConversation: deleteConversationApi,
  } = useWorkspaceContext()

  // Cargar workspaces al montar el componente - solo una vez
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token && workspaces.length === 0) {
      fetchWorkspaces()
    }
  }, [])

  // Transformar workspaces del contexto al formato del sidebar
  // Incluir las conversaciones del workspace activo expandido
  const workspacesData: WorkspaceWithChats[] = workspaces.map(ws => ({
    key: ws.id,
    label: ws.name,
    // Solo mostrar chats si este workspace está expandido y es el activo
    chats: (expandedWorkspace === ws.id && activeWorkspace?.id === ws.id)
      ? conversations.map(conv => ({
        key: conv.id,
        label: conv.title,
      }))
      : [],
  }))

  // Chats generales (sin workspace) - por ahora vacío, se implementará cuando haya endpoint
  const generalChats: SidebarItem[] = []

  // Detectar workspace desde la URL y cargar conversaciones
  useEffect(() => {
    if (pathname.startsWith("/workspace/")) {
      const workspaceId = pathname.split("/")[2]
      if (workspaceId) {
        setExpandedWorkspace(workspaceId)
        setSelectedItem(workspaceId)
        // Collapse chats section when a workspace is open
        setChatsSectionCollapsed(true)

        // Cargar conversaciones solo si hay workspaces y no se han cargado ya para este workspace
        const workspace = workspaces.find(ws => ws.id === workspaceId)
        if (workspace && lastLoadedWorkspaceRef.current !== workspaceId) {
          lastLoadedWorkspaceRef.current = workspaceId
          setActiveWorkspace(workspace)
          fetchConversations(workspaceId)
        }
      }
    } else {
      setExpandedWorkspace(null)
      lastLoadedWorkspaceRef.current = null
    }
  }, [pathname, workspaces.length]) // Only depend on pathname and workspaces length

  const toggleWorkspaceExpand = (workspaceKey: string, hasChats: boolean) => {
    if (expandedWorkspace === workspaceKey) {
      // Colapsar
      setExpandedWorkspace(null)
      lastLoadedWorkspaceRef.current = null
    } else {
      // Expandir y cargar conversaciones
      setExpandedWorkspace(workspaceKey)
      lastLoadedWorkspaceRef.current = workspaceKey
      const workspace = workspaces.find(ws => ws.id === workspaceKey)
      if (workspace) {
        setActiveWorkspace(workspace)
        fetchConversations(workspaceKey)
      }
    }
  }

  const handleRename = (item: SidebarItem) => {
    setCurrentEditItem(item)
    setRenameValue(item.label)
    setIsRenameModalOpen(true)
  }

  const handleEdit = async (item: SidebarItem) => {
    setCurrentEditItem(item)
    setEditContext("")
    setExistingDocuments([])
    setFileList([])
    setIsEditModalOpen(true)

    // Cargar documentos del workspace
    if (item.type === "workspace") {
      setIsLoadingDocuments(true)
      try {
        const docs = await fetchWorkspaceDocuments(item.key)
        setExistingDocuments(docs)
      } catch (error) {
        console.error("Error loading workspace documents:", error)
      } finally {
        setIsLoadingDocuments(false)
      }
    }
  }

  const handleDelete = (item: SidebarItem) => {
    setCurrentEditItem(item)
    setIsDeleteModalOpen(true)
  }

  const confirmRename = async () => {
    if (!currentEditItem) return

    try {
      if (currentEditItem.type === "workspace") {
        await updateWorkspaceApi(currentEditItem.key, { name: renameValue })
      }
      // Para chats, necesitaríamos una función de renombrar conversación
    } catch (error) {
      console.error("Error renaming:", error)
    }

    setIsRenameModalOpen(false)
    setCurrentEditItem(null)
    setRenameValue("")
  }

  const confirmEdit = async () => {
    if (!currentEditItem) return;

    setIsUploading(true);
    try {
      if (currentEditItem.type === "workspace") {
        // 1. Update workspace context
        await updateWorkspaceApi(currentEditItem.key, { instructions: editContext });

        // 2. Upload new files if any
        if (fileList.length > 0) {
          const uploadPromises = fileList.map(async (file) => {
            if (!file.originFileObj) return;
            const formData = new FormData();
            formData.append("file", file.originFileObj);

            try {
              await uploadDocumentApi(currentEditItem.key, formData);
              return { success: true };
            } catch (error) {
              console.error(`Error uploading ${file.name}:`, error);
              return { success: false };
            }
          });

          await Promise.all(uploadPromises);
        }

        // 3. Refresh documents list
        const docs = await fetchWorkspaceDocuments(currentEditItem.key);
        setExistingDocuments(docs);
      }
    } catch (error) {
      console.error("Error editing:", error);
      message.error("Error al actualizar el workspace");
    } finally {
      setIsUploading(false);
    }

    setIsEditModalOpen(false);
    setCurrentEditItem(null);
    setEditContext("");
    setFileList([]);
  }

  const confirmDelete = async () => {
    if (!currentEditItem) return

    try {
      if (currentEditItem.type === "workspace") {
        await deleteWorkspaceApi(currentEditItem.key)
      } else if (currentEditItem.type === "chat") {
        await deleteConversationApi(currentEditItem.key)
      }
    } catch (error) {
      console.error("Error deleting:", error)
    }

    setIsDeleteModalOpen(false)
    setCurrentEditItem(null)
  }

  const getDropdownItems = (item: SidebarItem) => [
    {
      key: "rename",
      label: "Renombrar",
      icon: <FormOutlined />,
      onClick: (e: { domEvent: React.MouseEvent }) => {
        e.domEvent.stopPropagation()
        handleRename(item)
      },
    },
    ...(item.type === "workspace"
      ? [
        {
          key: "edit",
          label: "Editar",
          icon: <EditOutlined />,
          onClick: (e: { domEvent: React.MouseEvent }) => {
            e.domEvent.stopPropagation()
            handleEdit(item)
          },
        },
      ]
      : []),
    {
      key: "delete",
      label: "Eliminar",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e: { domEvent: React.MouseEvent }) => {
        e.domEvent.stopPropagation()
        handleDelete(item)
      },
    },
  ]

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    // No permitir cerrar si está subiendo o procesando
    if (isUploading || documentStatus === "processing") {
      return;
    }
    setIsModalOpen(false)
    setWorkspaceName("")
    setAdditionalContext("")
    setFileList([])
    setDocumentStatus("idle")
    setUploadedDocumentIds([])
    setCreatedWorkspaceId(null)
    if (wsConnection) {
      wsConnection.close()
      setWsConnection(null)
    }
  }

  const handleCreateWorkspace = async () => {
    setIsUploading(true);
    setDocumentStatus("uploading");

    try {
      // 1. Create workspace first
      const newWorkspace = await createWorkspaceApi({
        name: workspaceName,
        description: additionalContext || undefined,
        instructions: additionalContext || undefined,
      });

      setCreatedWorkspaceId(newWorkspace.id);

      // 2. Upload files if any
      if (fileList.length > 0) {
        const uploadedIds: string[] = [];

        for (const file of fileList) {
          if (!file.originFileObj) continue;
          const formData = new FormData();
          formData.append("file", file.originFileObj);

          try {
            const uploadedDoc = await uploadDocumentApi(newWorkspace.id, formData);
            uploadedIds.push(uploadedDoc.id);
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            message.error(`Error al subir ${file.name}`);
          }
        }

        setUploadedDocumentIds(uploadedIds);
        setIsUploading(false);

        // 3. Si se subieron archivos, esperar a que terminen de procesarse
        if (uploadedIds.length > 0) {
          setDocumentStatus("processing");

          // Setup WebSocket to track document processing
          const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/notifications";
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log("✅ WebSocket conectado para tracking de documentos");
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              // Check if this notification is for one of our documents
              if (data.document_id && uploadedIds.includes(data.document_id)) {
                if (data.status === "COMPLETED") {
                  // Remove from pending list
                  const stillPending = uploadedIds.filter(id => id !== data.document_id);

                  // If all documents are processed, navigate
                  if (stillPending.length === 0) {
                    setDocumentStatus("completed");
                    ws.close();

                    setTimeout(() => {
                      handleCloseModal();
                      router.push(`/workspace/${newWorkspace.id}`);
                    }, 500);
                  }
                } else if (data.status === "ERROR") {
                  message.error(`Error al procesar documento`);
                  // Continue anyway, don't block the user
                  ws.close();
                  handleCloseModal();
                  router.push(`/workspace/${newWorkspace.id}`);
                }
              }
            } catch (err) {
              console.error("Error parseando mensaje WS:", err);
            }
          };

          ws.onerror = (err) => {
            console.error("Error en WebSocket:", err);
            // Continue anyway if WS fails
            handleCloseModal();
            router.push(`/workspace/${newWorkspace.id}`);
          };

          setWsConnection(ws);
          return;
        }
      }

      // 4. Si no hay archivos, navegar directamente
      setIsUploading(false);
      setDocumentStatus("completed");
      handleCloseModal();
      router.push(`/workspace/${newWorkspace.id}`);
    } catch (error) {
      console.error("Error creating workspace:", error);
      message.error("Error al crear el workspace");
      setIsUploading(false);
      setDocumentStatus("idle");
    }
  }

  const handleRemoveFile = (file: UploadFile) => {
    // No permitir eliminar archivos durante la subida o procesamiento
    if (isUploading || documentStatus === "processing") {
      return;
    }
    setFileList(fileList.filter((f) => f.uid !== file.uid))
  }

  const handleNewChat = () => {
    router.push("/")
  }

  const renderWorkspaceItem = (workspace: WorkspaceWithChats) => {
    const isExpanded = expandedWorkspace === workspace.key
    const isLoading = isExpanded && isLoadingConversations && activeWorkspace?.id === workspace.key
    const hasChats = workspace.chats.length > 0
    const item: SidebarItem = {
      key: workspace.key,
      label: workspace.label,
      icon: <FolderOutlined />,
      type: "workspace",
    }

    return (
      <div key={workspace.key}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            cursor: "pointer",
            borderRadius: "8px",
            margin: "2px 8px",
            transition: "background 0.2s",
            background: selectedItem === workspace.key ? "#2A2A2D" : "transparent",
          }}
          onMouseEnter={(e) => {
            setHoveredItem(workspace.key)
            if (selectedItem !== workspace.key) {
              e.currentTarget.style.background = "#2A2A2D"
            }
          }}
          onMouseLeave={(e) => {
            setHoveredItem(null)
            if (selectedItem !== workspace.key) {
              e.currentTarget.style.background = "transparent"
            }
          }}
          onClick={() => {
            setSelectedItem(workspace.key)
            router.push(`/workspace/${workspace.key}`)
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "#E3E3E3", fontSize: "14px" }}>{item.icon}</span>
            {!collapsed && <Text style={{ color: "#E3E3E3", fontSize: "14px" }}>{item.label}</Text>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!collapsed && (
              <span
                style={{ color: "#666666", fontSize: "10px", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleWorkspaceExpand(workspace.key, true)
                }}
              >
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
              </span>
            )}
            {!collapsed && (selectedItem === workspace.key || hoveredItem === workspace.key) && (
              <Dropdown
                menu={{ items: getDropdownItems(item) }}
                trigger={["click"]}
                placement="bottomRight"
                popupRender={(menu) => (
                  <div
                    style={{
                      background: "#2A2A2D",
                      borderRadius: "8px",
                      border: "1px solid #3A3A3D",
                      overflow: "hidden",
                    }}
                  >
                    {menu}
                  </div>
                )}
              >
                <MoreOutlined
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "#E3E3E3", fontSize: "14px", padding: "4px" }}
                />
              </Dropdown>
            )}
          </div>
        </div>

        {isExpanded && !collapsed && (
          <div style={{ position: "relative" }}>
            {isLoading ? (
              <div style={{ position: "relative", padding: "10px 16px 10px 40px" }}>
                {/* Línea vertical corta + horizontal para loading */}
                <div
                  style={{
                    position: "absolute",
                    left: "24px",
                    top: "0",
                    height: "50%",
                    width: "1px",
                    background: "#3A3A3D",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "24px",
                    top: "50%",
                    width: "12px",
                    height: "1px",
                    background: "#3A3A3D",
                  }}
                />
                <Text style={{ color: "#888888", fontSize: "12px" }}>Cargando...</Text>
              </div>
            ) : hasChats ? (
              workspace.chats.map((chat, index) => {
                const isLastItem = index === workspace.chats.length - 1
                const chatItem: SidebarItem = {
                  key: chat.key,
                  label: chat.label,
                  icon: <CommentOutlined />,
                  type: "chat",
                  isNested: true,
                  parentKey: workspace.key,
                }
                return (
                  <div
                    key={chat.key}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      paddingLeft: "40px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      margin: "2px 8px",
                      transition: "background 0.2s",
                      background: selectedItem === chat.key ? "#2A2A2D" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      setHoveredItem(chat.key)
                      if (selectedItem !== chat.key) {
                        e.currentTarget.style.background = "#2A2A2D"
                      }
                    }}
                    onMouseLeave={(e) => {
                      setHoveredItem(null)
                      if (selectedItem !== chat.key) {
                        e.currentTarget.style.background = "transparent"
                      }
                    }}
                    onClick={() => {
                      setSelectedItem(chat.key)
                      router.push(`/workspace/${workspace.key}/chat/${chat.key}`)
                    }}
                  >
                    {/* Línea vertical - solo hasta el centro si es el último */}
                    <div
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "0",
                        height: isLastItem ? "50%" : "100%",
                        width: "1px",
                        background: "#3A3A3D",
                      }}
                    />
                    {/* Línea horizontal */}
                    <div
                      style={{
                        position: "absolute",
                        left: "24px",
                        top: "50%",
                        width: "12px",
                        height: "1px",
                        background: "#3A3A3D",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: "#E3E3E3", fontSize: "14px" }}>
                        <CommentOutlined />
                      </span>
                      <Text style={{ color: "#E3E3E3", fontSize: "14px" }}>{chat.label}</Text>
                    </div>
                    {(selectedItem === chat.key || hoveredItem === chat.key) && (
                      <Dropdown
                        menu={{ items: getDropdownItems(chatItem) }}
                        trigger={["click"]}
                        placement="bottomRight"
                        popupRender={(menu) => (
                          <div
                            style={{
                              background: "#2A2A2D",
                              borderRadius: "8px",
                              border: "1px solid #3A3A3D",
                              overflow: "hidden",
                            }}
                          >
                            {menu}
                          </div>
                        )}
                      >
                        <MoreOutlined
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "#E3E3E3", fontSize: "14px", padding: "4px" }}
                        />
                      </Dropdown>
                    )}
                  </div>
                )
              })
            ) : (
              <div style={{ position: "relative", padding: "10px 16px 10px 40px" }}>
                {/* Línea en L para "Sin chats" */}
                <div
                  style={{
                    position: "absolute",
                    left: "24px",
                    top: "0",
                    height: "50%",
                    width: "1px",
                    background: "#3A3A3D",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "24px",
                    top: "50%",
                    width: "12px",
                    height: "1px",
                    background: "#3A3A3D",
                  }}
                />
                <Text style={{ color: "#888888", fontSize: "12px" }}>Sin chats</Text>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderChatItem = (item: SidebarItem) => {
    const handleChatClick = () => {
      setSelectedItem(item.key)
      // Navegar al chat general (sin workspace)
      router.push(`/chat/${item.key}`)
    }

    return (
      <div
        key={item.key}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          cursor: "pointer",
          borderRadius: "8px",
          margin: "2px 8px",
          transition: "background 0.2s",
          background: selectedItem === item.key ? "#2A2A2D" : "transparent",
        }}
        onMouseEnter={(e) => {
          setHoveredItem(item.key)
          if (selectedItem !== item.key) {
            e.currentTarget.style.background = "#2A2A2D"
          }
        }}
        onMouseLeave={(e) => {
          setHoveredItem(null)
          if (selectedItem !== item.key) {
            e.currentTarget.style.background = "transparent"
          }
        }}
        onClick={handleChatClick}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#E3E3E3", fontSize: "14px" }}>{item.icon}</span>
          {!collapsed && <Text style={{ color: "#E3E3E3", fontSize: "14px" }}>{item.label}</Text>}
        </div>
        {!collapsed && (selectedItem === item.key || hoveredItem === item.key) && (
          <Dropdown
            menu={{ items: getDropdownItems(item) }}
            trigger={["click"]}
            placement="bottomRight"
            popupRender={(menu) => (
              <div
                style={{
                  background: "#2A2A2D",
                  borderRadius: "8px",
                  border: "1px solid #3A3A3D",
                  overflow: "hidden",
                }}
              >
                {menu}
              </div>
            )}
          >
            <MoreOutlined
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#E3E3E3", fontSize: "14px", padding: "4px" }}
            />
          </Dropdown>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <>
      {/* Header with hamburger */}
      <div style={{ padding: "16px", display: "flex", alignItems: "center" }}>
        <Button
          type="text"
          icon={<MenuOutlined style={{ fontSize: "18px" }} />}
          onClick={() => {
            setCollapsed(!collapsed)
            if (window.innerWidth < 768) setMobileOpen(!mobileOpen)
          }}
          style={{ color: "#E3E3E3", padding: "4px 8px" }}
        />
      </div>

      {/* Nuevo Chat button */}
      <div style={{ padding: "0 12px", marginBottom: "12px" }}>
        <Button
          type="text"
          icon={<EditOutlined style={{ fontSize: "14px" }} />}
          onClick={handleNewChat}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "flex-start",
            padding: "10px 16px",
            height: "auto",
            background: "#2A2A2D",
            border: "none",
            borderRadius: "8px",
            color: "#E3E3E3",
            fontSize: "14px",
          }}
        >
          {!collapsed && "Nuevo Chat"}
        </Button>
      </div>

      <div style={{ padding: "0 12px", marginBottom: "24px" }}>
        <Button
          type="text"
          icon={<Rocket size={16} />}
          onClick={() => setIsRfpModalOpen(true)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "flex-start",
            padding: "10px 16px",
            height: "auto",
            background: "#2A2A2D",
            border: "none",
            borderRadius: "8px",
            color: "#E3E3E3",
            fontSize: "14px",
          }}
        >
          {!collapsed && "Analisis rapido RPF"}
        </Button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        {!collapsed && (
          <div
            onClick={() => setWorkspacesSectionCollapsed(!workspacesSectionCollapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              padding: "0 16px",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "#888888", fontSize: "10px" }}>
              {workspacesSectionCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </span>
            <Text
              style={{
                color: "#888888",
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              Workspaces
            </Text>
          </div>
        )}

        {/* Nuevo Workspace - siempre visible */}
        {!collapsed && (
          <div style={{ marginTop: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                cursor: "pointer",
                borderRadius: "8px",
                margin: "2px 8px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2A2A2D")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={handleOpenModal}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#E3E3E3", fontSize: "14px" }}>
                  <FolderOpenOutlined />
                </span>
                <Text style={{ color: "#E3E3E3", fontSize: "14px", fontWeight: 600 }}>Nuevo Workspace</Text>
              </div>
            </div>
          </div>
        )}

        {/* Workspace activo - siempre visible si hay uno expandido */}
        {!collapsed && workspacesSectionCollapsed && expandedWorkspace && (
          <div style={{ marginTop: "4px" }}>
            {workspacesData
              .filter(ws => ws.key === expandedWorkspace)
              .map(renderWorkspaceItem)}
          </div>
        )}

        {/* Lista de workspaces - solo cuando no está colapsado */}
        {!workspacesSectionCollapsed && (
          <div style={{ marginTop: "4px" }}>
            {workspacesData.map(renderWorkspaceItem)}
          </div>
        )}
      </div>

      <div>
        {!collapsed && (
          <div
            onClick={() => setChatsSectionCollapsed(!chatsSectionCollapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              padding: "0 16px",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "#888888", fontSize: "10px" }}>
              {chatsSectionCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </span>
            <Text
              style={{
                color: "#888888",
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              Chats
            </Text>
          </div>
        )}
        {!chatsSectionCollapsed && (
          <div style={{ marginTop: "8px" }}>
            {generalChats.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <Text style={{ color: "#666666", fontSize: "12px" }}>
                  Sin chats generales
                </Text>
              </div>
            ) : (
              generalChats.map(renderChatItem)
            )}
          </div>
        )}
      </div>
      {/* Modal para subir archivo RFP */}
      <Modal
        title="Análisis Rápido RFP"
        open={isRfpModalOpen}
        onCancel={() => {
          setIsRfpModalOpen(false)
          setRfpFile(null)
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsRfpModalOpen(false)
            setRfpFile(null)
          }}>
            Cancelar
          </Button>,
          <Button
            key="analyze"
            type="primary"
            loading={isAnalyzing}
            disabled={!rfpFile}
            onClick={handleRfpAnalysis}
            style={{
              background: "#E31837",
              borderColor: "#E31837",
            }}
          >
            Analizar
          </Button>,
        ]}
      >
        <div style={{ padding: "20px 0" }}>
          <Upload
            beforeUpload={(file) => {
              const isValidType = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ].includes(file.type)

              if (!isValidType) {
                message.error('Solo se permiten archivos PDF y Word')
                return Upload.LIST_IGNORE
              }

              const uploadFile: UploadFile = {
                uid: file.uid || '-1',
                name: file.name,
                status: 'done',
                originFileObj: file as any,
              }
              setRfpFile(uploadFile)
              return false
            }}
            onRemove={() => setRfpFile(null)}
            fileList={rfpFile ? [rfpFile] : []}
            maxCount={1}
            accept=".pdf,.doc,.docx"
          >
            <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
              Seleccionar archivo RFP
            </Button>
          </Upload>
          <Text style={{ display: "block", marginTop: "12px", color: "#888", fontSize: "13px" }}>
            Formatos permitidos: PDF, Word (.doc, .docx)
          </Text>
        </div>
      </Modal>
    </>
  )

  const modalStyles = {
    content: {
      background: "#252528",
      borderRadius: "16px",
      padding: "24px",
      border: "1px solid #404045",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
    },
    mask: {
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(4px)",
    },
  }

  // Función para obtener el icono según el tipo de archivo
  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#E53935', fontSize: '20px' }} />
      case 'doc':
      case 'docx':
        return <FileWordOutlined style={{ color: '#2196F3', fontSize: '20px' }} />
      case 'ppt':
      case 'pptx':
        return <FilePptOutlined style={{ color: '#FF9800', fontSize: '20px' }} />
      case 'xls':
      case 'xlsx':
        return <FileExcelOutlined style={{ color: '#4CAF50', fontSize: '20px' }} />
      default:
        return <FileOutlined style={{ color: '#888888', fontSize: '20px' }} />
    }
  }

  // Función para obtener icono desde file_type del backend
  const getFileIconFromType = (fileType: string) => {
    const type = fileType.toLowerCase()
    if (type.includes('pdf')) {
      return <FilePdfOutlined style={{ color: '#E53935', fontSize: '20px' }} />
    } else if (type.includes('word') || type.includes('doc')) {
      return <FileWordOutlined style={{ color: '#2196F3', fontSize: '20px' }} />
    } else if (type.includes('powerpoint') || type.includes('ppt') || type.includes('presentation')) {
      return <FilePptOutlined style={{ color: '#FF9800', fontSize: '20px' }} />
    } else if (type.includes('excel') || type.includes('xls') || type.includes('sheet')) {
      return <FileExcelOutlined style={{ color: '#4CAF50', fontSize: '20px' }} />
    } else {
      return <FileOutlined style={{ color: '#888888', fontSize: '20px' }} />
    }
  }

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
          // Recargar documentos
          if (currentEditItem?.type === "workspace") {
            const docs = await fetchWorkspaceDocuments(currentEditItem.key)
            setExistingDocuments(docs)
          }
        } catch (error) {
          console.error('Error deleting document:', error)
          message.error('Error al eliminar el documento')
        }
      },
    })
  }

  // Tipos de archivo permitidos
  const acceptedFileTypes = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
        />
      )}

      {/* Desktop Sidebar */}
      <Sider
        width={220}
        collapsedWidth={60}
        collapsed={collapsed}
        style={{
          background: "#1E1E21",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 1000,
          display: "block",
        }}
        trigger={null}
      >
        {sidebarContent}
      </Sider>

      {/* Spacer for fixed sidebar */}
      <div style={{ width: collapsed ? 60 : 220, flexShrink: 0, transition: "width 0.2s" }} />

      {/* Modal for new workspace */}
      <Modal
        title={null}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        centered
        width={500}
        styles={modalStyles}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 600 }}>Crear Nuevo Workspace</Text>
        </div>

        {/* Workspace Name */}
        <div style={{ marginBottom: "20px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Nombre del Workspace
          </Text>
          <Input
            placeholder="Ej: Proyecto Marketing Q1"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={isUploading || documentStatus === "processing"}
            style={{
              background: "#2A2A2D",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#FFFFFF",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>Archivos</Text>
          <Upload
            multiple
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            showUploadList={false}
          >
            <Button
              icon={<PlusOutlined />}
              style={{
                background: "#2A2A2D",
                border: "1px dashed #3A3A3D",
                borderRadius: "8px",
                color: "#888888",
                width: "100%",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              Añadir archivos
            </Button>
          </Upload>
          {/* File list */}
          {fileList.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {fileList.map((file) => (
                <div
                  key={file.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#2A2A2D",
                    padding: "8px 12px",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileOutlined style={{ color: "#888888", fontSize: "14px" }} />
                    <div>
                      <Text style={{ color: "#E3E3E3", fontSize: "13px" }}>{file.name}</Text>
                      {documentStatus === "processing" && (
                        <div style={{ fontSize: "11px", color: "#faad14", marginTop: "2px" }}>
                          ⏱ Procesando...
                        </div>
                      )}
                    </div>
                  </div>
                  <DeleteOutlined
                    onClick={() => handleRemoveFile(file)}
                    style={{
                      color: isUploading || documentStatus === "processing" ? "#444444" : "#666666",
                      fontSize: "14px",
                      cursor: isUploading || documentStatus === "processing" ? "not-allowed" : "pointer"
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Context */}
        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Contexto adicional para la IA
          </Text>
          <TextArea
            placeholder="Describe el propósito del workspace, instrucciones especiales o información relevante para la IA..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            disabled={isUploading || documentStatus === "processing"}
            rows={4}
            style={{
              background: "#2A2A2D",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#FFFFFF",
              fontSize: "14px",
              resize: "none",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button
            onClick={handleCloseModal}
            disabled={isUploading || documentStatus === "processing"}
            style={{
              background: "transparent",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              color: isUploading || documentStatus === "processing" ? "#666666" : "#888888",
              padding: "8px 20px",
              height: "auto",
              cursor: isUploading || documentStatus === "processing" ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateWorkspace}
            disabled={!workspaceName.trim() || isUploading || documentStatus === "processing"}
            loading={isUploading || documentStatus === "processing"}
            style={{
              background: workspaceName.trim() && !isUploading && documentStatus !== "processing" ? "#E53935" : "#3A3A3D",
              border: "none",
              borderRadius: "8px",
              color: workspaceName.trim() && !isUploading && documentStatus !== "processing" ? "#FFFFFF" : "#666666",
              padding: "8px 20px",
              height: "auto",
            }}
          >
            {documentStatus === "processing"
              ? "Procesando documentos..."
              : isUploading
                ? "Subiendo archivos..."
                : "Crear Workspace"}
          </Button>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        title={null}
        open={isRenameModalOpen}
        onCancel={() => setIsRenameModalOpen(false)}
        footer={null}
        centered
        width={400}
        styles={modalStyles}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 600 }}>
            Renombrar {currentEditItem?.type === "workspace" ? "Workspace" : "Chat"}
          </Text>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Nuevo nombre
          </Text>
          <Input
            placeholder="Ingresa el nuevo nombre"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            style={{
              background: "#2A2A2D",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#FFFFFF",
              fontSize: "14px",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button
            onClick={() => setIsRenameModalOpen(false)}
            style={{
              background: "transparent",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              color: "#888888",
              padding: "8px 20px",
              height: "auto",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmRename}
            disabled={!renameValue.trim()}
            style={{
              background: renameValue.trim() ? "#E53935" : "#3A3A3D",
              border: "none",
              borderRadius: "8px",
              color: renameValue.trim() ? "#FFFFFF" : "#666666",
              padding: "8px 20px",
              height: "auto",
            }}
          >
            Guardar
          </Button>
        </div>
      </Modal>

      {/* Edit Workspace Modal */}
      <Modal
        title={null}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setFileList([]);
          setEditContext("");
        }}
        footer={null}
        centered
        width={500}
        styles={modalStyles}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 600 }}>Editar Workspace</Text>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Nombre del Workspace
          </Text>
          <Input
            placeholder="Nombre"
            value={renameValue || currentEditItem?.label}
            onChange={(e) => setRenameValue(e.target.value)}
            style={{
              background: "#2A2A2D",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#FFFFFF",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Documentos Existentes */}
        {existingDocuments.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
              Documentos Existentes
            </Text>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
              className="chat-scrollbar"
            >
              {existingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "#2A2A2D",
                    borderRadius: "8px",
                    border: "1px solid #3A3A3D",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                    {getFileIconFromType(doc.file_type)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: "#E3E3E3",
                          fontSize: "13px",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.file_name}
                      </Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        {doc.status === 'COMPLETED' && (
                          <>
                            <span style={{ color: "#52C41A", fontSize: "10px" }}>✓</span>
                            <Text style={{ color: "#666666", fontSize: "11px" }}>
                              {doc.chunk_count} chunks
                            </Text>
                          </>
                        )}
                        {doc.status === 'PROCESSING' && (
                          <>
                            <span style={{ color: "#FFA940", fontSize: "10px" }}>⟳</span>
                            <Text style={{ color: "#666666", fontSize: "11px" }}>Procesando...</Text>
                          </>
                        )}
                        {doc.status === 'FAILED' && (
                          <>
                            <span style={{ color: "#E31837", fontSize: "10px" }}>✗</span>
                            <Text style={{ color: "#666666", fontSize: "11px" }}>Error</Text>
                          </>
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
                      handleDeleteDocument(doc.id, doc.file_name)
                    }}
                    style={{
                      color: "#E31837",
                      padding: "4px",
                      minWidth: "auto",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoadingDocuments && (
          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <Text style={{ color: "#888888", fontSize: "13px" }}>Cargando documentos...</Text>
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>Archivos</Text>
          <Text style={{ color: "#666666", fontSize: "12px", display: "block", marginBottom: "12px" }}>
            Formatos permitidos: PDF, Word, PowerPoint, Excel
          </Text>
          <Upload
            multiple
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            showUploadList={false}
            accept={acceptedFileTypes}
          >
            <Button
              icon={<PlusOutlined />}
              style={{
                background: "#2A2A2D",
                border: "1px dashed #4A4A4D",
                borderRadius: "8px",
                color: "#AAAAAA",
                width: "100%",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              Añadir archivos
            </Button>
          </Upload>

          {/* Lista de archivos subidos */}
          {fileList.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {fileList.map((file) => (
                <div
                  key={file.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "#2A2A2D",
                    borderRadius: "8px",
                    border: "1px solid #3A3A3D",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                    {getFileIcon(file.name)}
                    <Text
                      style={{
                        color: "#E3E3E3",
                        fontSize: "13px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </Text>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined style={{ fontSize: "12px" }} />}
                    onClick={() => handleRemoveFile(file)}
                    style={{
                      color: "#666666",
                      padding: "4px",
                      minWidth: "auto",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Contexto adicional para la IA
          </Text>
          <TextArea
            placeholder="Edita el contexto para la IA..."
            value={editContext}
            onChange={(e) => setEditContext(e.target.value)}
            rows={4}
            style={{
              background: "#2A2A2D",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#FFFFFF",
              fontSize: "14px",
              resize: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button
            onClick={() => {
              setIsEditModalOpen(false);
              setFileList([]);
              setEditContext("");
            }}
            style={{
              background: "transparent",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              color: "#888888",
              padding: "8px 24px",
              height: "auto",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmEdit}
            disabled={isUploading}
            loading={isUploading}
            style={{
              background: isUploading ? "#3A3A3D" : "#E53935",
              border: "none",
              borderRadius: "8px",
              color: isUploading ? "#666666" : "#FFFFFF",
              padding: "8px 24px",
              height: "auto",
            }}
          >
            {isUploading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={null}
        open={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        footer={null}
        centered
        width={400}
        styles={modalStyles}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <DeleteOutlined style={{ fontSize: "48px", color: "#E53935", marginBottom: "16px" }} />
          <div style={{ marginBottom: "16px" }}>
            <Text style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 600, display: "block" }}>
              Eliminar {currentEditItem?.type === "workspace" ? "Workspace" : "Chat"}
            </Text>
          </div>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            ¿Estás seguro de que deseas eliminar "{currentEditItem?.label}"?
          </Text>
          {currentEditItem?.type === "workspace" && (
            <Text style={{ color: "#E53935", fontSize: "13px", display: "block" }}>
              Esta acción eliminará también todos los chats asociados.
            </Text>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
            style={{
              background: "transparent",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              color: "#888888",
              padding: "8px 24px",
              height: "auto",
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            style={{
              background: "#E53935",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              padding: "8px 24px",
              height: "auto",
            }}
          >
            Eliminar
          </Button>
        </div>
      </Modal>

      {/* Modal para mostrar resultados del análisis */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 600
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #E31837, #FF4757)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileWordOutlined style={{ color: '#FFFFFF', fontSize: '16px' }} />
            </div>
            Resultados del Análisis RFP
          </div>
        }
        open={isResultModalOpen}
        onCancel={() => setIsResultModalOpen(false)}
        width={900}
        style={{
          top: 20,
          paddingBottom: 0
        }}
        styles={{
          body: {
            background: '#0D1117',
            padding: '24px'
          },
          header: {
            background: '#1A1A1C',
            borderBottom: '1px solid #2D2D2D',
            padding: '16px 24px'
          },
          content: {
            background: '#0D1117',
            padding: 0
          }
        }}
        footer={[
          <div key="actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1A1A1C',
            padding: '16px 24px',
            borderTop: '1px solid #2D2D2D'
          }}>
            <div style={{ color: '#888', fontSize: '13px' }}>
              {analysisResult?.cliente && `Cliente: ${analysisResult.cliente}`}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                key="docx"
                icon={<FileWordOutlined />}
                loading={isDownloading}
                onClick={() => handleDownloadDocument('docx')}
                style={{
                  background: '#2B579A',
                  borderColor: '#2B579A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  height: '36px',
                  padding: '0 16px',
                  fontWeight: 500
                }}
              >
                Descargar Word
              </Button>,
              <Button
                key="pdf"
                icon={<FilePdfOutlined />}
                loading={isDownloading}
                onClick={() => handleDownloadDocument('pdf')}
                style={{
                  background: '#E31837',
                  borderColor: '#E31837',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  height: '36px',
                  padding: '0 16px',
                  fontWeight: 500
                }}
              >
                Descargar PDF
              </Button>
            </div>
          </div>
        ]}
      >
        {analysisResult && (
          <div style={{
            maxHeight: "70vh",
            overflowY: "auto",
            background: '#0D1117',
            color: '#CCCCCC'
          }}>
            {/* Información Principal */}
            <div style={{
              background: 'linear-gradient(135deg, #1A1A1C 0%, #2D2D2D 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid #2D2D2D'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px'
              }}>
                <div>
                  <Text style={{
                    color: '#888888',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Cliente
                  </Text>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#E31837',
                    marginTop: '4px'
                  }}>
                    {analysisResult.cliente}
                  </div>
                </div>

                {analysisResult.alcance_economico && (
                  <div>
                    <Text style={{
                      color: '#888888',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Alcance Económico
                    </Text>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#00C851',
                      marginTop: '4px'
                    }}>
                      {analysisResult.alcance_economico.moneda} {analysisResult.alcance_economico.presupuesto}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas y Plazos */}
            {analysisResult.fechas_y_plazos?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Fechas y Plazos
                  </Text>
                </div>
                <div style={{
                  display: 'grid',
                  gap: '12px'
                }}>
                  {analysisResult.fechas_y_plazos.map((plazo: any, index: number) => (
                    <div key={index} style={{
                      background: '#1A1A1C',
                      border: '1px solid #2D2D2D',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Text strong style={{ color: '#FFFFFF', minWidth: '120px' }}>
                          {plazo.tipo}:
                        </Text>
                        <Tag color="blue" style={{
                          background: '#2F54EB',
                          borderColor: '#2F54EB',
                          color: '#FFFFFF',
                          borderRadius: '6px'
                        }}>
                          {plazo.valor}
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objetivo General */}
            {analysisResult.objetivo_general?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Objetivo General
                  </Text>
                </div>
                <div style={{
                  background: '#1A1A1C',
                  border: '1px solid #2D2D2D',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  {analysisResult.objetivo_general.map((obj: string, index: number) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#E31837',
                        borderRadius: '50%',
                        marginTop: '8px',
                        flexShrink: 0
                      }} />
                      <Text style={{ color: '#CCCCCC', lineHeight: '1.6' }}>
                        {obj}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tecnologías Requeridas */}
            {analysisResult.tecnologias_requeridas?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Tecnologías Requeridas
                  </Text>
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {analysisResult.tecnologias_requeridas.map((tech: string, index: number) => (
                    <Tag key={index} style={{
                      background: 'linear-gradient(135deg, #00C851, #00E676)',
                      border: '1px solid #00C851',
                      color: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontWeight: 500
                    }}>
                      {tech}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Preguntas Sugeridas */}
            {analysisResult.preguntas_sugeridas?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Preguntas Sugeridas
                  </Text>
                </div>
                <div style={{
                  background: '#1A1A1C',
                  border: '1px solid #2D2D2D',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  {analysisResult.preguntas_sugeridas.map((pregunta: string, index: number) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        color: '#FFA726',
                        fontSize: '14px',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        Q{index + 1}:
                      </div>
                      <Text style={{ color: '#CCCCCC', lineHeight: '1.6' }}>
                        {pregunta}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipo Sugerido */}
            {analysisResult.equipo_sugerido?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Equipo Sugerido
                  </Text>
                </div>
                <div style={{
                  display: 'grid',
                  gap: '16px'
                }}>
                  {analysisResult.equipo_sugerido.map((miembro: any, index: number) => (
                    <div key={index} style={{
                      background: 'linear-gradient(135deg, #1A1A1C, #2D2D2D)',
                      border: '1px solid #2D2D2D',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'linear-gradient(135deg, #E31837, #FF4757)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '18px',
                          fontWeight: 600
                        }}>
                          {miembro.nombre.charAt(0)}
                        </div>
                        <div>
                          <Text strong style={{
                            fontSize: '18px',
                            color: '#FFFFFF',
                            display: 'block'
                          }}>
                            {miembro.nombre}
                          </Text>
                          <Text style={{ color: '#888888' }}>
                            {miembro.rol}
                          </Text>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <Text style={{
                            color: '#888888',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Experiencia
                          </Text>
                          <Tag color="orange" style={{
                            background: '#FFA726',
                            borderColor: '#FFA726',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            marginTop: '4px'
                          }}>
                            {miembro.experiencia}
                          </Tag>
                        </div>

                        {miembro.skills?.length > 0 && (
                          <div>
                            <Text style={{
                              color: '#888888',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '8px',
                              display: 'block'
                            }}>
                              Skills
                            </Text>
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px'
                            }}>
                              {miembro.skills.map((skill: string, idx: number) => (
                                <Tag key={idx} style={{
                                  background: 'linear-gradient(135deg, #26C6DA, #00ACC1)',
                                  border: '1px solid #26C6DA',
                                  color: '#FFFFFF',
                                  borderRadius: '14px',
                                  padding: '2px 10px',
                                  fontSize: '12px'
                                }}>
                                  {skill}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
