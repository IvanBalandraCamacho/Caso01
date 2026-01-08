"use client"

import React, { useEffect, useState } from 'react'
import { Modal, Tag, Progress, Spin, message, Tooltip } from 'antd'
import { ModernButton } from './ModernButton'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  QuestionCircleOutlined 
} from '@ant-design/icons'
import { DashboardService, type Suggestion } from '@/lib/dashboardService'

interface SmartAssistantProps {
  suggestions?: Suggestion[]
  workspaceName?: string
  token?: string
  workspaceId?: string
  autoFetch?: boolean
}

export function SmartAssistant({ 
  suggestions = [], 
  workspaceName = 'Workspace Actual',
  token,
  workspaceId,
  autoFetch = false,
}: SmartAssistantProps) {
  const [loading, setLoading] = useState(false)
  const [realSuggestions, setRealSuggestions] = useState<Suggestion[]>([])

  useEffect(() => {
    if (autoFetch && token) {
      fetchSuggestions()
    }
  }, [autoFetch, token, workspaceId])

  const fetchSuggestions = async () => {
    if (!token) return

    setLoading(true)
    try {
      const data = await DashboardService.getSuggestions(token, workspaceId)
      setRealSuggestions(data)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      message.error('Error al cargar sugerencias')
    } finally {
      setLoading(false)
    }
  }

  // Usar datos reales si están disponibles
  const displaySuggestions = realSuggestions.length > 0 ? realSuggestions : suggestions

  const defaultSuggestions: Suggestion[] = [
    {
      type: 'missing_doc',
      title: 'Documento Faltante',
      description: 'El RFP menciona "Plan de Calidad" pero no lo has subido aún',
      action: 'Subir documento',
      priority: 'high',
    },
    {
      type: 'deadline',
      title: 'Fecha Crítica Detectada',
      description: 'Presentación técnica debe entregarse en 14 días (15 Ene)',
      action: 'Ver calendario',
      priority: 'high',
    },
    {
      type: 'requirement',
      title: 'Requisito No Cubierto',
      description: 'Requisito #12: "Certificación ISO 27001" necesita evidencia',
      action: 'Agregar evidencia',
      priority: 'medium',
    },
    {
      type: 'team',
      title: 'Rol Sugerido',
      description: 'Se detectó necesidad de Arquitecto Cloud Senior (5+ años)',
      action: 'Ver equipo',
      priority: 'medium',
    },
    {
      type: 'improvement',
      title: 'Mejora la Propuesta',
      description: 'Agrega casos de éxito similares para aumentar score',
      action: 'Ver sugerencias',
      priority: 'low',
    },
  ]

  // Usar datos reales si están disponibles, sino mostrar lista vacía para usuarios nuevos
  const activeSuggestions = displaySuggestions.length > 0 ? displaySuggestions : []

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Urgente' }
      case 'medium':
        return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', label: 'Importante' }
      default:
        return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Sugerencia' }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_doc': return <FileTextOutlined />
      case 'deadline': return <ClockCircleOutlined />
      case 'requirement': return <CheckCircleOutlined />
      case 'team': return '👥'
      default: return '💡'
    }
  }

  return (
    <div style={{
      background: 'rgba(26, 26, 28, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(227, 24, 55, 0.2)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: 0,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontSize: '20px',
              display: 'inline-block',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              🤖
            </span>
            Asistente Inteligente
            <Tooltip 
              title={
                <div style={{ maxWidth: '320px' }}>
                  <div style={{ marginBottom: '10px', fontWeight: 600, fontSize: '13px' }}>
                    🤖 Asistencia Inteligente Proactiva
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', marginBottom: '12px' }}>
                    Analiza automáticamente todos tus workspaces en tiempo real para detectar oportunidades de mejora.
                  </div>
                  <div style={{ 
                    fontSize: '11px',
                    lineHeight: '1.7',
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: '10px'
                  }}>
                    <strong>El asistente detecta:</strong><br/>
                    • 📄 Documentos faltantes o incompletos<br/>
                    • ⚠️ Errores en el procesamiento<br/>
                    • 🎯 Oportunidades de optimización<br/>
                    • ⏰ Tareas pendientes importantes
                  </div>
                  <div style={{ 
                    marginTop: '10px', 
                    paddingTop: '10px', 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.6)',
                    fontStyle: 'italic'
                  }}>
                    💡 Las sugerencias se actualizan automáticamente
                  </div>
                </div>
              }
              placement="top"
              styles={{
                container: {
                  background: 'rgba(20, 20, 22, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }
              }}
              color="transparent"
            >
              <QuestionCircleOutlined style={{
                fontSize: '14px',
                color: '#999999',
                cursor: 'help',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#3B82F6'
                e.currentTarget.style.transform = 'scale(1.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#999999'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              />
            </Tooltip>
          </h3>
          <p style={{ 
            fontSize: '13px', 
            color: '#999999', 
            margin: 0,
          }}>
            {activeSuggestions.length} sugerencias para {workspaceName}
          </p>
        </div>
        <Tag 
          color="processing" 
          style={{ 
            borderRadius: '6px',
            border: 'none',
            fontSize: '12px',
          }}
        >
          Activo
        </Tag>
      </div>

      {/* Suggestions List */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '8px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : activeSuggestions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <h4 style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
              Todo listo para comenzar
            </h4>
            <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>
              Crea tu primer workspace o sube documentos para recibir sugerencias inteligentes
            </p>
          </div>
        ) : (
          activeSuggestions.map((suggestion, index) => {
          const config = getPriorityConfig(suggestion.priority)
          return (
            <div
              key={index}
              style={{
                background: config.bg,
                border: `1px solid ${config.color}40`,
                borderRadius: '12px',
                padding: '16px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = config.color
                e.currentTarget.style.transform = 'translateX(4px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${config.color}40`
                e.currentTarget.style.transform = 'translateX(0)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${config.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: config.color,
                  flexShrink: 0,
                }}>
                  {getTypeIcon(suggestion.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      margin: 0,
                    }}>
                      {suggestion.title}
                    </h4>
                    <Tag 
                      style={{ 
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: config.color,
                        color: '#FFFFFF',
                        border: 'none',
                      }}
                    >
                      {config.label}
                    </Tag>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#CCCCCC',
                    margin: '0 0 12px 0',
                    lineHeight: 1.5,
                  }}>
                    {suggestion.description}
                  </p>
                  {suggestion.action && (
                    <button
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: config.color,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {suggestion.action} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        }))}
      </div>
    </div>
  )
}
