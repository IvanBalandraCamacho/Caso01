"use client";
import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { useWorkspaces } from "@/context/WorkspaceContext";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const conversationId = params.conversationId as string;
  
  const { 
    workspaces, 
    conversations,
    activeWorkspace, 
    setActiveWorkspace,
    activeConversation,
    setActiveConversation,
    fetchConversations 
  } = useWorkspaces();

  // Use refs to prevent infinite loops and track initialization
  const initializedWorkspaceRef = useRef(false);
  const initializedConversationRef = useRef(false);

  // Set active workspace - only once on mount or when workspaceId changes
  useEffect(() => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    
    if (workspace && activeWorkspace?.id !== workspaceId) {
      setActiveWorkspace(workspace);
      fetchConversations(workspaceId);
      initializedWorkspaceRef.current = true;
    }
    // Only depend on workspaceId and workspaces array, not the setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workspaces]);

  // Set active conversation - only once when conversation data is available
  useEffect(() => {
    if (conversations.length > 0 && activeConversation?.id !== conversationId) {
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        setActiveConversation(conversation);
        initializedConversationRef.current = true;
      }
    }
    // Only depend on conversationId and conversations array, not the setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversations]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
