# 🚀 Hoja de Ruta: Implementación de CopilotKit para Análisis Rápido de RFP

## 📋 Resumen Ejecutivo

Este documento detalla la estrategia de implementación de **CopilotKit** en el módulo de "Análisis Rápido de RFP" del sistema TIVIT AI Hub. CopilotKit permitirá crear una experiencia de copiloto IA interactiva, con capacidades de autocompletado, sugerencias contextuales y acciones automatizadas directamente en la interfaz de usuario.

---

## 🎯 Objetivos de la Implementación

1. **Copiloto Inteligente**: Asistente IA embebido que guía al usuario durante el análisis de RFPs
2. **Autocompletado Contextual**: Sugerencias en tiempo real basadas en el contenido del documento
3. **Acciones Automatizadas**: Botones y comandos que ejecutan análisis específicos
4. **Chat Integrado**: Panel de chat con contexto del documento actual
5. **Generación Asistida**: Completado automático de secciones del análisis

---

## 📦 Stack Tecnológico Requerido

### Frontend (Next.js 16 + React 19)
```json
{
  "dependencies": {
    "@copilotkit/react-core": "^1.3.0",
    "@copilotkit/react-ui": "^1.3.0",
    "@copilotkit/react-textarea": "^1.3.0"
  }
}
```

### Backend (FastAPI + Python)
```txt
copilotkit>=0.1.0
```

---

## 🗺️ Fases de Implementación

### **FASE 1: Configuración Base (Semana 1)**

#### 1.1 Instalación de Dependencias

```bash
# Frontend
cd front-v2
pnpm add @copilotkit/react-core @copilotkit/react-ui @copilotkit/react-textarea

# Backend (opcional para runtime actions)
cd backend
pip install copilotkit
```

#### 1.2 Configurar CopilotKit Provider

**Archivo a crear**: `front-v2/providers/CopilotProvider.tsx`

```tsx
"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { ReactNode } from "react";

interface CopilotProviderProps {
  children: ReactNode;
}

export function CopilotProvider({ children }: CopilotProviderProps) {
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      // O usar endpoint directo del backend:
      // runtimeUrl="http://localhost:8000/api/v1/copilot"
      agent="default"
      showDevConsole={process.env.NODE_ENV === "development"}
    >
      {children}
    </CopilotKit>
  );
}
```

#### 1.3 Integrar Provider en Layout

**Archivo a modificar**: `front-v2/app/layout.tsx`

```tsx
import { CopilotProvider } from "@/providers/CopilotProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CopilotProvider>
          {/* Otros providers */}
          {children}
        </CopilotProvider>
      </body>
    </html>
  );
}
```

#### 1.4 Crear Endpoint Runtime (Backend)

**Archivo a crear**: `backend/api/routes/copilot.py`

```python
from fastapi import APIRouter, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from core.llm_service import get_provider
from core.rag_client import rag_client
from models.schemas import DocumentChunk
from models.database import get_db
import logging
import json
from typing import Optional

router = APIRouter(prefix="/copilot", tags=["CopilotKit"])
logger = logging.getLogger(__name__)

# System prompt para el copiloto de análisis RFP
COPILOT_SYSTEM_PROMPT = """
Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.

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
"""

@router.get("/info")
async def copilot_info():
    """
    Endpoint de descubrimiento para CopilotKit.
    ⚠️ IMPORTANTE: Este endpoint DEBE devolver la estructura correcta
    para que CopilotKit pueda descubrir los agentes disponibles.
    """
    return {
        "runtime": "fastapi-copilotkit",
        "version": "1.0.0",
        "agents": [
            {
                "name": "default",
                "description": "Asistente de Análisis RFP (TIVIT)",
                "model": "gemini-2.0-flash-exp"
            }
        ],
        "actions": []
    }

@router.post("/")
async def copilot_runtime(
    request: Request,
    content_type: Optional[str] = Header(None)
):
    """
    Endpoint runtime principal para CopilotKit.
    Maneja tanto solicitudes de chat como de acciones.
    """
    try:
        body = await request.json()
        logger.info(f"Copilot request received: {json.dumps(body, indent=2)}")
        
        # Manejar diferentes tipos de solicitudes de CopilotKit
        request_type = body.get("type", "chat")
        
        if request_type == "chat" or "messages" in body:
            return await handle_chat_request(body)
        elif request_type == "action":
            return await handle_action_request(body)
        else:
            return JSONResponse(
                content={"error": "Unknown request type"},
                status_code=400
            )
        
    except Exception as e:
        logger.error(f"Error in copilot_runtime: {e}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )


async def handle_chat_request(body: dict):
    """
    Maneja las solicitudes de chat del copiloto.
    """
    messages = body.get("messages", [])
    properties = body.get("properties", {})
    workspace_id = properties.get("workspace_id")
    
    if not messages:
        return JSONResponse(
            content={"error": "No messages provided"},
            status_code=400
        )

    last_message = messages[-1].get("content", "")
    chat_history = [m for m in messages[:-1] if m.get("role") != "system"]

    # Obtener contexto RAG si hay workspace
    rag_chunks = []
    if workspace_id:
        try:
            rag_results = await rag_client.search(
                query=last_message,
                workspace_id=workspace_id,
                limit=5
            )
            rag_chunks = [
                DocumentChunk(
                    document_id=r.document_id,
                    chunk_text=r.content,
                    chunk_index=r.metadata.get("chunk_index", 0) if r.metadata else 0,
                    score=r.score
                ) for r in rag_results
            ]
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
    
    # Generar respuesta con streaming
    def generate():
        try:
            provider = get_provider()
            enhanced_history = [{"role": "system", "content": COPILOT_SYSTEM_PROMPT}] + chat_history
            
            for chunk in provider.generate_response_stream(
                query=last_message,
                context_chunks=rag_chunks,
                chat_history=enhanced_history
            ):
                yield f"data: {chunk}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Error in streaming: {e}", exc_info=True)
            error_msg = json.dumps({"error": str(e)})
            yield f"data: {error_msg}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def handle_action_request(body: dict):
    """
    Maneja las solicitudes de acciones del copiloto.
    """
    action_name = body.get("action")
    parameters = body.get("parameters", {})
    
    logger.info(f"Action request: {action_name} with params: {parameters}")
    
    return JSONResponse(
        content={
            "success": True,
            "message": f"Action {action_name} processed"
        }
    )
```

**⚠️ IMPORTANTE - Registrar el router en main.py:**

```python
# En backend/main.py, agregar:
from api.routes import copilot

app.include_router(copilot.router)
```

---

### **FASE 2: Componentes de UI del Copiloto (Semana 2)**

#### 2.1 Panel de Chat del Copiloto

**Archivo a crear**: `front-v2/components/copilot/CopilotPanel.tsx`

```tsx
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
```

#### 2.2 Textarea con Autocompletado IA

**Archivo a crear**: `front-v2/components/copilot/SmartTextarea.tsx`

```tsx
"use client";

import { CopilotTextarea } from "@copilotkit/react-textarea";
import "@copilotkit/react-textarea/styles.css";

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  context?: string;
}

export function SmartTextarea({ 
  value, 
  onChange, 
  placeholder,
  context 
}: SmartTextareaProps) {
  return (
    <CopilotTextarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autosuggestionsConfig={{
        textareaPurpose: `
          El usuario está analizando un RFP.
          Contexto del documento: ${context || "No disponible"}
          Ayuda a completar observaciones, análisis y recomendaciones.
        `,
        chatApiConfigs: {
          suggestionsApiConfig: {
            maxTokens: 100,
            stop: ["\n\n", ".", "?"],
          },
        },
      }}
      className="w-full min-h-[120px] bg-[#1E1F20] text-white border border-white/10 rounded-xl p-4"
    />
  );
}
```

#### 2.3 Sidebar del Copiloto

**Archivo a crear**: `front-v2/components/copilot/CopilotSidebar.tsx`

```tsx
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
```

---

### **FASE 3: Acciones del Copiloto (Semana 3)**

#### 3.1 Definir Acciones (useCopilotAction)

**Archivo a crear**: `front-v2/hooks/useCopilotActions.ts`

```tsx
"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { analyzeProposalApi } from "@/lib/api";

interface UseCopilotActionsProps {
  workspaceId: string;
  documentContent?: string;
  onAnalysisComplete?: (result: any) => void;
}

export function useCopilotActions({
  workspaceId,
  documentContent,
  onAnalysisComplete,
}: UseCopilotActionsProps) {
  
  // Hacer el contenido del documento accesible al copiloto
  useCopilotReadable({
    description: "Contenido del documento RFP actual",
    value: documentContent || "No hay documento cargado",
  });

  // Acción: Análisis Rápido
  useCopilotAction({
    name: "quickAnalysis",
    description: "Realiza un análisis rápido del RFP extrayendo información clave",
    parameters: [
      {
        name: "focusAreas",
        type: "string[]",
        description: "Áreas de enfoque: requisitos, fechas, presupuesto, equipo",
        required: false,
      },
    ],
    handler: async ({ focusAreas }) => {
      const result = await analyzeProposalApi({
        workspace_id: workspaceId,
        requirements: documentContent || "",
        output_format: "structured",
      });
      
      onAnalysisComplete?.(result);
      return `Análisis completado. Se encontraron ${result.tecnologias_requeridas?.length || 0} tecnologías y ${result.preguntas_sugeridas?.length || 0} preguntas sugeridas.`;
    },
  });

  // Acción: Extraer Fechas
  useCopilotAction({
    name: "extractDates",
    description: "Extrae todas las fechas y plazos del documento",
    handler: async () => {
      // Implementar extracción de fechas
      return "Fechas extraídas del documento";
    },
  });

  // Acción: Identificar Riesgos
  useCopilotAction({
    name: "identifyRisks",
    description: "Identifica riesgos legales y contractuales en el RFP",
    handler: async () => {
      // Implementar identificación de riesgos
      return "Riesgos identificados";
    },
  });

  // Acción: Generar Preguntas
  useCopilotAction({
    name: "generateQuestions",
    description: "Genera preguntas de aclaración para el cliente",
    parameters: [
      {
        name: "category",
        type: "string",
        description: "Categoría: técnico, legal, comercial, operativo",
        required: true,
      },
    ],
    handler: async ({ category }) => {
      // Implementar generación de preguntas
      return `Preguntas generadas para la categoría: ${category}`;
    },
  });

  // Acción: Sugerir Equipo
  useCopilotAction({
    name: "suggestTeam",
    description: "Sugiere el equipo técnico necesario basado en los requisitos",
    handler: async () => {
      // Implementar sugerencia de equipo
      return "Equipo sugerido basado en el análisis";
    },
  });
}
```

---

### **FASE 4: Integración en Página de Análisis Rápido (Semana 4)**

#### 4.1 Crear Página de Análisis Rápido con Copilot

**Archivo a crear**: `front-v2/app/workspace/[id]/quick-analysis/page.tsx`

```tsx
"use client";

import { use, useState, useEffect } from "react";
import { Card, Spin, Tabs, Button, Space, Tag } from "antd";
import { 
  RocketOutlined, 
  FileSearchOutlined,
  TeamOutlined,
  CalendarOutlined,
  AlertOutlined 
} from "@ant-design/icons";
import Sidebar from "@/components/sidebar";
import { UserMenu } from "@/components/UserMenu";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { CopilotSidebar } from "@/components/copilot/CopilotSidebar";
import { SmartTextarea } from "@/components/copilot/SmartTextarea";
import { useCopilotActions } from "@/hooks/useCopilotActions";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useUser } from "@/hooks/useUser";

export default function QuickAnalysisPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const { user } = useUser();
  const { activeWorkspace, documents } = useWorkspaceContext();
  
  const [documentContent, setDocumentContent] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Configurar acciones del copiloto
  useCopilotActions({
    workspaceId: id,
    documentContent,
    onAnalysisComplete: (result) => {
      setAnalysisResult(result);
      setIsAnalyzing(false);
    },
  });

  const analysisCards = [
    {
      key: "overview",
      icon: <FileSearchOutlined />,
      title: "Resumen Ejecutivo",
      description: "Visión general del RFP",
    },
    {
      key: "dates",
      icon: <CalendarOutlined />,
      title: "Fechas y Plazos",
      description: "Cronograma del proyecto",
    },
    {
      key: "team",
      icon: <TeamOutlined />,
      title: "Equipo Sugerido",
      description: "Perfiles recomendados",
    },
    {
      key: "risks",
      icon: <AlertOutlined />,
      title: "Riesgos Identificados",
      description: "Alertas y precauciones",
    },
  ];

  return (
    <div className="flex h-screen bg-[#131314] text-white overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <RocketOutlined className="text-2xl text-[#E31837]" />
            <div>
              <h1 className="text-xl font-bold">Análisis Rápido RFP</h1>
              <p className="text-sm text-zinc-500">
                {activeWorkspace?.name || "Workspace"}
              </p>
            </div>
          </div>
          <UserMenu user={user} />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysisCards.map((card) => (
                <Card
                  key={card.key}
                  className="bg-[#1E1F20] border-white/5 hover:border-[#E31837]/50 cursor-pointer transition-all"
                  hoverable
                >
                  <div className="text-center">
                    <div className="text-3xl text-[#E31837] mb-2">
                      {card.icon}
                    </div>
                    <h3 className="text-white font-medium">{card.title}</h3>
                    <p className="text-zinc-500 text-sm">{card.description}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <Card className="bg-[#1E1F20] border-white/5">
                <Tabs
                  items={[
                    {
                      key: "summary",
                      label: "Resumen",
                      children: (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-zinc-400 mb-2">Cliente</h4>
                            <p className="text-white">{analysisResult.cliente}</p>
                          </div>
                          <div>
                            <h4 className="text-zinc-400 mb-2">Objetivo</h4>
                            <p className="text-white">{analysisResult.objetivo_general?.[0]}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "tech",
                      label: "Tecnologías",
                      children: (
                        <Space wrap>
                          {analysisResult.tecnologias_requeridas?.map((tech: string, i: number) => (
                            <Tag key={i} color="blue">{tech}</Tag>
                          ))}
                        </Space>
                      ),
                    },
                    {
                      key: "questions",
                      label: "Preguntas Sugeridas",
                      children: (
                        <ul className="space-y-2">
                          {analysisResult.preguntas_sugeridas?.map((q: string, i: number) => (
                            <li key={i} className="text-zinc-300">• {q}</li>
                          ))}
                        </ul>
                      ),
                    },
                  ]}
                />
              </Card>
            )}

            {/* Notes with Smart Textarea */}
            <Card 
              title="Notas del Análisis" 
              className="bg-[#1E1F20] border-white/5"
            >
              <SmartTextarea
                value={notes}
                onChange={setNotes}
                placeholder="Escribe tus observaciones... (el copiloto te ayudará a completar)"
                context={documentContent}
              />
            </Card>
          </div>
        </div>

        {/* Copilot Panel (Floating) */}
        <CopilotPanel />
        
        {/* Copilot Sidebar */}
        <CopilotSidebar documentContext={documentContent} />
      </main>
    </div>
  );
}
```

---

### **FASE 5: Contexto Dinámico y RAG (Semana 5)**

#### 5.1 Hook para Contexto del Documento

**Archivo a crear**: `front-v2/hooks/useCopilotDocumentContext.ts`

```tsx
"use client";

import { useCopilotReadable } from "@copilotkit/react-core";
import { useEffect, useState } from "react";
import { getDocumentContentApi } from "@/lib/api";

interface UseCopilotDocumentContextProps {
  workspaceId: string;
  documentId?: string;
}

export function useCopilotDocumentContext({
  workspaceId,
  documentId,
}: UseCopilotDocumentContextProps) {
  const [documentContent, setDocumentContent] = useState<string>("");
  const [documentMetadata, setDocumentMetadata] = useState<any>(null);

  useEffect(() => {
    if (documentId) {
      loadDocumentContent();
    }
  }, [documentId]);

  const loadDocumentContent = async () => {
    try {
      const content = await getDocumentContentApi(documentId!);
      setDocumentContent(content.text);
      setDocumentMetadata(content.metadata);
    } catch (error) {
      console.error("Error loading document:", error);
    }
  };

  // Registrar contenido del documento para el copiloto
  useCopilotReadable({
    description: "Contenido completo del documento RFP actual",
    value: documentContent,
  });

  // Registrar metadata del documento
  useCopilotReadable({
    description: "Metadata del documento (nombre, tipo, tamaño)",
    value: JSON.stringify(documentMetadata || {}),
  });

  // Registrar información del workspace
  useCopilotReadable({
    description: "ID del workspace actual",
    value: workspaceId,
  });

  return {
    documentContent,
    documentMetadata,
    isLoaded: !!documentContent,
  };
}
```

#### 5.2 Integración con RAG Backend

**Archivo a modificar**: `backend/api/routes/copilot.py` (expandido)

```python
from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from core.llm_service import get_provider
from core.rag_client import search_documents
from models.database import get_db
from models.document import Document
from prompts.chat_prompts import RFP_ANALYSIS_JSON_PROMPT_TEMPLATE
import json

router = APIRouter(prefix="/copilot", tags=["CopilotKit"])

# System prompt para el copiloto de análisis RFP
COPILOT_SYSTEM_PROMPT = """
Eres un experto asistente de análisis de RFPs (Request for Proposals) de TIVIT.

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
"""

@router.post("/runtime")
async def copilot_runtime(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint runtime para CopilotKit con soporte RAG.
    """
    body = await request.json()
    
    messages = body.get("messages", [])
    frontend_context = body.get("context", {})
    actions = body.get("actions", [])
    
    # Extraer workspace_id del contexto
    workspace_id = None
    for ctx in frontend_context:
        if "workspace" in ctx.get("description", "").lower():
            workspace_id = ctx.get("value")
            break
    
    # Obtener contexto RAG
    rag_context = ""
    if workspace_id and messages:
        last_message = messages[-1].get("content", "")
        try:
            rag_results = await search_documents(
                query=last_message,
                workspace_id=workspace_id,
                top_k=10
            )
            rag_context = "\n\n".join([
                f"[Fragmento {i+1}]: {r.get('text', '')}"
                for i, r in enumerate(rag_results)
            ])
        except Exception as e:
            print(f"RAG search error: {e}")
    
    # Construir prompt con contexto
    system_prompt = COPILOT_SYSTEM_PROMPT
    if rag_context:
        system_prompt += f"\n\n=== CONTEXTO DEL DOCUMENTO ===\n{rag_context}"
    
    # Generar respuesta streaming
    async def generate():
        provider = get_provider()
        full_messages = [
            {"role": "system", "content": system_prompt},
            *messages
        ]
        
        async for chunk in provider.stream_chat(full_messages):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(), 
        media_type="text/event-stream"
    )


@router.post("/action/{action_name}")
async def execute_action(
    action_name: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Ejecuta una acción del copiloto.
    """
    body = await request.json()
    params = body.get("parameters", {})
    
    if action_name == "quickAnalysis":
        # Ejecutar análisis rápido
        result = await perform_quick_analysis(
            workspace_id=params.get("workspace_id"),
            db=db
        )
        return {"success": True, "result": result}
    
    elif action_name == "extractDates":
        # Extraer fechas
        return {"success": True, "dates": []}
    
    elif action_name == "identifyRisks":
        # Identificar riesgos
        return {"success": True, "risks": []}
    
    return {"success": False, "error": "Acción no reconocida"}


async def perform_quick_analysis(workspace_id: str, db: Session):
    """
    Realiza análisis rápido del RFP usando el prompt estructurado.
    """
    # Obtener documentos del workspace
    documents = db.query(Document).filter(
        Document.workspace_id == workspace_id,
        Document.status == "COMPLETED"
    ).all()
    
    if not documents:
        return {"error": "No hay documentos procesados en este workspace"}
    
    # Obtener contenido del documento principal
    # Implementar lógica de extracción...
    
    return {
        "cliente": "Por determinar",
        "fechas_y_plazos": [],
        "tecnologias_requeridas": [],
        "objetivo_general": [],
        "preguntas_sugeridas": []
    }
```

---

### **FASE 6: Mejoras de UX y Polish (Semana 6)**

#### 6.1 Indicadores de Estado del Copiloto

**Archivo a crear**: `front-v2/components/copilot/CopilotStatus.tsx`

```tsx
"use client";

import { useCopilotContext } from "@copilotkit/react-core";
import { Tag, Tooltip } from "antd";
import { RobotOutlined, LoadingOutlined, CheckCircleOutlined } from "@ant-design/icons";

export function CopilotStatus() {
  const { isLoading } = useCopilotContext();

  return (
    <Tooltip title={isLoading ? "El copiloto está pensando..." : "Copiloto listo"}>
      <Tag
        icon={isLoading ? <LoadingOutlined spin /> : <RobotOutlined />}
        color={isLoading ? "processing" : "success"}
        className="cursor-pointer"
      >
        {isLoading ? "Analizando..." : "Copiloto Activo"}
      </Tag>
    </Tooltip>
  );
}
```

#### 6.2 Comandos Rápidos (Slash Commands)

**Archivo a crear**: `front-v2/components/copilot/QuickCommands.tsx`

```tsx
"use client";

import { Button, Dropdown, MenuProps } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { useCopilotContext } from "@copilotkit/react-core";

interface QuickCommandsProps {
  onCommand: (command: string) => void;
}

export function QuickCommands({ onCommand }: QuickCommandsProps) {
  const commands: MenuProps["items"] = [
    {
      key: "analyze",
      label: "📊 Analizar documento completo",
      onClick: () => onCommand("/analyze"),
    },
    {
      key: "dates",
      label: "📅 Extraer fechas y plazos",
      onClick: () => onCommand("/dates"),
    },
    {
      key: "team",
      label: "👥 Sugerir equipo técnico",
      onClick: () => onCommand("/team"),
    },
    {
      key: "risks",
      label: "⚠️ Identificar riesgos",
      onClick: () => onCommand("/risks"),
    },
    {
      key: "questions",
      label: "❓ Generar preguntas",
      onClick: () => onCommand("/questions"),
    },
    {
      key: "summary",
      label: "📝 Resumen ejecutivo",
      onClick: () => onCommand("/summary"),
    },
  ];

  return (
    <Dropdown menu={{ items: commands }} trigger={["click"]}>
      <Button
        icon={<ThunderboltOutlined />}
        className="bg-[#E31837] border-none text-white hover:bg-[#c41530]"
      >
        Comandos Rápidos
      </Button>
    </Dropdown>
  );
}
```

---

## 📁 Estructura de Archivos Final

```
front-v2/
├── providers/
│   └── CopilotProvider.tsx          # Provider principal
├── components/
│   └── copilot/
│       ├── CopilotPanel.tsx         # Chat flotante
│       ├── CopilotSidebar.tsx       # Sidebar desplegable
│       ├── CopilotStatus.tsx        # Indicador de estado
│       ├── SmartTextarea.tsx        # Textarea con autocompletado
│       └── QuickCommands.tsx        # Comandos rápidos
├── hooks/
│   ├── useCopilotActions.ts         # Acciones del copiloto
│   └── useCopilotDocumentContext.ts # Contexto del documento
└── app/
    └── workspace/
        └── [id]/
            └── quick-analysis/
                └── page.tsx          # Página de análisis rápido

backend/
└── api/
    └── routes/
        └── copilot.py               # Endpoints del copiloto
```

---

## 🔧 Configuración de Variables de Entorno

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_COPILOT_ENABLED=true
```

### Backend (.env)
```env
# CopilotKit
COPILOT_ENABLED=true
COPILOT_MAX_TOKENS=4096
COPILOT_TEMPERATURE=0.7
```

---

## ✅ Checklist de Implementación

### Fase 1: Configuración Base
- [ ] Instalar dependencias de CopilotKit en frontend
- [ ] Crear CopilotProvider
- [ ] Integrar provider en layout principal
- [ ] Crear endpoint runtime en backend
- [ ] Probar conexión básica

### Fase 2: Componentes de UI
- [ ] Implementar CopilotPanel (chat flotante)
- [ ] Implementar SmartTextarea con autocompletado
- [ ] Implementar CopilotSidebar
- [ ] Estilizar componentes con tema TIVIT

### Fase 3: Acciones del Copiloto
- [ ] Definir acción quickAnalysis
- [ ] Definir acción extractDates
- [ ] Definir acción identifyRisks
- [ ] Definir acción generateQuestions
- [ ] Definir acción suggestTeam
- [ ] Probar todas las acciones

### Fase 4: Página de Análisis Rápido
- [ ] Crear página quick-analysis
- [ ] Integrar todos los componentes del copiloto
- [ ] Conectar con contexto del workspace
- [ ] Implementar visualización de resultados

### Fase 5: Contexto y RAG
- [ ] Implementar useCopilotDocumentContext
- [ ] Integrar búsqueda RAG en endpoint
- [ ] Optimizar prompts con contexto
- [ ] Probar precisión de respuestas

### Fase 6: Polish y UX
- [ ] Implementar indicadores de estado
- [ ] Agregar comandos rápidos
- [ ] Optimizar tiempos de respuesta
- [ ] Testing completo de flujos
- [ ] Documentación de usuario

---

## 📊 Métricas de Éxito

| Métrica | Objetivo | Método de Medición |
|---------|----------|-------------------|
| Tiempo de análisis | < 30 segundos | Métricas de API |
| Precisión de extracción | > 85% | Validación manual |
| Satisfacción del usuario | > 4.0/5.0 | Encuestas |
| Adopción | > 70% usuarios | Analytics |
| Reducción de tiempo | -50% vs manual | Comparativa |

---

## 🔗 Recursos y Referencias

- [Documentación CopilotKit](https://docs.copilotkit.ai/)
- [CopilotKit GitHub](https://github.com/CopilotKit/CopilotKit)
- [Ejemplos de Implementación](https://github.com/CopilotKit/CopilotKit/tree/main/examples)
- [API Reference](https://docs.copilotkit.ai/reference)

---

## 🐛 Troubleshooting - Problemas Comunes

### Error: "Agent 'default' not found after runtime sync"

**Síntoma**: 
```
useAgent: Agent 'default' not found after runtime sync (runtimeUrl=...). 
No agents registered. Verify your runtime /info
```

**Causa**: El endpoint `/info` no devuelve la estructura correcta o no está accesible.

**Solución**:

1. **Verificar que el endpoint `/info` esté funcionando:**
```bash
curl http://localhost:8000/api/v1/copilot/info
```

Debe retornar:
```json
{
  "runtime": "fastapi-copilotkit",
  "version": "1.0.0",
  "agents": [
    {
      "name": "default",
      "description": "Asistente de Análisis RFP (TIVIT)",
      "model": "gemini-2.0-flash-exp"
    }
  ],
  "actions": []
}
```

2. **Verificar que el router esté registrado en `main.py`:**
```python
from api.routes import copilot
app.include_router(copilot.router)
```

3. **Asegurar que el CopilotProvider especifica el agente:**
```tsx
<CopilotKit 
  runtimeUrl={runtimeUrl}
  agent="default"  // ← IMPORTANTE
>
```

4. **Verificar CORS si el frontend está en otro puerto:**
```python
# En backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Error: CORS bloqueando las solicitudes

**Síntoma**: Errores de CORS en la consola del navegador.

**Solución**: Verificar configuración CORS en el backend para permitir el origen del frontend.

### Error: Streaming no funciona

**Síntoma**: Las respuestas no se muestran en tiempo real.

**Solución**: 
1. Verificar que los headers de la respuesta incluyen `X-Accel-Buffering: no`
2. Asegurar que el generador termina con `yield "data: [DONE]\n\n"`
3. Verificar que el content-type es `text/event-stream`

### Error: RAG context no se incluye

**Síntoma**: El copiloto no responde basándose en los documentos.

**Solución**:
1. Verificar que `workspace_id` se pasa en las properties del request
2. Verificar que el servicio RAG está funcionando
3. Revisar logs del backend para ver si hay errores en la búsqueda

---

## 📝 Notas Adicionales

1. **Compatibilidad**: CopilotKit es compatible con React 19 y Next.js 16 (versiones actuales del proyecto)

2. **Streaming**: El sistema actual ya usa SSE para streaming, compatible con CopilotKit

3. **RAG Integration**: Aprovechar el servicio RAG existente (Qdrant + E5) para contexto

4. **Prompts existentes**: Reutilizar `RFP_ANALYSIS_JSON_PROMPT_TEMPLATE` y otros prompts del sistema

5. **Estilo visual**: Mantener consistencia con el tema dark mode TIVIT (#131314, #1E1F20, #E31837)

---

*Documento creado: Enero 2026*  
*Última actualización: {{ fecha_actual }}*  
*Autor: Equipo de Desarrollo TIVIT AI Hub*
