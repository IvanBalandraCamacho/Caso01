import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  OpenAIAdapter,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import OpenAI from "openai";

// Lazy initialization para evitar errores durante el build
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// URL del backend para obtener contexto RAG
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:8000/api/v1";

// Función para obtener contexto RAG del backend
async function getRAGContext(query: string, workspaceId?: string): Promise<string> {
  if (!workspaceId || workspaceId === "general") {
    return "";
  }
  
  try {
    console.log(`[CopilotKit] Fetching RAG context for workspace: ${workspaceId}, query: ${query.substring(0, 50)}...`);
    
    const response = await fetch(`${BACKEND_URL}/rag/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        workspace_id: workspaceId,
        limit: 5,
      }),
    });
    
    if (!response.ok) {
      console.error("[CopilotKit] RAG search failed:", response.status);
      return "";
    }
    
    const results = await response.json();
    if (results.results && results.results.length > 0) {
      const context = results.results
        .map((r: any, i: number) => `[Documento ${i + 1}]: ${r.content}`)
        .join("\n\n");
      console.log(`[CopilotKit] Retrieved ${results.results.length} RAG chunks`);
      return context;
    }
  } catch (error) {
    console.error("[CopilotKit] Error fetching RAG context:", error);
  }
  
  return "";
}

// System prompt base
const BASE_SYSTEM_PROMPT = `Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.
Tu objetivo es ayudar a analizar documentos, extraer datos y generar propuestas.

IMPORTANTE - GENERATIVE UI:
Cuando el usuario pida ver datos en forma visual (tablas, gráficos, métricas, timeline), 
DEBES usar las acciones disponibles para renderizar los datos directamente en el chat:

- renderTable: Para tablas de datos (requisitos, tecnologías, equipo, plazos, etc.)
- renderBarChart: Para comparar valores numéricos (costos por fase, recursos, etc.)
- renderLineChart: Para tendencias temporales (evolución de costos, cronogramas)
- renderPieChart: Para distribuciones y proporciones (tipos de requisitos, costos)
- renderMetrics: Para KPIs y métricas clave del proyecto
- renderTimeline: Para cronogramas y fechas importantes del RFP

SIEMPRE extrae los datos REALES del contexto de los documentos proporcionados.
NO inventes datos - usa SOLO información del contexto RAG.
Si no hay suficiente información en el contexto, indícalo claramente.`;

// Lazy initialization de runtime y adapter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let runtime: any = null;
let serviceAdapter: OpenAIAdapter | null = null;

function getRuntime() {
  if (!runtime) {
    runtime = new CopilotRuntime({
      actions: [
        {
          name: "searchRAGDocuments",
          description: "Busca información relevante en los documentos del workspace usando RAG. Úsalo SIEMPRE antes de responder preguntas sobre el contenido del documento o generar visualizaciones.",
          parameters: [
            {
              name: "query",
              type: "string",
              description: "La consulta de búsqueda para encontrar información relevante",
              required: true,
            },
            {
              name: "workspaceId",
              type: "string",
              description: "ID del workspace donde buscar (obtenerlo del contexto)",
              required: true,
            },
          ],
          handler: async ({ query, workspaceId }: { query: string; workspaceId: string }) => {
            console.log(`[CopilotKit Action] searchRAGDocuments called: ${query}, workspace: ${workspaceId}`);
            const context = getRAGContext(query, workspaceId);
            if (context) {
              return `Información encontrada en los documentos:\n\n${context}`;
            }
            return "No se encontró información relevante en los documentos del workspace.";
          },
        },
      ],
    });
  }
  return runtime;
}

function getServiceAdapter(): OpenAIAdapter {
  if (!serviceAdapter) {
    serviceAdapter = new OpenAIAdapter({
      openai: getOpenAIClient(),
      model: "gpt-4o-mini",
    });
  }
  return serviceAdapter;
}

export const POST = async (req: NextRequest) => {
  try {
    // Clonar el request para leer el body
    const body = await req.json();
    
    // Extraer workspaceId de múltiples fuentes posibles
    let workspaceId: string | undefined;
    
    // 1. Buscar en properties (forma directa)
    const properties = body.properties || {};
    workspaceId = properties.workspace_id || properties.workspaceId;
    
    // 2. Buscar en el contexto de mensajes del sistema
    if (!workspaceId) {
      const messages = body.messages || [];
      for (const msg of messages) {
        if (msg.role === "system" && typeof msg.content === "string") {
          // Buscar patrón workspace_id en el contenido
          const match = msg.content.match(/workspace[_\s]?(?:id)?[:\s]+([a-f0-9-]+)/i);
          if (match) {
            workspaceId = match[1];
            break;
          }
        }
      }
    }
    
    // 3. Buscar en el contexto de readables (CopilotKit los envía así)
    if (!workspaceId && body.context?.readables) {
      for (const readable of body.context.readables) {
        if (readable.value?.workspace_id) {
          workspaceId = readable.value.workspace_id;
          break;
        }
        if (readable.value?.workspaceId) {
          workspaceId = readable.value.workspaceId;
          break;
        }
      }
    }
    
    // 4. Buscar en el último mensaje de usuario (puede contener el ID en instrucciones)
    if (!workspaceId) {
      const messages = body.messages || [];
      for (const msg of messages) {
        if (typeof msg.content === "string") {
          const match = msg.content.match(/workspace[:\s]+([a-f0-9-]+)/i);
          if (match) {
            workspaceId = match[1];
          }
        }
      }
    }
    
    console.log(`[CopilotKit] Detected workspaceId: ${workspaceId || 'none'}`);
    
    // Extraer el último mensaje del usuario para buscar contexto RAG
    let userQuery = "";
    const messages = body.messages || [];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const content = messages[i].content;
        userQuery = typeof content === "string" 
          ? content 
          : content?.map((c: any) => c.text || "").join(" ") || "";
        break;
      }
    }
    
    // Obtener contexto RAG si hay workspace
    let ragContext = "";
    if (workspaceId && userQuery) {
      ragContext = await getRAGContext(userQuery, workspaceId);
    }
    
    // Construir system prompt con contexto RAG
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (ragContext) {
      systemPrompt += `\n\n--- CONTEXTO DE DOCUMENTOS DEL RFP ---\n${ragContext}\n--- FIN DEL CONTEXTO ---\n\nUsa esta información para responder las preguntas del usuario y generar visualizaciones.`;
    }
    
    // Agregar info del workspace al contexto
    if (workspaceId) {
      systemPrompt += `\n\nWorkspace ID actual: ${workspaceId}`;
    }
    
    // Crear nuevo request con el body modificado para incluir system prompt
    const modifiedBody = {
      ...body,
      systemPrompt,
    };
    
    // Crear nuevo Request con el body modificado
    const modifiedReq = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(modifiedBody),
    });

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime: getRuntime(),
      serviceAdapter: getServiceAdapter(),
      endpoint: "/api/copilotkit",
    });

    return handleRequest(modifiedReq);
  } catch (error) {
    console.error("[CopilotKit] Error in POST handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
