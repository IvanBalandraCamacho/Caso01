"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

interface AnalysisCopilotPanelProps {
  analysisContext?: string;
}

export function AnalysisCopilotPanel({ analysisContext }: AnalysisCopilotPanelProps) {
  return (
    <CopilotPopup
      labels={{
        title: "Asistente de Análisis RFP",
        initial: "¿Necesitas ayuda con el análisis? Puedo:\n\n• Generar un resumen ejecutivo\n• Identificar información faltante\n• Sugerir próximos pasos\n• Estimar esfuerzo y costos\n\n¿Qué te gustaría hacer?",
        placeholder: "Ej: Genera un resumen para el comité...",
      }}
      instructions={`
        Eres un experto en análisis de RFPs de TIVIT.
        
        Contexto del análisis actual:
        ${analysisContext || "No hay análisis cargado"}
        
        Puedes ayudar al usuario a:
        1. Interpretar los resultados del análisis
        2. Generar resúmenes ejecutivos
        3. Identificar información faltante
        4. Sugerir próximos pasos
        5. Estimar esfuerzos y costos
        6. Preparar material para presentaciones
        
        Usa las acciones disponibles cuando sea apropiado.
        Sé profesional, conciso y orientado a resultados.
      `}
      shortcut="mod+shift+a"
    />
  );
}

