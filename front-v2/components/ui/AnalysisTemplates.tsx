"use client"

import React, { useState } from 'react'
import { Modal, Tabs, Tag } from 'antd'
import { ModernButton } from './ModernButton'
import { 
  FileTextOutlined, 
  TeamOutlined, 
  CalendarOutlined,
  CheckCircleOutlined,
  RocketOutlined 
} from '@ant-design/icons'

interface TemplateOption {
  id: string
  name: string
  description: string
  type: string
  icon: React.ReactNode
  color: string
  sections: string[]
}

interface AnalysisTemplatesProps {
  open: boolean
  onClose: () => void
  onSelect?: (template: TemplateOption) => void
}

export function AnalysisTemplates({ open, onClose, onSelect }: AnalysisTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const templates: TemplateOption[] = [
    {
      id: 'rfp-gobierno',
      name: 'RFP Gobierno',
      description: 'Análisis especializado para licitaciones públicas',
      type: 'Sector Público',
      icon: <FileTextOutlined />,
      color: '#E31837',
      sections: [
        'Requisitos legales obligatorios',
        'Criterios de evaluación ponderados',
        'Documentos habilitantes',
        'Garantías requeridas',
        'Plazos administrativos',
      ],
    },
    {
      id: 'rfp-privado',
      name: 'RFP Empresa Privada',
      description: 'Análisis para propuestas comerciales B2B',
      type: 'Sector Privado',
      icon: <FileTextOutlined />,
      color: '#FF6B00',
      sections: [
        'Requisitos técnicos funcionales',
        'Propuesta económica',
        'SLAs y métricas',
        'Casos de éxito relevantes',
        'Equipo propuesto',
      ],
    },
    {
      id: 'rfp-ti',
      name: 'RFP Tecnología',
      description: 'Proyectos de infraestructura y software',
      type: 'TI / Cloud',
      icon: <RocketOutlined />,
      color: '#3B82F6',
      sections: [
        'Arquitectura técnica',
        'Stack tecnológico',
        'Requisitos de seguridad',
        'Escalabilidad y performance',
        'Plan de migración',
      ],
    },
    {
      id: 'rfp-consultoria',
      name: 'Consultoría',
      description: 'Servicios profesionales y outsourcing',
      type: 'Servicios',
      icon: <TeamOutlined />,
      color: '#10B981',
      sections: [
        'Metodología de trabajo',
        'Perfiles profesionales',
        'Entregables esperados',
        'Cronograma de actividades',
        'KPIs de medición',
      ],
    },
    {
      id: 'rfp-express',
      name: 'Análisis Rápido',
      description: 'Extracción básica de información clave',
      type: 'Express',
      icon: <CheckCircleOutlined />,
      color: '#F59E0B',
      sections: [
        'Requisitos obligatorios',
        'Fecha límite',
        'Presupuesto estimado',
        'Contacto del cliente',
        'Documentos requeridos',
      ],
    },
    {
      id: 'rfp-custom',
      name: 'Personalizado',
      description: 'Define tus propios criterios de análisis',
      type: 'Custom',
      icon: <CalendarOutlined />,
      color: '#8B5CF6',
      sections: [
        'Secciones personalizables',
        'Criterios específicos',
        'Formato adaptable',
        'Checklist a medida',
      ],
    },
  ]

  const handleSelect = (template: TemplateOption) => {
    setSelectedTemplate(template.id)
    if (onSelect) {
      onSelect(template)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      styles={{
        body: {
          padding: '40px',
          background: '#0A0A0B',
        },
        content: {
          background: '#0A0A0B',
          border: '1px solid rgba(227, 24, 55, 0.2)',
        },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#FFFFFF',
          marginBottom: '12px',
        }}>
          Plantillas de Análisis
        </h2>
        <p style={{ fontSize: '16px', color: '#999999', maxWidth: '600px', margin: '0 auto' }}>
          Selecciona una plantilla optimizada para tu tipo de RFP y acelera tu análisis
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px',
        marginBottom: '32px',
      }}>
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleSelect(template)}
            style={{
              background: selectedTemplate === template.id 
                ? 'rgba(227, 24, 55, 0.1)' 
                : 'rgba(26, 26, 28, 0.6)',
              backdropFilter: 'blur(20px)',
              border: selectedTemplate === template.id
                ? `2px solid ${template.color}`
                : '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (selectedTemplate !== template.id) {
                e.currentTarget.style.borderColor = `${template.color}80`
                e.currentTarget.style.transform = 'translateY(-4px)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplate !== template.id) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {/* Selected indicator */}
            {selectedTemplate === template.id && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: template.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}>
                <CheckCircleOutlined style={{ fontSize: '14px' }} />
              </div>
            )}

            {/* Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${template.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: template.color,
              fontSize: '20px',
            }}>
              {template.icon}
            </div>

            {/* Header */}
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: '4px',
              }}>
                {template.name}
              </h3>
              <Tag 
                style={{ 
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: `${template.color}20`,
                  color: template.color,
                  border: 'none',
                }}
              >
                {template.type}
              </Tag>
            </div>

            {/* Description */}
            <p style={{
              fontSize: '13px',
              color: '#CCCCCC',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}>
              {template.description}
            </p>

            {/* Sections */}
            <div style={{
              fontSize: '12px',
              color: '#999999',
            }}>
              <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                Incluye:
              </strong>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                lineHeight: 1.8,
              }}>
                {template.sections.slice(0, 3).map((section, idx) => (
                  <li key={idx}>{section}</li>
                ))}
                {template.sections.length > 3 && (
                  <li style={{ color: template.color }}>
                    +{template.sections.length - 3} más...
                  </li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        gap: '12px',
      }}>
        <ModernButton
          variant="ghost"
          onClick={onClose}
        >
          Cancelar
        </ModernButton>
        <ModernButton
          variant="gradient"
          glow
          disabled={!selectedTemplate}
          onClick={onClose}
        >
          Usar Plantilla Seleccionada
        </ModernButton>
      </div>
    </Modal>
  )
}
