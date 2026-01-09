"use client";

import { useCopilotAction, useCopilotReadable, useCopilotChat } from "@copilotkit/react-core";
import { useState, useCallback } from "react";
import { message } from "antd";
import {
  GenerativeTable,
  GenerativeBarChart,
  GenerativeLineChart,
  GenerativePieChart,
  GenerativeMetrics,
  GenerativeTimeline,
} from "@/components/copilot/GenerativeUI";

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
    description: "Contexto del documento del workspace actual para consultas y generación de visualizaciones",
    value: documentContext || "No hay documento cargado en el workspace",
  });

  useCopilotReadable({
    description: "ID del workspace actual",
    value: workspaceId,
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES CON GENERATIVE UI (Render directo en el chat)
  // ═══════════════════════════════════════════════════════════════

  // Acción: Renderizar tabla de datos en el chat
  useCopilotAction({
    name: "renderTable",
    description: "Renderiza una tabla de datos directamente en el chat. Úsalo cuando el usuario pida ver datos en formato tabla, lista de requisitos, tecnologías, equipo, plazos, etc. SIEMPRE usa datos reales extraídos del contexto del documento.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título descriptivo de la tabla",
        required: true,
      },
      {
        name: "data",
        type: "object[]",
        description: "Array de objetos con los datos. Extrae estos datos del contexto del documento RFP.",
        required: true,
      },
      {
        name: "columns",
        type: "object[]",
        description: "Definición de columnas: [{key: 'campo', title: 'Título Columna'}]",
        required: false,
      },
      {
        name: "summary",
        type: "string",
        description: "Breve resumen o análisis de los datos mostrados",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args?.data) {
        return (
          <GenerativeTable
            title={args.title as string || "Datos"}
            data={args.data as any[]}
            columns={args.columns as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm animate-pulse">📊 Generando tabla...</div>;
    },
  });

  // Acción: Renderizar gráfico de barras
  useCopilotAction({
    name: "renderBarChart",
    description: "Renderiza un gráfico de barras para comparar valores. Ideal para: costos por fase, distribución de recursos, comparativas de precios, cantidades por categoría.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título del gráfico",
        required: true,
      },
      {
        name: "data",
        type: "object[]",
        description: "Array de datos. Ejemplo: [{categoria: 'Fase 1', costo: 5000, horas: 100}]",
        required: true,
      },
      {
        name: "xKey",
        type: "string",
        description: "Nombre del campo para el eje X (categorías)",
        required: true,
      },
      {
        name: "yKeys",
        type: "string[]",
        description: "Array de campos numéricos para el eje Y",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Análisis o interpretación del gráfico",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args?.data) {
        return (
          <GenerativeBarChart
            title={args.title as string || "Gráfico"}
            data={args.data as any[]}
            xKey={args.xKey as string}
            yKeys={args.yKeys as string[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm animate-pulse">📊 Generando gráfico de barras...</div>;
    },
  });

  // Acción: Renderizar gráfico de líneas/tendencias
  useCopilotAction({
    name: "renderLineChart",
    description: "Renderiza un gráfico de líneas/área para mostrar tendencias. Ideal para: cronograma de costos mensuales, evolución del proyecto, proyecciones en el tiempo.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título del gráfico",
        required: true,
      },
      {
        name: "data",
        type: "object[]",
        description: "Array con datos temporales. Ejemplo: [{mes: 'Enero', costo: 10000}]",
        required: true,
      },
      {
        name: "xKey",
        type: "string",
        description: "Campo para el eje X (tiempo/periodo)",
        required: true,
      },
      {
        name: "yKeys",
        type: "string[]",
        description: "Campos para el eje Y (valores numéricos)",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Análisis de la tendencia mostrada",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args?.data) {
        return (
          <GenerativeLineChart
            title={args.title as string || "Tendencias"}
            data={args.data as any[]}
            xKey={args.xKey as string}
            yKeys={args.yKeys as string[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm animate-pulse">📈 Generando gráfico de tendencias...</div>;
    },
  });

  // Acción: Renderizar gráfico circular (pie)
  useCopilotAction({
    name: "renderPieChart",
    description: "Renderiza un gráfico circular para distribuciones y proporciones. Ideal para: distribución de costos, composición del equipo, tipos de requisitos, porcentajes.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título del gráfico",
        required: true,
      },
      {
        name: "data",
        type: "object[]",
        description: "Array con {name: 'categoría', value: número}",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Análisis de la distribución",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args?.data) {
        return (
          <GenerativePieChart
            title={args.title as string || "Distribución"}
            data={args.data as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm animate-pulse">🥧 Generando gráfico circular...</div>;
    },
  });

  // Acción: Mostrar métricas/KPIs
  useCopilotAction({
    name: "renderMetrics",
    description: "Muestra tarjetas con métricas y KPIs importantes. Ideal para: resúmenes ejecutivos, indicadores clave del RFP, totales, estadísticas principales.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título de la sección",
        required: true,
      },
      {
        name: "metrics",
        type: "object[]",
        description: "Array de métricas: [{label: 'nombre', value: 'valor', prefix?: '$', icon?: 'money'|'calendar'}]",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Contexto o explicación",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args?.metrics) {
        return (
          <GenerativeMetrics
            title={args.title as string || "Métricas"}
            metrics={args.metrics as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm animate-pulse">📋 Generando métricas...</div>;
    },
  });

  // Acción: Mostrar timeline de plazos
  useCopilotAction({
    name: "renderTimeline",
    description: "Muestra una línea de tiempo con fechas y eventos. Ideal para: cronograma del RFP, fechas límite, hitos del proyecto, plazos de entrega.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título del timeline",
        required: true,
      },
      {
        name: "events",
        type: "object[]",
        description: "Array de eventos: [{date: 'fecha', event: 'descripción', type?: 'deadline'|'milestone'|'start'}]",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Análisis del cronograma",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args?.events) {
        return (
          <GenerativeTimeline
            title={args.title as string || "Cronograma"}
            events={args.events as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm animate-pulse">📅 Generando timeline...</div>;
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES PARA CONSULTAS DE DATOS (Backend)
  // ═══════════════════════════════════════════════════════════════
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
