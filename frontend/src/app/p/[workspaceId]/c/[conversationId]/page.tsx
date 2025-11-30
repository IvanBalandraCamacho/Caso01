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
    activeWorkspace, 
    setActiveWorkspace,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    fetchWorkspaces
  } = useWorkspaces();

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const hasInitialized = useRef(false);

  // Cargar workspaces si no están cargados
  useEffect(() => {
    if (workspaces.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchWorkspaces();
    }
  }, [workspaces.length, fetchWorkspaces]);

  // Redirigir inmediatamente si el workspace activo fue eliminado
  useEffect(() => {
    // Si ya se cargaron workspaces y el workspace actual no existe, redirigir
    if (workspaces.length > 0 && !workspaces.find(ws => ws.id === workspaceId)) {
      router.push('/');
      return;
    }
    
    // Si el activeWorkspace es null (fue eliminado), redirigir
    if (activeWorkspace === null && workspaces.length > 0) {
      router.push('/');
      return;
    }
  }, [workspaces, workspaceId, activeWorkspace, router]);

  // Manejar workspace y conversación
  useEffect(() => {
    // Si no hay workspaces todavía, esperar
    if (workspaces.length === 0) {
      setIsLoading(true);
      return;
    }

    // Verificar que el workspace existe
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // Establecer workspace activo si es diferente
    if (activeWorkspace?.id !== workspaceId) {
      setActiveWorkspace(workspace);
      fetchConversations(workspaceId);
      return; // Esperar a que se carguen las conversaciones
    }

    // Si ya tenemos el workspace correcto pero las conversaciones están cargando, esperar
    if (isLoadingConversations) {
      setIsLoading(true);
      return;
    }

    // Si ya tenemos el workspace correcto pero no hay conversaciones (empty state real), mostrar not found
    if (conversations.length === 0) {
      // Wait a bit more - conversations might still be loading
      setIsLoading(true);
      return;
    }

    // Verificar que la conversación existe
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // Establecer conversación activa si es diferente
    if (activeConversation?.id !== conversationId) {
      setActiveConversation(conversation);
    }

    // Todo está listo
    setIsLoading(false);
    setNotFound(false);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, conversationId, workspaces, conversations, activeWorkspace?.id, activeConversation?.id]);

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando conversación...</p>
        </div>
      </div>
    );
  }

  // Si el workspace fue eliminado, no renderizar nada (la redirección está en proceso)
  if (!activeWorkspace || !workspaces.find(ws => ws.id === workspaceId)) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
