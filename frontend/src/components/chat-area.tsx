"use client";
import { useState } from "react"; // <-- AÑADIDO
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaces } from "@/context/WorkspaceContext"; 
import { UploadModal } from "./UploadModal"; // <-- AÑADIDO

export function ChatArea() {
  const { activeWorkspace } = useWorkspaces();
  
  // --- AÑADIDO: Estado para el modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ------------------------------------

  return (
    <main className="flex-1 flex flex-col bg-brand-dark">
      {/* --- AÑADIDO: Renderizar el modal (está oculto por defecto) --- */}
      <UploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
      {/* ----------------------------------------------------------- */}

      <header className="p-6 border-b border-gray-800/50 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">
          {activeWorkspace ? activeWorkspace.name : "Chat"}
        </h2>
        
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" alt="JD" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-300">John Doe</span>
        </div>
      </header>

      {/* Área de Mensajes - por ahora un placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Avatar className="h-16 w-16 mx-auto mb-4">
            <AvatarImage src="https://github.com/shadcn.png" alt="Velvet" />
            <AvatarFallback>V</AvatarFallback>
          </Avatar>
          <p className="text-lg text-gray-400">
            {activeWorkspace 
              ? `Bienvenido a ${activeWorkspace.name}. ¿En qué puedo ayudarte?`
              : "Selecciona un workspace para comenzar."
            }
          </p>
        </div>
      </div>

      {/* Footer con el Input */}
      <footer className="p-6">
        <div className="relative bg-brand-dark-secondary rounded-lg">
          <Input
            className="w-full bg-transparent border border-gray-700 rounded-lg py-3 pl-4 pr-36 focus-visible:ring-brand-red text-gray-300 placeholder-gray-500 h-12"
            placeholder="Escribe tu mensaje..."
            disabled={!activeWorkspace}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {/* --- MODIFICADO: Conectar el botón --- */}
            <Button 
              variant="secondary" 
              className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300"
              disabled={!activeWorkspace}
              onClick={() => setIsModalOpen(true)} // <-- AÑADIDO
            >
              Attach
            </Button>
            {/* ------------------------------------ */}
            <Button 
              className="ml-2 bg-brand-red text-white hover:bg-red-700"
              disabled={!activeWorkspace}
            >
              Send
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}