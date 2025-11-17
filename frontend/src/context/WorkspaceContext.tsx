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
import io, { Socket } from "socket.io-client";

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

  // --- Funciones CRUD ---
  fetchWorkspaces: () => Promise<void>;
  updateWorkspace: (
    workspaceId: string,
    data: Partial<Workspace>
  ) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  exportDocumentsToCsv: (workspaceId: string) => Promise<void>;
  exportChatToTxt: (workspaceId: string) => Promise<void>;
  exportChatToPdf: (workspaceId: string) => Promise<void>;
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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [...prev, notification]);
  };

  // --- WebSocket connection ---
  useEffect(() => {
    if (activeWorkspace) {
      const socket: Socket = io(`${apiUrl}/ws/v1/workspaces/${activeWorkspace.id}`);

      socket.on("connect", () => {
        console.log("Connected to WebSocket");
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from WebSocket");
      });

      socket.on("notification", (data: Notification) => {
        addNotification(data);
        if (data.type === "success") {
          fetchDocuments(activeWorkspace.id);
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [activeWorkspace, apiUrl]);

  // --- Función para cargar workspaces ---
  const fetchWorkspaces = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/api/v1/workspaces`);
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
          `${apiUrl}/api/v1/workspaces/${workspaceId}/documents`
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

  // --- Función para actualizar workspace ---
  const updateWorkspace = useCallback(
    async (workspaceId: string, data: Partial<Workspace>) => {
      if (!apiUrl) return;
      try {
        const response = await fetch(
          `${apiUrl}/api/v1/workspaces/${workspaceId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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
          `${apiUrl}/api/v1/workspaces/${workspaceId}`,
          {
            method: "DELETE",
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

  // --- Función para exportar a CSV ---
  const exportDocumentsToCsv = useCallback(
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        console.log('Exportando documentos a CSV...');
        const response = await fetch(
          `${apiUrl}/api/v1/workspaces/${workspaceId}/documents/export-csv`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`No se pudo exportar a CSV: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('Blob recibido:', blob.size, 'bytes');
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `documents_${workspaceId}.csv`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ CSV descargado exitosamente');
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
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        console.log('Exportando chat a TXT...');
        const response = await fetch(
          `${apiUrl}/api/v1/workspaces/${workspaceId}/chat/export/txt`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`No se pudo exportar a TXT: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('Blob recibido:', blob.size, 'bytes');
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${workspaceId}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ TXT descargado exitosamente');
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
    async (workspaceId: string) => {
      if (!apiUrl) return;
      try {
        console.log('Exportando chat a PDF...');
        const response = await fetch(
          `${apiUrl}/api/v1/workspaces/${workspaceId}/chat/export/pdf`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`No se pudo exportar a PDF: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('Blob recibido:', blob.size, 'bytes');
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${workspaceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ PDF descargado exitosamente');
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
          `${apiUrl}/api/v1/workspaces/${workspaceId}/chat/history`,
          {
            method: "DELETE",
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
          `${apiUrl}/api/v1/workspaces/fulltext-search?query=${query}`
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
          `${apiUrl}/api/v1/documents/${documentId}`,
          {
            method: "DELETE",
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

  // Efecto para setear el primer workspace como activo
  useEffect(() => {
    if (!activeWorkspace && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [workspaces, activeWorkspace]);

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
      fetchWorkspaces,
      updateWorkspace,
      deleteWorkspace,
      deleteDocument,
      exportDocumentsToCsv,
      exportChatToTxt,
      exportChatToPdf,
      deleteChatHistory,
      fulltextSearch,
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
      fetchWorkspaces,
      updateWorkspace,
      deleteWorkspace,
      deleteDocument,
      exportDocumentsToCsv,
      exportChatToTxt,
      exportChatToPdf,
      deleteChatHistory,
      fulltextSearch,
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
