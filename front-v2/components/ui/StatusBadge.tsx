"use client"

import { Tag } from 'antd'
import { dt } from '@/lib/design-tokens'
import type { CSSProperties } from 'react'

interface StatusBadgeProps {
  status: 'processing' | 'completed' | 'error' | 'pending' | 'success' | 'warning'
  text: string
  icon?: React.ReactNode
}

/**
 * Badge de estado con gradientes de color
 * Incluye animación opcional para estados "processing"
 */
export const StatusBadge = ({ status, text, icon }: StatusBadgeProps) => {
  const styles: Record<string, CSSProperties> = {
    processing: {
      background: dt.gradients.processing,
      border: 'none',
      color: '#fff',
      fontWeight: dt.typography.fontWeight.medium,
      padding: '4px 12px',
      borderRadius: dt.radius.sm,
    },
    completed: {
      background: dt.gradients.success,
      border: 'none',
      color: '#fff',
      fontWeight: dt.typography.fontWeight.medium,
      padding: '4px 12px',
      borderRadius: dt.radius.sm,
    },
    success: {
      background: dt.gradients.success,
      border: 'none',
      color: '#fff',
      fontWeight: dt.typography.fontWeight.medium,
      padding: '4px 12px',
      borderRadius: dt.radius.sm,
    },
    error: {
      background: dt.gradients.error,
      border: 'none',
      color: '#fff',
      fontWeight: dt.typography.fontWeight.medium,
      padding: '4px 12px',
      borderRadius: dt.radius.sm,
    },
    warning: {
      background: dt.gradients.warning,
      border: 'none',
      color: '#fff',
      fontWeight: dt.typography.fontWeight.medium,
      padding: '4px 12px',
      borderRadius: dt.radius.sm,
    },
    pending: {
      background: dt.gradients.warning,
      border: 'none',
      color: '#fff',
      fontWeight: dt.typography.fontWeight.medium,
      padding: '4px 12px',
      borderRadius: dt.radius.sm,
    },
  }

  return (
    <Tag 
      style={styles[status]}
      className={status === 'processing' ? 'animate-pulse' : ''}
      icon={icon}
    >
      {text}
    </Tag>
  )
}
