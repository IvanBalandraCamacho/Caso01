"use client";
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  fetchWorkspaces as fetchWorkspacesApi,
  updateWorkspaceApi,
  deleteWorkspaceApi,
  fetchWorkspaceDocuments as fetchWorkspaceDocumentsApi,
  deleteDocumentApi,
  fetchConversations as fetchConversationsApi,
  createConversationApi,
  deleteConversationApi,
  fetchConversationMessages as fetchConversationMessagesApi,
  exportDocumentsToCsvApi,
  exportChatToTxtApi,
  exportChatToPdfApi,
  deleteChatHistoryApi,
  fulltextSearchApi,
} from '@/lib/api';

// 1. Exportamos las interfaces para que otros archivos las usen
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  // Añadido para el update
  instructions?: string | null;
}

export interface Document {
  id: string;
  file_name: string;
  file_type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  chunk_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  chunk_references: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface Notification {
  message: string;
  type: "success" | "error" | "info";
}

// 2. Definimos la forma del contexto
interface WorkspaceContextType {
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;

  documents: Document[];
  isLoadingDocs: boolean;
  errorDocs: string | null;
  fetchDocuments: (workspaceId: string) => Promise<void>;

  notifications: Notification[];
  addNotification: (notification: Notification) => void;

  searchResults: unknown[];
  setSearchResults: (results: unknown[]) => void;

  // --- Conversations ---
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  fetchConversations: (workspaceId: string) => Promise<void>;
  createConversation: (workspaceId: string, title: string) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  fetchConversationMessages: (conversationId: string) => Promise<Message[]>;
  
  // Model selection
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // --- Funciones CRUD ---
  fetchWorkspaces: () => Promise<void>;
  updateWorkspace: (
    workspaceId: string,
    data: Partial<Workspace>
  ) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  exportDocumentsToCsv: (workspaceId: string) => Promise<void>;
  exportChatToTxt: (workspaceId: string, conversationId?: string) => Promise<void>;
  exportChatToPdf: (workspaceId: string, conversationId?: string) => Promise<void>;
  deleteChatHistory: (workspaceId: string) => Promise<void>;
  fulltextSearch: (query: string) => Promise<unknown[]>;
}

// 3. Creamos el Contexto
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

// 4. Creamos el "Proveedor"
export function WorkspaceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null
  );

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  
  // Estados para conversaciones
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  
  // Estado para el modelo LLM seleccionado
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [...prev, notification]);
  };

  // --- Función para cargar workspaces ---
  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await fetchWorkspacesApi();
      setWorkspaces(data);
    } catch (error) {
      console.error("Error al cargar workspaces:", error);
    }
  }, []);

  // --- Función para cargar documentos ---
  const fetchDocuments = useCallback(
    async (workspaceId: string) => {
      setIsLoadingDocs(true);
      setErrorDocs(null);
      try {
        const data: Document[] = await fetchWorkspaceDocumentsApi(workspaceId);
        setDocuments(data);
      } catch (error) {
        console.error("Error al cargar documentos:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setErrorDocs(errorMessage);
        setDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    },
    []
  );

  // --- Polling automático para documentos en procesamiento ---
  useEffect(() => {
    if (!activeWorkspace) return;
    
    // Verificar si hay documentos en estado PROCESSING o PENDING
    const hasProcessingDocuments = documents.some(
      doc => doc.status === "PROCESSING" || doc.status === "PENDING"
    );
    
    if (hasProcessingDocuments) {
      const intervalId = setInterval(() => {
        fetchDocuments(activeWorkspace.id);
      }, 3000); // Refrescar cada 3 segundos
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [activeWorkspace, documents, fetchDocuments]);

  // --- Función para actualizar workspace ---
  const updateWorkspace = useCallback(
    async (workspaceId: string, data: Partial<Workspace>) => {
      try {
        await updateWorkspaceApi(workspaceId, data);

        // Refrescar la lista de workspaces
        await fetchWorkspaces();

        // Actualizar el workspace activo si es el que se editó
        if (activeWorkspace?.id === workspaceId) {
          const updatedWorkspace = await updateWorkspaceApi(workspaceId, data);
          setActiveWorkspace(updatedWorkspace);
        }
      } catch (error) {
        console.error("Error al actualizar:", error);
        throw error; // Lanzar error para que el modal lo sepa
      }
    },
    [fetchWorkspaces, activeWorkspace]
  );

  // --- Función para borrar workspace ---
  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        await deleteWorkspaceApi(workspaceId);

        if (activeWorkspace?.id === workspaceId) {
          setActiveWorkspace(null);
        }
        await fetchWorkspaces();
      } catch (error) {
        console.error("Error al eliminar:", error);
        throw error; // Lanzar error
      }
    },
    [fetchWorkspaces, activeWorkspace]
  );

  // --- Función para cargar conversaciones ---
  const fetchConversations = useCallback(
    async (workspaceId: string) => {
      try {
        const data: Conversation[] = await fetchConversationsApi(workspaceId);
        setConversations(data);
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
        setConversations([]);
      }
    },
    []
  );

  // --- Función para crear conversación ---
  const createConversation = useCallback(
    async (workspaceId: string, title: string): Promise<Conversation> => {
      try {
        const newConversation: Conversation = await createConversationApi(workspaceId, title);
        
        // Refrescar lista de conversaciones
        await fetchConversations(workspaceId);
        
        return newConversation;
      } catch (error) {
        console.error("Error al crear conversación:", error);
        throw error;
      }
    },
    [fetchConversations]
  );

  // --- Función para eliminar conversación ---
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!activeWorkspace) return;
      try {
        await deleteConversationApi(activeWorkspace.id, conversationId);
        
        if (activeConversation?.id === conversationId) {
          setActiveConversation(null);
        }
        await fetchConversations(activeWorkspace.id);
      } catch (error) {
        console.error("Error al eliminar conversación:", error);
        throw error;
      }
    },
    [activeWorkspace, activeConversation, fetchConversations]
  );

  // --- Función para cargar mensajes de una conversación ---
  const fetchConversationMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      if (!activeWorkspace) return [];
      try {
        const data: ConversationWithMessages = await fetchConversationMessagesApi(activeWorkspace.id, conversationId);
        return data.messages;
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
        return [];
      }
    },
    [activeWorkspace]
  );

  // --- Función para exportar a CSV ---
  const exportDocumentsToCsv = useCallback(
    async (workspaceId: string) => {
      try {
        const blob = await exportDocumentsToCsvApi(workspaceId);
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `documents_${workspaceId}.csv`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error("Error al exportar a CSV:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al exportar CSV: ${errorMessage}`);
        throw error;
      }
    },
    []
  );

  // --- Función para exportar a TXT ---
  const exportChatToTxt = useCallback(
    async (workspaceId: string, conversationId?: string) => {
      try {
        const blob = await exportChatToTxtApi(workspaceId, conversationId);
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `chat_${conversationId || workspaceId}_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);
        }, 100);
      } catch (error) {
        console.error("Error al exportar a TXT:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al exportar TXT: ${errorMessage}`);
        throw error;
      }
    },
    []
  );

  // --- Función para exportar a PDF ---
  const exportChatToPdf = useCallback(
    async (workspaceId: string, conversationId?: string) => {
      try {
        const blob = await exportChatToPdfApi(workspaceId, conversationId);
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `chat_${conversationId || workspaceId}_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);
        }, 100);
      } catch (error) {
        console.error("Error al exportar a PDF:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al exportar PDF: ${errorMessage}`);
        throw error;
      }
    },
    []
  );

  // --- Función para borrar historial de chat ---
  const deleteChatHistory = useCallback(
    async (workspaceId: string) => {
      try {
        await deleteChatHistoryApi(workspaceId);
      } catch (error) {
        console.error("Error al borrar el historial de chat:", error);
        throw error;
      }
    },
    []
  );

  // --- Función para búsqueda de texto completo ---
  const fulltextSearch = useCallback(
    async (query: string) => {
      try {
        const data = await fulltextSearchApi(query);
        setSearchResults(data);
        return data;
      } catch (error) {
        console.error("Error en la búsqueda de texto completo:", error);
        throw error;
      }
    },
    []
  );

  // --- Función para borrar documento ---
  const deleteDocument = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocumentApi(documentId);

        if (activeWorkspace) {
          await fetchDocuments(activeWorkspace.id); // Refrescar lista de docs
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
        throw error; // Lanzar error
      }
    },
    [activeWorkspace, fetchDocuments]
  );

  // Cargar workspaces al inicio solo si el usuario está autenticado
  useEffect(() => {
    // Solo cargar si hay token (usuario autenticado)
    if (typeof window !== 'undefined' && localStorage.getItem('access_token')) {
      fetchWorkspaces();
    }
  }, [fetchWorkspaces]);

  // Escuchar cuando el usuario hace login (custom event)
  useEffect(() => {
    const handleLoginSuccess = () => {
      fetchWorkspaces();
    };

    const handleLogout = () => {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setConversations([]);
      setActiveConversation(null);
      setDocuments([]);
    };

    window.addEventListener('loginSuccess', handleLoginSuccess);
    window.addEventListener('logout', handleLogout);
    
    return () => {
      window.removeEventListener('loginSuccess', handleLoginSuccess);
      window.removeEventListener('logout', handleLogout);
    };
  }, [fetchWorkspaces]);

  // Nota: NO auto-seleccionar workspace al inicio - el usuario debe elegir manualmente

  const contextValue = useMemo(
    () => ({
      workspaces,
      setWorkspaces,
      activeWorkspace,
      setActiveWorkspace,
      documents,
      isLoadingDocs,
      errorDocs,
      fetchDocuments,
      notifications,
      addNotification,
      searchResults,
      setSearchResults,
      conversations,
      activeConversation,
      setActiveConversation,
      fetchConversations,
      createConversation,
      deleteConversation,
      fetchConversationMessages,
      fetchWorkspaces,
      updateWorkspace,
      deleteWorkspace,
      deleteDocument,
      exportDocumentsToCsv,
      exportChatToTxt,
      exportChatToPdf,
      deleteChatHistory,
      fulltextSearch,
      selectedModel,
      setSelectedModel,
    }),
    [
      workspaces,
      activeWorkspace,
      documents,
      isLoadingDocs,
      errorDocs,
      fetchDocuments,
      notifications,
      searchResults,
      conversations,
      activeConversation,
      fetchConversations,
      createConversation,
      deleteConversation,
      fetchConversationMessages,
      fetchWorkspaces,
      updateWorkspace,
      deleteWorkspace,
      deleteDocument,
      exportDocumentsToCsv,
      exportChatToTxt,
      exportChatToPdf,
      deleteChatHistory,
      fulltextSearch,
      selectedModel,
      setSelectedModel,
    ]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// 5. Hook personalizado
export function useWorkspaces() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error(
      "useWorkspaces debe ser usado dentro de un WorkspaceProvider"
    );
  }
  return context;
}

