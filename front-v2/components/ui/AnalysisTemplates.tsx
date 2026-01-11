"use client"

import React, { useState } from 'react'
import { Modal, Tabs, Tag, Button } from 'antd'
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
      width={850}
      centered
      styles={{
        body: {
          padding: '32px',
          background: '#1E1F20',
        },
        content: {
          background: '#1E1F20',
          border: '1px solid #334155',
          borderRadius: '24px',
          overflow: 'hidden'
        },
      } as any}
      closeIcon={<span className="text-zinc-500">×</span>}
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-white mb-2">
          Plantillas de Análisis
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          Selecciona una plantilla optimizada para tu tipo de RFP y acelera tu análisis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleSelect(template)}
            className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
              selectedTemplate === template.id 
                ? 'bg-zinc-800 border-[#E31837] ring-1 ring-[#E31837]' 
                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {/* Selected indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-3 right-3 text-[#E31837]">
                <CheckCircleOutlined />
              </div>
            )}

            {/* Icon & Title */}
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: template.color }}
              >
                {template.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {template.name}
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {template.type}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
              {template.description}
            </p>

            {/* Sections Preview */}
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-1">Incluye:</span>
              {template.sections.slice(0, 3).map((section, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="truncate">{section}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button 
          onClick={onClose}
          className="rounded-xl border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 px-6 h-11 font-medium"
        >
          Cancelar
        </Button>
        <Button
          disabled={!selectedTemplate}
          onClick={onClose}
          className="rounded-xl bg-[#E31837] hover:bg-[#c41530] border-none text-white px-8 h-11 font-bold shadow-lg shadow-[#E31837]/20 disabled:opacity-50"
        >
          Usar Plantilla
        </Button>
      </div>
    </Modal>
  )
}