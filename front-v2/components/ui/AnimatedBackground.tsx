"use client"

import React from 'react'

interface AnimatedBackgroundProps {
  variant?: 'subtle' | 'vibrant' | 'minimal'
}

export function AnimatedBackground({ variant = 'subtle' }: AnimatedBackgroundProps) {
  const getGradientConfig = () => {
    switch (variant) {
      case 'vibrant':
        return {
          colors: ['#0A0A0B', '#1A1A1C', '#E31837', '#FF6B00', '#0D0D0F'],
          opacity: 0.15,
        }
      case 'minimal':
        return {
          colors: ['#0A0A0B', '#0D0D0F', '#0A0A0B'],
          opacity: 1,
        }
      default: // subtle
        return {
          colors: ['#0A0A0B', '#1A1A1C', '#0D0D0F', '#1E1E21'],
          opacity: 1,
        }
    }
  }

  const config = getGradientConfig()

  return (
    <>
      {/* Animated gradient background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(-45deg, ${config.colors.join(', ')})`,
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 15s ease infinite',
          opacity: config.opacity,
          zIndex: -2,
        }}
      />

      {/* Radial glow overlays */}
      {variant !== 'minimal' && (
        <>
          <div
            style={{
              position: 'fixed',
              top: '10%',
              right: '10%',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(227, 24, 55, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: -1,
              animation: 'float 20s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: '20%',
              left: '5%',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(255, 107, 0, 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: -1,
              animation: 'float 25s ease-in-out infinite reverse',
            }}
          />
        </>
      )}

      {/* Scan line effect (optional futuristic touch) */}
      {variant === 'vibrant' && (
        <div
          className="scan-line"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(227, 24, 55, 0.3), transparent)',
            animation: 'scan 10s linear infinite',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
    </>
  )
}
