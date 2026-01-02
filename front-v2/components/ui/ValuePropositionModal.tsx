"use client"

import React from 'react'
import { Modal, Button } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, RocketOutlined } from '@ant-design/icons'
import { ModernButton } from './ModernButton'
import { FileText, Zap, Users, Shield, Database, Target } from 'lucide-react'

interface ValuePropositionModalProps {
  open: boolean
  onClose: () => void
}

export function ValuePropositionModal({ open, onClose }: ValuePropositionModalProps) {
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
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #E31837 0%, #FF6B00 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(227, 24, 55, 0.4)',
          }}
        >
          <RocketOutlined style={{ fontSize: '36px', color: '#FFFFFF' }} />
        </div>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#FFFFFF',
          marginBottom: '12px',
        }}>
          ¿Por qué TIVIT AI es diferente?
        </h2>
        <p style={{ fontSize: '16px', color: '#999999', maxWidth: '600px', margin: '0 auto' }}>
          No es solo un chat. Es tu asistente empresarial especializado en análisis de documentos y propuestas.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* ChatGPT Column */}
        <div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#CCCCCC',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <CloseCircleOutlined style={{ color: '#EF4444', marginRight: '8px' }} />
            ChatGPT / Gemini
          </h3>
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              color: '#999999',
              fontSize: '14px',
              lineHeight: '2',
            }}>
              <li>✗ Chat genérico sin contexto empresarial</li>
              <li>✗ Sin análisis de documentos RFP</li>
              <li>✗ Sin workspaces organizados</li>
              <li>✗ Sin generación de propuestas</li>
              <li>✗ Sin checklist automatizado</li>
              <li>✗ Sin matriz de requisitos</li>
              <li>✗ Conocimiento limitado y general</li>
              <li>✗ Sin trazabilidad empresarial</li>
            </ul>
          </div>
        </div>

        {/* TIVIT AI Column */}
        <div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#FFFFFF',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <CheckCircleOutlined style={{ color: '#10B981', marginRight: '8px' }} />
            TIVIT AI
          </h3>
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              color: '#FFFFFF',
              fontSize: '14px',
              lineHeight: '2',
              fontWeight: 500,
            }}>
              <li>✓ Análisis inteligente de RFPs/Licitaciones</li>
              <li>✓ Workspaces con contexto específico</li>
              <li>✓ Generación automática de propuestas</li>
              <li>✓ Checklist de cumplimiento automático</li>
              <li>✓ Matriz de requisitos funcionales</li>
              <li>✓ RAG con documentos corporativos</li>
              <li>✓ Exportación a Word/PDF profesional</li>
              <li>✓ Historial y trazabilidad completa</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Capacidades Especiales */}
      <div style={{ 
        background: 'rgba(227, 24, 55, 0.05)',
        border: '1px solid rgba(227, 24, 55, 0.2)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#E31837',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          🚀 Capacidades Empresariales Exclusivas
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '20px',
        }}>
          <CapabilityItem
            icon={<FileText size={24} />}
            title="Análisis RFP"
            description="Extrae automáticamente requisitos, fechas límite y criterios"
          />
          <CapabilityItem
            icon={<Database size={24} />}
            title="RAG Corporativo"
            description="Conocimiento específico de tu empresa y proyectos"
          />
          <CapabilityItem
            icon={<Target size={24} />}
            title="Matriz de Requisitos"
            description="Genera tablas de cumplimiento funcionales/técnicas"
          />
          <CapabilityItem
            icon={<Shield size={24} />}
            title="Checklist Automático"
            description="Verifica cumplimiento de criterios obligatorios"
          />
          <CapabilityItem
            icon={<Zap size={24} />}
            title="Generación Propuestas"
            description="Crea documentos profesionales en segundos"
          />
          <CapabilityItem
            icon={<Users size={24} />}
            title="Workspaces"
            description="Organiza proyectos con contexto persistente"
          />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <ModernButton
          variant="gradient"
          glow
          size="large"
          onClick={onClose}
          icon={<RocketOutlined />}
        >
          Comenzar Ahora
        </ModernButton>
      </div>
    </Modal>
  )
}

function CapabilityItem({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        margin: '0 auto 12px',
        background: 'rgba(227, 24, 55, 0.1)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#E31837',
      }}>
        {icon}
      </div>
      <h4 style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        color: '#FFFFFF',
        marginBottom: '4px',
      }}>
        {title}
      </h4>
      <p style={{ 
        fontSize: '12px', 
        color: '#999999',
        margin: 0,
        lineHeight: 1.4,
      }}>
        {description}
      </p>
    </div>
  )
}
