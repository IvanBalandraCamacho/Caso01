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

// Helper function para obtener headers con autenticación
const getAuthHeaders = () => {
  // Check if we're in the browser (not SSR)
  if (typeof window === 'undefined') {
    return {
      'Content-Type': 'application/json',
    };
  }
  
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

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

  searchResults: any[];
  setSearchResults: (results: any[]) => void;

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
  fulltextSearch: (query: string) => Promise<any>;
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
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
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/workspaces`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error("No se pudieron cargar los workspaces");
      const data = await response.json();
      setWorkspaces(data);
    } catch (error) {
      console.error("Error al cargar workspaces:", error);
    }
  }, [apiUrl]);

  // --- Función para cargar documentos ---
  const fetchDocuments = useCallback(
    async (workspaceId: string) => {
      if (!apiUrl) return;
      setIsLoadingDocs(true);
      setErrorDocs(null);
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}/documents`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("No se pudieron cargar los documentos");
        const data: Document[] = await response.json();
        setDocuments(data);
      } catch (error: any) {
        console.error("Error al cargar documentos:", error);
        setErrorDocs(error.message || "Error desconocido");
        setDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [apiUrl]
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
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        if (!response.ok)
          throw new Error("Error al actualizar el workspace");

        // Refrescar la lista de workspaces
        await fetchWorkspaces();

        // Actualizar el workspace activo si es el que se editó
        if (activeWorkspace?.id === workspaceId) {
          const updatedWorkspace = await response.json();
          setActiveWorkspace(updatedWorkspace);
        }
      } catch (error) {
        console.error("Error al actualizar:", error);
        throw error; // Lanzar error para que el modal lo sepa
      }
    },
    [apiUrl, fetchWorkspaces, activeWorkspace]
  );

  // --- Función para borrar workspace ---
  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("Error al eliminar el workspace");

        if (activeWorkspace?.id === workspaceId) {
          setActiveWorkspace(null);
        }
        await fetchWorkspaces();
      } catch (error) {
        console.error("Error al eliminar:", error);
        throw error; // Lanzar error
      }
    },
    [apiUrl, fetchWorkspaces, activeWorkspace]
  );

  // --- Función para cargar conversaciones ---
  const fetchConversations = useCallback(
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}/conversations`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("No se pudieron cargar las conversaciones");
        const data: Conversation[] = await response.json();
        setConversations(data);
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
        setConversations([]);
      }
    },
    [apiUrl]
  );

  // --- Función para crear conversación ---
  const createConversation = useCallback(
    async (workspaceId: string, title: string): Promise<Conversation> => {
      if (!apiUrl) throw new Error("API URL no configurada");
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}/conversations`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ title }),
          }
        );
        if (!response.ok) throw new Error("Error al crear la conversación");
        const newConversation: Conversation = await response.json();
        
        // Refrescar lista de conversaciones
        await fetchConversations(workspaceId);
        
        return newConversation;
      } catch (error) {
        console.error("Error al crear conversación:", error);
        throw error;
      }
    },
    [apiUrl, fetchConversations]
  );

  // --- Función para eliminar conversación ---
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!apiUrl || !activeWorkspace) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${activeWorkspace.id}/conversations/${conversationId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok) throw new Error("Error al eliminar la conversación");
        
        if (activeConversation?.id === conversationId) {
          setActiveConversation(null);
        }
        await fetchConversations(activeWorkspace.id);
      } catch (error) {
        console.error("Error al eliminar conversación:", error);
        throw error;
      }
    },
    [apiUrl, activeWorkspace, activeConversation, fetchConversations]
  );

  // --- Función para cargar mensajes de una conversación ---
  const fetchConversationMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      if (!apiUrl || !activeWorkspace) return [];
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${activeWorkspace.id}/conversations/${conversationId}`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("No se pudieron cargar los mensajes");
        const data: ConversationWithMessages = await response.json();
        return data.messages;
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
        return [];
      }
    },
    [apiUrl, activeWorkspace]
  );

  // --- Función para exportar a CSV ---
  const exportDocumentsToCsv = useCallback(
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}/documents/export-csv`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`No se pudo exportar a CSV: ${response.status}`);
        }
        const blob = await response.blob();
        
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
      } catch (error: any) {
        console.error("Error al exportar a CSV:", error);
        alert(`Error al exportar CSV: ${error.message}`);
        throw error;
      }
    },
    [apiUrl]
  );

  // --- Función para exportar a TXT ---
  const exportChatToTxt = useCallback(
    async (workspaceId: string, conversationId?: string) => {
      if (!apiUrl) return;
      try {
        const url = conversationId 
          ? `${apiUrl}/workspaces/${workspaceId}/chat/export/txt?conversation_id=${conversationId}`
          : `${apiUrl}/workspaces/${workspaceId}/chat/export/txt`;
        
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`No se pudo exportar a TXT: ${response.status}`);
        }
        const blob = await response.blob();
        
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
      } catch (error: any) {
        console.error("Error al exportar a TXT:", error);
        alert(`Error al exportar TXT: ${error.message}`);
        throw error;
      }
    },
    [apiUrl]
  );

  // --- Función para exportar a PDF ---
  const exportChatToPdf = useCallback(
    async (workspaceId: string, conversationId?: string) => {
      if (!apiUrl) return;
      try {
        const url = conversationId 
          ? `${apiUrl}/workspaces/${workspaceId}/chat/export/pdf?conversation_id=${conversationId}`
          : `${apiUrl}/workspaces/${workspaceId}/chat/export/pdf`;
        
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`No se pudo exportar a PDF: ${response.status}`);
        }
        const blob = await response.blob();
        
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
      } catch (error: any) {
        console.error("Error al exportar a PDF:", error);
        alert(`Error al exportar PDF: ${error.message}`);
        throw error;
      }
    },
    [apiUrl]
  );

  // --- Función para borrar historial de chat ---
  const deleteChatHistory = useCallback(
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/${workspaceId}/chat/history`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("No se pudo borrar el historial de chat");
      } catch (error) {
        console.error("Error al borrar el historial de chat:", error);
        throw error;
      }
    },
    [apiUrl]
  );

  // --- Función para búsqueda de texto completo ---
  const fulltextSearch = useCallback(
    async (query: string) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/workspaces/fulltext-search?query=${query}`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("No se pudo realizar la búsqueda");
        const data = await response.json();
        setSearchResults(data);
        return data;
      } catch (error) {
        console.error("Error en la búsqueda de texto completo:", error);
        throw error;
      }
    },
    [apiUrl]
  );

  // --- Función para borrar documento ---
  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/documents/${documentId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );
        if (!response.ok)
          throw new Error("Error al eliminar el documento");

        if (activeWorkspace) {
          await fetchDocuments(activeWorkspace.id); // Refrescar lista de docs
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
        throw error; // Lanzar error
      }
    },
    [apiUrl, activeWorkspace, fetchDocuments]
  );

  // Cargar workspaces al inicio
  useEffect(() => {
    fetchWorkspaces();
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

