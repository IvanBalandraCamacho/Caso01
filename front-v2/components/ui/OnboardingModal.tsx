"use client"

import React, { useState, useEffect } from 'react'
import { Modal, Steps } from 'antd'
import { ModernButton } from './ModernButton'
import { 
  FileText, 
  Folder, 
  MessageSquare, 
  Download,
  Zap,
  CheckCircle,
} from 'lucide-react'
import { RocketOutlined } from '@ant-design/icons'

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      icon: <Folder size={48} />,
      title: 'Crea un Workspace',
      description: 'Organiza tus proyectos y licitaciones en espacios dedicados con contexto específico.',
      tips: [
        'Cada workspace tiene su propio contexto e instrucciones',
        'Sube documentos relevantes (RFPs, especificaciones, etc.)',
        'Mantén todo organizado por cliente o proyecto',
      ],
      gradient: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
    },
    {
      icon: <FileText size={48} />,
      title: 'Sube tus Documentos',
      description: 'Carga RFPs, licitaciones, especificaciones técnicas y documentación corporativa.',
      tips: [
        'Soportamos PDF, Word, Excel, PowerPoint y más',
        'Los documentos se procesan automáticamente',
        'El sistema extrae requisitos y criterios clave',
      ],
      gradient: 'linear-gradient(135deg, #FF6B00 0%, #E31837 100%)',
    },
    {
      icon: <MessageSquare size={48} />,
      title: 'Chatea con IA Especializada',
      description: 'Pregunta sobre requisitos, genera matrices de cumplimiento y obtén insights.',
      tips: [
        'Pregunta: "¿Cuáles son los requisitos obligatorios?"',
        'Solicita: "Genera matriz de requisitos funcionales"',
        'Pide: "Crea checklist de cumplimiento"',
      ],
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
    },
    {
      icon: <Download size={48} />,
      title: 'Exporta Propuestas',
      description: 'Genera documentos profesionales en Word o PDF con un solo clic.',
      tips: [
        'Formato profesional con marca TIVIT',
        'Incluye todas las secciones necesarias',
        'Listo para entregar o editar',
      ],
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
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
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: currentStepData.gradient,
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 8px 32px rgba(227, 24, 55, 0.4)',
          }}
        >
          {currentStepData.icon}
        </div>
        
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#FFFFFF',
          marginBottom: '12px',
        }}>
          {currentStepData.title}
        </h2>
        
        <p style={{ 
          fontSize: '16px', 
          color: '#CCCCCC', 
          maxWidth: '500px', 
          margin: '0 auto 24px',
        }}>
          {currentStepData.description}
        </p>

        {/* Steps Progress */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px',
          marginBottom: '32px',
        }}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentStep ? '40px' : '12px',
                height: '6px',
                borderRadius: '3px',
                background: index === currentStep 
                  ? 'linear-gradient(90deg, #E31837, #FF6B00)'
                  : 'rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        background: 'rgba(227, 24, 55, 0.05)',
        border: '1px solid rgba(227, 24, 55, 0.2)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: '#E31837',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Zap size={20} />
          Tips Importantes
        </h3>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          color: '#CCCCCC',
          fontSize: '14px',
        }}>
          {currentStepData.tips.map((tip, index) => (
            <li 
              key={index}
              style={{ 
                marginBottom: '12px',
                paddingLeft: '28px',
                position: 'relative',
              }}
            >
              <CheckCircle 
                size={16} 
                style={{ 
                  position: 'absolute',
                  left: 0,
                  top: '2px',
                  color: '#10B981',
                }}
              />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <ModernButton
          variant="ghost"
          onClick={handlePrev}
          disabled={currentStep === 0}
          style={{ flex: 1 }}
        >
          Anterior
        </ModernButton>
        
        <ModernButton
          variant={currentStep === steps.length - 1 ? 'gradient' : 'primary'}
          glow={currentStep === steps.length - 1}
          onClick={handleNext}
          icon={currentStep === steps.length - 1 ? <RocketOutlined /> : undefined}
          style={{ flex: 1 }}
        >
          {currentStep === steps.length - 1 ? '¡Comenzar!' : 'Siguiente'}
        </ModernButton>
      </div>
    </Modal>
  )
}
