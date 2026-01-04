"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export function CopilotPanel() {
  return (
    <CopilotPopup
      labels={{
        title: "Asistente de Análisis RFP",
        initial: "¡Hola! Soy tu asistente para analizar RFPs. ¿En qué puedo ayudarte?",
        placeholder: "Pregunta sobre el documento...",
      }}
      instructions={`
        Eres un experto en análisis de RFPs (Request for Proposals).
        Tu rol es ayudar al usuario a:
        1. Identificar requisitos clave del documento
        2. Detectar fechas y plazos importantes
        3. Analizar el alcance económico
        4. Sugerir el equipo técnico necesario
        5. Identificar riesgos y vacíos de información
        
        Siempre basa tus respuestas en el contenido del documento actual.
      `}
    />
  );
}
