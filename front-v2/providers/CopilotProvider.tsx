"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { ReactNode, useState, useEffect, useRef } from "react";

interface CopilotProviderProps {
  children: ReactNode;
}

// Variable de entorno para habilitar/deshabilitar CopilotKit
// Por defecto habilitado en desarrollo, explícitamente "false" lo deshabilita
const COPILOT_ENABLED = process.env.NEXT_PUBLIC_COPILOT_ENABLED !== "false";

// URL del runtime - constante para evitar re-renders
const RUNTIME_URL = "/api/copilotkit";

export function CopilotProvider({ children }: CopilotProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  // Inicializar una sola vez al montar
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      // Pequeño delay para asegurar que el cliente está completamente hidratado
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Si CopilotKit está explícitamente deshabilitado, renderizar solo los hijos
  if (!COPILOT_ENABLED) {
    return <>{children}</>;
  }

  // Mostrar children sin CopilotKit mientras se inicializa para evitar errores
  if (!isReady) {
    return <>{children}</>;
  }

  return (
    <CopilotKit 
      runtimeUrl={RUNTIME_URL}
      showDevConsole={false}
    >
      {children}
    </CopilotKit>
  );
}
