"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useState, useCallback } from "react";
import {
  GenerativeTable,
  GenerativeBarChart,
  GenerativeLineChart,
  GenerativePieChart,
  GenerativeMetrics,
  GenerativeTimeline,
} from "@/components/copilot/GenerativeUI";

interface GeneratedUIElement {
  id: string;
  type: 'table' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'metrics' | 'timeline';
  component: React.ReactNode;
  timestamp: Date;
}

interface UseGenerativeUIProps {
  workspaceId: string;
  documentContext?: string;
  analysisData?: any;
}

export function useGenerativeUI({
  workspaceId,
  documentContext,
  analysisData,
}: UseGenerativeUIProps) {
  const [generatedElements, setGeneratedElements] = useState<GeneratedUIElement[]>([]);

  // Exponer datos del análisis al LLM
  useCopilotReadable({
    description: "Datos del análisis RFP actual incluyendo requisitos, plazos, tecnologías, equipo y costos. Usa estos datos para generar visualizaciones.",
    value: analysisData ? JSON.stringify(analysisData, null, 2) : "No hay datos de análisis disponibles",
  });

  useCopilotReadable({
    description: "Contexto del documento RFP cargado para referencia",
    value: documentContext || "No hay documento cargado",
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIÓN: Generar Tabla
  // ═══════════════════════════════════════════════════════════════
  useCopilotAction({
    name: "renderTable",
    description: "Renderiza una tabla con datos estructurados directamente en el chat. Úsalo cuando el usuario pida ver datos en formato de tabla, lista de requisitos, tecnologías, equipo, etc.",
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
        description: "Array de objetos con los datos. Cada objeto es una fila.",
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
        description: "Resumen o explicación de los datos",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args) {
        return (
          <GenerativeTable
            title={args.title as string}
            data={args.data as any[]}
            columns={args.columns as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm">Generando tabla...</div>;
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIÓN: Generar Gráfico de Barras
  // ═══════════════════════════════════════════════════════════════
  useCopilotAction({
    name: "renderBarChart",
    description: "Renderiza un gráfico de barras para comparar valores. Ideal para comparar costos, cantidades, distribuciones por categoría.",
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
        description: "Array de objetos con los datos. Ejemplo: [{mes: 'Enero', costo: 5000, horas: 100}]",
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
        description: "Array con nombres de campos para el eje Y (valores a graficar)",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Descripción o análisis del gráfico",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args) {
        return (
          <GenerativeBarChart
            title={args.title as string}
            data={args.data as any[]}
            xKey={args.xKey as string}
            yKeys={args.yKeys as string[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm">Generando gráfico de barras...</div>;
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIÓN: Generar Gráfico de Líneas/Área
  // ═══════════════════════════════════════════════════════════════
  useCopilotAction({
    name: "renderLineChart",
    description: "Renderiza un gráfico de líneas/área para mostrar tendencias en el tiempo. Ideal para cronogramas de costos, progreso, evolución mensual.",
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
        description: "Array de objetos con datos temporales. Ejemplo: [{periodo: 'Mes 1', valor: 1000}]",
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
        description: "Campos para el eje Y (valores)",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Análisis de la tendencia",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args) {
        return (
          <GenerativeLineChart
            title={args.title as string}
            data={args.data as any[]}
            xKey={args.xKey as string}
            yKeys={args.yKeys as string[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm">Generando gráfico de tendencias...</div>;
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIÓN: Generar Gráfico Circular (Pie)
  // ═══════════════════════════════════════════════════════════════
  useCopilotAction({
    name: "renderPieChart",
    description: "Renderiza un gráfico circular para mostrar proporciones y distribuciones. Ideal para distribución de costos, composición de equipo, tipos de requisitos.",
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
      if (status === "complete" && args) {
        return (
          <GenerativePieChart
            title={args.title as string}
            data={args.data as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm">Generando gráfico circular...</div>;
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIÓN: Mostrar Métricas/KPIs
  // ═══════════════════════════════════════════════════════════════
  useCopilotAction({
    name: "renderMetrics",
    description: "Muestra tarjetas con métricas y KPIs importantes. Ideal para resúmenes ejecutivos, indicadores clave, totales.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Título de la sección de métricas",
        required: true,
      },
      {
        name: "metrics",
        type: "object[]",
        description: "Array de métricas: [{label: 'nombre', value: 'valor', prefix?: '$', suffix?: '%', icon?: 'money'|'calendar'|'chart'}]",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Contexto o explicación de las métricas",
        required: false,
      },
    ],
    render: ({ args, status }) => {
      if (status === "complete" && args) {
        return (
          <GenerativeMetrics
            title={args.title as string}
            metrics={args.metrics as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm">Generando métricas...</div>;
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCIÓN: Mostrar Timeline de Plazos
  // ═══════════════════════════════════════════════════════════════
  useCopilotAction({
    name: "renderTimeline",
    description: "Muestra una línea de tiempo con fechas y eventos importantes. Ideal para cronogramas, hitos del proyecto, deadlines.",
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
      if (status === "complete" && args) {
        return (
          <GenerativeTimeline
            title={args.title as string}
            events={args.events as any[]}
            summary={args.summary as string}
          />
        );
      }
      return <div className="text-zinc-400 text-sm">Generando timeline...</div>;
    },
  });

  const clearGeneratedElements = useCallback(() => {
    setGeneratedElements([]);
  }, []);

  return {
    generatedElements,
    clearGeneratedElements,
  };
}
