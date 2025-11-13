"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, FileText, Trash2, Edit3, LogOut, Menu, X, Zap } from "lucide-react";

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
  const [selectedLLM, setSelectedLLM] = useState<string>("GEMINI");
  const [token, setToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Cargar workspaces al montar el componente
  useEffect(() => {
    fetchWorkspaces();
    // Inicializar LLM desde localStorage o desde el backend root
    try {
      const stored = localStorage.getItem("selected_llm");
      if (stored) setSelectedLLM(stored);
      else {
        // intentar obtener el valor por defecto del backend desde el endpoint de settings
        fetch(`${API_URL}/api/v1/settings/active_llm`).then(async (r) => {
          if (r.ok) {
            const j = await r.json();
            // j can be { key, value }
            if (j && j.value) setSelectedLLM(j.value);
          }
        }).catch(() => {});
      }
    } catch (err) {
      // ignore
    }
    // Inicializar token/usuario si existe en localStorage
    try {
      const t = localStorage.getItem("access_token");
      if (t) {
        setToken(t);
        fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        })
          .then((r) => r.json())
          .then((j) => {
            if (j && j.username) setAuthUser(j.username);
          })
          .catch(() => {});
      }
    } catch (err) {}
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces`);
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
    }
  };

  const updateWorkspace = async (id: number, name: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      }
    } catch (err) {
      console.error("Error updating workspace", err);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName }),
      });

      if (response.ok) {
        const newWorkspace = await response.json();
        setWorkspaces([...workspaces, newWorkspace]);
        setNewWorkspaceName("");
        setSelectedWorkspaceId(newWorkspace.id);
        try { localStorage.setItem("selected_workspace_id", String(newWorkspace.id)); } catch {}
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteWorkspace = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWorkspaces(workspaces.filter((w) => w.id !== id));
        if (selectedWorkspaceId === id) {
          setSelectedWorkspaceId(null);
          try { localStorage.removeItem("selected_workspace_id"); } catch {}
        }
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
    }
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-0 top-4 z-40 p-2 rounded-r-lg bg-[hsl(var(--primary))]/10 hover:bg-[hsl(var(--primary))]/20 transition-colors"
      >
        <Menu className="h-5 w-5 text-[hsl(var(--primary))]" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col shadow-sm h-screen">
      {/* Header */}
      <div className="px-6 py-4 flex items-start justify-between border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--primary))]">Velvet AI</h1>
          <p className="text-xs text-gray-500 mt-1">Sistema RAG</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* LLM Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[hsl(var(--primary))]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Modelo LLM</h3>
          </div>
          <div className="p-3 bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 rounded-lg">
            <p className="text-sm font-semibold text-[hsl(var(--primary))] flex items-center gap-2">
              <span className="text-lg">🤖</span> GEMINI
            </p>
            <p className="text-xs text-gray-600 mt-1">Modelo de IA avanzado</p>
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Espacios de Trabajo</h3>
          </div>

          {/* Create Workspace */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nuevo workspace..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && createWorkspace()}
              className="flex-1 h-10 text-sm"
            />
            <Button
              onClick={createWorkspace}
              disabled={isCreating || !newWorkspaceName.trim()}
              size="icon"
              className="bg-[hsl(var(--primary))] hover:bg-[hsl(0_85%_45%)] text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Workspaces List */}
          <div className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No hay workspaces aún</p>
            ) : (
              workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group transition-all duration-200 ${
                    selectedWorkspaceId === workspace.id
                      ? "bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 shadow-sm"
                      : "bg-white hover:bg-gray-100 border border-gray-200 hover:shadow-sm"
                  }`}
                  onClick={() => {
                    setSelectedWorkspaceId(workspace.id);
                    try { localStorage.setItem("selected_workspace_id", String(workspace.id)); } catch {}
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" />
                    <span className="text-sm font-medium truncate text-gray-700">{workspace.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-[hsl(var(--primary))]/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt("Nuevo nombre para workspace:", workspace.name);
                        if (newName && newName.trim() && newName !== workspace.name) {
                          updateWorkspace(workspace.id, newName.trim());
                        }
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("¿Eliminar este workspace?")) {
                          deleteWorkspace(workspace.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer - User Section */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        {authUser ? (
          <div className="space-y-3">
            <div className="p-3 bg-[hsl(var(--primary))]/5 rounded-lg border border-[hsl(var(--primary))]/20">
              <p className="text-xs text-gray-600 mb-1">Conectado como</p>
              <p className="text-sm font-semibold text-[hsl(var(--primary))]">{authUser}</p>
            </div>
            <Button
              onClick={() => {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user_id");
                window.location.reload();
              }}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-medium transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center">Inicia sesión para continuar</p>
        )}
      </div>
    </div>
  );
}
