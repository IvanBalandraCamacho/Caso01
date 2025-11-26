"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { SearchResults } from "@/components/search-results";
import ProposalModal from "@/components/ProposalModal";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Sparkles } from "lucide-react";

type ViewMode = "dashboard" | "chat";

export default function Home() {
  const { searchResults, workspaces } = useWorkspaces();
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [showProposalModal, setShowProposalModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      {viewMode === "dashboard" ? (
        // Dashboard View
        <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ backgroundColor: '#000000' }}>
          <div className="max-w-5xl w-full space-y-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4">
                Gestor de Propuestas Inteligente
              </h1>
              <p className="text-lg text-gray-400">
                Analiza RFPs, gestiona documentos y genera propuestas con IA
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta: Auditar RFP */}
              <div 
                className="bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all cursor-pointer border-2 border-gray-700 hover:border-blue-500"
                onClick={() => setShowProposalModal(true)}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500/20 p-4 rounded-lg">
                    <Sparkles className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      🚀 Auditar RFP
                    </h2>
                    <p className="text-gray-300 mb-4">
                      Sube un documento PDF y obtén análisis automático con IA: 
                      riesgos, presupuesto, tecnologías y equipo sugerido.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Extracción inteligente de información</li>
                      <li>✓ Detección de riesgos y gaps</li>
                      <li>✓ Generación de propuesta en Word</li>
                    </ul>
                  </div>
                </div>
                <Button className="w-full mt-6" size="lg">
                  <FileText className="mr-2 h-4 w-4" />
                  Iniciar Análisis
                </Button>
              </div>

              {/* Tarjeta: Chat RAG */}
              <div 
                className="bg-gray-800 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all cursor-pointer border-2 border-gray-700 hover:border-green-500"
                onClick={() => setViewMode("chat")}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-green-500/20 p-4 rounded-lg">
                    <MessageSquare className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      💬 Chat RAG
                    </h2>
                    <p className="text-gray-300 mb-4">
                      Consulta tus documentos corporativos usando IA conversacional. 
                      Busca información precisa en segundos.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>✓ Búsqueda semántica en documentos</li>
                      <li>✓ Respuestas con fuentes citadas</li>
                      <li>✓ Multi-modelo (OpenAI GPT-4o-mini)</li>
                    </ul>
                  </div>
                </div>
                <Button className="w-full mt-6" size="lg" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Abrir Chat
                </Button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-md border border-gray-700">
              <h3 className="font-semibold text-white mb-2">💡 Características Destacadas</h3>
              <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-300">
                <div>
                  <div className="text-2xl font-bold text-blue-400">100%</div>
                  <div>Automatizado</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">5 min</div>
                  <div>Tiempo de análisis</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">3+ IAs</div>
                  <div>Modelos disponibles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Chat View (Original)
        <>
          <ChatArea />
          {searchResults.length > 0 && <SearchResults results={searchResults} />}
        </>
      )}

      {/* Modal de Propuestas */}
      <ProposalModal 
        open={showProposalModal} 
        onClose={() => setShowProposalModal(false)} 
      />
    </div>
  );
}
