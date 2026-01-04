"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { ReactNode } from "react";

interface CopilotProviderProps {
  children: ReactNode;
}

// Variable de entorno para habilitar/deshabilitar CopilotKit
const COPILOT_ENABLED = process.env.NEXT_PUBLIC_COPILOT_ENABLED === "true";

export function CopilotProvider({ children }: CopilotProviderProps) {
  // Si CopilotKit está deshabilitado, renderizar solo los hijos
  if (!COPILOT_ENABLED) {
    return <>{children}</>;
  }

  // Usar el endpoint directo del Backend (Python/FastAPI)
  const runtimeUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/copilot`
    : "http://localhost:8000/api/v1/copilot";

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      showDevConsole={process.env.NODE_ENV === "development"}
      agent="default"
    >
      {children}
    </CopilotKit>
  );
}
