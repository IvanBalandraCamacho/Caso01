"use client"

import React from 'react'
import { Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

interface ContextualTooltipProps {
  title: string
  content: string | React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function ContextualTooltip({ 
  title, 
  content, 
  children, 
  placement = 'top' 
}: ContextualTooltipProps) {
  return (
    <Tooltip
      title={
        <div style={{ maxWidth: '300px' }}>
          <div style={{ 
            fontWeight: 600, 
            marginBottom: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
          }}>
            {title}
          </div>
          <div style={{ 
            color: '#CCCCCC',
            fontSize: '13px',
            lineHeight: 1.5,
          }}>
            {content}
          </div>
        </div>
      }
      placement={placement}
      color="#1A1A1C"
      overlayStyle={{
        maxWidth: '350px',
      }}
      styles={{
        container: {
          background: '#1A1A1C',
          border: '1px solid rgba(227, 24, 55, 0.2)',
          padding: '16px',
          borderRadius: '8px',
        }
      }}
    >
      {children}
    </Tooltip>
  )
}

export function InfoTooltip({ 
  title, 
  content,
  placement = 'top' 
}: { 
  title: string
  content: string | React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <Tooltip
      title={
        <div style={{ maxWidth: '280px' }}>
          <div style={{ 
            fontWeight: 600, 
            marginBottom: '6px',
            color: '#FFFFFF',
            fontSize: '13px',
          }}>
            {title}
          </div>
          <div style={{ 
            color: '#CCCCCC',
            fontSize: '12px',
            lineHeight: 1.5,
          }}>
            {content}
          </div>
        </div>
      }
      placement={placement}
      color="#1A1A1C"
      styles={{
        container: {
          background: '#1A1A1C',
          border: '1px solid rgba(227, 24, 55, 0.2)',
          padding: '12px',
          borderRadius: '8px',
        }
      }}
    >
      <InfoCircleOutlined 
        style={{ 
          color: '#999999',
          fontSize: '14px',
          cursor: 'help',
          marginLeft: '6px',
        }} 
      />
    </Tooltip>
  )
}
