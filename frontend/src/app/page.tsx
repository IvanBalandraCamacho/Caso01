"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { DocumentPanel } from "@/components/document-panel";
import { WorkspaceProvider, useWorkspaces } from "@/context/WorkspaceContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SearchResults } from "@/components/search-results";

function Home() {
  const { searchResults } = useWorkspaces();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatArea />
      <DocumentPanel />
      {searchResults.length > 0 && <SearchResults results={searchResults} />}
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <NotificationProvider>
        <Home />
      </NotificationProvider>
    </WorkspaceProvider>
  );
}
