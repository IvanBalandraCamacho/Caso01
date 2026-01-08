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
import { CopilotStatus } from "@/components/copilot/CopilotStatus";
import { QuickCommands } from "@/components/copilot/QuickCommands";
import { useCopilotActions } from "@/hooks/useCopilotActions";
import { useCopilotDocumentContext } from "@/hooks/useCopilotDocumentContext";
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
  
  const mainDocumentId = documents?.[0]?.id;
  const { documentContent } = useCopilotDocumentContext({
    workspaceId: id,
    documentId: mainDocumentId
  });

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
              <div className="flex items-center gap-2">
                <p className="text-sm text-zinc-500">
                  {activeWorkspace?.name || "Workspace"}
                </p>
                <CopilotStatus />
              </div>
            </div>
          </div>
          <UserMenu />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Quick Commands */}
            <div className="flex justify-end">
              <QuickCommands onCommand={(cmd) => console.log("Command:", cmd)} />
            </div>

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
