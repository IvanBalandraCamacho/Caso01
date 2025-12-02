"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { Loader2 } from "lucide-react";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const conversationId = params.conversationId as string;
  
  const { 
    workspaces, 
    conversations,
    isLoadingConversations,
    conversationsLoadedForWorkspace,
    activeWorkspace, 
    setActiveWorkspace,
    activeConversation,
    setActiveConversation,
    fetchWorkspaces,
  } = useWorkspaces();

  const [notFound, setNotFound] = useState(false);
  const hasInitialized = useRef(false);
  const hasSetWorkspace = useRef(false);

  // Cargar workspaces si no están cargados (acceso directo por URL)
  useEffect(() => {
    if (workspaces.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchWorkspaces();
    }
  }, [workspaces.length, fetchWorkspaces]);

  // Reset ref when workspaceId changes
  useEffect(() => {
    hasSetWorkspace.current = false;
  }, [workspaceId]);

  // Establecer workspace activo - el contexto auto-carga conversaciones
  useEffect(() => {
    if (workspaces.length === 0) return;
    // Don't re-set if we already set it for this workspace
    if (hasSetWorkspace.current) return;

    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
      setNotFound(true);
      return;
    }

    hasSetWorkspace.current = true;
    setActiveWorkspace(workspace);
    setNotFound(false);
  }, [workspaceId, workspaces, setActiveWorkspace]);

  // Establecer conversación activa cuando las conversaciones estén cargadas para ESTE workspace
  useEffect(() => {
    if (isLoadingConversations) return;
    if (conversationsLoadedForWorkspace !== workspaceId) return;

    if (conversations.length === 0) {
      setNotFound(true);
      return;
    }

    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      if (activeConversation?.id !== conversationId) {
        setActiveConversation(conversation);
      }
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }, [conversationId, conversations, isLoadingConversations, conversationsLoadedForWorkspace, workspaceId, activeConversation?.id, setActiveConversation]);

  // Redirigir si workspace fue eliminado
  useEffect(() => {
    if (workspaces.length > 0 && !workspaces.find(ws => ws.id === workspaceId)) {
      router.push('/');
    }
  }, [workspaces, workspaceId, router]);

  // Estados para el área de contenido (no afecta al sidebar)
  const isContentLoading = workspaces.length === 0 || 
                           isLoadingConversations || 
                           conversationsLoadedForWorkspace !== workspaceId;

  const showNotFound = notFound && !isContentLoading;

  // Contenido del área principal
  const renderContent = () => {
    if (showNotFound) {
      return (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-muted-foreground mb-4">Conversación no encontrada</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    if (isContentLoading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando conversación...</p>
          </div>
        </div>
      );
    }

    return <ChatArea />;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      {renderContent()}
    </div>
  );
}
