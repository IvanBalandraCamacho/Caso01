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
