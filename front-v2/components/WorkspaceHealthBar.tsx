"use client"

import React, { useEffect, useState } from 'react'
import { Progress, Tooltip, Alert } from 'antd'
import { InfoCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { fetchWorkspaceHealth } from '@/lib/api'
import { WorkspaceHealth } from '@/types/api'

interface WorkspaceHealthBarProps {
  workspaceId: string
  refreshTrigger?: number
}

export const WorkspaceHealthBar: React.FC<WorkspaceHealthBarProps> = ({ workspaceId, refreshTrigger }) => {
  const [health, setHealth] = useState<WorkspaceHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const loadHealth = async () => {
    try {
      const data = await fetchWorkspaceHealth(workspaceId)
      setHealth(data)
    } catch (error) {
      console.error('Error loading workspace health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [workspaceId, refreshTrigger])

  if (loading || !health) return <div className="h-2 w-full bg-zinc-800 animate-pulse rounded-full" />

  const getStatusColor = () => {
    if (health.percentage < 40) return '#E31837' // Red
    if (health.percentage < 80) return '#FF6B00' // Orange
    return '#52c41a' // Green
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="text-zinc-400 font-medium flex items-center gap-2">
          Completitud de la Oportunidad
          <Tooltip title="Porcentaje de campos estratégicos completados para esta oportunidad.">
            <InfoCircleOutlined className="text-zinc-500 cursor-help" />
          </Tooltip>
        </span>
        <span className="font-bold text-white">{health.percentage}%</span>
      </div>
      
      <Progress 
        percent={health.percentage} 
        strokeColor={getStatusColor()} 
        trailColor="#27272a"
        showInfo={false}
        status={health.percentage === 100 ? "success" : "active"}
        className="m-0"
      />

      {health.percentage < 100 && (
        <Alert
          message={
            <div className="text-xs">
              <span className="font-bold">Falta completar: </span>
              <span className="text-zinc-300">
                {health.missing_sections.slice(0, 3).join(', ')}
                {health.missing_sections.length > 3 && ` y ${health.missing_sections.length - 3} más`}
              </span>
            </div>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className="text-[#FF6B00]" />}
          className="bg-[#2A1D15] border-[#FF6B00]/30 py-1.5 px-3 rounded-xl"
        />
      )}

      {health.percentage === 100 && (
        <Alert
          message="Oportunidad 100% completada. ¡Lista para generar propuesta!"
          type="success"
          showIcon
          icon={<CheckCircleOutlined className="text-[#52c41a]" />}
          className="bg-[#152319] border-[#52c41a]/30 py-1.5 px-3 rounded-xl text-xs text-zinc-300"
        />
      )}
    </div>
  )
}
