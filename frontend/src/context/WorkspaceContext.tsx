"use client";
// AÑADIDO: Importar 'useMemo'
import { createContext, useState, useContext, ReactNode, useMemo } from "react"; 

// 1. Definimos el tipo para nuestro workspace
interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

// 2. Definimos la forma del contexto
interface WorkspaceContextType {
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
}

// 3. Creamos el Contexto con un valor por defecto
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// 4. Creamos el "Proveedor" que envolverá nuestra app
// --- CORRECCIÓN 1: Props marcadas como Readonly ---
export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // --- CORRECCIÓN 2: Estabilizar el valor del context con useMemo ---
  // Esto arregla la advertencia crítica y el bug funcional
  const contextValue = useMemo(() => ({
    workspaces,
    setWorkspaces,
    activeWorkspace,
    setActiveWorkspace
  }), [workspaces, activeWorkspace]); // El valor solo cambia si estas dependencias cambian
  // -----------------------------------------------------------

  return (
    // Usamos el valor memoizado
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// 5. Creamos un "Hook" personalizado para usar el contexto fácilmente
export function useWorkspaces() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspaces debe ser usado dentro de un WorkspaceProvider");
  }
  return context;
}