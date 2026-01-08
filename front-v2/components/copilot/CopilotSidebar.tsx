"use client";

import { CopilotSidebar as Sidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

interface CopilotSidebarProps {
  documentContext?: string;
}

export function CopilotSidebar({ documentContext }: CopilotSidebarProps) {
  return (
    <Sidebar
      labels={{
        title: "Copiloto RFP",
        initial: "Analicemos este documento juntos. ¿Qué información necesitas extraer?",
      }}
      instructions={`
        Contexto del documento actual:
        ${documentContext || "No hay documento cargado"}
        
        Eres un asistente experto en análisis de RFPs de TIVIT.
        Ayuda al usuario a extraer información estructurada.
      `}
      defaultOpen={false}
    />
  );
}
