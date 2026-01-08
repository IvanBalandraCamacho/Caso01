"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { ReactNode } from "react";

interface CopilotProviderProps {
  children: ReactNode;
}

// Variable de entorno para habilitar/deshabilitar CopilotKit
// Por defecto habilitado en desarrollo, explícitamente "false" lo deshabilita
const COPILOT_ENABLED = process.env.NEXT_PUBLIC_COPILOT_ENABLED !== "false";

export function CopilotProvider({ children }: CopilotProviderProps) {
  // Si CopilotKit está explícitamente deshabilitado, renderizar solo los hijos
  if (!COPILOT_ENABLED) {
    console.warn("[CopilotProvider] CopilotKit está deshabilitado. Set NEXT_PUBLIC_COPILOT_ENABLED=true para habilitarlo.");
    return <>{children}</>;
  }

  // Usar el API Route interno de Next.js que maneja el runtime de CopilotKit
  // Esto evita problemas de CORS y red entre contenedores Docker
  const runtimeUrl = "/api/copilotkit";

  console.log("CopilotProvider initialized with runtimeUrl:", runtimeUrl);

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      showDevConsole={false}
    >
      {children}
    </CopilotKit>
  );
}
