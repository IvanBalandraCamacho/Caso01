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
  ConversationWithMessages,
  ConversationUpdate,
} from '@/types/api';

// ============================================
// QUERY KEYS
// ============================================
const WORKSPACES_QUERY_KEY = 'workspaces';
const DOCUMENTS_QUERY_KEY = 'documents';
const CONVERSATIONS_QUERY_KEY = 'conversations';
const CONVERSATION_DETAILS_QUERY_KEY = 'conversation-details';

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
// API FUNCTIONS - PROPOSALS
// ============================================

/**
 * Analizar un archivo RFP (PDF) con IA
 * POST /proposals/analyze
 */
const analyzeProposalFile = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/proposals/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

/**
 * Generar documento Word de propuesta
 * POST /proposals/generate
 */
const generateProposalDocx = async (proposalData: any): Promise<Blob> => {
  const { data } = await apiClient.post('/proposals/generate', proposalData, {
    responseType: 'blob',
  });
  return data;
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
  conversationId,
}: {
  workspaceId: string;
  query: string;
  conversationId?: string;
}): Promise<ChatResponse> => {
  const requestBody: ChatRequest = {
    query,
    ...(conversationId && { conversation_id: conversationId }),
  };

  const { data } = await apiClient.post<ChatResponse>(
    `/workspaces/${workspaceId}/chat`,
    requestBody
  );
  return data;
};

/**
 * Enviar una consulta al chat con streaming (NDJSON)
 */
export const streamChatQuery = async ({
  workspaceId,
  query,
  conversationId,
  model,
  onChunk,
  onError,
  onFinish
}: {
  workspaceId: string;
  query: string;
  conversationId?: string;
  model?: string;
  onChunk: (chunk: any) => void;
  onError: (error: any) => void;
  onFinish: () => void;
}) => {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

  try {
    const response = await fetch(`${baseURL}/workspaces/${workspaceId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
        model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No readable stream');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            onChunk(data);
          } catch (e) {
            console.warn('Error parsing JSON chunk:', line);
          }
        }
      }
    }
    onFinish();
  } catch (error) {
    onError(error);
  }
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
 * Invalida conversations para actualizar la lista
 */
export const useChat = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ query, conversationId }: { query: string; conversationId?: string }) =>
      postChatQuery({ workspaceId, query, conversationId }),
    onSuccess: () => {
      // Invalidar conversaciones para que se actualice la lista en el sidebar
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY, workspaceId] });
    },
  });
};

// ============================================
// API FUNCTIONS - CONVERSATIONS
// ============================================

/**
 * Obtener una conversación con todos sus mensajes
 * GET /workspaces/{workspace_id}/conversations/{conversation_id}
 */
const fetchConversationWithMessages = async ({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId: string;
}): Promise<ConversationWithMessages> => {
  const { data } = await apiClient.get<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`
  );
  return data;
};

/**
 * Actualizar título de conversación
 * PUT /workspaces/{workspace_id}/conversations/{conversation_id}
 */
const updateConversation = async ({
  workspaceId,
  conversationId,
  updates,
}: {
  workspaceId: string;
  conversationId: string;
  updates: ConversationUpdate;
}): Promise<ConversationWithMessages> => {
  const { data } = await apiClient.put<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
    updates
  );
  return data;
};

/**
 * Eliminar una conversación
 * DELETE /workspaces/{workspace_id}/conversations/{conversation_id}
 */
const deleteConversation = async ({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId: string;
}): Promise<void> => {
  await apiClient.delete(
    `/workspaces/${workspaceId}/conversations/${conversationId}`
  );
};

// ============================================
// HOOKS - CONVERSATIONS
// ============================================

/**
 * Hook para obtener una conversación con mensajes
 */
export const useConversationWithMessages = ({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId?: string;
}) => {
  return useQuery({
    queryKey: [CONVERSATION_DETAILS_QUERY_KEY, workspaceId, conversationId],
    queryFn: () => fetchConversationWithMessages({ workspaceId, conversationId: conversationId! }),
    enabled: !!workspaceId && !!conversationId,
    retry: false, // No reintentar si falla (ej: 404)
    staleTime: 1000 * 60, // Cache por 1 minuto
  });
};

/**
 * Hook para actualizar conversación
 */
export const useUpdateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConversation,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY, variables.workspaceId] });
      queryClient.invalidateQueries({
        queryKey: [CONVERSATION_DETAILS_QUERY_KEY, variables.workspaceId, variables.conversationId]
      });
    },
  });
};

/**
 * Hook para eliminar conversación
 */
export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY, variables.workspaceId] });
    },
  });
};

// ============================================
// HOOKS - PROPOSALS
// ============================================

/**
 * Hook para analizar un archivo RFP
 */
export const useAnalyzeProposal = () => {
  return useMutation({
    mutationFn: analyzeProposalFile,
  });
};

/**
 * Hook para generar documento Word de propuesta
 */
export const useGenerateProposal = () => {
  return useMutation({
    mutationFn: generateProposalDocx,
  });
};
