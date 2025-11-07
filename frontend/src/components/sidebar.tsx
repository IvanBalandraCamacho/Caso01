"use client";
import { useEffect, useState } from "react";
import { Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspaces } from "@/context/WorkspaceContext"; // Importar hook
import { cn } from "@/lib/utils"; // Importar cn

export function Sidebar() {
  
  // Usamos el contexto global
  const { 
    workspaces, 
    setWorkspaces, 
    activeWorkspace, 
    setActiveWorkspace 
  } = useWorkspaces();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // --- CORRECCIÓN: useEffect para cargar datos (se ejecuta 1 vez) ---
  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}/api/v1/workspaces`);
        
        if (!response.ok) {
          throw new Error("No se pudieron cargar los workspaces");
        }
        
        const data = await response.json();
        setWorkspaces(data); // Guardar en contexto global
        
      } catch (error) {
        console.error("Error al cargar workspaces:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
    setIsClient(true);
    
    // El array vacío [] asegura que esto se ejecute solo una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- CORRECCIÓN: useEffect para establecer el workspace por defecto ---
  // Este hook se ejecuta *después* de que 'workspaces' se haya cargado
  useEffect(() => {
    // Si ya tenemos un workspace activo, no hacemos nada
    if (activeWorkspace) {
      return;
    }

    // Si la lista de workspaces tiene elementos y no hay uno activo,
    // seleccionamos el primero.
    if (workspaces.length > 0 && !activeWorkspace) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [workspaces, activeWorkspace, setActiveWorkspace]); // Depende de estos valores

  return (
    <aside className="w-72 bg-brand-dark-secondary flex flex-col p-4 border-r border-gray-800/50">
      {/* ... (La parte superior no cambia: TIVIT, Velvet, Select, New Conversation) ... */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-light">TIVIT</h1>
      </div>

      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-light">Velvet</h1>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="relative mt-2">
          {isClient ? (
            <Select defaultValue="gemini">
              <SelectTrigger className="w-full bg-black/30 border border-gray-700 text-sm text-gray-300 focus:ring-2 focus:ring-brand-red focus:border-brand-red">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-brand-dark-secondary border-gray-700 text-gray-300">
                <SelectItem value="gpt4">GPT-4o</SelectItem>
                <SelectItem value="llama3">Llama 3</SelectItem>
                <SelectItem value="gemini">Gemini 1.5</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 w-full rounded-md border border-gray-700 bg-black/30" />
          )}
        </div>

      </div>

      <Button className="w-full bg-brand-red text-white hover:bg-red-700 font-medium">
        <Plus className="mr-2 h-4 w-4" />
        New Conversation
      </Button>
      {/* ... (Fin de la parte superior) ... */}

      <nav className="flex flex-col space-y-6 mt-8">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Workspace
          </h2>
          
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-gray-400 text-sm">Cargando...</p>
            ) : (
              workspaces.map((ws) => (
                // --- CORRECCIÓN: Usamos <button> para la acción de clic ---
                <button 
                  key={ws.id} 
                  className={cn(
                    "block w-full text-left text-gray-300 hover:text-white transition-colors p-1 rounded",
                    // Comprobamos si el 'activeWorkspace' existe y si su 'id' coincide
                    activeWorkspace && activeWorkspace.id === ws.id && "bg-brand-red/20 text-white" 
                  )}
                  onClick={() => setActiveWorkspace(ws)} // <-- Cambia el workspace activo
                >
                  {ws.name}
                </button>
              ))
            )}
            {!isLoading && workspaces.length === 0 && (
              <p className="text-gray-400 text-sm">No hay workspaces.</p>
            )}
          </div>

        </div>
        
        <Separator className="bg-gray-800/50" />
        
        {/* ... (La sección "Your Conversations" no cambia) ... */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Your Conversations
          </h2>
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-2">
              <a className="block text-gray-400 hover:text-white transition-colors text-sm truncate" href="/">
                Análisis de la propuesta Q4...
              </a>
              <a className="block text-gray-400 hover:text-white transition-colors text-sm truncate" href="/">
                Resumen de métricas de Helpdesk
              </a>
            </div>
          </ScrollArea>
        </div>
      </nav>
    </aside>
  );
}