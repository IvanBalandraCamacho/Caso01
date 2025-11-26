"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyzeProposal, useGenerateProposal } from "@/hooks/useApi";
import { Upload, Loader2, FileText, AlertCircle, Users, DollarSign, Calendar } from "lucide-react";

interface ProposalModalProps {
  open: boolean;
  onClose: () => void;
}

type ModalState = "upload" | "analyzing" | "review";

interface ProposalAnalysis {
  cliente: string;
  fecha_entrega: string;
  alcance_economico: {
    presupuesto: string;
    moneda: string;
  };
  tecnologias_requeridas: string[];
  riesgos_detectados: string[];
  preguntas_sugeridas: string[];
  equipo_sugerido: Array<{
    nombre: string;
    rol: string;
    skills: string[];
    experiencia: string;
  }>;
}

export default function ProposalModal({ open, onClose }: ProposalModalProps) {
  const [state, setState] = useState<ModalState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ProposalAnalysis | null>(null);

  const analyzeMutation = useAnalyzeProposal();
  const generateMutation = useGenerateProposal();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setState("analyzing");
    try {
      const result = await analyzeMutation.mutateAsync(selectedFile);
      setAnalysis(result);
      setState("review");
    } catch (error) {
      console.error("Error analyzing proposal:", error);
      alert("Error al analizar el documento. Intente nuevamente.");
      setState("upload");
    }
  };

  const handleGenerateWord = async () => {
    if (!analysis) return;

    try {
      const blob = await generateMutation.mutateAsync(analysis);
      
      // Descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Propuesta_${analysis.cliente.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Cerrar modal
      handleClose();
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Error al generar el documento. Intente nuevamente.");
    }
  };

  const handleClose = () => {
    setState("upload");
    setSelectedFile(null);
    setAnalysis(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            🚀 Generar Propuesta Inteligente
          </DialogTitle>
        </DialogHeader>

        {/* Estado: Upload */}
        {state === "upload" && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Sube el archivo PDF del RFP para análisis automático
              </p>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="max-w-md mx-auto"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {selectedFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile}
              className="w-full"
              size="lg"
            >
              Analizar RFP con IA
            </Button>
          </div>
        )}

        {/* Estado: Analyzing */}
        {state === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-medium">Analizando documento...</p>
            <p className="text-sm text-gray-500 mt-2">
              Extrayendo información, identificando riesgos y buscando talento
            </p>
          </div>
        )}

        {/* Estado: Review */}
        {state === "review" && analysis && (
          <div className="space-y-6">
            {/* Información del Cliente */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Cliente</h3>
                  <p className="text-blue-700">{analysis.cliente}</p>
                </div>
              </div>
            </div>

            {/* Presupuesto y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">Presupuesto</h3>
                    <p className="text-green-700">
                      {analysis.alcance_economico.presupuesto} {analysis.alcance_economico.moneda}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-purple-900">Fecha Entrega</h3>
                    <p className="text-purple-700">{analysis.fecha_entrega}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Riesgos Detectados */}
            {analysis.riesgos_detectados.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-2">Riesgos Detectados</h3>
                    <ul className="space-y-1">
                      {analysis.riesgos_detectados.map((riesgo, idx) => (
                        <li key={idx} className="text-sm text-orange-700">
                          • {riesgo}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Equipo Sugerido */}
            {analysis.equipo_sugerido.length > 0 && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-indigo-900 mb-3">Equipo Sugerido</h3>
                    <div className="space-y-3">
                      {analysis.equipo_sugerido.map((miembro, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-indigo-200">
                          <p className="font-medium text-indigo-900">{miembro.nombre}</p>
                          <p className="text-sm text-indigo-700">{miembro.rol} • {miembro.experiencia}</p>
                          <p className="text-xs text-indigo-600 mt-1">
                            Skills: {miembro.skills.join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tecnologías */}
            {analysis.tecnologias_requeridas.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Tecnologías Requeridas</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.tecnologias_requeridas.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleGenerateWord}
                disabled={generateMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  "📄 Generar Documento Word"
                )}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                size="lg"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
