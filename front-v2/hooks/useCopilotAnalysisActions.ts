"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Toast } from "@/components/Toast";

interface UseAnalysisActionsProps {
  analysisResult: any;
  onResultUpdate: (result: any) => void;
  workspaceId?: string;
}

export function useCopilotAnalysisActions({
  analysisResult,
  onResultUpdate,
  workspaceId,
}: UseAnalysisActionsProps) {
  
  // Exponer el resultado actual a CopilotKit
  useCopilotReadable({
    description: "Resultado completo del análisis RFP actual incluyendo cliente, plazos, tecnologías, equipo y preguntas",
    value: analysisResult ? JSON.stringify(analysisResult, null, 2) : "No hay análisis disponible",
  });

  // Acción: Generar resumen ejecutivo
  useCopilotAction({
    name: "generateExecutiveSummary",
    description: "Genera un resumen ejecutivo del análisis RFP para presentar a stakeholders",
    parameters: [
      {
        name: "format",
        type: "string",
        description: "Formato: bullet_points, paragraph, slides",
        required: false,
      },
      {
        name: "audience",
        type: "string",
        description: "Audiencia: technical, executive, sales",
        required: false,
      },
    ],
    handler: async ({ format = "bullet_points", audience = "executive" }) => {
      if (!analysisResult) return "No hay análisis disponible";
      
      const summary = `
## Resumen Ejecutivo - ${analysisResult.cliente}

### Alcance Económico
- **Presupuesto**: ${analysisResult.alcance_economico?.presupuesto || 'No especificado'}
- **Moneda**: ${analysisResult.alcance_economico?.moneda || 'No especificada'}

### Plazos Clave
${analysisResult.fechas_y_plazos?.map((p: any) => `- ${p.tipo}: ${p.valor}`).join('\n') || 'No especificados'}

### Stack Tecnológico
${analysisResult.tecnologias_requeridas?.join(', ') || 'No especificado'}

### Equipo Requerido
${analysisResult.equipo_sugerido?.map((m: any) => `- ${m.nombre} (${m.experiencia})`).join('\n') || 'No especificado'}
      `;
      
      return summary;
    },
  });

  // Acción: Comparar con RFPs anteriores
  useCopilotAction({
    name: "compareWithPreviousRFPs",
    description: "Compara este análisis con RFPs similares anteriores",
    handler: async () => {
      // TODO: Implementar comparación con histórico
      return "Función de comparación en desarrollo. Próximamente podrás comparar con RFPs anteriores del mismo cliente o industria.";
    },
  });

  // Acción: Identificar gaps o información faltante
  useCopilotAction({
    name: "identifyInformationGaps",
    description: "Identifica información faltante o ambigua en el RFP",
    handler: async () => {
      if (!analysisResult) return "No hay análisis disponible";
      
      const gaps: string[] = [];
      
      if (!analysisResult.alcance_economico?.presupuesto || 
          analysisResult.alcance_economico.presupuesto.toLowerCase().includes('no especific')) {
        gaps.push("⚠️ Presupuesto no especificado");
      }
      
      if (!analysisResult.fechas_y_plazos?.length) {
        gaps.push("⚠️ Plazos no definidos");
      }
      
      if (!analysisResult.tecnologias_requeridas?.length) {
        gaps.push("⚠️ Stack tecnológico no especificado");
      }
      
      if (analysisResult.preguntas_sugeridas?.length > 5) {
        gaps.push(`📋 Se identificaron ${analysisResult.preguntas_sugeridas.length} preguntas pendientes de aclarar`);
      }
      
      return gaps.length > 0 
        ? `Se identificaron los siguientes gaps:\n\n${gaps.join('\n')}`
        : "✅ El análisis está completo, no se identificaron gaps significativos.";
    },
  });

  // Acción: Sugerir próximos pasos
  useCopilotAction({
    name: "suggestNextSteps",
    description: "Sugiere los próximos pasos a seguir después del análisis",
    handler: async () => {
      const steps = [
        "1️⃣ Revisar y validar el análisis con el equipo técnico",
        "2️⃣ Enviar preguntas de aclaración al cliente",
        "3️⃣ Elaborar propuesta técnica preliminar",
        "4️⃣ Estimar esfuerzo y costos con el equipo sugerido",
        "5️⃣ Preparar presentación para comité de propuestas",
      ];
      
      return `## Próximos Pasos Sugeridos\n\n${steps.join('\n')}`;
    },
  });

  // Acción: Calcular estimación de esfuerzo
  useCopilotAction({
    name: "estimateEffort",
    description: "Calcula una estimación de esfuerzo basada en el equipo y tecnologías",
    parameters: [
      {
        name: "ratePerHour",
        type: "number",
        description: "Tarifa promedio por hora del equipo (USD)",
        required: false,
      },
    ],
    handler: async ({ ratePerHour = 75 }) => {
      if (!analysisResult?.equipo_sugerido?.length) {
        return "No hay equipo sugerido para estimar";
      }
      
      const teamSize = analysisResult.equipo_sugerido.length;
      // Estimación básica: 3 meses promedio, 160 horas/mes
      const estimatedHours = teamSize * 160 * 3;
      const estimatedCost = estimatedHours * ratePerHour;
      
      return `
## Estimación Preliminar de Esfuerzo

- **Tamaño del equipo**: ${teamSize} personas
- **Horas estimadas**: ${estimatedHours.toLocaleString()} horas
- **Costo estimado**: USD ${estimatedCost.toLocaleString()}

⚠️ Esta es una estimación preliminar. Se recomienda realizar un análisis detallado.
      `;
    },
  });

  // Acción: Exportar a diferentes formatos
  useCopilotAction({
    name: "exportAnalysis",
    description: "Exporta el análisis en diferentes formatos",
    parameters: [
      {
        name: "format",
        type: "string",
        description: "Formato de exportación: json, markdown, csv",
        required: true,
      },
    ],
    handler: async ({ format }) => {
      if (!analysisResult) return "No hay análisis para exportar";
      
      switch (format) {
        case 'json':
          navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2));
          Toast.success("JSON copiado al portapapeles");
          return "Análisis exportado como JSON y copiado al portapapeles";
        
        case 'markdown':
          const md = `# Análisis RFP - ${analysisResult.cliente}\n\n...`;
          navigator.clipboard.writeText(md);
          Toast.success("Markdown copiado al portapapeles");
          return "Análisis exportado como Markdown";
        
        case 'csv':
          // Exportar equipo como CSV
          const csv = analysisResult.equipo_sugerido
            ?.map((m: any) => `${m.nombre},${m.rol},${m.experiencia}`)
            .join('\n');
          navigator.clipboard.writeText(`Nombre,Rol,Experiencia\n${csv}`);
          Toast.success("CSV copiado al portapapeles");
          return "Equipo exportado como CSV";
        
        default:
          return "Formato no soportado";
      }
    },
  });
}
