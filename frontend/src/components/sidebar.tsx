"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Plus, MoreVertical, PanelLeftClose, PanelLeftOpen, Search, MessageSquare, LayoutGrid, Sparkles } from "lucide-react";
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
import ProposalModal from "./ProposalModal";
import { UserMenu } from "./UserMenu";
import { updateConversationApi } from "@/lib/api";

export function Sidebar() {
  const router = useRouter();
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
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState("");

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
    } else {
      // Limpiar conversaciones si no hay workspace activo
      setActiveConversation(null);
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
        "Nueva conversación"
      );
      // Navegar a la nueva conversación
      router.push(`/p/${activeWorkspace.id}/c/${newConv.id}`);
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

  const startEditingConversation = (conv: Conversation) => {
    setEditingConversationId(conv.id);
    setEditingConversationTitle(conv.title);
  };

  const saveConversationTitle = async (convId: string) => {
    if (!activeWorkspace || !editingConversationTitle.trim()) {
      setEditingConversationId(null);
      return;
    }

    try {
      await updateConversationApi(activeWorkspace.id, convId, {
        title: editingConversationTitle.trim()
      });
      await fetchConversations(activeWorkspace.id);
      setEditingConversationId(null);
    } catch (error) {
      console.error("Error al actualizar título:", error);
    }
  };

  const cancelEditingConversation = () => {
    setEditingConversationId(null);
    setEditingConversationTitle("");
  };

  // Filtrar workspaces basado en búsqueda
  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase())
  );

  return (
    <>
      <aside className={cn(
        "border-r border-border flex flex-col transition-all duration-300 h-full",
        isCollapsed ? "w-20" : "w-72"
      )} style={{ backgroundColor: '#282A2C', color: '#ffffff' }}>
        <div className="p-4 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push('/')} title="Ir al Dashboard">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">V</div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>Velvet</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("hover:text-foreground", isCollapsed && "mx-auto")}
            style={{ color: '#9CA3AF' }}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </div>

        <div className="px-3 mb-4">
          <Button
            className={cn(
              "w-full bg-primary/50 text-primary-foreground hover:bg-primary/90 font-medium shadow-sm transition-all rounded-xl",
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

        {/* Botón Generar Propuesta */}
        <div className="px-3 mb-4">
          <Button
            className={cn(
              "w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-medium shadow-md transition-all rounded-xl",
              isCollapsed ? "px-0 justify-center" : "justify-start"
            )}
            onClick={() => setShowProposalModal(true)}
            title="Generar Propuesta"
          >
            <Sparkles className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
            {!isCollapsed && "🚀 Generar Propuesta"}
          </Button>
        </div>

        {/* Selector de Modelo de IA */}
        {!isCollapsed && (
          <div className="px-3 mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#9CA3AF' }}>
              AI Model
            </label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full h-9 text-sm" style={{ backgroundColor: '#1F2123', color: '#ffffff', borderColor: '#374151' }}>
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#1F2123', borderColor: '#374151' }}>
                <SelectItem value="gpt-4o-mini" style={{ color: '#ffffff' }}>GPT-4o Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isCollapsed && (
          <div className="px-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
              <Input
                className="w-full border-input pl-9 h-9 text-sm focus-visible:ring-primary rounded-xl"
                style={{ backgroundColor: '#1F2123', color: '#ffffff', borderColor: '#374151' }}
                placeholder="Search workspaces..."
                value={workspaceSearchQuery}
                onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4">
            {/* Workspaces */}
            <div>
              {!isCollapsed && (
                <div className="flex items-center justify-between mb-2 px-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#B0B5BA' }}>
                    Workspaces
                  </h2>
                  <button
                    className="h-5 w-5 rounded-md hover:bg-primary/20 flex justify-center items-center transition-colors duration-300"
                    onClick={() => setIsAddModalOpen(true)}

                  >

                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}

              <ScrollArea className="h-[180px]">
                <div className="space-y-1 pr-2">
                  {filteredWorkspaces.map((ws) => (
                    <div key={ws.id} className="group relative">
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-sm",
                          activeWorkspace?.id === ws.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent",
                          isCollapsed && "justify-center"
                        )}
                        style={activeWorkspace?.id !== ws.id ? { color: '#D1D5DB' } : undefined}
                        onClick={() => router.push(`/p/${ws.id}`)}
                        title={ws.name}
                      >
                        <LayoutGrid className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="truncate max-w-[180px]">{ws.name}</span>}
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
              </ScrollArea>
            </div>

            {/* Conversations */}
            <div>
              {!isCollapsed && (
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: '#B0B5BA' }}>
                  History
                </h2>
              )}
              <ScrollArea className="h-[200px]">
                <div className="space-y-1 pr-2">
                  {conversations.map((conv) => (
                    <div key={conv.id} className="group relative">
                      {editingConversationId === conv.id ? (
                        <div className="flex items-center gap-1 p-2">
                          <input
                            type="text"
                            value={editingConversationTitle}
                            onChange={(e) => setEditingConversationTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveConversationTitle(conv.id);
                              if (e.key === 'Escape') cancelEditingConversation();
                            }}
                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-500 hover:text-green-400"
                            onClick={() => saveConversationTitle(conv.id)}
                          >
                            ✓
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-400"
                            onClick={cancelEditingConversation}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-sm pr-8",
                              activeConversation?.id === conv.id
                                ? "bg-accent font-medium"
                                : "hover:bg-accent/50",
                              isCollapsed && "justify-center"
                            )}
                            style={activeConversation?.id === conv.id ? { color: '#ffffff' } : { color: '#D1D5DB' }}
                            onClick={() => router.push(`/p/${activeWorkspace?.id}/c/${conv.id}`)}
                            title={conv.title}
                          >
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span className="truncate max-w-[150px]">{conv.title}</span>}
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
                                  <DropdownMenuItem onClick={() => startEditingConversation(conv)}>
                                    Editar nombre
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteConversation(conv.id)}>
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        {/* User Menu at the bottom */}
        <div className="p-3 border-t border-gray-700 shrink-0">
          <UserMenu size="md" showName={!isCollapsed} />
        </div>

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

      <ProposalModal
        open={showProposalModal}
        onClose={() => setShowProposalModal(false)}
      />
    </>
  );
}
