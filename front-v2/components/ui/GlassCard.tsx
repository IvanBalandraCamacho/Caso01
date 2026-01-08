"use client"

import { dt } from '@/lib/design-tokens'
import type { CSSProperties, ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  hover?: boolean
  glow?: boolean
  style?: CSSProperties
  className?: string
  onClick?: () => void
}

/**
 * Card con efecto glassmorphism
 * Fondo translúcido con blur y borde luminoso
 */
export const GlassCard = ({ 
  children, 
  hover = false, 
  glow = false,
  style,
  className = '',
  onClick,
}: GlassCardProps) => {
  const baseStyle: CSSProperties = {
    background: 'rgba(26, 26, 28, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', // Safari
    border: glow ? `1px solid rgba(227, 24, 55, 0.3)` : `1px solid ${dt.colors.dark.borderSubtle}`,
    borderRadius: dt.radius.lg,
    padding: dt.spacing.lg,
    transition: dt.transitions.normal,
    boxShadow: glow ? dt.shadows.glow : dt.shadows.md,
  }

  return (
    <div
      className={`glass-card ${hover ? 'hover-lift' : ''} ${className}`}
      style={{ ...baseStyle, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
