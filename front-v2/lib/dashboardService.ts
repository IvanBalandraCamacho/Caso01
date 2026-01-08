/**
 * API Service para endpoints del Dashboard y Analytics
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

interface DashboardStats {
  total_workspaces: number;
  active_workspaces: number;
  total_documents: number;
  rfps_processed: number;
  completed_documents: number;
  success_rate: number;
  documents_this_month: number;
  documents_last_month: number;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

interface Suggestion {
  type: 'missing_doc' | 'deadline' | 'requirement' | 'team' | 'improvement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  workspace_id: string;
  workspace_name: string;
}

interface ComplianceDetail {
  requirement: string;
  status: 'completed' | 'partial' | 'pending';
  document_name: string;
}

interface ComplianceData {
  score: number;
  total_requirements: number;
  completed: number;
  partial: number;
  pending: number;
  details: ComplianceDetail[];
}

interface Deadline {
  date: string;
  title: string;
  description: string;
  document_name: string;
  days_remaining: number;
  priority: 'high' | 'medium' | 'low';
}

interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sections: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  estimated_time: string;
  use_cases: string[];
}

export class DashboardService {
  /**
   * Obtiene las estadísticas del dashboard
   */
  static async getDashboardStats(token: string): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas del dashboard');
    }

    return response.json();
  }

  /**
   * Obtiene sugerencias proactivas del asistente inteligente
   */
  static async getSuggestions(token: string, workspaceId?: string): Promise<Suggestion[]> {
    const url = workspaceId 
      ? `${API_BASE_URL}/suggestions?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/suggestions`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener sugerencias');
    }

    return response.json();
  }

  /**
   * Obtiene el score de cumplimiento de un workspace
   */
  static async getWorkspaceCompliance(token: string, workspaceId: string): Promise<ComplianceData> {
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/compliance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener compliance del workspace');
    }

    return response.json();
  }

  /**
   * Obtiene las fechas límite de un workspace
   */
  static async getWorkspaceDeadlines(token: string, workspaceId: string): Promise<Deadline[]> {
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/deadlines`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener deadlines del workspace');
    }

    return response.json();
  }

  /**
   * Lista todas las plantillas de análisis disponibles
   */
  static async getTemplates(token: string, category?: string): Promise<AnalysisTemplate[]> {
    const url = category 
      ? `${API_BASE_URL}/templates?category=${category}`
      : `${API_BASE_URL}/templates`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener plantillas');
    }

    return response.json();
  }

  /**
   * Obtiene el detalle de una plantilla específica
   */
  static async getTemplate(token: string, templateId: string): Promise<AnalysisTemplate> {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener plantilla');
    }

    return response.json();
  }

  /**
   * Aplica una plantilla a un workspace
   */
  static async applyTemplate(
    token: string, 
    workspaceId: string, 
    templateId: string
  ): Promise<{
    message: string;
    template: AnalysisTemplate;
    workspace_id: string;
    workspace_name: string;
    applied_at: string;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/apply-template?template_id=${templateId}`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al aplicar plantilla');
    }

    return response.json();
  }
}

export type {
  DashboardStats,
  Suggestion,
  ComplianceData,
  ComplianceDetail,
  Deadline,
  AnalysisTemplate,
};
