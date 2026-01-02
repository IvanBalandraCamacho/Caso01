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
import { fetchWorkspaceDocuments, deleteDocumentApi, uploadDocumentApi, createConversationApi, uploadDocumentToConversation } from "@/lib/api"
import type { DocumentPublic } from "@/types/api"
import { ArrowDown, ArrowRight, ChevronDown, ChevronRight, Rocket, FileText } from "lucide-react"

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
  const [processingMessage, setProcessingMessage] = useState<string>("");
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
  
  // New Chat with File Upload State
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState("")
  const [newChatFile, setNewChatFile] = useState<UploadFile | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)


  const handleDownloadDocument = useCallback(async (format: 'docx' | 'pdf') => {
    if (!analysisResult) return

    setIsDownloading(true)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        message.error("No estás autenticado. Por favor, inicia sesión nuevamente.")
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
      const response = await fetch(`${apiBaseUrl}/task/generate?format=${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(analysisResult),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.detail || `Error ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      if (blob.size === 0) {
        throw new Error("El documento generado está vacío")
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `analisis_rfp_${analysisResult.cliente?.replace(/\s+/g, '_') || 'documento'}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      message.success(`Documento ${format.toUpperCase()} descargado exitosamente`)
    } catch (error) {
      console.error("Error al descargar documento:", error)
      const errorMsg = error instanceof Error ? error.message : "Error desconocido"
      message.error(`Error al descargar el documento: ${errorMsg}`)
    } finally {
      setIsDownloading(false)
    }
  }, [analysisResult, message])
  
  const handleNewChat = () => {
    // Check if we are in a workspace context (from URL or activeWorkspace)
    const workspaceIdMatches = pathname.match(/\/workspace\/([^\/]+)/);
    const workspaceId = workspaceIdMatches ? workspaceIdMatches[1] : activeWorkspace?.id;

    if (workspaceId) {
       // Open New Chat Modal with file upload
       setIsNewChatModalOpen(true); 
       setNewChatTitle("");
       setNewChatFile(null);
    } else {
       // Open modal even without workspace - will create general chat
       setIsNewChatModalOpen(true); 
       setNewChatTitle("");
       setNewChatFile(null);
    }
  }

  const handleCreateChat = async () => {
    const workspaceIdMatches = pathname.match(/\/workspace\/([^\/]+)/);
    const workspaceId = workspaceIdMatches ? workspaceIdMatches[1] : activeWorkspace?.id;
    
    if (!workspaceId) {
        message.error("No se pudo identificar el workspace activo");
        return;
    }

    setIsCreatingChat(true);
    try {
        // 1. Create conversation
        const title = newChatTitle.trim() || "Nueva Conversación";
        const newConversation = await createConversationApi(workspaceId, title);
        
        // 2. Upload file if selected
        if (newChatFile && newChatFile.originFileObj) {
            const formData = new FormData();
            formData.append("file", newChatFile.originFileObj);
            
            try {
                await uploadDocumentToConversation(workspaceId, newConversation.id, formData);
                message.success("Chat creado y documento subido");
            } catch (error) {
                console.error("Error uploading file to chat:", error);
                message.warning("Chat creado, pero hubo un error al subir el documento");
            }
        } else {
            message.success("Chat creado exitosamente");
        }

        // 3. Close modal and redirect
        setIsNewChatModalOpen(false);
        setNewChatTitle("");
        setNewChatFile(null);
        
        // Refresh conversations
        fetchConversations(workspaceId);
        
        // Redirect to new chat
        router.push(`/workspace/${workspaceId}/chat/${newConversation.id}`);

    } catch (error) {
        console.error("Error creating chat:", error);
        message.error("Error al crear la conversación");
    } finally {
        setIsCreatingChat(false);
    }
  }

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
    generalConversations,
    activeWorkspace,
    setActiveWorkspace,
    fetchConversations,
    fetchGeneralConversations,
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
    if (token) {
      if (workspaces.length === 0) fetchWorkspaces()
      fetchGeneralConversations()
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

  // Chats generales (sin workspace)
  const generalChats: SidebarItem[] = generalConversations.map(conv => ({
    key: conv.id,
    label: conv.title,
    icon: <CommentOutlined />,
    type: "chat",
  }))

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
    
    // Populate existing instructions if it's a workspace
    if (item.type === "workspace") {
      const ws = workspaces.find(w => w.id === item.key);
      if (ws) {
        setEditContext(ws.instructions || "");
      }
    } else {
      setEditContext("")
    }

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
    setDocumentStatus("uploading");
    setProcessingMessage("");
    
    try {
      if (currentEditItem.type === "workspace") {
        // 1. Update workspace context
        await updateWorkspaceApi(currentEditItem.key, { instructions: editContext });

        // 2. Upload new files if any
        if (fileList.length > 0) {
          const uploadedIds: string[] = [];
          
          for (const file of fileList) {
             if (!file.originFileObj) continue;
             const formData = new FormData();
             formData.append("file", file.originFileObj);

             try {
               const uploadedDoc = await uploadDocumentApi(currentEditItem.key, formData);
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
            setProcessingMessage("Iniciando procesamiento...");

            // Use a mutable Set to track pending documents
            const pendingIds = new Set(uploadedIds);

            // Setup WebSocket to track document processing
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/notifications";
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
              console.log("✅ WebSocket conectado para tracking de documentos (Edición)");
            };

            ws.onmessage = async (event) => {
              try {
                const data = JSON.parse(event.data);

                // Check if this notification is for one of our documents
                if (data.document_id && uploadedIds.includes(data.document_id)) {
                  
                  if (data.status === "PROCESSING") {
                     setProcessingMessage(data.message || "Procesando...");
                  } else if (data.status === "COMPLETED") {
                    // Remove from pending list
                    pendingIds.delete(data.document_id);
                    
                    // Update the uploadedIds state (for UI if needed)
                    setUploadedDocumentIds(Array.from(pendingIds));

                    // If all documents are processed
                    if (pendingIds.size === 0) {
                      setDocumentStatus("completed");
                      setProcessingMessage("¡Completado!");
                      ws.close();
                      
                      // Refresh documents list one last time
                      const docs = await fetchWorkspaceDocuments(currentEditItem.key);
                      setExistingDocuments(docs);

                      message.success("Workspace actualizado y documentos procesados");
                      
                      setTimeout(() => {
                        setIsEditModalOpen(false);
                        setCurrentEditItem(null);
                        setEditContext("");
                        setFileList([]);
                        setDocumentStatus("idle");
                        setProcessingMessage("");
                      }, 500);
                    }
                  } else if (data.status === "ERROR") {
                    message.error(`Error al procesar documento`);
                    
                    pendingIds.delete(data.document_id);
                    setUploadedDocumentIds(Array.from(pendingIds));

                     if (pendingIds.size === 0) {
                        setDocumentStatus("completed");
                        ws.close();
                        setIsEditModalOpen(false);
                        setCurrentEditItem(null);
                        setEditContext("");
                        setFileList([]);
                        setDocumentStatus("idle");
                        setProcessingMessage("");
                     }
                  }
                }
              } catch (err) {
                console.error("Error parseando mensaje WS:", err);
              }
            };

            ws.onerror = (err) => {
              console.error("Error en WebSocket:", err);
              // Fallback: close modal if WS fails
              setIsEditModalOpen(false);
              setCurrentEditItem(null);
              setEditContext("");
              setFileList([]);
              setDocumentStatus("idle");
              setProcessingMessage("");
            };

            setWsConnection(ws);
            return; // Don't close modal yet
          }
        }

        // 3. Refresh documents list if no new files were uploaded (but instructions might have changed)
        const docs = await fetchWorkspaceDocuments(currentEditItem.key);
        setExistingDocuments(docs);
        message.success("Workspace actualizado");
      }
    } catch (error) {
      console.error("Error editing:", error);
      message.error("Error al actualizar el workspace");
    } finally {
        // Only reset if we are NOT waiting for WebSocket (processing)
        if (documentStatus !== "processing") {
            setIsUploading(false);
            setDocumentStatus("idle");
            setProcessingMessage("");
            
            // Only close if we didn't start a WebSocket wait (which returns early)
            if (fileList.length === 0) {
                setIsEditModalOpen(false);
                setCurrentEditItem(null);
                setEditContext("");
                setFileList([]);
            }
        }
    }
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
        width={280}
        collapsedWidth={60}
        collapsed={collapsed}
        style={{
          background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1c 100%)",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 1000,
          display: "block",
          borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.5)",
        }}
        trigger={null}
      >
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            height: "100%" 
          }}
        >
          {/* Static Header & Buttons */}
          <div style={{ flexShrink: 0 }}>
            {/* Header with hamburger */}
            <div style={{ padding: "16px", display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: "18px" }} />}
                onClick={() => {
                  setCollapsed(!collapsed)
                  if (window.innerWidth < 768) setMobileOpen(!mobileOpen)
                }}
                className="transition-smooth"
                style={{ 
                  color: "#E3E3E3", 
                  padding: "8px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(227, 24, 55, 0.1)";
                  e.currentTarget.style.color = "#E31837";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  e.currentTarget.style.color = "#E3E3E3";
                }}
              />
            </div>

            {/* Nuevo Chat button */}
            <div style={{ padding: "0 12px", marginBottom: "12px" }}>
              <Button
                type="text"
                icon={<EditOutlined style={{ fontSize: "14px" }} />}
                onClick={handleNewChat}
                className="transition-smooth hover-lift"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  justifyContent: "flex-start",
                  padding: "12px 16px",
                  height: "auto",
                  background: "linear-gradient(135deg, rgba(227, 24, 55, 0.1) 0%, rgba(227, 24, 55, 0.05) 100%)",
                  border: "1px solid rgba(227, 24, 55, 0.2)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 600,
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 2px 8px rgba(227, 24, 55, 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(227, 24, 55, 0.2) 0%, rgba(227, 24, 55, 0.1) 100%)";
                  e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.4)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(227, 24, 55, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(227, 24, 55, 0.1) 0%, rgba(227, 24, 55, 0.05) 100%)";
                  e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.2)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(227, 24, 55, 0.15)";
                }}
              >
                {!collapsed && "Nuevo Chat"}
              </Button>
            </div>

            <div style={{ padding: "0 12px", marginBottom: "12px" }}>
              <Button
                type="text"
                icon={<Rocket size={16} />}
                onClick={() => setIsRfpModalOpen(true)}
                className="transition-smooth hover-lift"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  justifyContent: "flex-start",
                  padding: "12px 16px",
                  height: "auto",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 600,
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)";
                  e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.4)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(16, 185, 129, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)";
                  e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.2)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.15)";
                }}
              >
                {!collapsed && "Análisis rápido RPF"}
              </Button>
            </div>

            {/* Nuevo Workspace button */}
            <div style={{ padding: "0 12px", marginBottom: "24px" }}>
              <Button
                type="text"
                icon={<FolderOpenOutlined style={{ fontSize: "14px" }} />}
                onClick={handleOpenModal}
                className="transition-smooth hover-lift"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  justifyContent: "flex-start",
                  padding: "12px 16px",
                  height: "auto",
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: 600,
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(59, 130, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.2)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.15)";
                }}
              >
                {!collapsed && "Nuevo Workspace"}
              </Button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="chat-scrollbar"
            style={{ 
              flexGrow: 1, 
              overflowY: "auto", 
              overflowX: "hidden",
              paddingBottom: "24px" 
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              {!collapsed && (
                <div
                  onClick={() => setWorkspacesSectionCollapsed(!workspacesSectionCollapsed)}
                  className="transition-smooth"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px 16px",
                    marginBottom: "12px",
                    borderRadius: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ color: "#999999", fontSize: "12px" }}>
                    {workspacesSectionCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </span>
                  <Text
                    style={{
                      color: "#BBBBBB",
                      fontSize: "13px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Workspaces
                  </Text>
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
                  className="transition-smooth"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px 16px",
                    marginBottom: "12px",
                    borderRadius: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ color: "#999999", fontSize: "12px" }}>
                    {chatsSectionCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </span>
                  <Text
                    style={{
                      color: "#BBBBBB",
                      fontSize: "13px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Chats
                  </Text>
                </div>
              )}
              {!chatsSectionCollapsed && (
                <div style={{ marginTop: "8px" }}>
                  {generalChats.length === 0 ? (
                    <div style={{ padding: "20px 16px", textAlign: "center" }}>
                      <div style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px dashed rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        padding: "16px",
                      }}>
                        <Text style={{ color: "#888888", fontSize: "12px", fontStyle: "italic" }}>
                          Sin chats generales
                        </Text>
                      </div>
                    </div>
                  ) : (
                    generalChats.map(renderChatItem)
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Sider>

      {/* Spacer for fixed sidebar */}
      <div style={{ width: collapsed ? 60 : 280, flexShrink: 0, transition: "width 0.2s" }} />

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
          // Prevent closing if processing
          if (isUploading || documentStatus === "processing") return;
          
          setIsEditModalOpen(false);
          setFileList([]);
          setEditContext("");
          setDocumentStatus("idle");
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
                    disabled={isUploading || documentStatus === "processing"}
                    style={{
                      color: isUploading || documentStatus === "processing" ? "#444" : "#E31837",
                      padding: "4px",
                      minWidth: "auto",
                      cursor: isUploading || documentStatus === "processing" ? "not-allowed" : "pointer"
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
            disabled={isUploading || documentStatus === "processing"}
          >
            <Button
              icon={<PlusOutlined />}
              disabled={isUploading || documentStatus === "processing"}
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
                cursor: isUploading || documentStatus === "processing" ? "not-allowed" : "pointer"
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
                        {file.name}
                        </Text>
                        {documentStatus === "processing" && (
                            <div style={{ fontSize: "11px", color: "#faad14", marginTop: "2px" }}>
                            ⏱ Procesando...
                            </div>
                        )}
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined style={{ fontSize: "12px" }} />}
                    onClick={() => handleRemoveFile(file)}
                    disabled={isUploading || documentStatus === "processing"}
                    style={{
                      color: "#666666",
                      padding: "4px",
                      minWidth: "auto",
                      cursor: isUploading || documentStatus === "processing" ? "not-allowed" : "pointer"
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

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button
            onClick={() => {
              if (isUploading || documentStatus === "processing") return;
              setIsEditModalOpen(false);
              setFileList([]);
              setEditContext("");
              setDocumentStatus("idle");
            }}
            disabled={isUploading || documentStatus === "processing"}
            style={{
              background: "transparent",
              border: "1px solid #3A3A3D",
              borderRadius: "8px",
              color: isUploading || documentStatus === "processing" ? "#666" : "#888888",
              padding: "8px 24px",
              height: "auto",
              cursor: isUploading || documentStatus === "processing" ? "not-allowed" : "pointer"
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmEdit}
            disabled={isUploading || documentStatus === "processing"}
            loading={isUploading || documentStatus === "processing"}
            style={{
              background: isUploading || documentStatus === "processing" ? "#3A3A3D" : "#E53935",
              border: "none",
              borderRadius: "8px",
              color: isUploading || documentStatus === "processing" ? "#666666" : "#FFFFFF",
              padding: "8px 24px",
              height: "auto",
            }}
          >
            {documentStatus === "processing" 
                ? (processingMessage || "Procesando...")
                : (isUploading ? "Subiendo..." : "Guardar cambios")}
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
        width={1000}
        style={{
          top: 20,
          paddingBottom: 0
        }}
        styles={{
          body: {
            background: '#1A1A1A',
            padding: '32px',
            maxHeight: '80vh',
            overflow: 'hidden'
          },
          header: {
            background: '#18181b',
            borderBottom: '1px solid #27272a',
            padding: '20px 32px'
          },
          content: {
            background: '#1A1A1A',
            padding: 0
          }
        }}
        footer={[
          <div key="actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#18181b',
            padding: '20px 32px',
            borderTop: '1px solid #27272a'
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
                className="h-10 px-6 rounded-lg font-medium"
                style={{
                  background: '#1E3A8A',
                  borderColor: '#1E3A8A',
                  color: '#FFFFFF'
                }}
              >
                Word
              </Button>
              <Button
                key="pdf"
                icon={<FilePdfOutlined />}
                loading={isDownloading}
                onClick={() => handleDownloadDocument('pdf')}
                className="h-10 px-6 rounded-lg font-medium"
                style={{
                  background: '#7F1D1D',
                  borderColor: '#7F1D1D',
                  color: '#FFFFFF'
                }}
              >
                PDF
              </Button>
            </div>
          </div>
        ]}
      >
        {analysisResult && (
          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden space-y-6 pr-2">
            {/* Hero Section - Cliente y Presupuesto */}
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Cliente */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                      </svg>
                    </div>
                    <span className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
                      Cliente
                    </span>
                  </div>
                  <h2 className="text-white text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    {analysisResult.cliente || 'No especificado'}
                  </h2>
                </div>
                
                {/* Presupuesto */}
                <div className="md:text-right">
                  <div className="flex items-center gap-2 mb-3 md:justify-end">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
                      Presupuesto Total
                    </span>
                  </div>
                  {analysisResult.alcance_economico?.presupuesto && 
                   !analysisResult.alcance_economico.presupuesto.toLowerCase().includes('no especific') ? (
                    <>
                      <div className="text-emerald-400 text-4xl font-bold font-mono">
                        {analysisResult.alcance_economico.moneda?.split('(')[0].trim() || ''} {analysisResult.alcance_economico.presupuesto}
                      </div>
                      {analysisResult.alcance_economico.moneda?.match(/\((.*?)\)/)?.[1] && (
                        <p className="text-zinc-400 text-sm mt-2 font-medium">
                          {analysisResult.alcance_economico.moneda.match(/\((.*?)\)/)?.[1]}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-zinc-500 text-lg font-medium">
                      No especificado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Objetivo Principal */}
            {analysisResult.objetivo_general?.length > 0 && (
              <div className="bg-gradient-to-br from-red-900/10 to-orange-900/10 border border-red-500/30 rounded-xl p-6 hover:border-red-500/50 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold">Objetivo del Proyecto</h3>
                </div>
                <div className="space-y-4">
                  {analysisResult.objetivo_general.map((obj: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                      <p className="text-zinc-200 text-base leading-relaxed flex-1">
                        {obj}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline de Plazos */}
            {analysisResult.fechas_y_plazos?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Plazos del Proyecto</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResult.fechas_y_plazos.map((plazo: any, index: number) => (
                    <div key={index} className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                      <div className="text-zinc-400 text-xs font-medium mb-2">
                        {plazo.tipo}
                      </div>
                      <div className="text-white text-lg font-semibold">
                        {plazo.valor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tecnologías */}
            {analysisResult.tecnologias_requeridas?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Stack Tecnológico</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.tecnologias_requeridas.map((tech: string, index: number) => (
                    <span key={index} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preguntas Clave */}
            {analysisResult.preguntas_sugeridas?.length > 0 && (
              <div className="bg-gradient-to-br from-amber-900/10 to-yellow-900/10 border border-amber-500/30 rounded-xl p-6 hover:border-amber-500/50 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold">Preguntas Clave para el Cliente</h3>
                </div>
                <div className="space-y-3">
                  {analysisResult.preguntas_sugeridas.map((pregunta: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group">
                      <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <p className="text-zinc-200 text-sm leading-relaxed flex-1">
                        {pregunta}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipo Propuesto */}
            {analysisResult.equipo_sugerido?.length > 0 && (
              <div className="bg-gradient-to-br from-purple-900/10 to-pink-900/10 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white text-lg font-bold">Equipo Recomendado</h3>
                    <p className="text-zinc-400 text-sm">Roles profesionales sugeridos para el proyecto</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResult.equipo_sugerido.map((miembro: any, index: number) => {
                    const avatarColors = [
                      'bg-gradient-to-br from-blue-500 to-blue-600',
                      'bg-gradient-to-br from-purple-500 to-purple-600',
                      'bg-gradient-to-br from-pink-500 to-pink-600',
                      'bg-gradient-to-br from-orange-500 to-orange-600',
                      'bg-gradient-to-br from-teal-500 to-teal-600',
                      'bg-gradient-to-br from-indigo-500 to-indigo-600',
                    ];
                    
                    return (
                      <div key={index} className="bg-zinc-800/30 border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/40 hover:bg-zinc-800/50 transition-all group">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-14 h-14 ${avatarColors[index % avatarColors.length]} rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                            {miembro.nombre?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-base mb-1.5">
                              {miembro.nombre}
                            </h4>
                            <p className="text-zinc-300 text-sm leading-snug font-medium">
                              {miembro.rol}
                            </p>
                          </div>
                        </div>
                        
                        {/* Experiencia */}
                        {miembro.experiencia && (
                          <div className="mb-4">
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg shadow-sm">
                              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                              </svg>
                              <div className="flex items-baseline gap-1">
                                <span className="text-amber-300 font-bold text-base">
                                  {miembro.experiencia}
                                </span>
                                <span className="text-amber-400/80 text-xs font-medium">
                                  años de experiencia
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Skills */}
                        {miembro.skills?.length > 0 && (
                          <div>
                            <p className="text-purple-300 text-xs font-semibold mb-2.5 uppercase tracking-wider">Habilidades Clave</p>
                            <div className="flex flex-wrap gap-1.5">
                              {miembro.skills.map((skill: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-200 rounded-md text-xs font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Chat Modal with File Upload */}
      <Modal
        title={null}
        open={isNewChatModalOpen}
        onCancel={() => !isCreatingChat && setIsNewChatModalOpen(false)}
        footer={null}
        centered
        width={450}
        styles={modalStyles}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 600 }}>Nuevo Chat</Text>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Título del Chat (Opcional)
          </Text>
          <Input
            placeholder="Ej: Análisis de Riesgos"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            disabled={isCreatingChat}
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

        <div style={{ marginBottom: "24px" }}>
          <Text style={{ color: "#888888", fontSize: "14px", display: "block", marginBottom: "8px" }}>
            Documento Inicial (Opcional)
          </Text>
          <Upload
            maxCount={1}
            fileList={newChatFile ? [newChatFile] : []}
            onChange={({ fileList }) => setNewChatFile(fileList[0] || null)}
            beforeUpload={() => false}
            showUploadList={false}
          >
            <Button
              icon={<UploadOutlined />}
              disabled={isCreatingChat}
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
              {newChatFile ? "Cambiar archivo" : "Adjuntar archivo"}
            </Button>
          </Upload>
          
          {newChatFile && (
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#2A2A2D", padding: "8px 12px", borderRadius: "6px" }}>
               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileOutlined style={{ color: "#888888" }} />
                  <Text style={{ color: "#E3E3E3", fontSize: "13px" }}>{newChatFile.name}</Text>
               </div>
               <DeleteOutlined 
                  onClick={(e) => { e.stopPropagation(); setNewChatFile(null); }}
                  style={{ color: "#666", cursor: "pointer" }}
               />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button
            onClick={() => setIsNewChatModalOpen(false)}
            disabled={isCreatingChat}
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
            onClick={handleCreateChat}
            loading={isCreatingChat}
            style={{
              background: "#E53935",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              padding: "8px 20px",
              height: "auto",
            }}
          >
            Crear Chat
          </Button>
        </div>
      </Modal>

      {/* Modal para Análisis Rápido RFP */}
      <Modal
        title={null}
        open={isRfpModalOpen}
        onCancel={() => {
          setIsRfpModalOpen(false)
          setRfpFile(null)
        }}
        footer={null}
        centered
        width={500}
        styles={modalStyles}
        closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
      >
        {/* Header del Modal */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            marginBottom: "12px" 
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            }}>
              <Rocket size={24} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <Text style={{ color: "#FFFFFF", fontSize: "22px", fontWeight: 700, display: "block" }}>
                Análisis Rápido RFP
              </Text>
              <Text style={{ color: "#888888", fontSize: "13px", display: "block" }}>
                Extrae información clave automáticamente
              </Text>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div style={{ marginBottom: "24px" }}>
          <Text style={{ 
            color: "#CCCCCC", 
            fontSize: "14px", 
            display: "block", 
            marginBottom: "12px",
            fontWeight: 600,
          }}>
            Selecciona tu documento RFP
          </Text>
          
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
            maxCount={1}
            showUploadList={false}
            style={{ width: "100%" }}
          >
            <div style={{
              width: "100%",
              minHeight: "180px",
              border: "2px dashed rgba(16, 185, 129, 0.3)",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.02) 100%)",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            className="upload-hover"
            >
              {!rfpFile ? (
                <>
                  <div style={{
                    width: "64px",
                    height: "64px",
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                  }}>
                    <UploadOutlined style={{ fontSize: "28px", color: "#FFFFFF" }} />
                  </div>
                  <Text style={{ 
                    color: "#FFFFFF", 
                    fontSize: "16px", 
                    fontWeight: 600,
                    marginBottom: "8px",
                    display: "block",
                  }}>
                    Arrastra tu archivo o haz click aquí
                  </Text>
                  <Text style={{ 
                    color: "#888888", 
                    fontSize: "13px",
                    display: "block",
                  }}>
                    PDF, Word (DOCX) • Máximo 10MB
                  </Text>
                </>
              ) : (
                <div style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "rgba(16, 185, 129, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <FileText size={20} style={{ color: "#FFFFFF" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ 
                      color: "#FFFFFF", 
                      fontSize: "14px",
                      fontWeight: 600,
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {rfpFile.name}
                    </Text>
                    <Text style={{ 
                      color: "#10B981", 
                      fontSize: "12px",
                      display: "block",
                    }}>
                      ✓ Archivo seleccionado
                    </Text>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRfpFile(null)
                    }}
                    style={{
                      color: "#EF4444",
                      flexShrink: 0,
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          </Upload>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          justifyContent: "flex-end",
        }}>
          <Button
            onClick={() => {
              setIsRfpModalOpen(false)
              setRfpFile(null)
            }}
            style={{
              height: "42px",
              padding: "0 24px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#CCCCCC",
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
            className="hover-lift"
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            loading={isAnalyzing}
            disabled={!rfpFile}
            onClick={handleRfpAnalysis}
            icon={!isAnalyzing && <Rocket size={16} />}
            style={{
              height: "42px",
              padding: "0 28px",
              borderRadius: "8px",
              border: "none",
              background: rfpFile 
                ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                : "rgba(255, 255, 255, 0.1)",
              color: rfpFile ? "#FFFFFF" : "#666666",
              fontWeight: 600,
              boxShadow: rfpFile 
                ? "0 4px 12px rgba(16, 185, 129, 0.3)" 
                : "none",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            className={rfpFile ? "hover-lift" : ""}
          >
            {isAnalyzing ? "Analizando..." : "Analizar RFP"}
          </Button>
        </div>

        {/* Estilos CSS adicionales */}
        <style jsx global>{`
          .upload-hover:hover {
            border-color: rgba(16, 185, 129, 0.6) !important;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%) !important;
            transform: translateY(-2px);
          }
        `}</style>
      </Modal>
    </>
  )
}
