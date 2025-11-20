"use client";
import { useEffect, useState } from "react";
import { Settings, Plus, MoreVertical, PanelLeftClose, PanelLeftOpen, Search, MessageSquare, LayoutGrid } from "lucide-react";
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
import { useWorkspaces, Workspace, Conversation } from "@/context/WorkspaceContext";
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
    conversations,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    createConversation,
    deleteConversation,
    fulltextSearch,
    fetchWorkspaces,
    selectedModel,
    setSelectedModel,
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  // React Query delete mutation
  const deleteWorkspaceMutation = useDeleteWorkspace();

  useEffect(() => {
    if (workspaces.length > 0 || !activeWorkspace) {
      setIsLoading(false);
    }
    setIsClient(true);
  }, [workspaces, activeWorkspace]);

  // Cargar conversaciones cuando cambia el workspace activo
  useEffect(() => {
    if (activeWorkspace) {
      fetchConversations(activeWorkspace.id);
    }
  }, [activeWorkspace, fetchConversations]);

  // Debug: Log cuando cambia el modelo seleccionado
  useEffect(() => {
    console.log("Sidebar: selectedModel actualizado a:", selectedModel);
  }, [selectedModel]);

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

  const handleNewConversation = async () => {
    if (!activeWorkspace) {
      alert("Por favor, selecciona un workspace primero");
      return;
    }
    try {
      const newConv = await createConversation(
        activeWorkspace.id,
        "Nueva Conversación"
      );
      setActiveConversation(newConv);
    } catch (error) {
      console.error("Error al crear conversación:", error);
      alert("Error al crear la conversación");
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (confirm("¿Estas seguro de eliminar esta conversación?")) {
      try {
        await deleteConversation(convId);
      } catch (error) {
        console.error("Error al eliminar conversación:", error);
      }
    }
  };

  return (
    <>
      <aside className={cn(
        "bg-popover border-r border-border flex flex-col transition-all duration-300 h-full",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <div className="p-4 flex items-center justify-between">
          {!isCollapsed && (
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">V</div>
                <h1 className="text-lg font-bold text-foreground tracking-tight">Velvet</h1>
             </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("text-muted-foreground hover:text-foreground", isCollapsed && "mx-auto")}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </div>

        <div className="px-3 mb-4">
           <Button 
             className={cn(
               "w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm transition-all",
               isCollapsed ? "px-0 justify-center" : "justify-start"
             )}
             onClick={handleNewConversation}
             disabled={!activeWorkspace}
             title="New Conversation"
           >
             <Plus className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
             {!isCollapsed && "New Chat"}
           </Button>
        </div>

        {!isCollapsed && (
          <div className="px-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-full bg-card border-input pl-9 h-9 text-sm focus-visible:ring-primary"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-6">
            {/* Workspaces */}
            <div>
              {!isCollapsed && (
                <div className="flex items-center justify-between mb-2 px-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Workspaces
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {workspaces.map((ws) => (
                  <div key={ws.id} className="group relative">
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-sm",
                        activeWorkspace?.id === ws.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        isCollapsed && "justify-center"
                      )}
                      onClick={() => setActiveWorkspace(ws)}
                      title={ws.name}
                    >
                      <LayoutGrid className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">{ws.name}</span>}
                    </button>
                    
                    {!isCollapsed && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(ws)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(ws.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Conversations */}
            <div>
              {!isCollapsed && (
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  History
                </h2>
              )}
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div key={conv.id} className="group relative">
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-sm",
                        activeConversation?.id === conv.id 
                          ? "bg-accent text-foreground font-medium" 
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        isCollapsed && "justify-center"
                      )}
                      onClick={() => setActiveConversation(conv)}
                      title={conv.title}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="truncate">{conv.title}</span>}
                    </button>
                    
                    {!isCollapsed && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteConversation(conv.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
             <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                <Settings className="h-4 w-4" />
                Settings
             </Button>
          </div>
        )}
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
