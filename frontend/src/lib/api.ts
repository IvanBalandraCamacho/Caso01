import axios, { AxiosInstance } from 'axios';
import {
  RAGIngestRequest,
  IngestResponse,
  SearchRequest,
  SearchResult,
} from '@/types/api';

// ============================================
// MAIN API CLIENT (original apiClient)
// ============================================
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Error de respuesta:', error.response.status, error.response.data);
      if (error.response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      if (error.response.status === 403) {
        console.error('No tienes permisos para realizar esta acción');
      }
    } else if (error.request) {
      console.error('Error de red:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================
// RAG API CLIENT (original ragClient)
// ============================================
const ragBaseURL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:8080';

export const ragApi: AxiosInstance = axios.create({
  baseURL: ragBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Same interceptors for RAG (assumes auth needed)
ragApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

ragApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('RAG Error de respuesta:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('RAG Error de red:', error.message);
    } else {
      console.error('RAG Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// RAG helper functions
export const ingestText = async (request: RAGIngestRequest): Promise<IngestResponse> => {
  const { data } = await ragApi.post<IngestResponse>('/ingest_text', request);
  return data;
};

export const searchRAG = async (request: SearchRequest): Promise<SearchResult[]> => {
  const { data } = await ragApi.post<SearchResult[]>('/search', request);
  return data;
};

export const deleteRAGDocument = async (documentId: string): Promise<void> => {
  await ragApi.delete(`/delete/${documentId}`);
};

export const ragHealthCheck = async (): Promise<{ status: string }> => {
  const { data } = await ragApi.get('/health');
  return data;
};

// ============================================
// WORKSPACE API FUNCTIONS
// ============================================

export const fetchWorkspaces = async () => {
  const { data } = await api.get('/workspaces');
  return data;
};

export const updateWorkspaceApi = async (workspaceId: string, updates: Record<string, unknown>) => {
  const { data } = await api.put(`/workspaces/${workspaceId}`, updates);
  return data;
};

export const deleteWorkspaceApi = async (workspaceId: string) => {
  const { data } = await api.delete(`/workspaces/${workspaceId}`);
  return data;
};

export const fetchWorkspaceDocuments = async (workspaceId: string) => {
  const { data } = await api.get(`/workspaces/${workspaceId}/documents`);
  return data;
};

export const fetchWorkspaceDetails = async (workspaceId: string) => {
  const { data } = await api.get(`/workspaces/${workspaceId}`);
  return data;
};

export const uploadDocumentApi = async (workspaceId: string, formData: FormData) => {
  const { data } = await api.post(`/workspaces/${workspaceId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const updateConversationApi = async (workspaceId: string, conversationId: string, updates: { title: string }) => {
  const { data } = await api.put(`/workspaces/${workspaceId}/conversations/${conversationId}`, updates);
  return data;
};

export const deleteDocumentApi = async (documentId: string) => {
  const { data } = await api.delete(`/documents/${documentId}`);
  return data;
};

// ============================================
// CONVERSATION API FUNCTIONS
// ============================================

export const fetchConversations = async (workspaceId: string) => {
  const { data } = await api.get(`/workspaces/${workspaceId}/conversations`);
  return data;
};

export const createConversationApi = async (workspaceId: string, title: string) => {
  const { data } = await api.post(`/workspaces/${workspaceId}/conversations`, { title });
  return data;
};

export const deleteConversationApi = async (workspaceId: string, conversationId: string) => {
  const { data } = await api.delete(`/workspaces/${workspaceId}/conversations/${conversationId}`);
  return data;
};

export const fetchConversationMessages = async (workspaceId: string, conversationId: string) => {
  const { data } = await api.get(`/workspaces/${workspaceId}/conversations/${conversationId}`);
  return data;
};

// ============================================
// EXPORT API FUNCTIONS
// ============================================

export const exportDocumentsToCsvApi = async (workspaceId: string) => {
  const { data } = await api.get(`/workspaces/${workspaceId}/documents/export-csv`, {
    responseType: 'blob',
  });
  return data;
};

export const exportChatToTxtApi = async (workspaceId: string, conversationId?: string) => {
  const url = conversationId 
    ? `/workspaces/${workspaceId}/chat/export/txt?conversation_id=${conversationId}`
    : `/workspaces/${workspaceId}/chat/export/txt`;
  const { data } = await api.get(url, {
    responseType: 'blob',
  });
  return data;
};

export const exportChatToPdfApi = async (workspaceId: string, conversationId?: string) => {
  const url = conversationId 
    ? `/workspaces/${workspaceId}/chat/export/pdf?conversation_id=${conversationId}`
    : `/workspaces/${workspaceId}/chat/export/pdf`;
  const { data } = await api.get(url, {
    responseType: 'blob',
  });
  return data;
};

export const deleteChatHistoryApi = async (workspaceId: string) => {
  const { data } = await api.delete(`/workspaces/${workspaceId}/chat/history`);
  return data;
};

export const fulltextSearchApi = async (query: string) => {
  const { data } = await api.get(`/workspaces/fulltext-search?query=${query}`);
  return data;
};

// ============================================
// AUTH API FUNCTIONS
// ============================================

export const checkAuthMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

// ============================================
// DOCUMENT GENERATION API FUNCTIONS
// ============================================

export const generateDownloadableDocument = async (
  workspaceId: string,
  conversationId: string,
  options: { format: string; document_type: string; include_metadata: boolean }
) => {
  const response = await api.post(
    `/workspaces/${workspaceId}/conversations/${conversationId}/generate-downloadable`,
    options,
    {
      responseType: 'blob',
    }
  );
  return response;
};

export const generateConversationTitle = async (workspaceId: string, conversationId: string) => {
  const { data } = await api.post(
    `/workspaces/${workspaceId}/conversations/${conversationId}/generate-title`
  );
  return data;
};

export default api;