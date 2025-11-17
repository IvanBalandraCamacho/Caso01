'use client';

import { useState } from 'react';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useApi';

/**
 * Ejemplo simplificado que muestra solo las operaciones básicas de workspaces
 * Este componente es más simple que WorkspaceManager y sirve como ejemplo inicial
 */
export default function SimpleWorkspaceList() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // 1. Hook de Query (GET) - Obtener lista de workspaces
  const { data: workspaces, isLoading, isError, error } = useWorkspaces();

  // 2. Hook de Mutación (POST) - Crear nuevo workspace
  const createWorkspaceMutation = useCreateWorkspace();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    createWorkspaceMutation.mutate(
      { 
        name, 
        description: description || null 
      },
      {
        onSuccess: () => {
          // Limpiar formulario en éxito
          setName('');
          setDescription('');
          alert('Workspace creado exitosamente!');
        },
        onError: (error: any) => {
          // Manejar errores
          const errorMessage = error.response?.data?.detail || error.message;
          alert(`Error al crear workspace: ${errorMessage}`);
        },
      }
    );
  };

  // Manejo de estados de carga y error
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg">Cargando workspaces...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500">
          Error: {(error as any)?.message || 'Error desconocido'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Gestión de Workspaces</h1>

      {/* Formulario para crear workspace */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Crear Nuevo Workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del Workspace *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Proyecto Marketing"
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito de este workspace..."
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={createWorkspaceMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded text-white font-medium transition-colors"
          >
            {createWorkspaceMutation.isPending ? 'Creando...' : 'Crear Workspace'}
          </button>

          {/* Mensaje de error en la mutación */}
          {createWorkspaceMutation.isError && (
            <div className="p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
              {(createWorkspaceMutation.error as any)?.response?.data?.detail ||
                'Error al crear el workspace'}
            </div>
          )}
        </form>
      </div>

      {/* Lista de workspaces */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">
          Mis Workspaces ({workspaces?.length || 0})
        </h2>

        {workspaces && workspaces.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No hay workspaces aún. ¡Crea el primero!
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces?.map((workspace) => (
              <div
                key={workspace.id}
                className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{workspace.name}</h3>
                    {workspace.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {workspace.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>ID: {workspace.id}</span>
                      <span>
                        Creado: {new Date(workspace.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className={
                          workspace.is_active ? 'text-green-500' : 'text-red-500'
                        }
                      >
                        {workspace.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
