"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle, FileText, Trash2, Edit3, LogOut, Menu, X, Zap,
  Settings, User, ChevronDown, Check, Briefcase
} from "lucide-react";
import { useToast } from "@/components/toast";

// Define la estructura de un Workspace
interface Workspace {
  id: number;
  name: string;
  created_at: string;
}

export function Sidebar() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { addToast } = useToast();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Efecto para manejar el tamaño de la pantalla y la visibilidad del sidebar
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchWorkspaces();
    // Intenta obtener el usuario autenticado
    const token = localStorage.getItem("access_token");
    if (token) {
      fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(user => setAuthUser(user.username))
      .catch(() => localStorage.removeItem("access_token"));
    }
    // Sincronizar el workspace seleccionado desde localStorage
    const storedWorkspaceId = localStorage.getItem("selected_workspace_id");
    if (storedWorkspaceId) {
      setSelectedWorkspaceId(Number(storedWorkspaceId));
    }
  }, []);

  // Obtiene los workspaces desde el API
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces`);
      if (response.ok) {
        const data: Workspace[] = await response.json();
        setWorkspaces(data);
        // Si no hay workspace seleccionado, elige el primero
        if (!localStorage.getItem("selected_workspace_id") && data.length > 0) {
          handleWorkspaceSelect(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    }
  };

  // Actualiza el nombre de un workspace
  const updateWorkspace = async (id: number, name: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        const updated = await response.json();
        setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
      }
    } catch (err) {
      console.error("Error updating workspace:", err);
    }
  };

  // Crea un nuevo workspace
  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      addToast("Debes iniciar sesión para crear un workspace", "error");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newWorkspaceName }),
      });

      if (response.ok) {
        const newWorkspace = await response.json();
        setWorkspaces(prev => [...prev, newWorkspace]);
        setNewWorkspaceName("");
        handleWorkspaceSelect(newWorkspace.id);
        addToast("Workspace creado exitosamente", "success");
      } else {
        addToast("Error al crear el workspace", "error");
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
      addToast("Error de red al crear el workspace", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Elimina un workspace
  const deleteWorkspace = async (id: number) => {
    try {
      if (confirm("¿Estás seguro de que quieres eliminar este espacio de trabajo?")) {
        const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, { method: "DELETE" });
        if (response.ok) {
          setWorkspaces(prev => prev.filter(w => w.id !== id));
          if (selectedWorkspaceId === id) {
            const firstWorkspace = workspaces[0];
            handleWorkspaceSelect(firstWorkspace ? firstWorkspace.id : null);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
    }
  };

  // Maneja la selección de un workspace
  const handleWorkspaceSelect = (id: number | null) => {
    setSelectedWorkspaceId(id);
    if (id !== null) {
      localStorage.setItem("selected_workspace_id", String(id));
    } else {
      localStorage.removeItem("selected_workspace_id");
    }
  };

  // Cierra sesión
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("selected_workspace_id");
    window.location.reload();
  };

  // Componente para el botón de abrir sidebar en móvil
  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-50 p-2 rounded-md bg-background/80 backdrop-blur-sm shadow-md hover:bg-secondary transition-colors"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>
    );
  }

  return (
    <div className={`
      ${isMobile ? 'fixed inset-0 z-40' : 'relative'}
      w-72 bg-background border-r border-border flex flex-col h-screen transition-transform duration-300
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary"/>
            </span>
            <h1 className="text-xl font-bold text-foreground">Velvet AI</h1>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-secondary rounded-md">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Contenido principal del Sidebar */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sección de Workspaces */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Espacios de Trabajo</h3>
          <div className="space-y-2">
            {workspaces.map(ws => (
              <div
                key={ws.id}
                onClick={() => handleWorkspaceSelect(ws.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedWorkspaceId === ws.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm truncate">{ws.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt("Nuevo nombre:", ws.name);
                      if (newName?.trim()) updateWorkspace(ws.id, newName.trim());
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100/50 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {/* Crear Workspace */}
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Nuevo..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && createWorkspace()}
              className="h-9 text-sm"
            />
            <Button onClick={createWorkspace} disabled={isCreating} size="icon" className="h-9 w-9 flex-shrink-0">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sección de Modelo LLM */}
        <div>
           <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Modelo LLM</h3>
           <div className="p-3 bg-secondary rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary"/>
                <span className="text-sm font-semibold text-foreground">GEMINI</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Activo</span>
           </div>
        </div>

        {/* Sección de Chats Creados */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Chats Creados</h3>
          <div className="space-y-2">
            <div className="group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-foreground hover:bg-secondary">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate">Chat 1</span>
              </div>
            </div>
            <div className="group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-foreground hover:bg-secondary">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate">Chat 2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Sección de Usuario */}
      <div className="p-4 border-t border-border">
        {authUser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground"/>
              </div>
              <span className="text-sm font-medium text-foreground">{authUser}</span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
