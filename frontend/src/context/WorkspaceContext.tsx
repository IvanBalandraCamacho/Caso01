"use client";
// AÑADIDO: useCallback
import { createContext, useState, useContext, ReactNode, useMemo, useCallback } from "react"; 

// 1. Exportamos las interfaces para que otros archivos las usen
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

export interface Document {
  id: string;
  file_name: string;
  file_type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  chunk_count: number;
}

// 2. Definimos la forma del contexto (con documentos)
interface WorkspaceContextType {
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  
  // AÑADIDO: Estado de documentos
  documents: Document[];
  isLoadingDocs: boolean;
  errorDocs: string | null;
  fetchDocuments: (workspaceId: string) => Promise<void>;
}

// 3. Creamos el Contexto
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// 4. Creamos el "Proveedor"
export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  
  // AÑADIDO: Estado de documentos movido aquí
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);

  // AÑADIDO: Lógica de fetch movida aquí y envuelta en useCallback
  const fetchDocuments = useCallback(async (workspaceId: string) => {
    setIsLoadingDocs(true);
    setErrorDocs(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/documents`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar los documentos");
      }
      const data: Document[] = await response.json();
      setDocuments(data);
    } catch (error: any) {
      console.error("Error al cargar documentos:", error);
      setErrorDocs(error.message || "Error desconocido");
      setDocuments([]); // Limpiar en caso de error
    } finally {
      setIsLoadingDocs(false);
    }
  }, []); // useCallback con array vacío

  // Memoizamos el valor del contexto
  const contextValue = useMemo(() => ({
    workspaces,
    setWorkspaces,
    activeWorkspace,
    setActiveWorkspace,
    documents,
    isLoadingDocs,
    errorDocs,
    fetchDocuments
  }), [
    workspaces, 
    activeWorkspace, 
    documents, 
    isLoadingDocs, 
    errorDocs, 
    fetchDocuments // 'fetchDocuments' es estable gracias a useCallback
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