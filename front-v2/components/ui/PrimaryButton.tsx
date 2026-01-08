"use client"

import { Button } from 'antd'
import { dt } from '@/lib/design-tokens'
import type { ButtonProps } from 'antd'
import type { CSSProperties } from 'react'

interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'accent' | 'ghost' | 'success' | 'danger'
  glow?: boolean
}

/**
 * Botón primario con diseño mejorado y variantes
 * Incluye gradientes, sombras y efectos hover
 */
export const PrimaryButton = ({ 
  variant = 'primary', 
  glow = false,
  children,
  className = '',
  style,
  ...props 
}: PrimaryButtonProps) => {
  const variants: Record<string, CSSProperties> = {
    primary: {
      background: dt.gradients.primary,
      border: 'none',
      color: dt.colors.dark.text,
      fontWeight: dt.typography.fontWeight.medium,
      borderRadius: dt.radius.lg,
      padding: '12px 24px',
      height: 'auto',
      transition: dt.transitions.normal,
      boxShadow: glow ? dt.shadows.glow : '0 4px 16px rgba(227, 24, 55, 0.3)',
    },
    accent: {
      background: dt.gradients.accent,
      border: 'none',
      color: dt.colors.dark.text,
      fontWeight: dt.typography.fontWeight.medium,
      borderRadius: dt.radius.lg,
      padding: '12px 24px',
      height: 'auto',
      transition: dt.transitions.normal,
      boxShadow: '0 4px 16px rgba(255, 107, 0, 0.3)',
    },
    success: {
      background: dt.gradients.success,
      border: 'none',
      color: dt.colors.dark.text,
      fontWeight: dt.typography.fontWeight.medium,
      borderRadius: dt.radius.lg,
      padding: '12px 24px',
      height: 'auto',
      transition: dt.transitions.normal,
      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
    },
    danger: {
      background: dt.gradients.error,
      border: 'none',
      color: dt.colors.dark.text,
      fontWeight: dt.typography.fontWeight.medium,
      borderRadius: dt.radius.lg,
      padding: '12px 24px',
      height: 'auto',
      transition: dt.transitions.normal,
      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
    },
    ghost: {
      background: 'transparent',
      border: `1px solid ${dt.colors.dark.border}`,
      color: dt.colors.dark.textMuted,
      fontWeight: dt.typography.fontWeight.medium,
      borderRadius: dt.radius.lg,
      padding: '12px 24px',
      height: 'auto',
      transition: dt.transitions.normal,
    },
  }

  return (
    <Button
      {...props}
      style={{ ...variants[variant], ...style }}
      className={`hover-lift button-glow ${className}`}
    >
      {children}
    </Button>
  )
}
