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

  // Usar el endpoint de API Route de Next.js que maneja OpenAI
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      showDevConsole={process.env.NODE_ENV === "development"}
    >
      {children}
    </CopilotKit>
  );
}
