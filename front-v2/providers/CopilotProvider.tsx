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

  // Usar el API Route interno de Next.js que maneja el runtime de CopilotKit
  // Esto evita problemas de CORS y red entre contenedores Docker
  const runtimeUrl = "/api/copilotkit";

  console.log("CopilotProvider initialized with runtimeUrl:", runtimeUrl);

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      showDevConsole={process.env.NODE_ENV === "development"}
    >
      {children}
    </CopilotKit>
  );
}
