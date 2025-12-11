"use client"

import type React from "react"

import { PlusOutlined, RocketOutlined, DownOutlined, SendOutlined, InfoCircleOutlined, UploadOutlined, DownloadOutlined, FilePdfOutlined, FileWordOutlined, LoadingOutlined } from "@ant-design/icons"
import { Button, Select, Typography, Input, Upload, App, Modal, Spin, Descriptions, Tag, Divider } from "antd"
import type { UploadProps, UploadFile } from "antd"
import { useState, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { UserMenu } from "./UserMenu"
import { useUser } from "@/hooks/useUser"
import { useWorkspaceContext } from "@/context/WorkspaceContext"

const { Text, Title } = Typography
const { TextArea } = Input

export default function ChatArea() {
  const [model, setModel] = useState("velvet-8b")
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

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }, [])

  const handleSendMessage = useCallback(() => {
    if (!activeWorkspace?.id) {
      modal.info({
        title: "Función sin implementar",
        icon: <InfoCircleOutlined style={{ color: "#E31837" }} />,
        content: "Esta funcionalidad aún no está disponible. Por favor, selecciona un workspace desde el panel lateral para comenzar a chatear.",
        okText: "Entendido",
        okButtonProps: {
          style: {
            background: "#E31837",
            borderColor: "#E31837",
          }
        }
      })
      return
    }
    
    if (message.trim()) {
      const chatId = uuidv4()
      // Guardar el modelo seleccionado en el contexto
      setSelectedModel(model)
      router.push(`/chat/${chatId}?message=${encodeURIComponent(message)}`)
    }
  }, [activeWorkspace, message, model, router, setSelectedModel, modal])

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

      const response = await fetch("http://localhost:8000/api/v1/task/analyze", {
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
      const response = await fetch(`http://localhost:8000/api/v1/task/generate?format=${format}`, {
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
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#000000",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <img 
          src="/logo.svg" 
          alt="Logo" 
          style={{ height: "40px" }} 
        />

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
        }}
      >
        {/* Greeting */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#E31837",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28">
              <text x="6" y="22" fontSize="22" fontWeight="bold" fill="#FFFFFF" fontFamily="Arial, sans-serif">
                T
              </text>
            </svg>
          </div>
          <Title
            level={1}
            style={{
              fontSize: "clamp(24px, 5vw, 36px)",
              color: "#FFFFFF",
              fontWeight: 400,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            Hola, {user?.full_name || user?.email?.split('@')[0] || 'Usuario'}
          </Title>
        </div>

        {/* Input Area */}
        <div style={{ width: "100%", maxWidth: "760px" }}>
          <div
            style={{
              background: "#1A1A1C",
              borderRadius: "18px",
              padding: "18px 24px",
              marginBottom: "20px",
            }}
          >
            <TextArea
              placeholder="Preguntale a Velvet 8b."
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyPress}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                background: "transparent",
                border: "none",
                boxShadow: "none",
                outline: "none",
                color: "#CCCCCC",
                fontSize: "15px",
                padding: 0,
                resize: "none",
                marginBottom: "16px",
              }}
              styles={{
                textarea: {
                  background: "transparent",
                  color: "#CCCCCC",
                }
              }}
            />

            {/* Bottom row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
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
                  icon={<PlusOutlined style={{ fontSize: "18px" }} />}
                  style={{
                    color: "#888888",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    width: "auto",
                    height: "auto",
                    flexShrink: 0,
                  }}
                />
              </Upload>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Model selector */}
              <Select
                value={model}
                onChange={setModel}
                suffixIcon={<DownOutlined style={{ color: "#888888", fontSize: "10px" }} />}
                style={{ width: "120px" }}
                variant="borderless"
                styles={{
                  popup: { root: { background: "#1A1A1C" } },
                }}
                classNames={{ popup: { root: "dark-select-dropdown" } }}
                options={[
                  { label: "Velvet 8B", value: "velvet-8b" },
                  { label: "Velvet 10B", value: "velvet-10b" },
                ]}
              />

              <Button
                type="text"
                shape="circle"
                icon={<SendOutlined style={{ fontSize: "16px" }} />}
                onClick={handleSendMessage}
                style={{
                  color: message.trim() ? "#FFFFFF" : "#888888",
                  background: message.trim() ? "#E31837" : "#2A2A2D",
                  width: "36px",
                  height: "36px",
                  flexShrink: 0,
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={() => setIsRfpModalOpen(true)}
              style={{
                background: "#1A1A1C",
                border: "1px solid #333333",
                color: "#CCCCCC",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                height: "auto",
                borderRadius: "20px",
                fontSize: "14px",
              }}
              icon={<RocketOutlined style={{ color: "#FF6B00" }} />}
            >
              Analisis rapido RPF
            </Button>
            <Button
              style={{
                background: "#1A1A1C",
                border: "1px solid #333333",
                color: "#CCCCCC",
                padding: "8px 20px",
                height: "auto",
                borderRadius: "20px",
                fontSize: "14px",
              }}
            >
              Resumen rapido
            </Button>
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
              background: 'linear-gradient(135deg, #E31837, #FF4757)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileWordOutlined style={{ color: '#FFFFFF', fontSize: '16px' }} />
            </div>
            Resultados del Análisis RFP
          </div>
        }
        open={isResultModalOpen}
        onCancel={() => setIsResultModalOpen(false)}
        width={900}
        style={{ 
          top: 20,
          paddingBottom: 0 
        }}
        styles={{
          body: { 
            background: '#0D1117',
            padding: '24px'
          },
          header: {
            background: '#1A1A1C',
            borderBottom: '1px solid #2D2D2D',
            padding: '16px 24px'
          },
          content: {
            background: '#0D1117',
            padding: 0
          }
        }}
        footer={[
          <div key="actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1A1A1C',
            padding: '16px 24px',
            borderTop: '1px solid #2D2D2D'
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
                style={{
                  background: '#2B579A',
                  borderColor: '#2B579A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  height: '36px',
                  padding: '0 16px',
                  fontWeight: 500
                }}
              >
                Descargar Word
              </Button>,
              <Button
                key="pdf"
                icon={<FilePdfOutlined />}
                loading={isDownloading}
                onClick={() => handleDownloadDocument('pdf')}
                style={{
                  background: '#E31837',
                  borderColor: '#E31837',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  height: '36px',
                  padding: '0 16px',
                  fontWeight: 500
                }}
              >
                Descargar PDF
              </Button>
            </div>
          </div>
        ]}
      >
        {analysisResult && (
          <div style={{ 
            maxHeight: "70vh", 
            overflowY: "auto",
            background: '#0D1117',
            color: '#CCCCCC'
          }}>
            {/* Información Principal */}
            <div style={{
              background: 'linear-gradient(135deg, #1A1A1C 0%, #2D2D2D 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid #2D2D2D'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '24px'
              }}>
                <div>
                  <Text style={{ 
                    color: '#888888', 
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Cliente
                  </Text>
                  <div style={{ 
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#E31837',
                    marginTop: '4px'
                  }}>
                    {analysisResult.cliente}
                  </div>
                </div>
                
                {analysisResult.alcance_economico && (
                  <div>
                    <Text style={{ 
                      color: '#888888', 
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Alcance Económico
                    </Text>
                    <div style={{ 
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#00C851',
                      marginTop: '4px'
                    }}>
                      {analysisResult.alcance_economico.moneda} {analysisResult.alcance_economico.presupuesto}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas y Plazos */}
            {analysisResult.fechas_y_plazos?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{ 
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Fechas y Plazos
                  </Text>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gap: '12px'
                }}>
                  {analysisResult.fechas_y_plazos.map((plazo: any, index: number) => (
                    <div key={index} style={{ 
                      background: '#1A1A1C',
                      border: '1px solid #2D2D2D',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Text strong style={{ color: '#FFFFFF', minWidth: '120px' }}>
                          {plazo.tipo}:
                        </Text>
                        <Tag color="blue" style={{
                          background: '#2F54EB',
                          borderColor: '#2F54EB',
                          color: '#FFFFFF',
                          borderRadius: '6px'
                        }}>
                          {plazo.valor}
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objetivo General */}
            {analysisResult.objetivo_general?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{ 
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Objetivo General
                  </Text>
                </div>
                <div style={{ 
                  background: '#1A1A1C',
                  border: '1px solid #2D2D2D',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  {analysisResult.objetivo_general.map((obj: string, index: number) => (
                    <div key={index} style={{ 
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#E31837',
                        borderRadius: '50%',
                        marginTop: '8px',
                        flexShrink: 0
                      }} />
                      <Text style={{ color: '#CCCCCC', lineHeight: '1.6' }}>
                        {obj}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tecnologías Requeridas */}
            {analysisResult.tecnologias_requeridas?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{ 
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Tecnologías Requeridas
                  </Text>
                </div>
                <div style={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {analysisResult.tecnologias_requeridas.map((tech: string, index: number) => (
                    <Tag key={index} style={{
                      background: 'linear-gradient(135deg, #00C851, #00E676)',
                      border: '1px solid #00C851',
                      color: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontWeight: 500
                    }}>
                      {tech}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Preguntas Sugeridas */}
            {analysisResult.preguntas_sugeridas?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{ 
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Preguntas Sugeridas
                  </Text>
                </div>
                <div style={{ 
                  background: '#1A1A1C',
                  border: '1px solid #2D2D2D',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  {analysisResult.preguntas_sugeridas.map((pregunta: string, index: number) => (
                    <div key={index} style={{ 
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        color: '#FFA726',
                        fontSize: '14px',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        Q{index + 1}:
                      </div>
                      <Text style={{ color: '#CCCCCC', lineHeight: '1.6' }}>
                        {pregunta}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipo Sugerido */}
            {analysisResult.equipo_sugerido?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px'
                  }} />
                  <Text style={{ 
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    Equipo Sugerido
                  </Text>
                </div>
                <div style={{ 
                  display: 'grid',
                  gap: '16px'
                }}>
                  {analysisResult.equipo_sugerido.map((miembro: any, index: number) => (
                    <div key={index} style={{
                      background: 'linear-gradient(135deg, #1A1A1C, #2D2D2D)',
                      border: '1px solid #2D2D2D',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'linear-gradient(135deg, #E31837, #FF4757)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '18px',
                          fontWeight: 600
                        }}>
                          {miembro.nombre.charAt(0)}
                        </div>
                        <div>
                          <Text strong style={{ 
                            fontSize: '18px', 
                            color: '#FFFFFF',
                            display: 'block'
                          }}>
                            {miembro.nombre}
                          </Text>
                          <Text style={{ color: '#888888' }}>
                            {miembro.rol}
                          </Text>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <Text style={{ 
                            color: '#888888', 
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Experiencia
                          </Text>
                          <Tag color="orange" style={{
                            background: '#FFA726',
                            borderColor: '#FFA726',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            marginTop: '4px'
                          }}>
                            {miembro.experiencia}
                          </Tag>
                        </div>
                        
                        {miembro.skills?.length > 0 && (
                          <div>
                            <Text style={{ 
                              color: '#888888', 
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '8px',
                              display: 'block'
                            }}>
                              Skills
                            </Text>
                            <div style={{ 
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px'
                            }}>
                              {miembro.skills.map((skill: string, idx: number) => (
                                <Tag key={idx} style={{
                                  background: 'linear-gradient(135deg, #26C6DA, #00ACC1)',
                                  border: '1px solid #26C6DA',
                                  color: '#FFFFFF',
                                  borderRadius: '14px',
                                  padding: '2px 10px',
                                  fontSize: '12px'
                                }}>
                                  {skill}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
