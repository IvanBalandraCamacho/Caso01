import axios, { AxiosInstance } from 'axios';
import {
  RAGIngestRequest,
  IngestResponse,
  SearchRequest,
  SearchResult,
} from '@/types/api';

/**
 * Cliente para el servicio RAG
 * Maneja la indexación y búsqueda semántica de documentos
 */
class RAGClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:8080';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Indexa contenido de texto en el sistema RAG
   */
  async ingestText(request: RAGIngestRequest): Promise<IngestResponse> {
    const { data } = await this.client.post<IngestResponse>('/ingest_text', request);
    return data;
  }

  /**
   * Busca documentos relevantes usando búsqueda semántica
   */
  async search(request: SearchRequest): Promise<SearchResult[]> {
    const { data } = await this.client.post<SearchResult[]>('/search', request);
    return data;
  }

  /**
   * Elimina un documento del índice RAG
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.client.delete(`/delete/${documentId}`);
  }

  /**
   * Verifica el estado de salud del servicio RAG
   */
  async healthCheck(): Promise<{ status: string }> {
    const { data } = await this.client.get('/health');
    return data;
  }
}

// Exportar instancia singleton
const ragClient = new RAGClient();
export default ragClient;
