"use client"

import type React from "react"

import { PlusOutlined, RocketOutlined, DownOutlined, SendOutlined, InfoCircleOutlined, UploadOutlined, DownloadOutlined, FilePdfOutlined, FileWordOutlined, LoadingOutlined } from "@ant-design/icons"
import { Button, Select, Typography, Input, Upload, App, Modal, Spin, Descriptions, Tag, Divider } from "antd"
import type { UploadProps, UploadFile } from "antd"
import { useState, useCallback, memo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { UserMenu } from "./UserMenu"
import { useUser } from "@/hooks/useUser"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { GlassCard } from "@/components/ui/GlassCard"
import { PrimaryButton } from "@/components/ui/PrimaryButton"
import { FloatingParticles } from "@/components/ui/FloatingParticles"
import { ModernButton } from "@/components/ui/ModernButton"
import { FeatureCard } from "@/components/ui/FeatureCard"
import { ValuePropositionModal } from "@/components/ui/ValuePropositionModal"
import { OnboardingModal } from "@/components/ui/OnboardingModal"
import { InfoTooltip } from "@/components/ui/ContextualTooltip"
import { DashboardStats, TodoList, UpcomingDeadlines } from "@/components/ui/DashboardWidgets"
import { SmartAssistant } from "@/components/ui/SmartAssistant"
import { AnalysisTemplates } from "@/components/ui/AnalysisTemplates"
import { dt } from "@/lib/design-tokens"
import { Sparkles, Zap, Shield, Globe, FileText, Target, Folder } from "lucide-react"

const { Text, Title } = Typography
const { TextArea } = Input

export function ChatArea() {
  const [model, setModel] = useState("gpt-4o-mini")
  const [message, setMessage] = useState("")
  const { user } = useUser()
  const router = useRouter()
  const { activeWorkspace, setSelectedModel } = useWorkspaceContext()
  const { modal, message: antMessage } = App.useApp()

  // Estados para el análisis RFP
  const [isRfpModalOpen, setIsRfpModalOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rfpFile, setRfpFile] = useState<UploadFile | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const [showTemplates, setShowTemplates] = useState(false)
  // Nuevos estados para UX mejorada
  const [showValueProposition, setShowValueProposition] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Mostrar onboarding en primera visita
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding && user) {
      setShowOnboarding(true)
      localStorage.setItem('hasSeenOnboarding', 'true')
    }
  }, [user])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }, [])

  const handleSendMessage = useCallback(() => {
    if (message.trim()) {
      const chatId = uuidv4()
      // Guardar el modelo seleccionado en el contexto
      setSelectedModel(model)

      if (activeWorkspace?.id) {
        router.push(`/workspace/${activeWorkspace.id}/chat/${chatId}?message=${encodeURIComponent(message)}`)
      } else {
        // Redirigir al chat general si no hay workspace activo
        router.push(`/chat/${chatId}?message=${encodeURIComponent(message)}`)
      }
    }
  }, [activeWorkspace, message, model, router, setSelectedModel])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const handleRfpAnalysis = useCallback(async () => {
    if (!rfpFile) {
      antMessage.error("Por favor selecciona un archivo")
      return
    }

    setIsAnalyzing(true)

    try {
      const token = localStorage.getItem('access_token')
      const formData = new FormData()
      const file = rfpFile.originFileObj || rfpFile
      formData.append("file", file as File)

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
      const response = await fetch(`${apiBaseUrl}/task/analyze`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error al analizar el documento")
      }

      const result = await response.json()
      setAnalysisResult(result)
      setIsRfpModalOpen(false)
      setIsResultModalOpen(true)
      antMessage.success("Análisis completado exitosamente")
    } catch (error) {
      console.error("Error:", error)
      antMessage.error("Error al analizar el documento. Inténtalo de nuevo.")
    } finally {
      setIsAnalyzing(false)
    }
  }, [rfpFile, antMessage])

  const handleDownloadDocument = useCallback(async (format: 'docx' | 'pdf') => {
    if (!analysisResult) return

    setIsDownloading(true)

    try {
      const token = localStorage.getItem('access_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
      const response = await fetch(`${apiBaseUrl}/task/generate?format=${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(analysisResult),
      })

      if (!response.ok) {
        throw new Error("Error al generar el documento")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `analisis_rfp.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      antMessage.success(`Documento ${format.toUpperCase()} descargado exitosamente`)
    } catch (error) {
      console.error("Error:", error)
      antMessage.error("Error al descargar el documento. Inténtalo de nuevo.")
    } finally {
      setIsDownloading(false)
    }
  }, [analysisResult, antMessage])

  return (
    <div
      className="bg-gradient-animated"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Floating Particles Background */}
      <FloatingParticles count={40} />

      {/* Decorative gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(227, 24, 55, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          pointerEvents: "none",
          animation: "float 20s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: "5%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          pointerEvents: "none",
          animation: "float 25s ease-in-out infinite reverse",
        }}
      />

      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
          backdropFilter: "blur(10px)",
          background: "rgba(10, 10, 11, 0.3)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Logo with glow */}
        <div className="hover-lift">
          <img
            src="/logo.svg"
            alt="Logo"
            style={{ 
              height: "40px",
              filter: "drop-shadow(0 0 10px rgba(227, 24, 55, 0.3))",
            }}
          />
        </div>

        {/* User Menu */}
        <UserMenu user={user} />
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          paddingBottom: "120px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Greeting with enhanced design */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            className="hover-lift"
            style={{
              width: "72px",
              height: "72px",
              background: "linear-gradient(135deg, #E31837 0%, #FF6B00 100%)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 8px 32px rgba(227, 24, 55, 0.4)",
              position: "relative",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36">
              <text x="8" y="28" fontSize="28" fontWeight="bold" fill="#FFFFFF" fontFamily="Arial, sans-serif">
                T
              </text>
            </svg>
            <Sparkles 
              size={16} 
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                color: "#FF6B00",
                filter: "drop-shadow(0 0 4px rgba(255, 107, 0, 0.8))",
              }}
            />
          </div>
          <div>
            <Title
              level={1}
              className="text-fluid-xl"
              style={{
                color: "#FFFFFF",
                fontWeight: 700,
                margin: 0,
                background: "linear-gradient(135deg, #FFFFFF 0%, #CCCCCC 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              Hola, {user?.full_name || user?.email?.split('@')[0] || 'Usuario'}
            </Title>
            <p style={{ 
              color: "#999999", 
              fontSize: "16px", 
              margin: "4px 0 0 0",
              fontWeight: 500,
            }}>
              ¿En qué puedo ayudarte hoy?
            </p>
          </div>
        </div>

        {/* Dashboard Stats - Muestra métricas empresariales */}
        <div style={{ maxWidth: "1200px", width: "100%", marginBottom: "32px" }} className="animate-fade-in-up">
          <DashboardStats 
            token={typeof window !== 'undefined' ? localStorage.getItem('access_token') || undefined : undefined}
            autoFetch={true}
          />
        </div>

        {/* Smart Assistant - Sugerencias proactivas */}
        <div style={{ 
          maxWidth: "1200px", 
          width: "100%",
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "32px",
        }} className="animate-fade-in-up">
          <SmartAssistant 
            workspaceName={activeWorkspace?.name || 'tus workspaces'}
            token={typeof window !== 'undefined' ? localStorage.getItem('access_token') || undefined : undefined}
            workspaceId={activeWorkspace?.id}
            autoFetch={true}
          />
          <div>
            <TodoList />
            <UpcomingDeadlines />
          </div>
        </div>

        {/* Quick Actions Section */}
        <div style={{ 
          maxWidth: "1200px", 
          width: "100%",
          marginBottom: "32px",
        }} className="animate-fade-in-up">
          <h3 style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#FFFFFF",
            marginBottom: "16px",
            textAlign: "center",
          }}>
            ⚡ Acciones Rápidas Empresariales
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}>
            <div onClick={() => setIsRfpModalOpen(true)} style={{ cursor: 'pointer' }}>
              <FeatureCard
                icon={<Zap />}
                title="Análisis Rápido RFP"
                description="Analiza documentos RFP en 30 segundos con IA"
                gradient="linear-gradient(135deg, #E31837 0%, #C41530 100%)"
              />
            </div>
            <div onClick={() => router.push('/workspace')} style={{ cursor: 'pointer' }}>
              <FeatureCard
                icon={<Folder />}
                title="Mis Workspaces"
                description="Organiza proyectos por cliente o tipo"
                gradient="linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)"
              />
            </div>
          </div>
        </div>

        {/* Diferenciador clave */}
        <div 
          style={{ 
            maxWidth: "800px",
            width: "100%",
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <p style={{ 
            fontSize: "14px", 
            color: "#666666",
            marginBottom: "12px",
          }}>
            No es solo un chat.
          </p>
          <h3 style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#FFFFFF",
            marginBottom: "16px",
            background: "linear-gradient(135deg, #E31837 0%, #FF6B00 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Es tu asistente empresarial especializado en análisis de propuestas
          </h3>
          <ModernButton
            variant="ghost"
            size="small"
            onClick={() => setShowValueProposition(true)}
            icon={<InfoCircleOutlined />}
          >
            Ver diferencias con ChatGPT
          </ModernButton>
        </div>

        {/* Input Area */}
        <div style={{ width: "100%", maxWidth: "800px" }} className="animate-fade-in-up">
          <GlassCard
            hover
            style={{
              padding: "24px",
              marginBottom: "20px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '8px',
              marginBottom: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', color: '#999999', fontWeight: 500 }}>
                  Pregunta algo específico
                  <InfoTooltip
                    title="Ejemplos de preguntas"
                    content={
                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        <li>"¿Cuáles son los requisitos obligatorios?"</li>
                        <li>"Genera matriz de requisitos funcionales"</li>
                        <li>"Crea checklist de cumplimiento"</li>
                        <li>"¿Qué documentos faltan para la propuesta?"</li>
                      </ul>
                    }
                  />
                </span>
              </div>
            </div>
            <TextArea
              placeholder="Ej: '¿Cuáles son los requisitos funcionales del RFP?' o 'Genera matriz de requisitos técnicos'"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyPress}
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
                outline: "none",
                color: "#FFFFFF",
                fontSize: "16px",
                padding: 0,
                resize: "none",
                marginBottom: "20px",
              }}
              styles={{
                textarea: {
                  background: "transparent",
                  color: "#FFFFFF",
                  fontWeight: 400,
                }
              }}
            />

            {/* Bottom row with enhanced design */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Plus button - File Upload */}
              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                accept="*/*"
              >
                <Button
                  type="text"
                  icon={<PlusOutlined style={{ fontSize: "20px" }} />}
                  className="hover-lift"
                  style={{
                    color: "#999999",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    height: "40px",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(227, 24, 55, 0.1)"
                    e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.3)"
                    e.currentTarget.style.color = "#E31837"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"
                    e.currentTarget.style.color = "#999999"
                  }}
                />
              </Upload>

              {/* Model selector with modern design */}
              <Select
                value={model}
                onChange={setModel}
                suffixIcon={<DownOutlined style={{ color: "#888888", fontSize: "12px" }} />}
                style={{ width: "180px" }}
                variant="borderless"
                styles={{
                  popup: { root: { background: "#1A1A1C" } },
                }}
                classNames={{ popup: { root: "dark-select-dropdown" } }}
                options={[
                  { label: "ChatGPT 4o-mini", value: "gpt-4o-mini" },
                  { label: "Velvet 12B", value: "velvet-12b" },
                ]}
              />

              <PrimaryButton
                shape="circle"
                icon={<SendOutlined style={{ fontSize: "16px" }} />}
                onClick={handleSendMessage}
                disabled={!message.trim()}
                aria-label="Enviar mensaje"
                aria-disabled={!message.trim()}
                variant={message.trim() ? "primary" : "ghost"}
                glow={!!message.trim()}
                style={{
                  width: "36px",
                  height: "36px",
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <ModernButton
              onClick={() => setIsRfpModalOpen(true)}
              aria-label="Analizar documento RFP rápidamente"
              variant="gradient"
              glow
              icon={<RocketOutlined />}
            >
              Análisis Rápido RFP
            </ModernButton>
            
            <ModernButton
              onClick={() => router.push("/workspace")}
              variant="ghost"
              icon={<InfoCircleOutlined />}
            >
              Explorar Funciones
            </ModernButton>
          </div>
        </div>
      </main>

      {/* Modal para subir archivo RFP */}
      <Modal
        title="Análisis Rápido RFP"
        open={isRfpModalOpen}
        onCancel={() => {
          setIsRfpModalOpen(false)
          setRfpFile(null)
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsRfpModalOpen(false)
            setRfpFile(null)
          }}>
            Cancelar
          </Button>,
          <Button
            key="analyze"
            type="primary"
            loading={isAnalyzing}
            disabled={!rfpFile}
            onClick={handleRfpAnalysis}
            style={{
              background: "#E31837",
              borderColor: "#E31837",
            }}
          >
            Analizar
          </Button>,
        ]}
      >
        <div style={{ padding: "20px 0" }}>
          <Upload
            beforeUpload={(file) => {
              const isValidType = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ].includes(file.type)

              if (!isValidType) {
                antMessage.error('Solo se permiten archivos PDF y Word')
                return Upload.LIST_IGNORE
              }

              const uploadFile: UploadFile = {
                uid: file.uid || '-1',
                name: file.name,
                status: 'done',
                originFileObj: file as any,
              }
              setRfpFile(uploadFile)
              return false
            }}
            onRemove={() => setRfpFile(null)}
            fileList={rfpFile ? [rfpFile] : []}
            maxCount={1}
            accept=".pdf,.doc,.docx"
          >
            <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
              Seleccionar archivo RFP
            </Button>
          </Upload>
          <Text style={{ display: "block", marginTop: "12px", color: "#888", fontSize: "13px" }}>
            Formatos permitidos: PDF, Word (.doc, .docx)
          </Text>
        </div>
      </Modal>

      {/* Modal para mostrar resultados del análisis */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 600
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileWordOutlined style={{ color: '#FFFFFF', fontSize: '16px' }} />
            </div>
            Análisis de Requerimientos
          </div>
        }
        open={isResultModalOpen}
        onCancel={() => setIsResultModalOpen(false)}
        width={1000}
        style={{
          top: 20,
          paddingBottom: 0
        }}
        styles={{
          body: {
            background: '#1A1A1A',
            padding: '32px',
            maxHeight: '80vh',
            overflow: 'hidden'
          },
          header: {
            background: '#18181b',
            borderBottom: '1px solid #27272a',
            padding: '20px 32px'
          },
          content: {
            background: '#1A1A1A',
            padding: 0
          }
        } as any}
        footer={[
          <div key="actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#18181b',
            padding: '20px 32px',
            borderTop: '1px solid #27272a'
          }}>
            <div style={{ color: '#888', fontSize: '13px' }}>
              {analysisResult?.cliente && `Cliente: ${analysisResult.cliente}`}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                key="docx"
                icon={<FileWordOutlined />}
                loading={isDownloading}
                onClick={() => handleDownloadDocument('docx')}
                className="h-10 px-6 rounded-lg font-medium"
                style={{
                  background: '#1E3A8A',
                  borderColor: '#1E3A8A',
                  color: '#FFFFFF'
                }}
              >
                Word
              </Button>
              <Button
                key="pdf"
                icon={<FilePdfOutlined />}
                loading={isDownloading}
                onClick={() => handleDownloadDocument('pdf')}
                className="h-10 px-6 rounded-lg font-medium"
                style={{
                  background: '#7F1D1D',
                  borderColor: '#7F1D1D',
                  color: '#FFFFFF'
                }}
              >
                PDF
              </Button>
            </div>
          </div>
        ]}
      >
        {analysisResult && (
          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden space-y-6 pr-2">
            {/* Hero Section - Cliente y Presupuesto */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Cliente */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                      Cliente
                    </span>
                  </div>
                  <h2 className="text-white text-2xl font-bold">
                    {analysisResult.cliente}
                  </h2>
                </div>

                {/* Presupuesto */}
                {/* Presupuesto */}
                {analysisResult.alcance_economico && (
                  <div className="md:text-right">
                    <div className="flex items-center gap-2 mb-3 md:justify-end">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                        Presupuesto Total
                      </span>
                    </div>
                    {[
                      "no especificado",
                      "no especificada",
                    ].includes(
                      analysisResult.alcance_economico.presupuesto
                        ?.toLowerCase()
                        .trim()
                    ) ? (
                      <div className="text-emerald-400 text-3xl font-bold font-mono">
                        No especificado
                      </div>
                    ) : (
                      <>
                        <div className="text-emerald-400 text-3xl font-bold font-mono">
                          {analysisResult.alcance_economico.moneda
                            ?.split("(")[0]
                            .trim()}{" "}
                          {analysisResult.alcance_economico.presupuesto}
                        </div>
                        <p className="text-zinc-500 text-sm mt-1">
                          {analysisResult.alcance_economico.moneda?.match(
                            /\((.*?)\)/
                          )?.[1] || ""}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Objetivo Principal */}
            {analysisResult.objetivo_general?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Objetivo del Proyecto</h3>
                </div>
                <div className="space-y-3">
                  {analysisResult.objetivo_general.map((obj: string, index: number) => (
                    <p key={index} className="text-zinc-300 text-base leading-relaxed pl-10">
                      {obj}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline de Plazos */}
            {analysisResult.fechas_y_plazos?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Plazos del Proyecto</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResult.fechas_y_plazos.map((plazo: any, index: number) => (
                    <div key={index} className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                      <div className="text-zinc-400 text-xs font-medium mb-2">
                        {plazo.tipo}
                      </div>
                      <div className="text-white text-lg font-semibold">
                        {plazo.valor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tecnologías */}
            {analysisResult.tecnologias_requeridas?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Stack Tecnológico</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.tecnologias_requeridas.map((tech: string, index: number) => (
                    <span key={index} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preguntas Clave */}
            {analysisResult.preguntas_sugeridas?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Preguntas Clave para el Cliente</h3>
                </div>
                <div className="space-y-3">
                  {analysisResult.preguntas_sugeridas.map((pregunta: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-zinc-300 text-sm leading-relaxed flex-1">
                        {pregunta}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipo Propuesto */}
            {analysisResult.equipo_sugerido?.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  </div>
                  <h3 className="text-white text-base font-semibold">Equipo Propuesto</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResult.equipo_sugerido.map((miembro: any, index: number) => {
                    const avatarColors = [
                      'bg-gradient-to-br from-blue-500 to-blue-600',
                      'bg-gradient-to-br from-purple-500 to-purple-600',
                      'bg-gradient-to-br from-pink-500 to-pink-600',
                      'bg-gradient-to-br from-orange-500 to-orange-600',
                      'bg-gradient-to-br from-teal-500 to-teal-600',
                    ];

                    return (
                      <div key={index} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 hover:border-zinc-600 transition-all">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-12 h-12 ${avatarColors[index % avatarColors.length]} rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg`}>
                            {miembro.nombre.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-base mb-1">
                              {miembro.nombre}
                            </h4>
                            <p className="text-zinc-400 text-sm leading-snug">
                              {miembro.rol}
                            </p>
                          </div>
                        </div>

                        {/* Experiencia */}
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
      <AnalysisTemplates
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
      />
                            </svg>
                            {miembro.experiencia}
                          </span>
                        </div>

                        {/* Skills */}
                        {miembro.skills?.length > 0 && (
                          <div>
                            <p className="text-zinc-500 text-xs font-medium mb-2">Habilidades</p>
                            <div className="flex flex-wrap gap-1.5">
                              {miembro.skills.map((skill: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-1 bg-zinc-700/50 text-zinc-300 rounded-md text-xs">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Modales de UX mejorada */}
      <ValuePropositionModal 
        open={showValueProposition} 
        onClose={() => setShowValueProposition(false)} 
      />
      <OnboardingModal 
        open={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  )
}
