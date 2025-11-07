"use client";
import { useState, useEffect } from "react"; // <-- AÑADIDO: Hooks de React
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

// --- AÑADIDO: Definimos un tipo para los datos del workspace ---
interface Workspace {
  id: string;
  name: string;
  description: string | null;
}
// -----------------------------------------------------------

export function Sidebar() {
  
  // --- AÑADIDO: Estado para almacenar los workspaces ---
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ----------------------------------------------------

  // --- AÑADIDO: Hook para cargar datos al montar el componente ---
  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        // Usamos la variable de entorno que definimos en docker-compose
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}/api/v1/workspaces`);
        
        if (!response.ok) {
          throw new Error("No se pudieron cargar los workspaces");
        }
        
        const data: Workspace[] = await response.json();
        setWorkspaces(data);
      } catch (error) {
        console.error("Error al cargar workspaces:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, []); // El array vacío [] asegura que esto se ejecute solo una vez
  // -----------------------------------------------------------

  return (
    <aside className="w-72 bg-brand-dark-secondary flex flex-col p-4 border-r border-gray-800/50">
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
        </div>
      </div>

      <Button className="w-full bg-brand-red text-white hover:bg-red-700 font-medium">
        <Plus className="mr-2 h-4 w-4" />
        New Conversation
      </Button>

      <nav className="flex flex-col space-y-6 mt-8">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Workspace
          </h2>
          
          {/* --- MODIFICADO: Lista dinámica de Workspaces --- */}
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-gray-400 text-sm">Cargando...</p>
            ) : (
              workspaces.map((ws) => (
                <a 
                  key={ws.id} 
                  className="block text-gray-300 hover:text-white transition-colors" 
                  href={`/`} // Por ahora, el href es "/"
                >
                  {ws.name}
                </a>
              ))
            )}
            {!isLoading && workspaces.length === 0 && (
              <p className="text-gray-400 text-sm">No hay workspaces.</p>
            )}
          </div>
          {/* ------------------------------------------------- */}

        </div>
        
        <Separator className="bg-gray-800/50" />
        
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