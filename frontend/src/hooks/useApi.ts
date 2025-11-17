import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import {
  WorkspacePublic,
  WorkspaceCreate,
  WorkspaceUpdate,
  DocumentPublic,
  ChatRequest,
  ChatResponse,
  UploadDocumentParams,
} from '@/types/api';

// ============================================
// QUERY KEYS
// ============================================
const WORKSPACES_QUERY_KEY = 'workspaces';
const DOCUMENTS_QUERY_KEY = 'documents';

// ============================================
// API FUNCTIONS - WORKSPACES
// ============================================

/**
 * Obtener todos los workspaces
 * GET /workspaces
 */
const fetchWorkspaces = async (): Promise<WorkspacePublic[]> => {
  const { data } = await apiClient.get<WorkspacePublic[]>('/workspaces');
  return data;
};

/**
 * Obtener un workspace por ID
 * GET /workspaces/{id}
 */
const fetchWorkspaceById = async (id: string): Promise<WorkspacePublic> => {
  const { data } = await apiClient.get<WorkspacePublic>(`/workspaces/${id}`);
  return data;
};

/**
 * Crear un nuevo workspace
 * POST /workspaces
 */
const createWorkspace = async (newWorkspace: WorkspaceCreate): Promise<WorkspacePublic> => {
  const { data } = await apiClient.post<WorkspacePublic>('/workspaces', newWorkspace);
  return data;
};

/**
 * Actualizar un workspace
 * PUT /workspaces/{id}
 */
const updateWorkspace = async ({
  id,
  updates,
}: {
  id: string;
  updates: WorkspaceUpdate;
}): Promise<WorkspacePublic> => {
  const { data } = await apiClient.put<WorkspacePublic>(`/workspaces/${id}`, updates);
  return data;
};

/**
 * Eliminar un workspace
 * DELETE /workspaces/{id}
 */
const deleteWorkspace = async (id: string): Promise<void> => {
  await apiClient.delete(`/workspaces/${id}`);
};

// ============================================
// API FUNCTIONS - DOCUMENTS
// ============================================

/**
 * Obtener documentos de un workspace
 * GET /workspaces/{id}/documents
 */
const fetchWorkspaceDocuments = async (workspaceId: string): Promise<DocumentPublic[]> => {
  const { data } = await apiClient.get<DocumentPublic[]>(`/workspaces/${workspaceId}/documents`);
  return data;
};

/**
 * Subir un documento a un workspace
 * POST /workspaces/{id}/upload
 */
const uploadDocument = async ({ workspaceId, file }: UploadDocumentParams): Promise<DocumentPublic> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<DocumentPublic>(
    `/workspaces/${workspaceId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return data;
};

/**
 * Eliminar un documento
 * DELETE /documents/{id}
 */
const deleteDocument = async ({ documentId, workspaceId }: { documentId: string; workspaceId?: string }): Promise<{ workspaceId?: string }> => {
  await apiClient.delete(`/documents/${documentId}`);
  return { workspaceId };
};

// ============================================
// API FUNCTIONS - CHAT
// ============================================

/**
 * Enviar una consulta al chat de un workspace
 * POST /workspaces/{id}/chat
 */
const postChatQuery = async ({
  workspaceId,
  query,
}: {
  workspaceId: string;
  query: string;
}): Promise<ChatResponse> => {
  const { data } = await apiClient.post<ChatResponse>(`/workspaces/${workspaceId}/chat`, {
    query,
  });
  return data;
};

// ============================================
// HOOKS - WORKSPACES
// ============================================

/**
 * Hook para obtener todos los workspaces
 */
export const useWorkspaces = () => {
  return useQuery({
    queryKey: [WORKSPACES_QUERY_KEY],
    queryFn: fetchWorkspaces,
  });
};

/**
 * Hook para obtener un workspace por ID
 */
export const useWorkspaceById = (id: string) => {
  return useQuery({
    queryKey: [WORKSPACES_QUERY_KEY, id],
    queryFn: () => fetchWorkspaceById(id),
    enabled: !!id, // Solo ejecutar si hay un ID válido
  });
};

/**
 * Hook para crear un workspace
 */
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      // Invalidar el cache de workspaces para forzar un refetch
      queryClient.invalidateQueries({ queryKey: [WORKSPACES_QUERY_KEY] });
    },
  });
};

/**
 * Hook para actualizar un workspace
 */
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateWorkspace,
    onSuccess: (data) => {
      // Invalidar tanto la lista como el workspace específico
      queryClient.invalidateQueries({ queryKey: [WORKSPACES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORKSPACES_QUERY_KEY, data.id] });
    },
  });
};

/**
 * Hook para eliminar un workspace
 */
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      // Invalidar el cache de workspaces
      queryClient.invalidateQueries({ queryKey: [WORKSPACES_QUERY_KEY] });
    },
  });
};

// ============================================
// HOOKS - DOCUMENTS
// ============================================

/**
 * Hook para obtener documentos de un workspace
 */
export const useWorkspaceDocuments = (workspaceId: string) => {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, workspaceId],
    queryFn: () => fetchWorkspaceDocuments(workspaceId),
    enabled: !!workspaceId, // Solo ejecutar si hay un ID válido
  });
};

/**
 * Hook para subir un documento
 */
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: (data) => {
      // Invalidar los documentos de ese workspace
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY, data.workspace_id] });
    },
  });
};

/**
 * Hook para eliminar un documento
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: (result) => {
      // Invalidar documentos del workspace específico si está disponible
      if (result.workspaceId) {
        queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY, result.workspaceId] });
      }
      // También invalidar todos los documentos como fallback
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
    },
  });
};

// ============================================
// HOOKS - CHAT
// ============================================

/**
 * Hook para enviar consultas al chat
 * No invalida queries, solo maneja su propio estado
 */
export const useChat = (workspaceId: string) => {
  return useMutation({
    mutationFn: (query: string) => postChatQuery({ workspaceId, query }),
  });
};
