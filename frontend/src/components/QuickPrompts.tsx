"use client";
import { Button } from "@/components/ui/button";

interface QuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

export function QuickPrompts({ onPromptSelect }: QuickPromptsProps) {
  const prompts = [
    "Genera un resumen ejecutivo de la documentación disponible",
    "Identifica y extrae los puntos críticos y conclusiones principales",
    "Proporciona una explicación simplificada para audiencia no técnica",
    "Realiza un análisis profundo con insights estratégicos y recomendaciones",
    "Compara y contrasta los documentos para identificar patrones o discrepancias",
    "Extrae métricas, KPIs y datos cuantitativos relevantes del contenido",
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {prompts.map((prompt, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border-gray-600"
          onClick={() => onPromptSelect(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
