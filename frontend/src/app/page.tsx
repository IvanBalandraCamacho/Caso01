"use client"; // <-- AÑADIR "use client"
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { WorkspaceProvider } from "@/context/WorkspaceContext"; // <-- IMPORTAR

export default function Home() {
  return (
    // Envolvemos los dos componentes con el proveedor
    <WorkspaceProvider>
      <div className="flex h-screen">
        <Sidebar />
        <ChatArea />
      </div>
    </WorkspaceProvider>
  );
}