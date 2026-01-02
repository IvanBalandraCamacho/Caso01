import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  RAGIngestRequest,
  IngestResponse,
  SearchRequest,
  SearchResult,
  Token,
  HTTPValidationError,
  DocumentPublic,
  WorkspacePublic,
  WorkspaceCreate,
  WorkspaceUpdate,
  ConversationPublic,
  ConversationWithMessages,
  ConversationCreate,
  UserPublic,
  UserCreate,
  GenerateDownloadableDocRequest,
  DownloadableDocumentResponse,
  ProposalAnalysis,
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
  Servicio,
  Trabajador,
  HealthCheckResponse,
  DetailedHealthCheckResponse,
  LLMHealthCheckResponse,
  CacheStats,
  LLMMetrics,
  QueryAnalysis,
  TeamSuggestionRequest,
  TeamSuggestionResponse,
} from "@/types/api";

// ============================================
// MAIN API CLIENT (original apiClient)
// ============================================
const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// TOKEN REFRESH LOGIC
// ============================================
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Attempt to refresh the JWT token
 * Uses /api/v1/auth/refresh endpoint per OpenAPI spec
 */
const refreshToken = async (): Promise<string | null> => {
  const currentToken = localStorage.getItem("access_token");
  if (!currentToken) return null;

  try {
    const response = await axios.post<Token>(
      `${baseURL}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );
    const newToken = response.data.access_token;
    localStorage.setItem("access_token", newToken);
    return newToken;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

/**
 * Handle logout - clear token and redirect
 */
const handleLogout = () => {
  localStorage.removeItem("access_token");
  // Dispatch custom event for other components to react
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("logout"));
    window.location.href = "/login";
  }
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (error: HTTPValidationError): string => {
  if (!error.detail || !Array.isArray(error.detail)) {
    return "Error de validación desconocido";
  }
  return error.detail
    .map((err) => {
      const location = err.loc.join(" → ");
      return `${location}: ${err.msg}`;
    })
    .join("\n");
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor with token refresh and validation error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<HTTPValidationError | { detail: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response) {
      const status = error.response.status;

      // Handle 401 Unauthorized - attempt token refresh first
      if (status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Queue this request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          if (newToken) {
            processQueue(null, newToken);
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          } else {
            // Refresh failed - logout
            processQueue(new Error("Token refresh failed"), null);
            handleLogout();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          handleLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle 422 Validation Error
      if (status === 422) {
        const validationError = error.response.data as HTTPValidationError;
        console.error(
          "Validation Error (422):",
          formatValidationErrors(validationError)
        );
        // Re-throw with formatted message for UI handling
        const formattedError = new Error(formatValidationErrors(validationError));
        (formattedError as Error & { validationDetails: HTTPValidationError }).validationDetails = validationError;
        return Promise.reject(formattedError);
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.error("Forbidden (403): No tienes permisos para realizar esta acción");
      }

      // Handle other errors
      console.error(
        "Error de respuesta:",
        status,
        error.response.data,
      );
    } else if (error.request) {
      console.error("Error de red:", error.message);
    } else {
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  },
);

// ============================================
// RAG API CLIENT (Proxied via Backend)
// ============================================
// RAG requests are now proxied through the main backend API
// to ensure security and valid authentication.

// RAG helper functions
export const ingestText = async (
  request: RAGIngestRequest,
): Promise<IngestResponse> => {
  const { data } = await api.post<IngestResponse>("/rag/ingest_text", request);
  return data;
};

export const searchRAG = async (
  request: SearchRequest,
): Promise<SearchResult[]> => {
  const { data } = await api.post<SearchResult[]>("/rag/search", request);
  return data;
};

export const deleteRAGDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/rag/delete/${documentId}`);
};

export const ragHealthCheck = async (): Promise<{ status: string }> => {
  const { data } = await api.get("/rag/health");
  return data;
};

// ============================================
// WORKSPACE API FUNCTIONS
// ============================================

/**
 * Get all workspaces for current user
 * GET /api/v1/workspaces
 */
export const fetchWorkspaces = async (): Promise<WorkspacePublic[]> => {
  const { data } = await api.get<WorkspacePublic[]>("/workspaces");
  return data;
};

/**
 * Get a specific workspace by ID
 * GET /api/v1/workspaces/{workspace_id}
 */
export const fetchWorkspaceDetails = async (workspaceId: string): Promise<WorkspacePublic> => {
  const { data } = await api.get<WorkspacePublic>(`/workspaces/${workspaceId}`);
  return data;
};

/**
 * Create a new workspace
 * POST /api/v1/workspaces
 */
export const createWorkspaceApi = async (
  workspace: WorkspaceCreate,
): Promise<WorkspacePublic> => {
  const { data } = await api.post<WorkspacePublic>("/workspaces", workspace);
  return data;
};

/**
 * Update an existing workspace
 * PUT /api/v1/workspaces/{workspace_id}
 */
export const updateWorkspaceApi = async (
  workspaceId: string,
  updates: WorkspaceUpdate,
): Promise<WorkspacePublic> => {
  const { data } = await api.put<WorkspacePublic>(`/workspaces/${workspaceId}`, updates);
  return data;
};

/**
 * Delete a workspace
 * DELETE /api/v1/workspaces/{workspace_id}
 */
export const deleteWorkspaceApi = async (workspaceId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}`);
};

/**
 * Get all documents in a workspace
 * GET /api/v1/workspaces/{workspace_id}/documents
 */
export const fetchWorkspaceDocuments = async (workspaceId: string): Promise<DocumentPublic[]> => {
  const { data } = await api.get<DocumentPublic[]>(`/workspaces/${workspaceId}/documents`);
  return data;
};

/**
 * Get pending/processing documents in a workspace
 * GET /api/v1/workspaces/{workspace_id}/documents/pending
 */
export const getPendingDocuments = async (workspaceId: string): Promise<DocumentPublic[]> => {
  const { data } = await api.get<DocumentPublic[]>(`/workspaces/${workspaceId}/documents/pending`);
  return data;
};

/**
 * Upload a document to a workspace
 * POST /api/v1/workspaces/{workspace_id}/upload
 * Supports progress tracking via onProgress callback
 */
export const uploadDocumentApi = async (
  workspaceId: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
): Promise<DocumentPublic> => {
  const { data } = await api.post<DocumentPublic>(
    `/workspaces/${workspaceId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress
        ? (progressEvent) => {
          const total = progressEvent.total || 0;
          const current = progressEvent.loaded;
          const percentCompleted = total > 0 ? Math.round((current / total) * 100) : 0;
          onProgress(percentCompleted);
        }
        : undefined,
    },
  );
  return data;
};

/**
 * Export documents to CSV
 * GET /api/v1/workspaces/{workspace_id}/documents/export-csv
 */
export const exportDocumentsToCsvApi = async (workspaceId: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(
    `/workspaces/${workspaceId}/documents/export-csv`,
    {
      responseType: "blob",
    },
  );
  return data;
};

/**
 * Update a conversation title
 * PUT /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}
 */
export const updateConversationApi = async (
  workspaceId: string,
  conversationId: string,
  updates: { title: string },
): Promise<ConversationWithMessages> => {
  const { data } = await api.put<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
    updates,
  );
  return data;
};

/**
 * Delete a document
 * DELETE /api/v1/documents/{document_id}
 */
export const deleteDocumentApi = async (documentId: string): Promise<void> => {
  await api.delete(`/documents/${documentId}`);
};

/**
 * Get document status (for polling)
 * GET /api/v1/documents/{document_id}/status
 */
export const getDocumentStatus = async (documentId: string): Promise<DocumentPublic> => {
  const { data } = await api.get<DocumentPublic>(`/documents/${documentId}/status`);
  return data;
};

// ============================================
// CONVERSATION API FUNCTIONS
// ============================================

/**
 * Get all conversations in a workspace
 * GET /api/v1/workspaces/{workspace_id}/conversations
 */
export const fetchConversations = async (workspaceId: string): Promise<ConversationPublic[]> => {
  const { data } = await api.get<ConversationPublic[]>(`/workspaces/${workspaceId}/conversations`);
  return data;
};

/**
 * Get all general conversations (no workspace)
 * GET /api/v1/conversations/general
 */
export const fetchGeneralConversations = async (): Promise<ConversationPublic[]> => {
  const { data } = await api.get<ConversationPublic[]>("/conversations/general");
  return data;
};

/**
 * Create a new conversation
 * POST /api/v1/workspaces/{workspace_id}/conversations
 */
export const createConversationApi = async (
  workspaceId: string,
  title: string,
): Promise<ConversationPublic> => {
  const { data } = await api.post<ConversationPublic>(`/workspaces/${workspaceId}/conversations`, {
    title,
  } as ConversationCreate);
  return data;
};

/**
 * Get a conversation with all messages
 * GET /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}
 */
export const fetchConversationMessages = async (
  workspaceId: string | null,
  conversationId: string,
): Promise<ConversationWithMessages> => {
  if (!workspaceId) {
    return fetchGeneralConversationMessages(conversationId);
  }
  const { data } = await api.get<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
  );
  return data;
};

/**
 * Get a general conversation with all messages
 * GET /api/v1/conversations/{conversation_id}
 */
export const fetchGeneralConversationMessages = async (
  conversationId: string,
): Promise<ConversationWithMessages> => {
  const { data } = await api.get<ConversationWithMessages>(
    `/conversations/${conversationId}`,
  );
  return data;
};

/**
 * Delete a conversation
 * DELETE /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}
 */
export const deleteConversationApi = async (
  workspaceId: string,
  conversationId: string,
): Promise<void> => {
  await api.delete(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
  );
};

/**
 * Delete a general conversation
 * DELETE /api/v1/conversations/{conversation_id}
 */
export const deleteGeneralConversationApi = async (
  conversationId: string,
): Promise<void> => {
  await api.delete(`/conversations/${conversationId}`);
};

/**
 * Get documents in a specific conversation
 * GET /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/documents
 */
export const fetchConversationDocuments = async ({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId: string;
}): Promise<DocumentPublic[]> => {
  const { data } = await api.get<DocumentPublic[]>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/documents`,
  );
  return data;
};

/**
 * Upload a document to a specific conversation
 * POST /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/upload
 * Supports progress tracking via onProgress callback
 */
export const uploadDocumentToConversation = async (
  workspaceId: string,
  conversationId: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
): Promise<DocumentPublic> => {
  const { data } = await api.post<DocumentPublic>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress
        ? (progressEvent) => {
          const total = progressEvent.total || 0;
          const current = progressEvent.loaded;
          const percentCompleted = total > 0 ? Math.round((current / total) * 100) : 0;
          onProgress(percentCompleted);
        }
        : undefined,
    },
  );
  return data;
};

// ============================================
// CHAT API FUNCTIONS
// ============================================

/**
 * Send a chat message (RAG pipeline)
 * POST /api/v1/workspaces/{workspace_id}/chat
 */
export const sendChatMessage = async (
  workspaceId: string,
  request: ChatRequest,
): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>(
    `/workspaces/${workspaceId}/chat`,
    request,
  );
  return data;
};

/**
 * Send a chat message with streaming response (NDJSON)
 * POST /api/v1/workspaces/{workspace_id}/chat
 * 
 * Handles both NDJSON (JSON per line) and SSE (data: prefix) formats.
 * 
 * @param workspaceId - The workspace ID
 * @param request - Chat request with query and optional conversation_id
 * @param onChunk - Callback called for each event from the stream
 *                  Receives the full parsed event object (content, sources, or intent)
 * @param onComplete - Callback called when streaming is complete
 * @param onError - Callback called if an error occurs
 * @param onIntent - [DEPRECATED] Use onChunk with ChatStreamEvent_Intent type instead
 */
export const sendChatMessageStream = async (
  workspaceId: string,
  request: ChatRequest,
  onChunk: (event: ChatStreamEvent) => void,
  onComplete?: (conversationId: string) => void,
  onError?: (error: Error) => void,
  onIntent?: (intent: string) => void,
): Promise<void> => {
  const token = localStorage.getItem("access_token");
  const url = `${baseURL}/workspaces/${workspaceId}/chat`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Error ${response.status}: ${response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    let conversationId = "";
    let buffer = "";

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
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith(":")) {
          // Ignorar líneas vacías y comentarios SSE
          continue;
        }

        // Determinar el contenido JSON a parsear
        let jsonData: string;

        if (trimmedLine.startsWith("data: ")) {
          // Formato SSE
          jsonData = trimmedLine.slice(6).trim();

          if (jsonData === "[DONE]") {
            if (onComplete) onComplete(conversationId);
            return;
          }
        } else {
          // Formato NDJSON puro (JSON directo por línea)
          jsonData = trimmedLine;
        }

        try {
          const parsed = JSON.parse(jsonData) as ChatStreamEvent & {
            conversation_id?: string;
            model_used?: string;
          };

          // Extraer conversation_id si está disponible
          if (parsed.conversation_id) {
            conversationId = parsed.conversation_id;
          }

          // Manejar eventos con type: "intent" (también llama callback deprecated)
          if (parsed.type === "intent" && "intent" in parsed) {
            console.log("Intent detectado:", parsed.intent);
            if (onIntent) {
              onIntent(parsed.intent);
            }
            // Enviar al nuevo callback también
            onChunk(parsed);
            continue;
          }

          // Pasar todos los eventos al callback (content, sources, etc.)
          onChunk(parsed);
        } catch (e) {
          console.warn("Error parsing JSON chunk:", jsonData, e);
        }
      }
    }

    // Procesar cualquier dato restante en el buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as ChatStreamEvent & { conversation_id?: string };
        if (parsed.conversation_id) {
          conversationId = parsed.conversation_id;
        }
        onChunk(parsed);
      } catch (e) {
        console.warn("Error parsing final buffer:", buffer, e);
      }
    }

    if (onComplete) onComplete(conversationId);
  } catch (error) {
    console.error("Streaming error:", error);
    if (onError) {
      onError(error instanceof Error ? error : new Error("Unknown streaming error"));
    } else {
      throw error;
    }
  }
};

/**
 * Send a general chat message with streaming response (Landing page - No Workspace)
 * POST /api/v1/chat/general
 */
export const sendGeneralChatMessageStream = async (
  request: ChatRequest,
  onChunk: (event: ChatStreamEvent) => void,
  onComplete?: (conversationId: string) => void,
  onError?: (error: Error) => void,
): Promise<void> => {
  const token = localStorage.getItem("access_token");
  const url = `${baseURL}/chat/general`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Error ${response.status}: ${response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    let conversationId = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        try {
          const parsed = JSON.parse(trimmedLine) as ChatStreamEvent & {
            conversation_id?: string;
          };

          if (parsed.type === "conversation_id" && "id" in parsed) {
            conversationId = parsed.id as string;
          }

          onChunk(parsed);
        } catch (e) {
          console.warn("Error parsing JSON chunk:", trimmedLine, e);
        }
      }
    }

    if (onComplete) onComplete(conversationId);
  } catch (error) {
    console.error("Streaming error:", error);
    if (onError) {
      onError(error instanceof Error ? error : new Error("Unknown streaming error"));
    } else {
      throw error;
    }
  }
};

// ============================================
// EXPORT API FUNCTIONS
// ============================================

/**
 * Export chat history to TXT
 * GET /api/v1/workspaces/{workspace_id}/chat/export/txt
 */
export const exportChatToTxtApi = async (
  workspaceId: string,
  conversationId?: string,
): Promise<Blob> => {
  const params = conversationId ? `?conversation_id=${conversationId}` : "";
  const { data } = await api.get<Blob>(
    `/workspaces/${workspaceId}/chat/export/txt${params}`,
    {
      responseType: "blob",
    },
  );
  return data;
};

/**
 * Export chat history to PDF
 * GET /api/v1/workspaces/{workspace_id}/chat/export/pdf
 */
export const exportChatToPdfApi = async (
  workspaceId: string,
  conversationId?: string,
): Promise<Blob> => {
  const params = conversationId ? `?conversation_id=${conversationId}` : "";
  const { data } = await api.get<Blob>(
    `/workspaces/${workspaceId}/chat/export/pdf${params}`,
    {
      responseType: "blob",
    },
  );
  return data;
};

/**
 * Delete chat history for a conversation
 * DELETE /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/messages
 */
export const deleteChatHistoryApi = async (
  workspaceId: string,
  conversationId: string,
): Promise<void> => {
  await api.delete(
    `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
  );
};

/**
 * Fulltext search across workspace documents
 * GET /api/v1/workspaces/{workspace_id}/search
 */
export const fulltextSearchApi = async (
  workspaceId: string,
  query: string,
  limit?: number,
): Promise<SearchResult[]> => {
  const params = new URLSearchParams({ query });
  if (limit) params.append("limit", limit.toString());
  const { data } = await api.get<SearchResult[]>(
    `/workspaces/${workspaceId}/search?${params.toString()}`,
  );
  return data;
};

// ============================================
// AUTH API FUNCTIONS
// ============================================

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const registerUser = async (userData: UserCreate): Promise<UserPublic> => {
  const { data } = await api.post<UserPublic>("/auth/register", userData);
  return data;
};

/**
 * Login user with email and password
 * POST /api/v1/auth/login (OAuth2 password flow)
 * Note: Uses form-urlencoded format per OAuth2 spec
 */
export const loginUser = async (email: string, password: string): Promise<Token> => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const { data } = await api.post<Token>("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return data;
};

/**
 * Get current authenticated user info
 * GET /api/v1/auth/me
 */
export const checkAuthMe = async (): Promise<UserPublic> => {
  const { data } = await api.get<UserPublic>("/auth/me");
  return data;
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshAccessToken = async (): Promise<Token> => {
  const { data } = await api.post<Token>("/auth/refresh");
  return data;
};

/**
 * Logout user (mainly for logging/auditing)
 * POST /api/v1/auth/logout
 */
export const logoutUser = async (): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>("/auth/logout");
  return data;
};

// ============================================
// DOCUMENT GENERATION API FUNCTIONS
// ============================================

/**
 * Generate a downloadable document (TXT/Markdown/PDF)
 * POST /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/generate-downloadable
 */
export const generateDownloadableDocument = async (
  workspaceId: string,
  conversationId: string,
  options: GenerateDownloadableDocRequest,
): Promise<DownloadableDocumentResponse> => {
  const { data } = await api.post<DownloadableDocumentResponse>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/generate-downloadable`,
    options,
  );
  return data;
};

/**
 * Download document directly in a specific format
 * GET /api/v1/workspaces/{workspace_id}/conversations/{conversation_id}/download/{format}
 */
export const downloadDocumentDirect = async (
  workspaceId: string,
  conversationId: string,
  format: "txt" | "markdown" | "pdf",
  documentType: string = "complete",
  includeMetadata: boolean = true,
): Promise<Blob> => {
  const params = new URLSearchParams({
    document_type: documentType,
    include_metadata: includeMetadata.toString(),
  });
  const { data } = await api.get<Blob>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/download/${format}?${params}`,
    {
      responseType: "blob",
    },
  );
  return data;
};

// ============================================
// PROPOSAL/TASK ANALYSIS API FUNCTIONS
// ============================================

/**
 * Analyze a document/RFP using AI
 * POST /api/v1/task/analyze
 * Note: This endpoint accepts multipart/form-data with a file
 */
export const analyzeDocumentApi = async (
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ProposalAnalysis> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ProposalAnalysis>("/task/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: onProgress
      ? (progressEvent) => {
        const total = progressEvent.total || 0;
        const current = progressEvent.loaded;
        const percentCompleted = total > 0 ? Math.round((current / total) * 100) : 0;
        onProgress(percentCompleted);
      }
      : undefined,
  });
  return data;
};

/**
 * Generate a proposal document (Word)
 * POST /api/v1/task/generate
 */
export const generateProposalDocumentApi = async (
  proposalData: Record<string, unknown>,
): Promise<Blob> => {
  const { data } = await api.post("/task/generate", proposalData, {
    responseType: "blob",
  });
  return data;
};

/**
 * Download a proposal document from markdown content
 * POST /api/v1/conversations/proposals/download
 */
export const downloadProposalFromMarkdown = async (
  rawMarkdown: string,
  cliente: string = "Propuesta",
  format: "docx" | "pdf" = "docx",
): Promise<Blob> => {
  const { data } = await api.post(
    `/conversations/proposals/download?format=${format}`,
    {
      raw_markdown: rawMarkdown,
      cliente: cliente,
    },
    {
      responseType: "blob",
    },
  );
  return data;
};

// ============================================
// TIVIT SERVICES API FUNCTIONS
// ============================================

/**
 * Get list of TIVIT services
 * GET /api/v1/servicios
 */
export const fetchServicios = async (
  categoria?: string,
  nivelDificultad?: string,
): Promise<Servicio[]> => {
  const params = new URLSearchParams();
  if (categoria) params.append("categoria", categoria);
  if (nivelDificultad) params.append("nivel_dificultad", nivelDificultad);

  const query = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get<Servicio[]>(`/servicios${query}`);
  return data;
};

/**
 * Get a specific service by ID
 * GET /api/v1/servicios/{servicio_id}
 */
export const fetchServicioById = async (servicioId: string): Promise<Servicio> => {
  const { data } = await api.get<Servicio>(`/servicios/${servicioId}`);
  return data;
};

/**
 * Get list of TIVIT workers
 * GET /api/v1/trabajadores
 */
export const fetchTrabajadores = async (
  area?: string,
  rol?: string,
  disponibilidad?: string,
): Promise<Trabajador[]> => {
  const params = new URLSearchParams();
  if (area) params.append("area", area);
  if (rol) params.append("rol", rol);
  if (disponibilidad) params.append("disponibilidad", disponibilidad);

  const query = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get<Trabajador[]>(`/trabajadores${query}`);
  return data;
};

/**
 * Get a specific worker by ID
 * GET /api/v1/trabajadores/{trabajador_id}
 */
export const fetchTrabajadorById = async (trabajadorId: string): Promise<Trabajador> => {
  const { data } = await api.get<Trabajador>(`/trabajadores/${trabajadorId}`);
  return data;
};

/**
 * Suggest a team based on requirements
 * POST /api/v1/equipos/sugerir
 */
export const sugerirEquipo = async (
  requerimientos: TeamSuggestionRequest,
): Promise<TeamSuggestionResponse> => {
  const { data } = await api.post<TeamSuggestionResponse>("/equipos/sugerir", requerimientos);
  return data;
};

// ============================================
// HEALTH CHECK API FUNCTIONS
// ============================================

/**
 * Basic health check
 * GET /api/v1/health
 */
export const healthCheck = async (): Promise<HealthCheckResponse> => {
  const { data } = await api.get<HealthCheckResponse>("/health");
  return data;
};

/**
 * Detailed health check with service status
 * GET /api/v1/health/detailed
 */
export const detailedHealthCheck = async (): Promise<DetailedHealthCheckResponse> => {
  const { data } = await api.get<DetailedHealthCheckResponse>("/health/detailed");
  return data;
};

/**
 * Kubernetes readiness probe
 * GET /api/v1/health/ready
 */
export const readinessProbe = async (): Promise<HealthCheckResponse> => {
  const { data } = await api.get<HealthCheckResponse>("/health/ready");
  return data;
};

/**
 * Kubernetes liveness probe
 * GET /api/v1/health/live
 */
export const livenessProbe = async (): Promise<HealthCheckResponse> => {
  const { data } = await api.get<HealthCheckResponse>("/health/live");
  return data;
};

/**
 * LLM-specific health check
 * GET /api/v1/health/llm
 */
export const llmHealthCheck = async (): Promise<LLMHealthCheckResponse> => {
  const { data } = await api.get<LLMHealthCheckResponse>("/health/llm");
  return data;
};

// ============================================
// CACHE & LLM METRICS API FUNCTIONS
// ============================================

/**
 * Get cache statistics
 * GET /api/v1/cache/stats
 */
export const getCacheStats = async (): Promise<CacheStats> => {
  const { data } = await api.get<CacheStats>("/cache/stats");
  return data;
};

/**
 * Invalidate cache
 * POST /api/v1/cache/invalidate
 */
export const invalidateCache = async (): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>("/cache/invalidate");
  return data;
};

/**
 * Get LLM system metrics
 * GET /api/v1/llm/metrics
 */
export const getLLMMetrics = async (): Promise<LLMMetrics> => {
  const { data } = await api.get<LLMMetrics>("/llm/metrics");
  return data;
};

/**
 * Analyze query complexity (for debugging)
 * POST /api/v1/llm/analyze-query
 */
export const analyzeQueryComplexity = async (request: ChatRequest): Promise<QueryAnalysis> => {
  const { data } = await api.post<QueryAnalysis>("/llm/analyze-query", request);
  return data;
};

/**
 * Fetch document content for preview
 * GET /api/v1/workspaces/{workspace_id}/documents/{document_id}/content
 */
export const fetchDocumentContent = async (
  workspaceId: string,
  documentId: string
): Promise<Blob> => {
  const { data } = await api.get<Blob>(
    `/workspaces/${workspaceId}/documents/${documentId}/content`,
    {
      responseType: "blob",
    }
  );
  return data;
};


// ============================================
// PROPOSAL & RFP API FUNCTIONS
// ============================================

export interface ProposalRequest {
  workspace_id: string;
  conversation_id?: string;
  requirements: string;
  context?: string;
  output_format: string;
}

/**
 * Analyze an RFP or proposal requirements
 * POST /api/v1/proposal/analyze
 */
export const analyzeProposalApi = async (data: ProposalRequest): Promise<ProposalAnalysis> => {
  const { data: response } = await api.post<ProposalAnalysis>("/proposal/analyze", data);
  return response;
};

export default api;
