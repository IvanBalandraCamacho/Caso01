"use client";
import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ConversationsListView } from "@/components/conversations-list-view";
import { useWorkspaces } from "@/context/WorkspaceContext";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const hasSetWorkspace = useRef(false);
  
  const { 
    workspaces, 
    activeWorkspace, 
    setActiveWorkspace,
    setActiveConversation,
  } = useWorkspaces();

  useEffect(() => {
    // Reset ref when workspaceId changes (navigating to different workspace)
    hasSetWorkspace.current = false;
  }, [workspaceId]);

  useEffect(() => {
    // Don't do anything if workspaces haven't loaded yet
    if (workspaces.length === 0) return;
    // Don't re-set if we already set it for this workspace
    if (hasSetWorkspace.current) return;
    
    // Find and set the active workspace
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      hasSetWorkspace.current = true;
      setActiveWorkspace(workspace);
      // Reset conversation when entering workspace list view
      setActiveConversation(null);
    } else {
      // If workspace not found, redirect to home
      router.push('/');
    }
  }, [workspaceId, workspaces, setActiveWorkspace, setActiveConversation, router]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ConversationsListView />
    </div>
  );
}
