"use client";

import { useCopilotAction, useCopilotReadable, useCopilotChat } from "@copilotkit/react-core";
import { useState, useCallback } from "react";
import { message } from "antd";

interface UseCopilotChatProps {
  workspaceId: string;
  conversationId?: string;
  documentContext?: string;
  onDataGenerated?: (data: any, type: string) => void;
  onProposalGenerated?: (proposal: any) => void;
}

interface DataQuery {
  type: 'table' | 'chart' | 'summary' | 'comparison';
  title: string;
  data: any[];
  columns?: string[];
}

export function useCopilotChatActions({
  workspaceId,
  conversationId,
  documentContext,
  onDataGenerated,
  onProposalGenerated,
}: UseCopilotChatProps) {
  const [generatedData, setGeneratedData] = useState<DataQuery[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Exponer contexto del workspace a CopilotKit
  useCopilotReadable({
    description: "Contexto del documento del workspace actual para consultas y generación",
    value: documentContext || "No hay documento cargado en el workspace",
  });

  useCopilotReadable({
    description: "ID del workspace actual",
    value: workspaceId,
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES PARA CONSULTAS DE DATOS
  // ═══════════════════════════════════════════════════════════════

  // Acción: Generar tabla de datos
  useCopilotAction({
    name: "generateDataTable",
    description: "Genera una tabla de datos estructurada a partir del documento (requisitos, plazos, costos, etc.)",
    parameters: [
      {
        name: "dataType",
        type: "string",
        description: "Tipo de datos: requisitos, plazos, tecnologias, costos, equipo, riesgos",
        required: true,
      },
      {
        name: "columns",
        type: "string[]",
        description: "Columnas a incluir en la tabla",
        required: false,
      },
      {
        name: "filters",
        type: "object",
        description: "Filtros a aplicar",
        required: false,
      },
    ],
    handler: async ({ dataType, columns, filters }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        // Llamar al endpoint de análisis con el tipo específico
        const response = await fetch(`${apiBaseUrl}/workspaces/${workspaceId}/extract-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data_type: dataType,
            columns,
            filters,
          }),
        });

        if (!response.ok) throw new Error('Error al extraer datos');
        
        const data = await response.json();
        
        const tableData: DataQuery = {
          type: 'table',
          title: `Tabla de ${dataType}`,
          data: data.rows || [],
          columns: data.columns || columns,
        };
        
        setGeneratedData(prev => [...prev, tableData]);
        onDataGenerated?.(tableData, 'table');
        
        return `✅ Tabla generada con ${data.rows?.length || 0} filas. Los datos están disponibles en la interfaz.`;
      } catch (error) {
        console.error('Error generating table:', error);
        return `❌ Error al generar tabla: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Generar matriz de requisitos
  useCopilotAction({
    name: "generateRequirementsMatrix",
    description: "Genera una matriz de requisitos funcionales y no funcionales del RFP",
    parameters: [
      {
        name: "includeTraceability",
        type: "boolean",
        description: "Incluir trazabilidad con secciones del documento",
        required: false,
      },
      {
        name: "prioritize",
        type: "boolean",
        description: "Incluir priorización de requisitos",
        required: false,
      },
    ],
    handler: async ({ includeTraceability = false, prioritize = true }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        const response = await fetch(`${apiBaseUrl}/task/requirements-matrix`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            include_traceability: includeTraceability,
            prioritize,
          }),
        });

        if (!response.ok) throw new Error('Error al generar matriz');
        
        const matrix = await response.json();
        
        const matrixData: DataQuery = {
          type: 'table',
          title: 'Matriz de Requisitos',
          data: matrix.requirements || [],
          columns: ['ID', 'Requisito', 'Tipo', 'Prioridad', 'Fuente'],
        };
        
        setGeneratedData(prev => [...prev, matrixData]);
        onDataGenerated?.(matrixData, 'requirements_matrix');
        
        return `✅ Matriz de requisitos generada con ${matrix.requirements?.length || 0} requisitos identificados.`;
      } catch (error) {
        return `❌ Error: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Generar resumen comparativo
  useCopilotAction({
    name: "generateComparison",
    description: "Genera una comparación o resumen de datos específicos del documento",
    parameters: [
      {
        name: "aspect",
        type: "string",
        description: "Aspecto a comparar: costos, tecnologias, plazos, recursos",
        required: true,
      },
      {
        name: "format",
        type: "string",
        description: "Formato: tabla, lista, resumen",
        required: false,
      },
    ],
    handler: async ({ aspect, format = "tabla" }) => {
      // Simular extracción y comparación
      const comparisonData: DataQuery = {
        type: 'comparison',
        title: `Comparación de ${aspect}`,
        data: [],
        columns: ['Aspecto', 'Valor Actual', 'Recomendado', 'Diferencia'],
      };
      
      setGeneratedData(prev => [...prev, comparisonData]);
      onDataGenerated?.(comparisonData, 'comparison');
      
      return `📊 Comparación de ${aspect} generada en formato ${format}.`;
    },
  });

  // Acción: Calcular cotización preliminar
  useCopilotAction({
    name: "calculatePreliminaryQuote",
    description: "Calcula una cotización preliminar basada en el análisis del RFP",
    parameters: [
      {
        name: "includeContingency",
        type: "boolean",
        description: "Incluir contingencia (15-20%)",
        required: false,
      },
      {
        name: "teamRates",
        type: "object",
        description: "Tarifas por rol del equipo",
        required: false,
      },
    ],
    handler: async ({ includeContingency = true, teamRates }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        const response = await fetch(`${apiBaseUrl}/task/preliminary-quote`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            include_contingency: includeContingency,
            team_rates: teamRates,
          }),
        });

        const quote = await response.json();
        
        const quoteData: DataQuery = {
          type: 'summary',
          title: 'Cotización Preliminar',
          data: [quote],
          columns: ['Concepto', 'Horas', 'Tarifa', 'Subtotal'],
        };
        
        setGeneratedData(prev => [...prev, quoteData]);
        onDataGenerated?.(quoteData, 'quote');
        
        return `💰 Cotización preliminar generada:\n\n- Total estimado: ${quote.total || 'Por calcular'}\n- Incluye contingencia: ${includeContingency ? 'Sí' : 'No'}`;
      } catch (error) {
        return `❌ Error al calcular cotización: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES PARA PROPUESTAS COMERCIALES
  // ═══════════════════════════════════════════════════════════════

  // Acción: Generar propuesta comercial completa
  useCopilotAction({
    name: "generateCommercialProposal",
    description: "Genera una propuesta comercial completa basada en el análisis del RFP",
    parameters: [
      {
        name: "sections",
        type: "string[]",
        description: "Secciones a incluir: resumen_ejecutivo, alcance, metodologia, equipo, cronograma, inversion, garantias",
        required: false,
      },
      {
        name: "tone",
        type: "string",
        description: "Tono de la propuesta: formal, persuasivo, tecnico",
        required: false,
      },
      {
        name: "outputFormat",
        type: "string",
        description: "Formato de salida: markdown, docx, pdf",
        required: false,
      },
    ],
    handler: async ({ sections, tone = "formal", outputFormat = "markdown" }) => {
      setIsGenerating(true);
      message.loading("Generando propuesta comercial...");
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        const defaultSections = [
          'resumen_ejecutivo',
          'alcance',
          'metodologia',
          'equipo',
          'cronograma',
          'inversion',
          'garantias'
        ];
        
        const response = await fetch(`${apiBaseUrl}/task/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            sections: sections || defaultSections,
            tone,
            output_format: outputFormat,
          }),
        });

        if (!response.ok) throw new Error('Error al generar propuesta');
        
        if (outputFormat === 'docx' || outputFormat === 'pdf') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `propuesta_comercial.${outputFormat}`;
          a.click();
          message.success("Documento descargado");
          return `✅ Propuesta comercial generada y descargada como ${outputFormat.toUpperCase()}`;
        }
        
        const proposal = await response.json();
        onProposalGenerated?.(proposal);
        message.success("Propuesta generada");
        
        return `✅ Propuesta comercial generada con las siguientes secciones:\n\n${(sections || defaultSections).map(s => `• ${s.replace('_', ' ')}`).join('\n')}\n\nEl documento está disponible para revisión y edición.`;
      } catch (error) {
        message.error("Error al generar propuesta");
        return `❌ Error al generar propuesta: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Generar sección específica de propuesta
  useCopilotAction({
    name: "generateProposalSection",
    description: "Genera una sección específica de la propuesta comercial",
    parameters: [
      {
        name: "sectionName",
        type: "string",
        description: "Nombre de la sección: resumen_ejecutivo, metodologia, equipo, cronograma, inversion",
        required: true,
      },
      {
        name: "customInstructions",
        type: "string",
        description: "Instrucciones adicionales para personalizar la sección",
        required: false,
      },
    ],
    handler: async ({ sectionName, customInstructions }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        const response = await fetch(`${apiBaseUrl}/task/generate-section`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            section_name: sectionName,
            custom_instructions: customInstructions,
          }),
        });

        const section = await response.json();
        
        return `## ${sectionName.replace('_', ' ').toUpperCase()}\n\n${section.content}\n\n---\n✅ Sección generada. Puedes editarla o solicitar modificaciones.`;
      } catch (error) {
        return `❌ Error al generar sección: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Mejorar/editar sección existente
  useCopilotAction({
    name: "improveSection",
    description: "Mejora o edita una sección de la propuesta con instrucciones específicas",
    parameters: [
      {
        name: "currentContent",
        type: "string",
        description: "Contenido actual de la sección",
        required: true,
      },
      {
        name: "improvementRequest",
        type: "string",
        description: "Qué mejora o cambio se solicita",
        required: true,
      },
    ],
    handler: async ({ currentContent, improvementRequest }) => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        // Usar el endpoint de chat normal para la mejora
        const response = await fetch(`${apiBaseUrl}/chat/general/stream`, { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Mejora el siguiente contenido según estas instrucciones: ${improvementRequest}\n\nContenido actual:\n${currentContent}`,
            stream: false
          }),
        });

        const improved = await response.json();
        
        return `## Contenido Mejorado\n\n${improved.content}\n\n---\n✅ Sección mejorada según las instrucciones proporcionadas.`;
      } catch (error) {
        return `❌ Error al mejorar sección: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  // Acción: Analizar riesgos legales
  useCopilotAction({
    name: "analyzeLegalRisks",
    description: "Analiza los riesgos legales y contractuales del RFP",
    handler: async () => {
      setIsGenerating(true);
      
      try {
        const token = localStorage.getItem('access_token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
        
        const response = await fetch(`${apiBaseUrl}/task/legal-risks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
          }),
        });

        const risks = await response.json();
        
        const riskData: DataQuery = {
          type: 'table',
          title: 'Análisis de Riesgos Legales',
          data: risks.risks || [],
          columns: ['Riesgo', 'Severidad', 'Mitigación', 'Cláusula'],
        };
        
        setGeneratedData(prev => [...prev, riskData]);
        onDataGenerated?.(riskData, 'legal_risks');
        
        return `⚖️ Análisis de riesgos completado:\n\n- Riesgos identificados: ${risks.risks?.length || 0}\n- Nivel de riesgo general: ${risks.overall_risk || 'Medio'}\n\nLos detalles están disponibles en la tabla generada.`;
      } catch (error) {
        return `❌ Error al analizar riesgos: ${error}`;
      } finally {
        setIsGenerating(false);
      }
    },
  });

  return {
    generatedData,
    isGenerating,
    clearGeneratedData: () => setGeneratedData([]),
  };
}
