"use client";

import { useWorkspaces } from "@/context/WorkspaceContext";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Calendar, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ConversationsListView() {
  const { 
    activeWorkspace, 
    conversations,
    isLoadingConversations,
    createConversation,
    deleteConversation,
    setActiveConversation 
  } = useWorkspaces();
  const router = useRouter();
  const [deleteConvConfirm, setDeleteConvConfirm] = useState<string | null>(null);

  const handleNewConversation = async () => {
    if (!activeWorkspace) return;
    
    try {
      const newConv = await createConversation(
        activeWorkspace.id,
        "Nueva conversación"
      );
      setActiveConversation(newConv);
      router.push(`/p/${activeWorkspace.id}/c/${newConv.id}`);
    } catch (error) {
      console.error("Error al crear conversación:", error);
    }
  };

  const handleConversationClick = (convId: string) => {
    if (!activeWorkspace) return;
    
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
      setActiveConversation(conv);
      router.push(`/p/${activeWorkspace.id}/c/${convId}`);
    }
  };

  const handleDeleteClick = (convId: string) => {
    setDeleteConvConfirm(convId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConvConfirm || !activeWorkspace) return;
    
    try {
      await deleteConversation(deleteConvConfirm);
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
    } finally {
      setDeleteConvConfirm(null);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Selecciona un workspace</h2>
          <p className="text-muted-foreground">Elige un workspace para ver tus conversaciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{activeWorkspace.name}</h1>
          <Button onClick={handleNewConversation} className="gap-2" disabled={isLoadingConversations}>
            <Plus className="h-4 w-4" />
            Nueva Conversación
          </Button>
        </div>
        <p className="text-muted-foreground">
          {isLoadingConversations 
            ? "Cargando conversaciones..." 
            : `${conversations.length} ${conversations.length === 1 ? 'conversación' : 'conversaciones'}`
          }
        </p>
      </div>

      {/* Conversations Grid */}
      <ScrollArea className="flex-1 p-6">
        {/* Loading State - Priority over empty state */}
        {isLoadingConversations ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Cargando conversaciones...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No hay conversaciones</h3>
            <p className="text-muted-foreground mb-4">Crea una nueva conversación para comenzar</p>
            <Button onClick={handleNewConversation} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Conversación
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group relative border border-border rounded-lg p-4 hover:border-primary transition-all cursor-pointer bg-card"
                onClick={() => handleConversationClick(conv.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold truncate max-w-[200px]">{conv.title}</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(conv.created_at).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}</span>
                </div>

                {conv.updated_at && conv.updated_at !== conv.created_at && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Actualizado: {new Date(conv.updated_at).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteConvConfirm}
        onOpenChange={(open) => !open && setDeleteConvConfirm(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar conversación"
        description="¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer."
        variant="destructive"
      />
    </div>
  );
}
