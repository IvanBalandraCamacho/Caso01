"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Card, Typography, Row, Col, Button, App, Steps, Spin } from 'antd'
import { 
  InboxOutlined, 
  RocketOutlined, 
  FileTextOutlined, 
  DatabaseOutlined,
  ArrowRightOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import Sidebar from '@/components/sidebar'
import { UserMenu } from '@/components/UserMenu'
import { useUser } from '@/hooks/useUser'
import { analyzeDocumentApi, uploadDocumentApi } from '@/lib/api'

const { Dragger } = Upload
const { Title, Text } = Typography

// Tipos de archivo permitidos
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function QuickAnalysisPage() {
  const { user } = useUser()
  const router = useRouter()
  const { message } = App.useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [file, setFile] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

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
    try {
      // Simular progreso inicial
      onProgress({ percent: 10 })
      
      const response = await analyzeDocumentApi(file, (percent) => {
         // Ajustar porcentaje para que no llegue a 100 antes de tiempo
         onProgress({ percent: Math.min(percent * 0.7, 70) }) // Análisis = 70%
      }) as any // Casting porque la firma original solo retorna ProposalAnalysis
      
      // Guardar resultado y ID
      setAnalysisResult(response.analysis)
      setWorkspaceId(response.workspace_id)
      setFile(file)
      
      onProgress({ percent: 75 })
      
      // Subir el documento al workspace creado
      try {
        const formData = new FormData();
        formData.append("file", file);
        await uploadDocumentApi(response.workspace_id, formData);
        onProgress({ percent: 95 })
        message.success("Documento analizado y guardado en el workspace.");
      } catch (uploadError) {
        console.warn("Error subiendo documento al workspace:", uploadError);
        // No fallar todo el proceso si solo falla el upload
        message.warning("Análisis completado. El documento se procesará en segundo plano.");
      }
      
      onProgress({ percent: 100 })
      onSuccess("ok")
      
      // Redirigir inmediatamente al Proposal Workbench
      router.push(`/workspace/${response.workspace_id}/quick-analysis`)
      
    } catch (error) {
      console.error(error)
      onError(error)
      message.error("Error al analizar el documento. Inténtalo de nuevo.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analysisOptions = [
    {
      id: 'A',
      title: 'Análisis Rápido',
      description: 'Ver el resumen ejecutivo y puntos clave en el Dashboard.',
      icon: <RocketOutlined className="text-4xl text-[#E31837]" />,
      action: () => router.push(`/workspace/${workspaceId}/quick-analysis`)
    },
    {
      id: 'B',
      title: 'Generación Completa',
      description: 'Ir al chat para generar una propuesta detallada.',
      icon: <FileTextOutlined className="text-4xl text-[#FF6B00]" />,
      action: () => router.push(`/workspace/${workspaceId}/quick-analysis`)
    },
    {
      id: 'C',
      title: 'Extracción de Requisitos',
      description: 'Ver la matriz de cumplimiento extraída.',
      icon: <DatabaseOutlined className="text-4xl text-[#52c41a]" />,
      action: () => router.push(`/workspace/${workspaceId}/quick-analysis`)
    }
  ]

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

        <div className="flex-1 overflow-y-auto p-8 sm:p-12">
          <div className="max-w-5xl mx-auto">
            <div className="mb-12">
              <Title level={2} className="text-white !mb-2">Nuevo Análisis RFP</Title>
              <Text className="text-zinc-400">Sigue los pasos para analizar tu documento de licitación de forma inteligente.</Text>
            </div>

            <Steps
              current={currentStep}
              className="custom-steps mb-16"
              items={[
                { title: 'Carga de Archivo', icon: isAnalyzing ? <LoadingOutlined /> : undefined },
                { title: 'Selección de Análisis' },
                { title: 'Resultados' }
              ]}
            />

            {currentStep === 0 && (
              <div className="animate-fade-in-up">
                <Dragger
                  name="file"
                  multiple={false}
                  accept={ACCEPTED_FILE_TYPES}
                  customRequest={customRequest}
                  showUploadList={false}
                  disabled={isAnalyzing}
                  className={`bg-[#1E1F20] border-2 border-dashed border-zinc-800 hover:border-[#E31837] rounded-3xl p-12 transition-all ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="ant-upload-drag-icon">
                    {isAnalyzing ? (
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#E31837' }} spin />} />
                    ) : (
                      <InboxOutlined className="text-zinc-500" />
                    )}
                  </div>
                  <p className="text-xl font-semibold text-white mt-4">
                    {isAnalyzing ? "Analizando documento con IA..." : "Arrastra tu RFP aquí o haz clic para subir"}
                  </p>
                  <p className="text-zinc-500 mt-2">
                    {isAnalyzing ? "Esto puede tardar unos segundos." : "Solo PDF y Word (.pdf, .doc, .docx) hasta 50MB."}
                  </p>
                </Dragger>
              </div>
            )}

            {currentStep === 1 && (
              <div className="animate-fade-in-up">
                <div className="text-center mb-10">
                  <Title level={3} className="text-white !mb-3">¡Análisis Completado!</Title>
                  <Text className="text-zinc-400">Hemos procesado tu documento. ¿Cómo quieres proceder?</Text>
                </div>
                
                <Row gutter={[24, 24]}>
                  {analysisOptions.map((opt) => (
                    <Col xs={24} md={8} key={opt.id}>
                      <Card
                        hoverable
                        className="h-full bg-[#1E1F20] border-white/5 hover:border-[#E31837]/50 rounded-3xl transition-all group overflow-hidden"
                        onClick={opt.action}
                      >
                        <div className="flex flex-col items-center text-center p-4">
                          <div className="mb-6 p-6 bg-[#131314] rounded-2xl group-hover:scale-110 transition-transform">
                            {opt.icon}
                          </div>
                          <Title level={4} className="text-white !mb-3">{opt.title}</Title>
                          <Text className="text-zinc-400 mb-6">{opt.description}</Text>
                          <Button 
                            type="text" 
                            icon={<ArrowRightOutlined />} 
                            className="text-[#E31837] group-hover:translate-x-2 transition-transform"
                          >
                            Ver Resultados
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <div className="mt-12 text-center">
                  <Button type="link" onClick={() => {
                    setFile(null);
                    setWorkspaceId(null);
                    setCurrentStep(0);
                  }} className="text-zinc-500">
                    Analizar otro archivo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-steps .ant-steps-item-title {
          color: #a1a1aa !important;
        }
        .custom-steps .ant-steps-item-active .ant-steps-item-title {
          color: white !important;
          font-weight: 600 !important;
        }
        .custom-steps .ant-steps-item-finish .ant-steps-item-title {
          color: #52c41a !important;
        }
        .custom-steps .ant-steps-item-icon {
          background: #1E1F20 !important;
          border-color: #27272a !important;
        }
        .custom-steps .ant-steps-item-active .ant-steps-item-icon {
          background: #E31837 !important;
          border-color: #E31837 !important;
        }
        .custom-steps .ant-steps-item-active .ant-steps-item-icon .ant-steps-icon {
          color: white !important;
        }
        .custom-steps .ant-steps-item-finish .ant-steps-item-icon {
          background: transparent !important;
          border-color: #52c41a !important;
        }
        .custom-steps .ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon {
          color: #52c41a !important;
        }
        .ant-card {
          background: #1E1F20 !important;
        }
      `}</style>
    </div>
  )
}
