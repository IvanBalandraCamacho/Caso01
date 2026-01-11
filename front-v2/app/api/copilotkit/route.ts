import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  GoogleGenerativeAIAdapter,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";

// Lazy initialization del adaptador Gemini
let geminiAdapter: GoogleGenerativeAIAdapter | null = null;

function getGeminiAdapter(): GoogleGenerativeAIAdapter {
  if (!geminiAdapter) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY no configurada");
    }
    // Usar modelo estable de Gemini (no preview)
    geminiAdapter = new GoogleGenerativeAIAdapter({
      model: process.env.GEMINI_FLASH_MODEL || "gemini-2.0-flash-exp",
    });
  }
  return geminiAdapter;
}

// Runtime simple sin acciones del servidor
// Las acciones las maneja el cliente con useCopilotAction
let runtime: CopilotRuntime | null = null;

function getRuntime(): CopilotRuntime {
  if (!runtime) {
    runtime = new CopilotRuntime();
  }
  return runtime;
}

export const POST = async (req: NextRequest) => {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime: getRuntime(),
      serviceAdapter: getGeminiAdapter(),
      endpoint: "/api/copilotkit",
    });

    return handleRequest(req);
  } catch (error) {
    console.error("[CopilotKit] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
