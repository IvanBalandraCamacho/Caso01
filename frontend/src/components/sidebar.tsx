"use client";
import { useEffect, useState } from "react";
import { Settings, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspaces, Workspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import { EditWorkspaceModal } from "./EditWorkspaceModal";
import { AddWorkspaceModal } from "./AddWorkspaceModal";
import { useDeleteWorkspace } from "@/hooks/useApi";
import Image from "next/image";

export function Sidebar() {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    fulltextSearch,
    fetchWorkspaces,
  } = useWorkspaces();

  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // React Query delete mutation
  const deleteWorkspaceMutation = useDeleteWorkspace();

  useEffect(() => {
    if (workspaces.length > 0 || !activeWorkspace) {
      setIsLoading(false);
    }
    setIsClient(true);
  }, [workspaces, activeWorkspace]);

  const openEditModal = (workspace: Workspace) => {
    setWorkspaceToEdit(workspace);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setWorkspaceToEdit(null);
    setIsEditModalOpen(false);
  };

  const handleDelete = async (workspaceId: string) => {
    if (
      confirm(
        "¿Estás seguro de que quieres eliminar este workspace? Esta acción es irreversible."
      )
    ) {
      try {
        await deleteWorkspaceMutation.mutateAsync(workspaceId);
        // Refrescar la lista después de eliminar
        await fetchWorkspaces();
      } catch (error) {
        console.error("Error al eliminar workspace", error);
        alert("Error al eliminar el workspace. Intenta nuevamente.");
      }
    }
  };

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const results = await fulltextSearch(searchQuery);
      setSearchResults(results);
    }
  };

  return (
    <>
      <aside className="w-72 bg-brand-dark-secondary flex flex-col p-4 border-r border-gray-800/50">
        {/* Header: Logo */}
        <div className="mb-8 flex items-center justify-center">
          <Image 
            src="/logo.svg" 
            alt="Logo de la empresa" 
            width={600} 
            height={152}
            className="w-full h-auto max-w-[250px]"
            priority
          />
        </div>

        {/* Header: Velvet y Modelo */}
        <div className="flex flex-col mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-brand-light">Velvet</h1>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
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

        {/* Nueva Conversación */}
        <Button 
          className="w-full bg-brand-red text-white hover:bg-red-700 font-medium"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>

        {/* Global Search */}
        <div className="mt-4">
          <Input
            className="w-full bg-transparent border border-gray-700 rounded-lg py-2 pl-4 pr-10 focus-visible:ring-brand-red text-gray-300 placeholder-gray-500"
            placeholder="Search all documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Navegación */}
        <nav className="flex flex-col space-y-6 mt-8">
          {/* Workspaces */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Workspace
            </h2>

            <div className="space-y-2">
              {isLoading && workspaces.length === 0 ? (
                <p className="text-gray-400 text-sm">Cargando...</p>
              ) : (
                workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="flex items-center justify-between group"
                  >
                    <button
                      className={cn(
                        "flex-1 text-left text-gray-300 hover:text-white transition-colors p-1 rounded truncate",
                        activeWorkspace &&
                          activeWorkspace.id === ws.id &&
                          "bg-brand-red/20 text-white"
                      )}
                      onClick={() => setActiveWorkspace(ws)}
                    >
                      {ws.name}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-brand-dark-secondary border-gray-700 text-gray-300">
                        <DropdownMenuItem onClick={() => openEditModal(ws)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => handleDelete(ws.id)}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
              {!isLoading && workspaces.length === 0 && (
                <p className="text-gray-400 text-sm">No hay workspaces.</p>
              )}
            </div>
          </div>

          <Separator className="bg-gray-800/50" />

          {/* Conversaciones */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Your Conversations
            </h2>
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-2">
                {/* Ejemplo estático */}
                <a
                  className="block text-gray-400 hover:text-white transition-colors text-sm truncate"
                  href="/"
                >
                  Análisis de la propuesta Q4...
                </a>
                <a
                  className="block text-gray-400 hover:text-white transition-colors text-sm truncate"
                  href="/"
                >
                  Resumen de métricas de Helpdesk
                </a>
              </div>
            </ScrollArea>
          </div>
        </nav>
      </aside>

      {workspaceToEdit && (
        <EditWorkspaceModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          workspace={workspaceToEdit}
        />
      )}

      <AddWorkspaceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchWorkspaces}
      />
    </>
  );
}
