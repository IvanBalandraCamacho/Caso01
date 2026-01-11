"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Typography, App, Spin, Progress } from 'antd'
import { 
  InboxOutlined, 
  LoadingOutlined,
  FileTextOutlined,
  RocketOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import Sidebar from '@/components/sidebar'
import { UserMenu } from '@/components/UserMenu'
import { useUser } from '@/hooks/useUser'
import { analyzeDocumentApi } from '@/lib/api'

const { Dragger } = Upload
const { Title, Text } = Typography

// Tipos de archivo permitidos
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Mensajes de progreso para UX más amigable
const PROGRESS_MESSAGES = [
  { percent: 10, message: "Leyendo documento...", icon: <FileTextOutlined /> },
  { percent: 30, message: "Extrayendo contenido...", icon: <FileTextOutlined /> },
  { percent: 50, message: "Analizando con IA...", icon: <RocketOutlined /> },
  { percent: 70, message: "Generando insights...", icon: <RocketOutlined /> },
  { percent: 85, message: "Preparando workspace...", icon: <RocketOutlined /> },
  { percent: 95, message: "Casi listo...", icon: <CheckCircleOutlined /> },
];

export default function QuickAnalysisPage() {
  const { user } = useUser()
  const router = useRouter()
  const { message } = App.useApp()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")

  // Actualizar mensaje de progreso según el porcentaje
  const updateProgressMessage = (percent: number) => {
    const msg = PROGRESS_MESSAGES.find((m, i) => {
      const next = PROGRESS_MESSAGES[i + 1];
      return percent >= m.percent && (!next || percent < next.percent);
    });
    if (msg) setProgressMessage(msg.message);
  };

  // Custom request para realizar la llamada real a la API
  const customRequest = async ({ file, onSuccess, onError, onProgress }: any) => {
    // Validar tipo de archivo
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.includes(file.type) || 
                        fileName.endsWith('.pdf') || 
                        fileName.endsWith('.doc') || 
                        fileName.endsWith('.docx');
    
    if (!isValidType) {
      message.error("Solo se permiten archivos PDF o Word (.pdf, .doc, .docx)");
      onError(new Error("Tipo de archivo no permitido"));
      return;
    }

    setIsAnalyzing(true)
    setProgress(5)
    setProgressMessage("Iniciando análisis...")
    
    try {
      // Simular progreso inicial
      setProgress(10)
      updateProgressMessage(10)
      onProgress({ percent: 10 })
      
      const response = await analyzeDocumentApi(file, (percent) => {
         // Ajustar porcentaje para que no llegue a 100 antes de tiempo
         const adjustedPercent = Math.min(percent * 0.7, 70)
         setProgress(adjustedPercent)
         updateProgressMessage(adjustedPercent)
         onProgress({ percent: adjustedPercent })
      }) as any
      
      setProgress(75)
      updateProgressMessage(75)
      onProgress({ percent: 75 })
      
      // El documento ya se indexa en RAG durante el análisis en el backend
      // No es necesario subirlo de nuevo
      
      setProgress(100)
      setProgressMessage("¡Listo! Redirigiendo...")
      onProgress({ percent: 100 })
      onSuccess("ok")
      
      // Pequeño delay para que el usuario vea el 100%
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirigir al Proposal Workbench
      router.push(`/workspace/${response.workspace_id}/quick-analysis`)
      
    } catch (error) {
      console.error(error)
      onError(error)
      message.error("Error al analizar el documento. Inténtalo de nuevo.")
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  return (
    <div className="flex h-screen bg-[#131314] text-white overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="px-6 py-6 z-20 flex justify-between items-center bg-[#131314]/80 backdrop-blur-md border-b border-white/5">
          <div className="cursor-pointer" onClick={() => router.push('/')}>
            <img src="/logo.svg" alt="Logo" className="h-8" />
          </div>
          <UserMenu user={user} />
        </header>

        <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-2xl mx-auto">
            {/* Título */}
            <div className="text-center mb-10">
              <Title level={2} className="text-white !mb-3">
                {isAnalyzing ? "Analizando tu RFP" : "Análisis Inteligente de RFP"}
              </Title>
              <Text className="text-zinc-400 text-lg">
                {isAnalyzing 
                  ? "Nuestra IA está extrayendo información clave del documento..."
                  : "Sube tu documento y obtén un análisis completo en segundos"
                }
              </Text>
            </div>

            {/* Upload Zone o Progress */}
            {isAnalyzing ? (
              <div className="bg-[#1E1F20] rounded-3xl p-12 border border-zinc-800 animate-fade-in">
                <div className="flex flex-col items-center">
                  {/* Icono animado */}
                  <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E31837] to-[#FF6B00] flex items-center justify-center animate-pulse">
                      <RocketOutlined className="text-4xl text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-[#E31837]/30 animate-ping" />
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full max-w-md mb-6">
                    <Progress 
                      percent={progress} 
                      strokeColor={{
                        '0%': '#E31837',
                        '100%': '#FF6B00',
                      }}
                      railColor="#27272a"
                      showInfo={false}
                      size={["100%", 8]}
                    />
                  </div>
                  
                  {/* Mensaje de progreso */}
                  <div className="text-center">
                    <p className="text-xl font-semibold text-white mb-2">
                      {progressMessage}
                    </p>
                    <p className="text-zinc-500 text-sm">
                      {progress}% completado
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Dragger
                name="file"
                multiple={false}
                accept={ACCEPTED_FILE_TYPES}
                customRequest={customRequest}
                showUploadList={false}
                disabled={isAnalyzing}
                className="bg-[#1E1F20] border-2 border-dashed border-zinc-700 hover:border-[#E31837] rounded-3xl p-12 transition-all duration-300 group"
              >
                <div className="flex flex-col items-center">
                  {/* Icono grande */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <InboxOutlined className="text-4xl text-zinc-400 group-hover:text-[#E31837] transition-colors" />
                  </div>
                  
                  <p className="text-xl font-semibold text-white mb-2">
                    Arrastra tu RFP aquí
                  </p>
                  <p className="text-zinc-400 mb-4">
                    o haz clic para seleccionar
                  </p>
                  
                  {/* Badge de formatos */}
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">PDF</span>
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">DOC</span>
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">DOCX</span>
                  </div>
                  
                  <p className="text-zinc-600 text-xs mt-4">
                    Máximo 50MB
                  </p>
                </div>
              </Dragger>
            )}

            {/* Features info */}
            {!isAnalyzing && (
              <div className="mt-10 grid grid-cols-3 gap-6 text-center animate-fade-in">
                <div className="p-4">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#E31837]/10 flex items-center justify-center">
                    <FileTextOutlined className="text-[#E31837]" />
                  </div>
                  <p className="text-sm text-zinc-400">Extracción automática de requisitos</p>
                </div>
                <div className="p-4">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
                    <RocketOutlined className="text-[#FF6B00]" />
                  </div>
                  <p className="text-sm text-zinc-400">Análisis con IA avanzada</p>
                </div>
                <div className="p-4">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircleOutlined className="text-green-500" />
                  </div>
                  <p className="text-sm text-zinc-400">Sugerencias de equipo incluidas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .ant-upload-drag {
          background: transparent !important;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
