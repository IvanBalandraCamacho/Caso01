"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { ReactNode } from "react";

interface CopilotProviderProps {
  children: ReactNode;
  workspaceId?: string;
}

// Variable de entorno para habilitar/deshabilitar CopilotKit
// Por defecto habilitado en desarrollo, explícitamente "false" lo deshabilita
const COPILOT_ENABLED = process.env.NEXT_PUBLIC_COPILOT_ENABLED !== "false";

// URL del runtime - constante para evitar re-renders
const RUNTIME_URL = "/api/copilotkit";

export function CopilotProvider({ children, workspaceId }: CopilotProviderProps) {
  // Si CopilotKit está deshabilitado, renderizar solo los hijos
  if (!COPILOT_ENABLED) {
    return <>{children}</>;
  }

  // Configurar propiedades a enviar con cada request
  const properties = workspaceId ? { workspace_id: workspaceId, workspaceId } : undefined;

  return (
    <CopilotKit 
      runtimeUrl={RUNTIME_URL}
      showDevConsole={false}
      properties={properties}
    >
      {children}
    </CopilotKit>
  );
}
