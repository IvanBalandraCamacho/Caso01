"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { analyzeProposalApi } from "@/lib/api";

interface UseCopilotActionsProps {
  workspaceId: string;
  documentContent?: string;
  onAnalysisComplete?: (result: any) => void;
}

export function useCopilotActions({
  workspaceId,
  documentContent,
  onAnalysisComplete,
}: UseCopilotActionsProps) {
  
  // Hacer el contenido del documento accesible al copiloto
  useCopilotReadable({
    description: "Contenido del documento RFP actual",
    value: documentContent || "No hay documento cargado",
  });

  // Acción: Análisis Rápido
  useCopilotAction({
    name: "quickAnalysis",
    description: "Realiza un análisis rápido del RFP extrayendo información clave",
    parameters: [
      {
        name: "focusAreas",
        type: "string[]",
        description: "Áreas de enfoque: requisitos, fechas, presupuesto, equipo",
        required: false,
      },
    ],
    handler: async ({ focusAreas }) => {
      const result = await analyzeProposalApi({
        workspace_id: workspaceId,
        requirements: documentContent || "",
        output_format: "structured",
      });
      
      onAnalysisComplete?.(result);
      return `Análisis completado. Se encontraron ${result.tecnologias_requeridas?.length || 0} tecnologías y ${result.preguntas_sugeridas?.length || 0} preguntas sugeridas.`;
    },
  });

  // Acción: Extraer Fechas
  useCopilotAction({
    name: "extractDates",
    description: "Extrae todas las fechas y plazos del documento",
    handler: async () => {
      // Implementar extracción de fechas
      return "Fechas extraídas del documento (Simulado para F2)";
    },
  });

  // Acción: Identificar Riesgos
  useCopilotAction({
    name: "identifyRisks",
    description: "Identifica riesgos legales y contractuales en el RFP",
    handler: async () => {
      // Implementar identificación de riesgos
      return "Riesgos identificados (Simulado para F2)";
    },
  });

  // Acción: Generar Preguntas
  useCopilotAction({
    name: "generateQuestions",
    description: "Genera preguntas de aclaración para el cliente",
    parameters: [
      {
        name: "category",
        type: "string",
        description: "Categoría: técnico, legal, comercial, operativo",
        required: true,
      },
    ],
    handler: async ({ category }) => {
      // Implementar generación de preguntas
      return `Preguntas generadas para la categoría: ${category} (Simulado para F2)`;
    },
  });

  // Acción: Sugerir Equipo
  useCopilotAction({
    name: "suggestTeam",
    description: "Sugiere el equipo técnico necesario basado en los requisitos",
    handler: async () => {
      // Implementar sugerencia de equipo
      return "Equipo sugerido basado en el análisis (Simulado para F2)";
    },
  });
}
