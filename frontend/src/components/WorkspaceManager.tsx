'use client';

import { useState } from 'react';
import {
  useWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useWorkspaceDocuments,
  useUploadDocument,
  useDeleteDocument,
  useChat,
  useWorkspaceById,
} from '@/hooks/useApi';
import { WorkspaceCreate, WorkspaceUpdate } from '@/types/api';

/**
 * Componente de ejemplo que demuestra el uso de todos los hooks de la API
 * Este componente muestra cómo:
 * - Listar workspaces (GET)
 * - Crear un workspace (POST)
 * - Actualizar un workspace (PUT)
 * - Eliminar un workspace (DELETE)
 * - Listar documentos de un workspace (GET)
 * - Subir documentos (POST con multipart/form-data)
 * - Eliminar documentos (DELETE)
 * - Hacer consultas al chat (POST)
 */
export default function WorkspaceManager() {
  // Estados locales para formularios
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatQuery, setChatQuery] = useState('');

  // ============================================
  // HOOKS - WORKSPACES
  // ============================================

  // Query para obtener todos los workspaces
  const {
    data: workspaces,
    isLoading: isLoadingWorkspaces,
    isError: isErrorWorkspaces,
    error: errorWorkspaces,
  } = useWorkspaces();

  // Query para obtener un workspace específico (cuando se selecciona uno)
  const { data: selectedWorkspace } = useWorkspaceById(selectedWorkspaceId);

  // Mutaciones para CRUD de workspaces
  const createWorkspaceMutation = useCreateWorkspace();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();

  // ============================================
  // HOOKS - DOCUMENTS
  // ============================================

  // Query para obtener documentos del workspace seleccionado
  const {
    data: documents,
    isLoading: isLoadingDocuments,
  } = useWorkspaceDocuments(selectedWorkspaceId);

  // Mutaciones para documentos
  const uploadDocumentMutation = useUploadDocument();
  const deleteDocumentMutation = useDeleteDocument();

  // ============================================
  // HOOKS - CHAT
  // ============================================

  // Mutación para chat (específica del workspace seleccionado)
  const chatMutation = useChat(selectedWorkspaceId);

  // ============================================
  // HANDLERS - WORKSPACES
  // ============================================

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const newWorkspace: WorkspaceCreate = {
      name: newWorkspaceName,
      description: newWorkspaceDescription || null,
    };

    createWorkspaceMutation.mutate(newWorkspace, {
      onSuccess: () => {
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
        alert('Workspace creado exitosamente');
      },
      onError: (error: any) => {
        alert(`Error al crear workspace: ${error.response?.data?.detail || error.message}`);
      },
    });
  };

  const handleStartEdit = (id: string, name: string, description: string | null) => {
    setEditingWorkspaceId(id);
    setEditName(name);
    setEditDescription(description || '');
  };

  const handleUpdateWorkspace = () => {
    if (!editingWorkspaceId || !editName.trim()) return;

    const updates: WorkspaceUpdate = {
      name: editName,
      description: editDescription || null,
    };

    updateWorkspaceMutation.mutate(
      { id: editingWorkspaceId, updates },
      {
        onSuccess: () => {
          setEditingWorkspaceId('');
          setEditName('');
          setEditDescription('');
          alert('Workspace actualizado exitosamente');
        },
        onError: (error: any) => {
          alert(`Error al actualizar: ${error.response?.data?.detail || error.message}`);
        },
      }
    );
  };

  const handleDeleteWorkspace = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este workspace?')) return;

    deleteWorkspaceMutation.mutate(id, {
      onSuccess: () => {
        if (selectedWorkspaceId === id) {
          setSelectedWorkspaceId('');
        }
        alert('Workspace eliminado exitosamente');
      },
      onError: (error: any) => {
        alert(`Error al eliminar: ${error.response?.data?.detail || error.message}`);
      },
    });
  };

  // ============================================
  // HANDLERS - DOCUMENTS
  // ============================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadDocument = () => {
    if (!selectedFile || !selectedWorkspaceId) return;

    uploadDocumentMutation.mutate(
      { workspaceId: selectedWorkspaceId, file: selectedFile },
      {
        onSuccess: () => {
          setSelectedFile(null);
          // Resetear el input
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          alert('Documento subido exitosamente (procesándose en segundo plano)');
        },
        onError: (error: any) => {
          alert(`Error al subir documento: ${error.response?.data?.detail || error.message}`);
        },
      }
    );
  };

  const handleDeleteDocument = (documentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    deleteDocumentMutation.mutate(documentId, {
      onSuccess: () => {
        alert('Documento eliminado exitosamente');
      },
      onError: (error: any) => {
        alert(`Error al eliminar documento: ${error.response?.data?.detail || error.message}`);
      },
    });
  };

  // ============================================
  // HANDLERS - CHAT
  // ============================================

  const handleSendChatQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || !selectedWorkspaceId) return;

    chatMutation.mutate(chatQuery, {
      onSuccess: () => {
        setChatQuery('');
      },
      onError: (error: any) => {
        alert(`Error en chat: ${error.response?.data?.detail || error.message}`);
      },
    });
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoadingWorkspaces) {
    return (
      <div className="p-8">
        <p className="text-lg">Cargando workspaces...</p>
      </div>
    );
  }

  if (isErrorWorkspaces) {
    return (
      <div className="p-8">
        <p className="text-red-500">
          Error al cargar workspaces: {(errorWorkspaces as any)?.message || 'Error desconocido'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Workspace Manager - Demo de API</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ===== COLUMNA IZQUIERDA: WORKSPACES ===== */}
        <div className="space-y-6">
          {/* Crear Workspace */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Crear Nuevo Workspace</h2>
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Nombre del workspace"
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
              <textarea
                value={newWorkspaceDescription}
                onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full p-2 rounded bg-gray-700 text-white"
                rows={3}
              />
              <button
                type="submit"
                disabled={createWorkspaceMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-2 rounded text-white font-medium"
              >
                {createWorkspaceMutation.isPending ? 'Creando...' : 'Crear Workspace'}
              </button>
              {createWorkspaceMutation.isError && (
                <p className="text-red-500 text-sm">
                  {(createWorkspaceMutation.error as any)?.response?.data?.detail ||
                    'Error al crear'}
                </p>
              )}
            </form>
          </div>

          {/* Lista de Workspaces */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Mis Workspaces</h2>
            {workspaces && workspaces.length === 0 ? (
              <p className="text-gray-400">No hay workspaces aún</p>
            ) : (
              <ul className="space-y-2">
                {workspaces?.map((ws) => (
                  <li
                    key={ws.id}
                    className={`p-3 rounded border ${
                      selectedWorkspaceId === ws.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700'
                    }`}
                  >
                    {editingWorkspaceId === ws.id ? (
                      // Modo edición
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-1 rounded bg-gray-700 text-white"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full p-1 rounded bg-gray-700 text-white"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateWorkspace}
                            disabled={updateWorkspaceMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                          >
                            {updateWorkspaceMutation.isPending ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => setEditingWorkspaceId('')}
                            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo vista
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{ws.name}</h3>
                            {ws.description && (
                              <p className="text-sm text-gray-400">{ws.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setSelectedWorkspaceId(ws.id)}
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                          >
                            Seleccionar
                          </button>
                          <button
                            onClick={() =>
                              handleStartEdit(ws.id, ws.name, ws.description || null)
                            }
                            className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteWorkspace(ws.id)}
                            disabled={deleteWorkspaceMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== COLUMNA DERECHA: DOCUMENTOS Y CHAT ===== */}
        <div className="space-y-6">
          {!selectedWorkspaceId ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <p className="text-gray-400">Selecciona un workspace para ver documentos y chat</p>
            </div>
          ) : (
            <>
              {/* Subir Documento */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Subir Documento</h2>
                <div className="space-y-3">
                  <input
                    id="file-input"
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full text-white"
                  />
                  {selectedFile && <p className="text-sm text-gray-400">{selectedFile.name}</p>}
                  <button
                    onClick={handleUploadDocument}
                    disabled={!selectedFile || uploadDocumentMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 p-2 rounded text-white font-medium"
                  >
                    {uploadDocumentMutation.isPending ? 'Subiendo...' : 'Subir Documento'}
                  </button>
                </div>
              </div>

              {/* Lista de Documentos */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Documentos</h2>
                {isLoadingDocuments ? (
                  <p className="text-gray-400">Cargando documentos...</p>
                ) : documents && documents.length === 0 ? (
                  <p className="text-gray-400">No hay documentos en este workspace</p>
                ) : (
                  <ul className="space-y-2">
                    {documents?.map((doc) => (
                      <li key={doc.id} className="p-3 rounded border border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{doc.file_name}</h4>
                            <p className="text-xs text-gray-400">
                              Tipo: {doc.file_type} | Estado: {doc.status} | Chunks:{' '}
                              {doc.chunk_count}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deleteDocumentMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Chat */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Chat con el Workspace</h2>
                <form onSubmit={handleSendChatQuery} className="space-y-3">
                  <textarea
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="w-full p-2 rounded bg-gray-700 text-white"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={chatMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-2 rounded text-white font-medium"
                  >
                    {chatMutation.isPending ? 'Enviando...' : 'Enviar Pregunta'}
                  </button>
                </form>

                {/* Respuesta del Chat */}
                {chatMutation.isSuccess && chatMutation.data && (
                  <div className="mt-4 p-4 bg-gray-900 rounded">
                    <h3 className="font-semibold mb-2">Respuesta:</h3>
                    <p className="text-sm mb-3">{chatMutation.data.llm_response}</p>
                    {chatMutation.data.relevant_chunks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <h4 className="text-sm font-semibold mb-2">
                          Fragmentos relevantes ({chatMutation.data.relevant_chunks.length}):
                        </h4>
                        {chatMutation.data.relevant_chunks.slice(0, 2).map((chunk, idx) => (
                          <div key={idx} className="text-xs text-gray-400 mb-2">
                            <p>Score: {chunk.score.toFixed(3)}</p>
                            <p className="truncate">{chunk.chunk_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {chatMutation.isError && (
                  <p className="mt-3 text-red-500 text-sm">
                    {(chatMutation.error as any)?.response?.data?.detail ||
                      'Error al enviar la consulta'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
