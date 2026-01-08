"use client";

import { CopilotTextarea } from "@copilotkit/react-textarea";
import "@copilotkit/react-textarea/styles.css";

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  context?: string;
}

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  context
}: SmartTextareaProps) {
  return (
    <CopilotTextarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autosuggestionsConfig={{
        textareaPurpose: `
          El usuario está analizando un RFP.
          Contexto del documento: ${context || "No disponible"}
          Ayuda a completar observaciones, análisis y recomendaciones.
        `,
        chatApiConfigs: {
          suggestionsApiConfig: {
            maxTokens: 100,
            stop: ["\n\n", ".", "?"],
          },
        },
      }}
      className="w-full min-h-[120px] bg-[#1E1F20] text-white border border-white/10 rounded-xl p-4"
    />
  );
}
