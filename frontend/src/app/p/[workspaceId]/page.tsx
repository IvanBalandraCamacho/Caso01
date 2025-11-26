"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { useWorkspaces } from "@/context/WorkspaceContext";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const { 
    workspaces, 
    activeWorkspace, 
    setActiveWorkspace,
    setActiveConversation,
    fetchConversations 
  } = useWorkspaces();

  useEffect(() => {
    // Find and set the active workspace
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      setActiveWorkspace(workspace);
      fetchConversations(workspaceId);
      // Reset conversation only when entering workspace view (not chat)
      setActiveConversation(null);
    } else if (workspaces.length > 0) {
      // If workspace not found but we have workspaces, redirect to first one
      router.push(`/p/${workspaces[0].id}`);
    }
  }, [workspaceId, workspaces, setActiveWorkspace, fetchConversations, setActiveConversation, router]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
