/**
 * Design Tokens - Sistema de diseño unificado para TIVIT Chat
 * Centraliza colores, espaciado, tipografía y estilos para consistencia visual
 */

export const designTokens = {
  // Paleta de colores TIVIT
  colors: {
    brand: {
      primary: '#E31837',      // Rojo TIVIT
      primaryHover: '#C41530',
      primaryLight: '#FF6B85',
      primaryDark: '#B01228',
    },
    accent: {
      orange: '#FF6B00',       // Naranja acento
      blue: '#3B82F6',
      purple: '#8B5CF6',
      green: '#10B981',
      yellow: '#F59E0B',
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
    dark: {
      bg: '#0A0A0B',           // Fondo principal (más suave que negro puro)
      bgElevated: '#141416',   // Fondo elevado
      card: '#1A1A1C',         // Cards/inputs
      cardHover: '#2A2A2D',    // Hover states
      border: '#333333',       // Bordes
      borderSubtle: 'rgba(255, 255, 255, 0.1)',
      text: '#FFFFFF',
      textMuted: '#CCCCCC',
      textSubtle: '#888888',
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },
  
  // Espaciado consistente (8px base)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  
  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '18px',
    xl: '24px',
    full: '9999px',
  },
  
  // Sombras
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 4px 16px rgba(0, 0, 0, 0.25)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.35)',
    xl: '0 20px 60px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(227, 24, 55, 0.3)',
    glowStrong: '0 0 40px rgba(227, 24, 55, 0.5)',
  },
  
  // Transiciones
  transitions: {
    fast: 'all 0.15s ease',
    normal: 'all 0.2s ease',
    slow: 'all 0.3s ease',
    bounce: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Tipografía
  typography: {
    fontFamily: {
      sans: 'Geist, system-ui, -apple-system, sans-serif',
      mono: 'Geist Mono, monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '15px',
      lg: '16px',
      xl: '18px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Gradientes
  gradients: {
    primary: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
    accent: 'linear-gradient(135deg, #FF6B00 0%, #E31837 100%)',
    info: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    warning: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
    error: 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)',
    processing: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
    background: 'linear-gradient(180deg, #0A0A0B 0%, #141416 50%, #1A1A1C 100%)',
  },
  
  // Z-index
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
  },
} as const

// Helper para acceso rápido
export const dt = designTokens

// Type helpers para TypeScript
export type ColorToken = keyof typeof designTokens.colors
export type SpacingToken = keyof typeof designTokens.spacing
export type RadiusToken = keyof typeof designTokens.radius
