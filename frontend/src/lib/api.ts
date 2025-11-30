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
  ConversationPublic,
  ConversationWithMessages,
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
// RAG API CLIENT (original ragClient)
// ============================================
const ragBaseURL =
  process.env.NEXT_PUBLIC_RAG_SERVICE_URL || "http://localhost:8080";

export const ragApi: AxiosInstance = axios.create({
  baseURL: ragBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Same interceptors for RAG (assumes auth needed)
ragApi.interceptors.request.use(
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

ragApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "RAG Error de respuesta:",
        error.response.status,
        error.response.data,
      );
    } else if (error.request) {
      console.error("RAG Error de red:", error.message);
    } else {
      console.error("RAG Error:", error.message);
    }
    return Promise.reject(error);
  },
);

// RAG helper functions
export const ingestText = async (
  request: RAGIngestRequest,
): Promise<IngestResponse> => {
  const { data } = await ragApi.post<IngestResponse>("/ingest_text", request);
  return data;
};

export const searchRAG = async (
  request: SearchRequest,
): Promise<SearchResult[]> => {
  const { data } = await ragApi.post<SearchResult[]>("/search", request);
  return data;
};

export const deleteRAGDocument = async (documentId: string): Promise<void> => {
  await ragApi.delete(`/delete/${documentId}`);
};

export const ragHealthCheck = async (): Promise<{ status: string }> => {
  const { data } = await ragApi.get("/health");
  return data;
};

// ============================================
// WORKSPACE API FUNCTIONS
// ============================================

export const fetchWorkspaces = async (): Promise<WorkspacePublic[]> => {
  const { data } = await api.get<WorkspacePublic[]>("/workspaces");
  return data;
};

export const updateWorkspaceApi = async (
  workspaceId: string,
  updates: Record<string, unknown>,
): Promise<WorkspacePublic> => {
  const { data } = await api.put<WorkspacePublic>(`/workspaces/${workspaceId}`, updates);
  return data;
};

export const deleteWorkspaceApi = async (workspaceId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}`);
};

export const fetchWorkspaceDocuments = async (workspaceId: string): Promise<DocumentPublic[]> => {
  const { data } = await api.get<DocumentPublic[]>(`/workspaces/${workspaceId}/documents`);
  return data;
};

export const fetchWorkspaceDetails = async (workspaceId: string): Promise<WorkspacePublic> => {
  const { data } = await api.get<WorkspacePublic>(`/workspaces/${workspaceId}`);
  return data;
};

/**
 * Upload a document to a workspace
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

export const deleteDocumentApi = async (documentId: string): Promise<void> => {
  await api.delete(`/documents/${documentId}`);
};

// ============================================
// CONVERSATION API FUNCTIONS
// ============================================

export const fetchConversations = async (workspaceId: string): Promise<ConversationPublic[]> => {
  const { data } = await api.get<ConversationPublic[]>(`/workspaces/${workspaceId}/conversations`);
  return data;
};

export const createConversationApi = async (
  workspaceId: string,
  title: string,
): Promise<ConversationPublic> => {
  const { data } = await api.post<ConversationPublic>(`/workspaces/${workspaceId}/conversations`, {
    title,
  });
  return data;
};

export const deleteConversationApi = async (
  workspaceId: string,
  conversationId: string,
): Promise<void> => {
  await api.delete(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
  );
};

export const fetchConversationMessages = async (
  workspaceId: string,
  conversationId: string,
): Promise<ConversationWithMessages> => {
  const { data } = await api.get<ConversationWithMessages>(
    `/workspaces/${workspaceId}/conversations/${conversationId}`,
  );
  return data;
};

// ============================================
// EXPORT API FUNCTIONS
// ============================================

export const exportDocumentsToCsvApi = async (workspaceId: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(
    `/workspaces/${workspaceId}/documents/export-csv`,
    {
      responseType: "blob",
    },
  );
  return data;
};

export const exportChatToTxtApi = async (
  workspaceId: string,
  conversationId?: string,
): Promise<Blob> => {
  const url = conversationId
    ? `/workspaces/${workspaceId}/chat/export/txt?conversation_id=${conversationId}`
    : `/workspaces/${workspaceId}/chat/export/txt`;
  const { data } = await api.get<Blob>(url, {
    responseType: "blob",
  });
  return data;
};

export const exportChatToPdfApi = async (
  workspaceId: string,
  conversationId?: string,
): Promise<Blob> => {
  const url = conversationId
    ? `/workspaces/${workspaceId}/chat/export/pdf?conversation_id=${conversationId}`
    : `/workspaces/${workspaceId}/chat/export/pdf`;
  const { data } = await api.get<Blob>(url, {
    responseType: "blob",
  });
  return data;
};

export const deleteChatHistoryApi = async (workspaceId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}/chat/history`);
};

export const fulltextSearchApi = async (query: string): Promise<SearchResult[]> => {
  const { data } = await api.get<SearchResult[]>(`/workspaces/fulltext-search?query=${query}`);
  return data;
};

// ============================================
// AUTH API FUNCTIONS
// ============================================

export const checkAuthMe = async (): Promise<import("@/types/api").UserPublic> => {
  const { data } = await api.get<import("@/types/api").UserPublic>("/auth/me");
  return data;
};

// ============================================
// DOCUMENT GENERATION API FUNCTIONS
// ============================================

export const generateDownloadableDocument = async (
  workspaceId: string,
  conversationId: string,
  options: import("@/types/api").GenerateDownloadableDocRequest,
): Promise<import("axios").AxiosResponse<Blob>> => {
  const response = await api.post<Blob>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/generate-downloadable`,
    options,
    {
      responseType: "blob",
    },
  );
  return response;
};

export const generateConversationTitle = async (
  workspaceId: string,
  conversationId: string,
): Promise<{ title: string }> => {
  const { data } = await api.post<{ title: string }>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/generate-title`,
  );
  return data;
};

// ============================================
// CONVERSATION DOCUMENTS API FUNCTIONS
// ============================================

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
// DOCUMENT STATUS POLLING API FUNCTIONS
// ============================================

export const getDocumentStatus = async (documentId: string): Promise<DocumentPublic> => {
  const { data } = await api.get<DocumentPublic>(`/documents/${documentId}/status`);
  return data;
};

export const getPendingDocuments = async (workspaceId: string): Promise<DocumentPublic[]> => {
  const { data } = await api.get<DocumentPublic[]>(`/workspaces/${workspaceId}/documents/pending`);
  return data;
};

export default api;
