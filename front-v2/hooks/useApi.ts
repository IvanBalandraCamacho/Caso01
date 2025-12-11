import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ingestText,
  searchRAG,
  deleteRAGDocument,
  ragHealthCheck,
  getDocumentStatus,
  getPendingDocuments,
  fetchWorkspaces as fetchWorkspacesApi,
  createWorkspaceApi,
  updateWorkspaceApi,
  deleteWorkspaceApi,
  fetchWorkspaceDocuments as fetchWorkspaceDocumentsApi,
  fetchConversations as fetchConversationsApi,
  createConversationApi,
  deleteConversationApi,
  fetchConversationMessages as fetchConversationMessagesApi,
  fetchConversationDocuments as fetchConversationDocumentsApi,
  uploadDocumentToConversation as uploadDocumentToConversationApi,
  deleteDocumentApi,
} from "@/lib/api";
import {
  WorkspacePublic,
  WorkspaceCreate,
  WorkspaceUpdate,
  DocumentPublic,
  DocumentStatus,
  ChatRequest,
  ChatResponse,
  UploadDocumentParams,
  ConversationWithMessages,
  ConversationUpdate,
  RAGIngestRequest,
  SearchRequest,
  SearchResult,
  ProposalAnalysis,
  ConversationPublic,
} from "@/types/api";
import { useRef } from "react";

// ============================================
// QUERY KEYS
// ============================================
const WORKSPACES_QUERY_KEY = "workspaces";
const DOCUMENTS_QUERY_KEY = "documents";
const CONVERSATIONS_QUERY_KEY = "conversations";
const CONVERSATION_DETAILS_QUERY_KEY = "conversation-details";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Obtener un workspace por ID
 * GET /workspaces/{id}
 */
const fetchWorkspaceById = async (id: string): Promise<WorkspacePublic> => {
  const { data } = await api.get<WorkspacePublic>(`/workspaces/${id}`);
  return data;
};

/**
 * Crear un nuevo workspace
 * POST /workspaces
 */
const createWorkspace = async (
  newWorkspace: WorkspaceCreate,
): Promise<WorkspacePublic> => {
  const { data } = await api.post<WorkspacePublic>("/workspaces", newWorkspace);
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
  const { data } = await api.put<WorkspacePublic>(`/workspaces/${id}`, updates);
  return data;
};

/**
 * Eliminar un workspace
 * DELETE /workspaces/{id}
 */
const deleteWorkspace = async (id: string): Promise<void> => {
  await api.delete(`/workspaces/${id}`);
};

/**
 * Subir un documento a un workspace
 * POST /workspaces/{id}/upload
 */
const uploadDocument = async ({
  workspaceId,
  file,
}: UploadDocumentParams): Promise<DocumentPublic> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<DocumentPublic>(
    `/workspaces/${workspaceId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
};

/**
 * Subir un documento a una conversación
 * POST /workspaces/{workspace_id}/conversations/{conversation_id}/upload
 */
const uploadDocumentToConversation = async ({
  workspaceId,
  conversationId,
  file,
}: {
  workspaceId: string;
  conversationId: string;
  file: File;
}): Promise<DocumentPublic> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<DocumentPublic>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
};

/**
 * Eliminar un documento
 * DELETE /documents/{id}
 */
const deleteDocument = async ({
  documentId,
  workspaceId,
}: {
  documentId: string;
  workspaceId?: string;
}): Promise<{ workspaceId?: string }> => {
  await api.delete(`/documents/${documentId}`);
  return { workspaceId };
};

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

  const { data } = await api.post<ChatResponse>(
    `/workspaces/${workspaceId}/chat`,
    requestBody,
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
  onFinish,
}: {
  workspaceId: string;
  query: string;
  conversationId?: string;
  model?: string;
  onChunk: (chunk: unknown) => void;
  onError: (error: unknown) => void;
  onFinish: () => void;
}) => {
  const baseURL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${baseURL}/workspaces/${workspaceId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
        model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Error ${response.status}: ${response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error("No readable stream");

    let buffer = ""; // Buffer para acumular datos incompletos

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decodificar y agregar al buffer
      buffer += decoder.decode(value, { stream: true });

      // Procesar líneas completas
      const lines = buffer.split("\n");

      // Guardar la última línea incompleta en el buffer
      buffer = lines.pop() || "";

      // Procesar líneas completas
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            onChunk(data);
          } catch (e) {
            console.warn("Error parsing JSON chunk:", line, e);
          }
        }
      }
    }

    // Procesar cualquier dato restante en el buffer
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        onChunk(data);
      } catch (e) {
        console.warn("Error parsing final buffer:", buffer, e);
      }
    }

    onFinish();
  } catch (error) {
    onError(error);
  }
};

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
  const { data } = await api.get<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
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
  const { data } = await api.put<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
    updates,
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
  await api.delete(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
  );
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
    queryFn: fetchWorkspacesApi,
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
      queryClient.invalidateQueries({
        queryKey: [WORKSPACES_QUERY_KEY, data.id],
      });
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
    queryFn: () => fetchWorkspaceDocumentsApi(workspaceId),
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
      queryClient.invalidateQueries({
        queryKey: [DOCUMENTS_QUERY_KEY, data.workspace_id],
      });
    },
  });
};

/**
 * Hook para obtener documentos de una conversación
 */
export const useConversationDocuments = (
  workspaceId?: string,
  conversationId?: string,
) => {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, workspaceId, conversationId],
    queryFn: () => fetchConversationDocumentsApi({ workspaceId: workspaceId!, conversationId: conversationId! }),
    enabled: !!workspaceId && !!conversationId,
    retry: false, // No reintentar si falla (ej: 404)
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook para subir un documento a una conversación
 */
export const useUploadDocumentToConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocumentToConversation,
    onSuccess: (data, variables) => {
      // Invalidar documentos de la conversación específica
      queryClient.invalidateQueries({
        queryKey: [
          DOCUMENTS_QUERY_KEY,
          variables.workspaceId,
          variables.conversationId,
        ],
      });
      // También invalidar documentos del workspace
      queryClient.invalidateQueries({
        queryKey: [DOCUMENTS_QUERY_KEY, variables.workspaceId],
      });
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
        queryClient.invalidateQueries({
          queryKey: [DOCUMENTS_QUERY_KEY, result.workspaceId],
        });
      }
      // También invalidar todos los documentos como fallback
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
    },
  });
};

// ============================================
// HOOKS - CONVERSATIONS
// ============================================

/**
 * Hook para obtener conversaciones de un workspace
 */
export const useConversations = (workspaceId: string) => {
  return useQuery({
    queryKey: [CONVERSATIONS_QUERY_KEY, workspaceId],
    queryFn: () => fetchConversationsApi(workspaceId),
    enabled: !!workspaceId,
  });
};

/**
 * Hook para crear una conversación
 */
export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, title }: { workspaceId: string; title: string }) =>
      createConversationApi(workspaceId, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_QUERY_KEY, variables.workspaceId],
      });
    },
  });
};

/**
 * Hook para obtener una conversación con mensajes
 */
export const useConversationWithMessages = ({
  workspaceId,
  conversationId,
}: {
  workspaceId?: string;
  conversationId?: string;
}) => {
  return useQuery({
    queryKey: [CONVERSATION_DETAILS_QUERY_KEY, workspaceId, conversationId],
    queryFn: () =>
      fetchConversationWithMessages({
        workspaceId: workspaceId!,
        conversationId: conversationId!,
      }),
    enabled: !!workspaceId && !!conversationId,
    retry: false, // No reintentar si falla (ej: 404)
    staleTime: 1000 * 60 * 5, // 5 minutos antes de considerar stale
    gcTime: 1000 * 60 * 10, // Garbage collection después de 10 minutos
    refetchOnWindowFocus: false, // No refetch al cambiar foco
    refetchOnMount: true, // SÍ refetch al montar para cargar historial actualizado
    refetchOnReconnect: false, // No refetch al reconectar
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
      queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_QUERY_KEY, variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          CONVERSATION_DETAILS_QUERY_KEY,
          variables.workspaceId,
          variables.conversationId,
        ],
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
      queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_QUERY_KEY, variables.workspaceId],
      });
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
    mutationFn: ({
      query,
      conversationId,
    }: {
      query: string;
      conversationId?: string;
    }) => postChatQuery({ workspaceId, query, conversationId }),
    onSuccess: () => {
      // Invalidar conversaciones para que se actualice la lista en el sidebar
      queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_QUERY_KEY, workspaceId],
      });
    },
  });
};

// ============================================
// HOOKS - INTENTION TASK (Proposal Analysis & Generation)
// ============================================

/**
 * Analizar un archivo RFP (PDF) con IA
 * POST /task/analyze
 */
const analyzeProposalFile = async (file: File): Promise<ProposalAnalysis> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ProposalAnalysis>("/task/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

/**
 * Generar documento Word de propuesta desde análisis directo
 * POST /task/generate
 */
const generateProposalDocx = async (proposalData: ProposalAnalysis): Promise<Blob> => {
  const { data } = await api.post<Blob>("/task/generate", proposalData, {
    responseType: "blob",
  });
  return data;
};

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

// ============================================
// HOOKS - RAG SERVICE
// ============================================

/**
 * Hook para indexar contenido de texto en el RAG
 */
export const useIngestText = () => {
  return useMutation({
    mutationFn: ingestText,
  });
};

/**
 * Hook para buscar documentos con el RAG
 */
export const useSearchRAG = () => {
  return useMutation({
    mutationFn: searchRAG,
  });
};

/**
 * Hook para eliminar documento del RAG
 */
export const useDeleteRAGDocument = () => {
  return useMutation({
    mutationFn: deleteRAGDocument,
  });
};

/**
 * Hook para verificar salud del RAG service
 */
export const useRAGHealthCheck = () => {
  return useQuery({
    queryKey: ["rag-health"],
    queryFn: ragHealthCheck,
    refetchInterval: 30000, // Revalidar cada 30 segundos
    retry: 3,
  });
};

// ============================================
// HOOKS - DOCUMENT STATUS POLLING WITH EXPONENTIAL BACKOFF
// ============================================

/**
 * Configuration for exponential backoff polling
 */
const POLLING_CONFIG = {
  INITIAL_INTERVAL: 2000,  // Start with 2 seconds
  MAX_INTERVAL: 30000,     // Max 30 seconds
  BACKOFF_MULTIPLIER: 1.5, // Increase by 1.5x each time
  MAX_RETRIES: 60,         // Stop after ~60 attempts (roughly 10-15 minutes)
} as const;

/**
 * Calculate next polling interval using exponential backoff
 */
const calculateBackoffInterval = (attemptCount: number): number => {
  const interval = Math.min(
    POLLING_CONFIG.INITIAL_INTERVAL * Math.pow(POLLING_CONFIG.BACKOFF_MULTIPLIER, attemptCount),
    POLLING_CONFIG.MAX_INTERVAL
  );
  return Math.round(interval);
};

/**
 * Hook para obtener el estado de un documento con polling automático y exponential backoff
 */
export const useDocumentStatus = (documentId: string, enabled: boolean = true) => {
  const attemptCountRef = useRef(0);
  const lastStatusRef = useRef<DocumentStatus | null>(null);

  return useQuery({
    queryKey: ["document-status", documentId],
    queryFn: async () => {
      const result = await getDocumentStatus(documentId);
      
      // Track status changes for backoff reset
      if (result.status !== lastStatusRef.current) {
        // Reset attempt count on status change (e.g., PENDING → PROCESSING)
        if (lastStatusRef.current !== null) {
          attemptCountRef.current = 0;
        }
        lastStatusRef.current = result.status as DocumentStatus;
      }
      
      return result;
    },
    enabled: !!documentId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as DocumentPublic | undefined;
      
      // Stop polling if terminal state reached
      if (data?.status === "COMPLETED" || data?.status === "FAILED") {
        attemptCountRef.current = 0;
        return false;
      }
      
      // Stop polling after max retries
      if (attemptCountRef.current >= POLLING_CONFIG.MAX_RETRIES) {
        console.warn(`Document ${documentId}: Max polling attempts reached`);
        return false;
      }
      
      // Calculate next interval with exponential backoff
      const nextInterval = calculateBackoffInterval(attemptCountRef.current);
      attemptCountRef.current++;
      
      return nextInterval;
    },
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 0, // Data is always considered stale during polling
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook para obtener documentos pendientes de un workspace con exponential backoff
 */
export const usePendingDocuments = (workspaceId: string, enabled: boolean = true) => {
  const attemptCountRef = useRef(0);

  return useQuery({
    queryKey: ["pending-documents", workspaceId],
    queryFn: async () => {
      const result = await getPendingDocuments(workspaceId);
      return result;
    },
    enabled: !!workspaceId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as DocumentPublic[] | undefined;
      
      // Stop polling if no pending documents
      if (!data || data.length === 0) {
        attemptCountRef.current = 0;
        return false;
      }
      
      // Stop after max retries
      if (attemptCountRef.current >= POLLING_CONFIG.MAX_RETRIES) {
        return false;
      }
      
      // Use slower backoff for batch polling (starts at 5 seconds)
      const nextInterval = calculateBackoffInterval(attemptCountRef.current) + 3000;
      attemptCountRef.current++;
      
      return nextInterval;
    },
    retry: 2,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
