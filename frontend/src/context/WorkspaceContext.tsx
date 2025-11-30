"use client";
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useRef,
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
  fetchConversationDocuments,
  uploadDocumentToConversation,
  getPendingDocuments,
} from "@/lib/api";
import { SearchResult, DocumentStatus } from "@/types/api";

// 1. Exportamos las interfaces para que otros archivos las usen
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  // Añadido para el update
  instructions?: string | null;
  // Conversación por defecto creada al crear un workspace
  default_conversation_id?: string | null;
}

export interface Document {
  id: string;
  file_name: string;
  file_type: string;
  status: DocumentStatus;
  chunk_count: number;
  conversation_id?: string | null;
  suggestion_short?: string | null;
  suggestion_full?: string | null;
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

  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;

  // --- Conversations ---
  conversations: Conversation[];
  isLoadingConversations: boolean;
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  fetchConversations: (workspaceId: string) => Promise<void>;
  createConversation: (
    workspaceId: string,
    title: string,
  ) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  fetchConversationMessages: (workspaceId: string, conversationId: string) => Promise<Message[]>;

  // Conversation documents
  fetchConversationDocuments: (workspaceId: string, conversationId: string) => Promise<Document[]>;
  uploadDocumentToConversation: (
    workspaceId: string,
    conversationId: string,
    formData: FormData,
  ) => Promise<Document>;

  // Model selection
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // --- Funciones CRUD ---
  fetchWorkspaces: () => Promise<void>;
  updateWorkspace: (
    workspaceId: string,
    data: Partial<Workspace>,
  ) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  exportDocumentsToCsv: (workspaceId: string) => Promise<void>;
  exportChatToTxt: (
    workspaceId: string,
    conversationId?: string,
  ) => Promise<void>;
  exportChatToPdf: (
    workspaceId: string,
    conversationId?: string,
  ) => Promise<void>;
  deleteChatHistory: (workspaceId: string) => Promise<void>;
  fulltextSearch: (query: string) => Promise<SearchResult[]>;
}

// 3. Creamos el Contexto
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

// 4. Creamos el "Proveedor"
export function WorkspaceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null,
  );

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Estados para conversaciones
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);

  // Estado para el modelo LLM seleccionado
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [...prev, notification]);
  }, []);

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
  const fetchDocuments = useCallback(async (workspaceId: string) => {
    setIsLoadingDocs(true);
    setErrorDocs(null);
    try {
      const data: Document[] = await fetchWorkspaceDocumentsApi(workspaceId);
      setDocuments(data);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setErrorDocs(errorMessage);
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // --- Optimized polling for processing documents using dedicated endpoint ---
  // Uses /api/v1/workspaces/{workspace_id}/documents/pending instead of fetching all documents
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptRef = useRef(0);
  
  // Exponential backoff configuration
  const INITIAL_POLL_INTERVAL = 3000;  // 3 seconds
  const MAX_POLL_INTERVAL = 30000;     // 30 seconds
  const BACKOFF_MULTIPLIER = 1.5;

  useEffect(() => {
    if (!activeWorkspace) {
      // Clear polling when no workspace
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      pollingAttemptRef.current = 0;
      return;
    }

    // Check if there are any processing documents using the optimized flag
    const hasProcessingDocs = documents.some(
      (doc) => doc.status === "PROCESSING" || doc.status === "PENDING"
    );

    if (!hasProcessingDocs) {
      // Reset polling when all documents are processed
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      pollingAttemptRef.current = 0;
      return;
    }

    // Start polling with exponential backoff
    const pollPendingDocuments = async () => {
      try {
        // Use dedicated pending documents endpoint (more efficient)
        const pendingDocs = await getPendingDocuments(activeWorkspace.id);
        
        if (pendingDocs.length === 0) {
          // All documents processed, refresh the full list once
          await fetchDocuments(activeWorkspace.id);
          pollingAttemptRef.current = 0;
          return;
        }

        // Update only the changed documents in state
        setDocuments((prevDocs) => {
          const updatedDocs = [...prevDocs];
          pendingDocs.forEach((pendingDoc) => {
            const index = updatedDocs.findIndex((d) => d.id === pendingDoc.id);
            if (index !== -1) {
              updatedDocs[index] = pendingDoc as Document;
            }
          });
          return updatedDocs;
        });

        // Schedule next poll with exponential backoff
        const nextInterval = Math.min(
          INITIAL_POLL_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, pollingAttemptRef.current),
          MAX_POLL_INTERVAL
        );
        pollingAttemptRef.current++;
        
        pollingIntervalRef.current = setTimeout(pollPendingDocuments, nextInterval);
      } catch (error) {
        console.error("Error polling pending documents:", error);
        // Retry with backoff even on error
        const nextInterval = Math.min(
          INITIAL_POLL_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, pollingAttemptRef.current),
          MAX_POLL_INTERVAL
        );
        pollingAttemptRef.current++;
        pollingIntervalRef.current = setTimeout(pollPendingDocuments, nextInterval);
      }
    };

    // Initial poll after a short delay
    pollingIntervalRef.current = setTimeout(pollPendingDocuments, INITIAL_POLL_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  // Only depend on activeWorkspace.id and whether there are processing docs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, documents.some((d) => d.status === "PROCESSING" || d.status === "PENDING")]);

  // --- Función para actualizar workspace ---
  const updateWorkspace = useCallback(
    async (workspaceId: string, data: Partial<Workspace>) => {
      try {
        const updatedWorkspace = await updateWorkspaceApi(workspaceId, data);

        // Refrescar la lista de workspaces
        await fetchWorkspaces();

        // Actualizar el workspace activo si es el que se editó
        setActiveWorkspace((current) => {
          if (current?.id === workspaceId) {
            return updatedWorkspace;
          }
          return current;
        });
      } catch (error) {
        console.error("Error al actualizar:", error);
        throw error; // Lanzar error para que el modal lo sepa
      }
    },
    [fetchWorkspaces],
  );

  // --- Función para borrar workspace ---
  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        await deleteWorkspaceApi(workspaceId);

        setActiveWorkspace((current) => {
          if (current?.id === workspaceId) {
            setActiveConversation(null);
            setConversations([]);
            setDocuments([]);
            
            // Redirigir al landing
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
            return null;
          }
          return current;
        });
        await fetchWorkspaces();
      } catch (error) {
        console.error("Error al eliminar:", error);
        throw error; // Lanzar error
      }
    },
    [fetchWorkspaces],
  );

  // --- Función para cargar conversaciones ---
  const fetchConversations = useCallback(async (workspaceId: string) => {
    // Set loading state immediately to prevent flash of empty state
    setIsLoadingConversations(true);
    try {
      const data: Conversation[] = await fetchConversationsApi(workspaceId);
      // Only update conversations after data is fetched (stale data retention)
      setConversations(data);
    } catch (error) {
      console.error("Error al cargar conversaciones:", error);
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // --- Función para crear conversación ---
  const createConversation = useCallback(
    async (workspaceId: string, title: string): Promise<Conversation> => {
      try {
        const newConversation: Conversation = await createConversationApi(
          workspaceId,
          title,
        );

        // Refrescar lista de conversaciones
        await fetchConversations(workspaceId);

        return newConversation;
      } catch (error) {
        console.error("Error al crear conversación:", error);
        throw error;
      }
    },
    [fetchConversations],
  );

  // --- Función para eliminar conversación ---
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      let workspaceId: string | null = null;
      
      setActiveWorkspace((current) => {
        if (current) {
          workspaceId = current.id;
        }
        return current;
      });
      
      if (!workspaceId) return;
      
      try {
        await deleteConversationApi(workspaceId, conversationId);

        setActiveConversation((current) => {
          if (current?.id === conversationId) {
            return null;
          }
          return current;
        });
        
        await fetchConversations(workspaceId);
      } catch (error) {
        console.error("Error al eliminar conversación:", error);
        throw error;
      }
    },
    [fetchConversations],
  );

  // --- Función para cargar mensajes de una conversación ---
  const fetchConversationMessages = useCallback(
    async (workspaceId: string, conversationId: string): Promise<Message[]> => {
      if (!workspaceId) return [];
      try {
        const data: ConversationWithMessages =
          await fetchConversationMessagesApi(
            workspaceId,
            conversationId,
          );
        return data.messages;
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
        return [];
      }
    },
    [],
  );

  // --- Función para cargar documentos de una conversación ---
  const fetchConversationDocumentsCallback = useCallback(
    async (workspaceId: string, conversationId: string): Promise<Document[]> => {
      if (!workspaceId) return [];
      try {
        const data: Document[] = await fetchConversationDocuments({
          workspaceId,
          conversationId,
        });
        return data;
      } catch (error) {
        console.error("Error al cargar documentos de conversación:", error);
        return [];
      }
    },
    [],
  );

  // --- Función para subir documento a una conversación ---
  const uploadDocumentToConversationCallback = useCallback(
    async (workspaceId: string, conversationId: string, formData: FormData): Promise<Document> => {
      if (!workspaceId) throw new Error("No workspace ID provided");
      try {
        const data: Document = await uploadDocumentToConversation(
          workspaceId,
          conversationId,
          formData,
        );
        return data;
      } catch (error) {
        console.error("Error al subir documento a conversación:", error);
        throw error;
      }
    },
    [],
  );

  // --- Función para exportar a CSV ---
  const exportDocumentsToCsv = useCallback(async (workspaceId: string) => {
    try {
      const blob = await exportDocumentsToCsvApi(workspaceId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
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
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al exportar CSV: ${errorMessage}`);
      throw error;
    }
  }, []);

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
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al exportar TXT: ${errorMessage}`);
        throw error;
      }
    },
    [],
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
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al exportar PDF: ${errorMessage}`);
        throw error;
      }
    },
    [],
  );

  // --- Función para borrar historial de chat ---
  const deleteChatHistory = useCallback(async (workspaceId: string) => {
    try {
      await deleteChatHistoryApi(workspaceId);
    } catch (error) {
      console.error("Error al borrar el historial de chat:", error);
      throw error;
    }
  }, []);

  // --- Función para búsqueda de texto completo ---
  const fulltextSearch = useCallback(async (query: string) => {
    try {
      const data = await fulltextSearchApi(query);
      setSearchResults(data);
      return data;
    } catch (error) {
      console.error("Error en la búsqueda de texto completo:", error);
      throw error;
    }
  }, []);

  // --- Función para borrar documento ---
  const deleteDocument = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocumentApi(documentId);

        setActiveWorkspace((current) => {
          if (current) {
            fetchDocuments(current.id); // Refrescar lista de docs
          }
          return current;
        });
      } catch (error) {
        console.error("Error al eliminar:", error);
        throw error; // Lanzar error
      }
    },
    [fetchDocuments],
  );

  // Cargar workspaces al inicio solo si el usuario está autenticado
  useEffect(() => {
    // Solo cargar si hay token (usuario autenticado)
    if (typeof window !== "undefined" && localStorage.getItem("access_token")) {
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

    window.addEventListener("loginSuccess", handleLoginSuccess);
    window.addEventListener("logout", handleLogout);

    return () => {
      window.removeEventListener("loginSuccess", handleLoginSuccess);
      window.removeEventListener("logout", handleLogout);
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
      isLoadingConversations,
      activeConversation,
      setActiveConversation,
      fetchConversations,
      createConversation,
      deleteConversation,
      fetchConversationMessages,
      fetchConversationDocuments: fetchConversationDocumentsCallback,
      uploadDocumentToConversation: uploadDocumentToConversationCallback,
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
    // Only include values that actually change and affect consumers
    // State setters are stable and don't need to be included
    // useCallback functions are stable unless their deps change
    [
      workspaces,
      activeWorkspace,
      documents,
      isLoadingDocs,
      errorDocs,
      notifications,
      searchResults,
      conversations,
      isLoadingConversations,
      activeConversation,
      selectedModel,
      // Callback functions - include only those with changing dependencies
      fetchDocuments,
      addNotification,
      fetchConversations,
      createConversation,
      deleteConversation,
      fetchConversationMessages,
      fetchConversationDocumentsCallback,
      uploadDocumentToConversationCallback,
      fetchWorkspaces,
      updateWorkspace,
      deleteWorkspace,
      deleteDocument,
      exportDocumentsToCsv,
      exportChatToTxt,
      exportChatToPdf,
      deleteChatHistory,
      fulltextSearch,
    ],
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
      "useWorkspaces debe ser usado dentro de un WorkspaceProvider",
    );
  }
  return context;
}
