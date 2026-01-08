/**
 * Componente de loading con spinner mejorado y animaciones
 */
"use client"

import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { dt } from '@/lib/design-tokens'

interface LoadingSpinnerProps {
  tip?: string
  size?: 'small' | 'default' | 'large'
  fullscreen?: boolean
}

export const LoadingSpinner = ({ 
  tip = "Cargando...", 
  size = "default",
  fullscreen = false 
}: LoadingSpinnerProps) => {
  const indicator = (
    <div className="spinner-gradient" />
  )

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 10, 11, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: dt.zIndex.modal,
      }}>
        <div style={{ textAlign: 'center' }}>
          {indicator}
          <div style={{ 
            marginTop: dt.spacing.md, 
            color: dt.colors.dark.textMuted,
            fontSize: dt.typography.fontSize.sm,
          }}>
            {tip}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Spin 
      indicator={indicator}
      tip={tip}
      size={size}
    />
  )
}

/**
 * Indicador de typing (tres puntos animados)
 */
export const TypingIndicator = () => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '4px', 
      padding: dt.spacing.md,
    }}>
      <div 
        className="typing-dot"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dt.colors.brand.primary,
        }}
      />
      <div 
        className="typing-dot"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dt.colors.brand.primary,
        }}
      />
      <div 
        className="typing-dot"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dt.colors.brand.primary,
        }}
      />
    </div>
  )
}
