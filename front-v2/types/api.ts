// Tipos basados en los schemas de Pydantic del backend
// Generated from OpenAPI 3.1.0 specification

// ==============================================
// AUTH TYPES (from OpenAPI components.schemas)
// ==============================================

/**
 * Token response from /api/v1/auth/login and /api/v1/auth/refresh
 */
export interface Token {
  access_token: string;
  token_type: string; // default: "bearer"
}

/**
 * User creation request for /api/v1/auth/register
 */
export interface UserCreate {
  email: string;
  full_name?: string | null;
  password: string;
}

/**
 * Login request body - OAuth2 password flow
 * Note: Uses 'username' field for email per OAuth2 spec
 */
export interface LoginRequest {
  username: string; // This is the email
  password: string;
  grant_type?: string; // Optional, pattern: "^password$"
  scope?: string; // default: ""
  client_id?: string | null;
  client_secret?: string | null;
}

/**
 * Public user information returned by API
 */
export interface UserPublic {
  email: string;
  full_name?: string | null;
  id: string;
  is_active: boolean;
  profile_picture?: string | null;
  created_at: string; // ISO 8601 date-time
}

// ==============================================
// WORKSPACE TYPES
// ==============================================

export interface WorkspaceBase {
  name: string;
  description?: string | null;
  instructions?: string | null;
  
  // --- Strategic Fields (Fase 1) ---
  country?: string | null;
  client_company?: string | null;
  operation_name?: string | null;
  tvt?: number | null;
  tech_stack?: string[] | null;
  opportunity_type?: string | null;
  estimated_price?: number | null;
  estimated_time?: string | null;
  resource_count?: number | null;
  category?: string | null;
  objective?: string | null;
}

export interface WorkspaceCreate extends WorkspaceBase { }

export interface WorkspaceUpdate {
  name?: string | null;
  description?: string | null;
  instructions?: string | null;
  
  // --- Strategic Fields (Fase 1) ---
  country?: string | null;
  client_company?: string | null;
  operation_name?: string | null;
  tvt?: number | null;
  tech_stack?: string[] | null;
  opportunity_type?: string | null;
  estimated_price?: number | null;
  estimated_time?: string | null;
  resource_count?: number | null;
  category?: string | null;
  objective?: string | null;
}

export interface WorkspacePublic extends WorkspaceBase {
  id: string;
  created_at: string; // ISO 8601 date-time
  is_active: boolean;
  default_conversation_id?: string | null;
}

// ==============================================
// DOCUMENT TYPES
// ==============================================

/**
 * Document status enum matching backend states
 */
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentBase {
  file_name: string;
  file_type: string;
}

export interface DocumentCreate extends DocumentBase {
  workspace_id: string;
  status?: DocumentStatus;
  chunk_count?: number;
}

/**
 * Document response from API - matches OpenAPI DocumentPublic schema
 */
export interface DocumentPublic extends DocumentBase {
  id: string;
  workspace_id: string;
  conversation_id?: string | null; // Added: document can belong to a conversation
  status: DocumentStatus;
  chunk_count: number;
  created_at: string; // ISO 8601 date-time
  suggestion_short?: string | null; // Added: short suggestion from processing
  suggestion_full?: string | null; // Added: full suggestion from processing
}

// ==============================================
// CHAT TYPES
// ==============================================

/**
 * Chat request body for /api/v1/workspaces/{workspace_id}/chat
 */
export interface ChatRequest {
  query: string;
  conversation_id?: string | null;
  model?: string | null;
}

/**
 * Document chunk from RAG retrieval
 */
export interface DocumentChunk {
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  score: number;
}

/**
 * Chat response - matches OpenAPI ChatResponse schema
 */
export interface ChatResponse {
  query: string;
  llm_response: string;
  relevant_chunks: DocumentChunk[];
  conversation_id: string; // Added: required field per OpenAPI spec
}

/**
 * Streaming chat event types from backend (NDJSON format)
 */
export interface ChatStreamEvent_Content {
  type: 'content';
  text: string;
  conversation_id?: string;
}

export interface ChatStreamEvent_Sources {
  type: 'sources';
  relevant_chunks: DocumentChunk[];
  conversation_id?: string;
}

export interface ChatStreamEvent_Intent {
  type: 'intent';
  intent: string;
  conversation_id?: string;
}

export interface ChatStreamEvent_ConversationId {
  type: 'conversation_id';
  id: string;
}

/**
 * Union type for all streaming chat events
 */
export type ChatStreamEvent =
  | ChatStreamEvent_Content
  | ChatStreamEvent_Sources
  | ChatStreamEvent_Intent
  | ChatStreamEvent_ConversationId;

// ==============================================
// ERROR TYPES (from OpenAPI components.schemas)
// ==============================================

/**
 * Single validation error detail
 */
export interface ValidationError {
  loc: (string | number)[]; // Location of the error
  msg: string; // Error message
  type: string; // Error type identifier
}

/**
 * HTTP 422 Validation Error response
 */
export interface HTTPValidationError {
  detail: ValidationError[];
}

/**
 * Generic API error (non-validation)
 */
export interface ApiError {
  detail: string;
}

// ==============================================
// UPLOAD TYPES
// ==============================================

export interface UploadDocumentParams {
  workspaceId: string;
  file: File;
  onProgress?: (progress: number) => void; // Added: upload progress callback
}

// ==============================================
// RAG SERVICE TYPES
// ==============================================

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

// ==============================================
// CONVERSATION TYPES
// ==============================================

/**
 * Message role enum
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Single message in a conversation
 */
export interface MessagePublic {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  chunk_references?: string | null;
  created_at: string; // ISO 8601 date-time
}

// Alias for backwards compatibility
export type Message = MessagePublic;

/**
 * Conversation without messages - matches OpenAPI ConversationPublic
 */
export interface ConversationPublic {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string; // ISO 8601 date-time
  updated_at: string; // ISO 8601 date-time
  message_count: number; // default: 0
  has_proposal: boolean; // default: false
}

// Alias for backwards compatibility
export type Conversation = ConversationPublic;

/**
 * Conversation with messages - matches OpenAPI ConversationWithMessages
 */
export interface ConversationWithMessages extends ConversationPublic {
  messages: MessagePublic[]; // default: []
}

/**
 * Request body for creating a conversation
 */
export interface ConversationCreate {
  title: string;
}

/**
 * Request body for updating a conversation
 */
export interface ConversationUpdate {
  title: string; // Required per OpenAPI spec
}

// ==============================================
// DOCUMENT GENERATION TYPES
// ==============================================

/**
 * Request body for generating downloadable documents
 */
export interface GenerateDownloadableDocRequest {
  format?: string; // default: "markdown" - "txt" | "markdown" | "pdf"
  document_type?: string; // default: "complete" - "complete" | "summary" | "key_points"
  include_metadata?: boolean; // default: true
  custom_instructions?: string | null;
}

/**
 * Response from document generation endpoint
 */
export interface DownloadableDocumentResponse {
  content: string;
  filename: string;
  format: string;
  word_count: number;
  message: string;
}

// ==============================================
// TIVIT SERVICE TYPES (from OpenAPI components.schemas)
// ==============================================

/**
 * TIVIT Service - matches OpenAPI Servicio schema
 */
export interface Servicio {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  costo_mensual_min: number;
  costo_mensual_max: number;
  costo_implementacion_min?: number | null;
  costo_implementacion_max?: number | null;
  duracion_estimada_meses: number;
  nivel_dificultad: string;
  tecnologias_principales: string[];
}

/**
 * TIVIT Worker - matches OpenAPI Trabajador schema
 */
export interface Trabajador {
  id: string;
  nombre: string;
  edad: number;
  nacionalidad: string;
  localidad: string;
  area: string;
  certificaciones: string[];
  area_experiencia: string;
  rol: string;
  anos_experiencia: number;
  idiomas: string[];
  disponibilidad: string;
}

// ==============================================
// PROPOSAL TYPES
// ==============================================

/**
 * Team member suggestion from proposal analysis
 */
export interface ProposalTeamMember {
  nombre: string;
  rol: string;
  skills: string[];
  experiencia: string;
}

/**
 * Economic scope from proposal analysis
 */
export interface ProposalEconomicScope {
  presupuesto: string;
  moneda: string;
}

/**
 * Full proposal analysis response
 */
export interface ProposalAnalysis {
  cliente: string;
  fecha_entrega: string;
  alcance_economico: ProposalEconomicScope;
  tecnologias_requeridas: string[];
  riesgos_detectados: string[];
  preguntas_sugeridas: string[];
  equipo_sugerido: ProposalTeamMember[];
}

// ==============================================
// HEALTH CHECK TYPES
// ==============================================

export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
}

export interface DetailedHealthCheckResponse {
  status: string;
  services: {
    mysql: { status: string; latency_ms?: number };
    redis: { status: string; latency_ms?: number };
    rag_service?: { status: string; latency_ms?: number };
  };
  timestamp: string;
}

export interface LLMHealthCheckResponse {
  status: string;
  model: string;
  response_time_ms?: number;
  timestamp: string;
}

// ==============================================
// CACHE & LLM METRICS TYPES
// ==============================================

export interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: number;
  total_entries: number;
  memory_usage_mb?: number;
}

export interface LLMMetrics {
  total_requests: number;
  avg_response_time_ms: number;
  cache_hit_rate: number;
  supported_task_types: string[];
  model_info: {
    name: string;
    version?: string;
  };
}

export interface QueryAnalysis {
  query: string;
  complexity: string;
  estimated_tokens: number;
  optimal_parameters: Record<string, unknown>;
}

// ==============================================
// HEALTH & COMPLETION TYPES
// ==============================================

export interface WorkspaceHealth {
  workspace_id: string;
  percentage: number;
  missing_sections: string[];
  is_complete: boolean;
}

// ==============================================
// TEAM SUGGESTION TYPES
// ==============================================

export interface TeamSuggestionRequest {
  servicios: string[];
  tamano_equipo: number;
  presupuesto_mensual: number;
  duracion_meses: number;
  ubicacion_preferida?: string;
}

export interface TeamSuggestionResponse {
  equipo_sugerido: Trabajador[];
  costo_total_mensual: number;
  costo_total_proyecto: number;
  cobertura_servicios: string[];
}
