"use client";
import { useEffect } from "react";
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

  // Set active workspace
  useEffect(() => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace && activeWorkspace?.id !== workspaceId) {
      setActiveWorkspace(workspace);
      fetchConversations(workspaceId);
    }
  }, [workspaceId, workspaces, activeWorkspace, setActiveWorkspace, fetchConversations]);

  // Set active conversation
  useEffect(() => {
    if (conversations.length > 0) {
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation && activeConversation?.id !== conversationId) {
        setActiveConversation(conversation);
      }
    }
  }, [conversationId, conversations, activeConversation, setActiveConversation]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
