"use client"

import React from "react"
import { Select, Tooltip } from "antd"
import { ThunderboltOutlined, RocketOutlined, BulbOutlined, ClockCircleOutlined } from "@ant-design/icons"

export type ThinkingLevel = "OFF" | "LOW" | "MEDIUM" | "HIGH"

interface ThinkingLevelSelectorProps {
  value: ThinkingLevel
  onChange: (level: ThinkingLevel) => void
  disabled?: boolean
  size?: "small" | "middle" | "large"
  style?: React.CSSProperties
}

const THINKING_LEVELS: { value: ThinkingLevel; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "OFF",
    label: "Sin Pensar",
    description: "Respuestas instantaneas, sin razonamiento profundo",
    icon: <ClockCircleOutlined />,
    color: "#666666",
  },
  {
    value: "LOW",
    label: "Rapido",
    description: "Razonamiento basico, respuestas agiles",
    icon: <ThunderboltOutlined />,
    color: "#52C41A",
  },
  {
    value: "MEDIUM",
    label: "Balanceado",
    description: "Balance entre velocidad y profundidad",
    icon: <RocketOutlined />,
    color: "#1890FF",
  },
  {
    value: "HIGH",
    label: "Profundo",
    description: "Analisis exhaustivo, maximo razonamiento",
    icon: <BulbOutlined />,
    color: "#722ED1",
  },
]

export function ThinkingLevelSelector({ 
  value, 
  onChange, 
  disabled = false,
  size = "middle",
  style 
}: ThinkingLevelSelectorProps) {
  const selectedLevel = THINKING_LEVELS.find(l => l.value === value)

  return (
    <Tooltip 
      title={
        <div>
          <strong>Nivel de Razonamiento</strong>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px", opacity: 0.9 }}>
            {selectedLevel?.description}
          </p>
        </div>
      }
      placement="top"
    >
      <Select
        value={value}
        onChange={onChange}
        disabled={disabled}
        size={size}
        style={{ 
          minWidth: "140px",
          ...style 
        }}
        variant="borderless"
        popupClassName="thinking-level-dropdown"
        labelRender={({ value }) => {
          const level = THINKING_LEVELS.find(l => l.value === value)
          return (
            <span style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              color: level?.color 
            }}>
              {level?.icon}
              <span style={{ fontSize: "13px" }}>{level?.label}</span>
            </span>
          )
        }}
        options={THINKING_LEVELS.map(level => ({
          value: level.value,
          label: (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              padding: "4px 0"
            }}>
              <span style={{ color: level.color, fontSize: "16px" }}>
                {level.icon}
              </span>
              <div>
                <div style={{ fontWeight: 500, color: "#FFFFFF" }}>
                  {level.label}
                </div>
                <div style={{ fontSize: "11px", color: "#888888" }}>
                  {level.description}
                </div>
              </div>
            </div>
          ),
        }))}
      />
    </Tooltip>
  )
}

// Hook para persistir la preferencia del usuario
export function useThinkingLevel(defaultLevel: ThinkingLevel = "MEDIUM"): [ThinkingLevel, (level: ThinkingLevel) => void] {
  const [level, setLevel] = React.useState<ThinkingLevel>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("thinking_level")
      if (saved && ["OFF", "LOW", "MEDIUM", "HIGH"].includes(saved)) {
        return saved as ThinkingLevel
      }
    }
    return defaultLevel
  })

  const updateLevel = React.useCallback((newLevel: ThinkingLevel) => {
    setLevel(newLevel)
    if (typeof window !== "undefined") {
      localStorage.setItem("thinking_level", newLevel)
    }
  }, [])

  return [level, updateLevel]
}

export default ThinkingLevelSelector
