"use client";
import { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from "react"; 

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

  // --- Funciones CRUD ---
  fetchWorkspaces: () => Promise<void>; 
  updateWorkspace: (workspaceId: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
}

// 3. Creamos el Contexto
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// 4. Creamos el "Proveedor"
export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // --- Función para cargar workspaces ---
  const fetchWorkspaces = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/api/v1/workspaces`);
      if (!response.ok) throw new Error("No se pudieron cargar los workspaces");
      const data = await response.json();
      setWorkspaces(data);
    } catch (error) {
      console.error("Error al cargar workspaces:", error);
    }
  }, [apiUrl]);

  // --- Función para cargar documentos ---
  const fetchDocuments = useCallback(async (workspaceId: string) => {
    if (!apiUrl) return;
    setIsLoadingDocs(true);
    setErrorDocs(null);
    try {
      const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/documents`);
      if (!response.ok) throw new Error("No se pudieron cargar los documentos");
      const data: Document[] = await response.json();
      setDocuments(data);
    } catch (error: any) {
      console.error("Error al cargar documentos:", error);
      setErrorDocs(error.message || "Error desconocido");
      setDocuments([]); 
    } finally {
      setIsLoadingDocs(false);
    }
  }, [apiUrl]); 

  // --- Función para actualizar workspace ---
  const updateWorkspace = useCallback(async (workspaceId: string, data: Partial<Workspace>) => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Error al actualizar el workspace");
      
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
  }, [apiUrl, fetchWorkspaces, activeWorkspace]);

  // --- Función para borrar workspace ---
  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error("Error al eliminar el workspace");
      
      if (activeWorkspace?.id === workspaceId) {
        setActiveWorkspace(null);
      }
      await fetchWorkspaces(); 
    } catch (error) {
      console.error("Error al eliminar:", error);
      throw error; // Lanzar error
    }
  }, [apiUrl, fetchWorkspaces, activeWorkspace]);

  // --- Función para borrar documento ---
  const deleteDocument = useCallback(async (documentId: string) => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/api/v1/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error("Error al eliminar el documento");
      
      if (activeWorkspace) {
        await fetchDocuments(activeWorkspace.id); // Refrescar lista de docs
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      throw error; // Lanzar error
    }
  }, [apiUrl, activeWorkspace, fetchDocuments]);

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

  const contextValue = useMemo(() => ({
    workspaces,
    setWorkspaces,
    activeWorkspace,
    setActiveWorkspace,
    documents,
    isLoadingDocs,
    errorDocs,
    fetchDocuments,
    fetchWorkspaces,
    updateWorkspace,
    deleteWorkspace,
    deleteDocument
  }), [
    workspaces, 
    activeWorkspace, 
    documents, 
    isLoadingDocs, 
    errorDocs, 
    fetchDocuments, 
    fetchWorkspaces, 
    updateWorkspace, 
    deleteWorkspace, 
    deleteDocument
  ]);

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
    throw new Error("useWorkspaces debe ser usado dentro de un WorkspaceProvider");
  }
  return context;
}