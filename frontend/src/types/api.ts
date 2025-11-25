// Tipos basados en los schemas de Pydantic del backend

// --- Workspace Types ---
export interface WorkspaceBase {
  name: string;
  description?: string | null;
  instructions?: string | null;
}

export interface WorkspaceCreate extends WorkspaceBase {}

export interface WorkspaceUpdate {
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
}

export interface WorkspacePublic extends WorkspaceBase {
  id: string;
  created_at: string;
  is_active: boolean;
}

// --- Document Types ---
export interface DocumentBase {
  file_name: string;
  file_type: string;
}

export interface DocumentCreate extends DocumentBase {
  workspace_id: string;
  status?: string;
  chunk_count?: number;
}

export interface DocumentPublic extends DocumentBase {
  id: string;
  workspace_id: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

// --- Chat Types ---
export interface ChatRequest {
  query: string;
  model?: string;
  conversation_id?: string;
}

export interface DocumentChunk {
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  score: number;
}

export interface ChatResponse {
  query: string;
  llm_response: string;
  relevant_chunks: DocumentChunk[];
}

// --- Error Types ---
export interface ApiError {
  detail: string;
}

// --- Upload Types ---
export interface UploadDocumentParams {
  workspaceId: string;
  file: File;
}

// --- RAG Service Types ---
export interface RAGIngestRequest {
  document_id: string;
  workspace_id: string;
  content: string;
  metadata: Record<string, unknown>;
  user_id?: string | null;
}

export interface IngestResponse {
  document_id: string;
  chunks_count: number;
  status: string;
  message?: string | null;
}

export interface SearchRequest {
  query: string;
  workspace_id?: string | null;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  document_id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

// --- Conversation Types ---
export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  chunk_references: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationUpdate {
  title?: string;
}

