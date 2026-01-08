"use client"

import React from 'react'
import { Card } from 'antd'
import type { ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  gradient?: string
}

export function FeatureCard({ 
  icon, 
  title, 
  description, 
  gradient = 'linear-gradient(135deg, #E31837 0%, #C41530 100%)' 
}: FeatureCardProps) {
  return (
    <div
      className="feature-card transition-smooth"
      style={{
        background: 'rgba(26, 26, 28, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '32px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)'
        e.currentTarget.style.borderColor = 'rgba(227, 24, 55, 0.3)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(227, 24, 55, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Gradient overlay on hover */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: gradient,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }}
        className="feature-card-accent"
      />
      
      {/* Icon */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '28px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(227, 24, 55, 0.3)',
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#FFFFFF',
          marginBottom: '12px',
          lineHeight: 1.4,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: '14px',
          color: '#999999',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  )
}
