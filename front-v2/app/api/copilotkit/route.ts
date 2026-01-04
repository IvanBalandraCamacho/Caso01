import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";

// Crear cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crear adapter de OpenAI con gpt-4o-mini
const serviceAdapter = new OpenAIAdapter({
  openai,
  model: "gpt-4o-mini",
});

// Crear runtime de CopilotKit
const runtime = new CopilotRuntime({
  // System prompt para el asistente
  instructions: `Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.

Tu rol es ayudar a los usuarios a:
1. Analizar documentos RFP de manera estructurada
2. Identificar requisitos técnicos y funcionales
3. Detectar fechas límite y plazos importantes
4. Estimar presupuestos y alcances económicos
5. Sugerir equipos técnicos adecuados
6. Identificar riesgos y vacíos de información
7. Generar preguntas de aclaración para el cliente

Siempre basa tus respuestas en el contexto del documento proporcionado.
Sé preciso, profesional y estructurado en tus respuestas.
Responde siempre en español.`,
});

// Exportar handlers para Next.js App Router
export const POST = async (req: Request) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
