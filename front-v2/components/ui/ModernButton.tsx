"use client"

import React from 'react'
import { Button } from 'antd'
import type { ButtonProps } from 'antd'

// Omit the 'variant' property from ButtonProps to avoid conflict with Ant Design 5.x
interface ModernButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'outline'
  glow?: boolean
}

export function ModernButton({ 
  variant = 'primary', 
  glow = false, 
  children, 
  className = '',
  ...props 
}: ModernButtonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      height: '44px',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: 600,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: 'none',
      position: 'relative',
      overflow: 'hidden',
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
          color: '#FFFFFF',
          boxShadow: glow ? '0 4px 20px rgba(227, 24, 55, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
        }
      case 'gradient':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #E31837 0%, #FF6B00 100%)',
          color: '#FFFFFF',
          boxShadow: glow ? '0 4px 20px rgba(227, 24, 55, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
        }
      case 'secondary':
        return {
          ...baseStyle,
          background: 'rgba(227, 24, 55, 0.1)',
          color: '#E31837',
          border: '1px solid rgba(227, 24, 55, 0.3)',
        }
      case 'ghost':
        return {
          ...baseStyle,
          background: 'transparent',
          color: '#CCCCCC',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      case 'outline':
        return {
          ...baseStyle,
          background: 'transparent',
          color: '#E31837',
          border: '2px solid #E31837',
        }
      default:
        return baseStyle
    }
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const button = e.currentTarget
    if (variant === 'primary' || variant === 'gradient') {
      button.style.transform = 'translateY(-2px)'
      button.style.boxShadow = '0 8px 30px rgba(227, 24, 55, 0.5)'
    } else if (variant === 'ghost') {
      button.style.borderColor = 'rgba(227, 24, 55, 0.5)'
      button.style.color = '#E31837'
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const button = e.currentTarget
    button.style.transform = 'translateY(0)'
    if (variant === 'primary' || variant === 'gradient') {
      button.style.boxShadow = glow 
        ? '0 4px 20px rgba(227, 24, 55, 0.4)' 
        : '0 2px 8px rgba(0, 0, 0, 0.15)'
    } else if (variant === 'ghost') {
      button.style.borderColor = 'rgba(255, 255, 255, 0.1)'
      button.style.color = '#CCCCCC'
    }
  }

  return (
    <Button
      {...props}
      className={`modern-button ${className}`}
      style={getVariantStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Button>
  )
}
