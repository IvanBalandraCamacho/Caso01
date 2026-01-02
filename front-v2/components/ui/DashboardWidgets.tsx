"use client"

import React, { useEffect, useState } from 'react'
import { Card, Progress, Tag, Spin, message, Tooltip, Button, Input, DatePicker, TimePicker } from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  FileTextOutlined,
  TeamOutlined,
  TrophyOutlined,
  AlertOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons'
import { TrendingUp, FileCheck, Calendar, Target } from 'lucide-react'
import { DashboardService, type DashboardStats as DashboardStatsData } from '@/lib/dashboardService'
import dayjs from 'dayjs'

interface DashboardStatsProps {
  workspaceCount?: number
  documentCount?: number
  analysisCount?: number
  completionRate?: number
  token?: string // Token de autenticación para hacer las llamadas
  autoFetch?: boolean // Si debe obtener datos automáticamente
}

export function DashboardStats({
  workspaceCount = 0,
  documentCount = 0,
  analysisCount = 0,
  completionRate = 0,
  token,
  autoFetch = false,
}: DashboardStatsProps) {
  const [loading, setLoading] = useState(false)
  const [realData, setRealData] = useState<DashboardStatsData | null>(null)

  useEffect(() => {
    if (autoFetch && token) {
      fetchDashboardStats()
    }
  }, [autoFetch, token])

  const fetchDashboardStats = async () => {
    if (!token) return

    setLoading(true)
    try {
      const data = await DashboardService.getDashboardStats(token)
      setRealData(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      message.error('Error al cargar estadísticas del dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Usar datos reales si están disponibles, sino usar props
  const displayWorkspaceCount = realData?.total_workspaces ?? workspaceCount
  const displayDocumentCount = realData?.total_documents ?? documentCount
  const displayAnalysisCount = realData?.rfps_processed ?? analysisCount
  const displayCompletionRate = realData?.success_rate ?? completionRate
  const displayTrendPercentage = realData?.trend_percentage ?? 0
  const displayTrend = realData?.trend ?? 'stable'

  const getTrendIcon = () => {
    if (displayTrend === 'up') return '↑'
    if (displayTrend === 'down') return '↓'
    return '→'
  }

  const getTrendColor = () => {
    if (displayTrend === 'up') return '#10B981'
    if (displayTrend === 'down') return '#EF4444'
    return '#6B7280'
  }

  const stats = [
    {
      title: 'Workspaces Activos',
      value: displayWorkspaceCount,
      icon: <FileTextOutlined />,
      color: '#E31837',
      gradient: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
      change: `${getTrendIcon()} ${Math.abs(displayTrendPercentage)}%`,
      changeColor: getTrendColor(),
      tooltipTitle: '📁 Workspaces Activos',
      tooltip: (
        <div style={{ maxWidth: '280px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
            ¿Qué son los Workspaces?
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>
            Espacios de trabajo donde organizas tus proyectos, clientes y documentos. 
            Cada workspace es independiente y permite gestionar análisis de RFPs de forma aislada.
          </div>
          <div style={{ 
            marginTop: '10px', 
            paddingTop: '10px', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            fontStyle: 'italic'
          }}>
            💡 Tip: Crea un workspace por cliente o proyecto
          </div>
        </div>
      ),
    },
    {
      title: 'Documentos Analizados',
      value: displayDocumentCount,
      icon: <FileCheck size={20} />,
      color: '#FF6B00',
      gradient: 'linear-gradient(135deg, #FF6B00 0%, #E31837 100%)',
      change: `${getTrendIcon()} ${Math.abs(displayTrendPercentage)}%`,
      changeColor: getTrendColor(),
      tooltipTitle: '📄 Documentos Analizados',
      tooltip: (
        <div style={{ maxWidth: '280px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
            Todos tus documentos procesados
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>
            Total de archivos que has subido y el sistema ha procesado: PDFs, documentos Word, hojas Excel, etc.
          </div>
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: 'rgba(255,107,0,0.1)',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.5'
          }}>
            <strong>Incluye:</strong> Contratos, propuestas, RFPs, anexos técnicos, términos de referencia
          </div>
        </div>
      ),
    },
    {
      title: 'RFPs Procesados',
      value: displayAnalysisCount,
      icon: <Target size={20} />,
      color: '#3B82F6',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
      change: `↑ 15%`,
      changeColor: '#10B981',
      tooltipTitle: '🎯 RFPs Procesados',
      tooltip: (
        <div style={{ maxWidth: '300px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
            Análisis inteligente con IA
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', marginBottom: '10px' }}>
            RFPs que han sido completamente analizados mediante inteligencia artificial.
          </div>
          <div style={{ 
            fontSize: '11px',
            lineHeight: '1.7',
            color: 'rgba(255,255,255,0.75)'
          }}>
            <strong>La IA extrae:</strong><br/>
            • Cliente y datos de contacto<br/>
            • Presupuesto y fechas límite<br/>
            • Requisitos técnicos y funcionales<br/>
            • Equipo requerido y experiencia<br/>
            • Criterios de evaluación
          </div>
        </div>
      ),
    },
    {
      title: 'Tasa de Éxito',
      value: `${displayCompletionRate}%`,
      icon: <TrophyOutlined />,
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      change: '↑ 8%',
      changeColor: '#10B981',
      tooltipTitle: '🏆 Tasa de Éxito',
      tooltip: (
        <div style={{ maxWidth: '280px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
            Efectividad del procesamiento
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', marginBottom: '10px' }}>
            Porcentaje de documentos procesados exitosamente sin errores o problemas.
          </div>
          <div style={{ 
            display: 'flex',
            gap: '8px',
            fontSize: '11px',
            marginTop: '8px'
          }}>
            <div style={{ 
              flex: 1,
              padding: '6px 8px',
              background: 'rgba(16,185,129,0.1)',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#10B981', fontWeight: 600 }}>✓ Éxito</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Procesado OK</div>
            </div>
            <div style={{ 
              flex: 1,
              padding: '6px 8px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#EF4444', fontWeight: 600 }}>✗ Error</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Falló OCR</div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  if (loading && autoFetch) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    }}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="hover-lift"
          style={{
            background: 'rgba(26, 26, 28, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(227, 24, 55, 0.3)'
            e.currentTarget.style.transform = 'translateY(-4px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {/* Gradient top border */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: stat.gradient,
          }} />

          {/* Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stat.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#FFFFFF',
            fontSize: '20px',
            boxShadow: `0 4px 12px ${stat.color}40`,
          }}>
            {stat.icon}
          </div>

          {/* Value */}
          <div style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '8px',
            lineHeight: 1,
          }}>
            {stat.value}
          </div>

          {/* Title and Change */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                fontSize: '14px',
                color: '#888888',
                fontWeight: 500,
              }}>
                {stat.title}
              </span>
              <Tooltip 
                title={stat.tooltip} 
                placement="top"
                styles={{
                  container: {
                    background: 'rgba(20, 20, 22, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }
                }}
                color="transparent"
              >
                <QuestionCircleOutlined style={{
                  fontSize: '14px',
                  color: '#999999',
                  cursor: 'help',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = stat.color
                  e.currentTarget.style.transform = 'scale(1.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#999999'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                />
              </Tooltip>
            </div>
            <span style={{
              fontSize: '12px',
              color: stat.changeColor,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {stat.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodoList() {
  const [todos, setTodos] = useState<Array<{ id: number; text: string; completed: boolean }>>([])
  const [newTodo, setNewTodo] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Cargar todos del localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem('userTodos')
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos))
      } catch (e) {
        console.error('Error loading todos:', e)
      }
    }
  }, [])

  // Guardar todos en localStorage
  useEffect(() => {
    if (todos.length > 0 || localStorage.getItem('userTodos')) {
      localStorage.setItem('userTodos', JSON.stringify(todos))
    }
  }, [todos])

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo, completed: false }])
      setNewTodo('')
      setIsAdding(false)
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const incompleteTodos = todos.filter(t => !t.completed).length
  const completedTodos = todos.filter(t => !t.completed).length

  return (
    <div style={{
      background: 'rgba(26, 26, 28, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gradient top border */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      }} />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: 0,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}>
              <CheckCircleOutlined style={{ color: '#FFFFFF', fontSize: '18px' }} />
            </div>
            Lista de Tareas
          </h3>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '46px',
          }}>
            <span style={{ 
              color: '#888888', 
              fontSize: '13px',
            }}>
              {incompleteTodos}
            </span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              PENDIENTE{incompleteTodos !== 1 ? 'S' : ''}
            </span>
          </div>
        </div>
        <Button
          type="primary"
          size="middle"
          icon={<PlusOutlined />}
          onClick={() => setIsAdding(true)}
          className="hover-shine"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '10px',
            height: '36px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
          }}
        >
          Agregar
        </Button>
      </div>

      {isAdding && (
        <div style={{ 
          marginBottom: '20px',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <Input
            placeholder="✍️ Escribe tu tarea..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onPressEnter={addTodo}
            autoFocus
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              marginBottom: '12px',
              borderRadius: '10px',
              height: '40px',
              fontSize: '14px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              size="middle" 
              onClick={addTodo} 
              type="primary"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                height: '36px',
                fontWeight: 600,
              }}
            >
              Guardar
            </Button>
            <Button 
              size="middle" 
              onClick={() => { setIsAdding(false); setNewTodo('') }}
              style={{
                borderRadius: '8px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
        {todos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%)',
            borderRadius: '16px',
            border: '2px dashed rgba(16, 185, 129, 0.2)',
          }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '16px',
              filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.2))',
            }}>✅</div>
            <h4 style={{ 
              color: '#FFFFFF', 
              fontSize: '16px', 
              marginBottom: '8px',
              fontWeight: 600,
            }}>
              Sin tareas pendientes
            </h4>
            <p style={{ 
              color: '#999999', 
              fontSize: '13px', 
              margin: 0,
              lineHeight: '1.6',
            }}>
              Haz clic en <strong style={{ color: '#10B981' }}>Agregar</strong> para crear tu primera tarea
            </p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="hover-lift"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                background: todo.completed 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${todo.completed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '10px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = todo.completed ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.15)'
                e.currentTarget.style.background = todo.completed
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.12) 100%)'
                  : 'rgba(255, 255, 255, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = todo.completed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.background = todo.completed
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)'
                  : 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: todo.completed ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                border: todo.completed ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => toggleTodo(todo.id)}
              >
                {todo.completed && <CheckCircleOutlined style={{ color: '#FFFFFF', fontSize: '12px' }} />}
              </div>
              <span style={{
                flex: 1,
                color: todo.completed ? '#888888' : '#FFFFFF',
                fontSize: '14px',
                textDecoration: todo.completed ? 'line-through' : 'none',
                lineHeight: '1.5',
                fontWeight: todo.completed ? 400 : 500,
              }}>
                {todo.text}
              </span>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTodo(todo.id)
                }}
                style={{ 
                  padding: '6px 10px', 
                  height: 'auto',
                  borderRadius: '6px',
                  opacity: 0.6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6'
                  e.currentTarget.style.background = 'transparent'
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ComplianceScore({ score = 0 }: { score?: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    return '#EF4444'
  }

  const getStatus = (score: number) => {
    if (score === 0) return 'Sin datos'
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bueno'
    return 'Necesita Mejora'
  }

  return (
    <div style={{
      background: 'rgba(26, 26, 28, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#FFFFFF',
          margin: 0,
        }}>
          Score de Cumplimiento
        </h3>
        <Tag color={score > 0 ? getColor(score) : 'default'} style={{ 
          fontSize: '14px',
          padding: '4px 12px',
          borderRadius: '6px',
          border: 'none',
        }}>
          {getStatus(score)}
        </Tag>
      </div>

      {score === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h4 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '8px' }}>
            Sin score disponible
          </h4>
          <p style={{ color: '#999999', fontSize: '12px', margin: 0 }}>
            El score de cumplimiento se calculará cuando tengas proyectos activos
          </p>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              background: `linear-gradient(135deg, ${getColor(score)}, ${getColor(score)}CC)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}>
              {score}%
            </div>
            <p style={{ color: '#999999', fontSize: '14px', margin: 0 }}>
              De los requisitos obligatorios cumplidos
            </p>
          </div>

          <Progress 
            percent={score} 
            strokeColor={{
              '0%': getColor(score),
              '100%': `${getColor(score)}CC`,
            }}
            railColor="rgba(255, 255, 255, 0.1)"
            showInfo={false}
            size={12}
            style={{ marginBottom: '16px' }}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginTop: '20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: '#10B981',
                marginBottom: '4px',
              }}>
                0
              </div>
              <div style={{ fontSize: '12px', color: '#999999' }}>
                Cumplidos
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: '#F59E0B',
                marginBottom: '4px',
              }}>
                0
              </div>
              <div style={{ fontSize: '12px', color: '#999999' }}>
                Parciales
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: '#EF4444',
                marginBottom: '4px',
              }}>
                0
              </div>
              <div style={{ fontSize: '12px', color: '#999999' }}>
                Pendientes
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function UpcomingDeadlines() {
  const [deadlines, setDeadlines] = useState<Array<{
    id: number
    title: string
    date: string
    time?: string
    type: 'entrega' | 'reunion'
  }>>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newDeadline, setNewDeadline] = useState({ title: '', date: '', time: '', type: 'entrega' as 'entrega' | 'reunion' })

  // Cargar deadlines del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('userDeadlines')
    if (saved) {
      try {
        setDeadlines(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading deadlines:', e)
      }
    }
  }, [])

  // Guardar deadlines en localStorage
  useEffect(() => {
    if (deadlines.length > 0 || localStorage.getItem('userDeadlines')) {
      localStorage.setItem('userDeadlines', JSON.stringify(deadlines))
    }
  }, [deadlines])

  const addDeadline = () => {
    if (newDeadline.title.trim() && newDeadline.date) {
      setDeadlines([...deadlines, { ...newDeadline, id: Date.now() }])
      setNewDeadline({ title: '', date: '', time: '', type: 'entrega' })
      setIsAdding(false)
    }
  }

  const deleteDeadline = (id: number) => {
    setDeadlines(deadlines.filter(d => d.id !== id))
  }

  const getDaysLeft = (dateStr: string) => {
    const today = dayjs()
    const deadline = dayjs(dateStr)
    return deadline.diff(today, 'day')
  }

  const getPriorityColor = (daysLeft: number) => {
    if (daysLeft <= 3) return '#EF4444'
    if (daysLeft <= 7) return '#F59E0B'
    return '#3B82F6'
  }

  const sortedDeadlines = [...deadlines].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div style={{
      background: 'rgba(26, 26, 28, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gradient top border */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
      }} />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: 0,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)',
            }}>
              <Calendar size={18} style={{ color: '#FFFFFF' }} />
            </div>
            Próximas Fechas Límite
          </h3>
          <div style={{ 
            marginLeft: '46px',
            color: '#888888',
            fontSize: '13px',
          }}>
            {sortedDeadlines.length} recordatorio{sortedDeadlines.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Button
          type="primary"
          size="middle"
          icon={<PlusOutlined />}
          onClick={() => setIsAdding(true)}
          className="hover-shine"
          style={{
            background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
            border: 'none',
            borderRadius: '10px',
            height: '36px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(227, 24, 55, 0.2)',
          }}
        >
          Agregar
        </Button>
      </div>

      {isAdding && (
        <div style={{
          marginBottom: '20px',
          padding: '18px',
          background: 'linear-gradient(135deg, rgba(227, 24, 55, 0.05) 0%, rgba(196, 21, 48, 0.05) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(227, 24, 55, 0.2)',
        }}>
          <Input
            placeholder="📌 Título del recordatorio..."
            value={newDeadline.title}
            onChange={(e) => setNewDeadline({ ...newDeadline, title: e.target.value })}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              marginBottom: '12px',
              borderRadius: '10px',
              height: '40px',
              fontSize: '14px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <DatePicker
              placeholder="📅 Fecha"
              onChange={(date) => setNewDeadline({ ...newDeadline, date: date ? date.format('YYYY-MM-DD') : '' })}
              style={{ 
                flex: 1,
                height: '40px',
                borderRadius: '10px',
              }}
            />
            <TimePicker
              placeholder="🕐 Hora (opcional)"
              format="HH:mm"
              onChange={(time) => setNewDeadline({ ...newDeadline, time: time ? time.format('HH:mm') : '' })}
              style={{ 
                flex: 1,
                height: '40px',
                borderRadius: '10px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <Button
              size="middle"
              type={newDeadline.type === 'entrega' ? 'primary' : 'default'}
              onClick={() => setNewDeadline({ ...newDeadline, type: 'entrega' })}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                background: newDeadline.type === 'entrega' 
                  ? 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: newDeadline.type === 'entrega' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              📦 Entrega
            </Button>
            <Button
              size="middle"
              type={newDeadline.type === 'reunion' ? 'primary' : 'default'}
              onClick={() => setNewDeadline({ ...newDeadline, type: 'reunion' })}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                background: newDeadline.type === 'reunion'
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: newDeadline.type === 'reunion' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              👥 Reunión
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              size="middle" 
              onClick={addDeadline} 
              type="primary"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
                border: 'none',
                borderRadius: '8px',
                height: '36px',
                fontWeight: 600,
              }}
            >
              Guardar
            </Button>
            <Button 
              size="middle" 
              onClick={() => { setIsAdding(false); setNewDeadline({ title: '', date: '', time: '', type: 'entrega' }) }}
              style={{
                borderRadius: '8px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
        {sortedDeadlines.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'linear-gradient(135deg, rgba(227, 24, 55, 0.03) 0%, rgba(196, 21, 48, 0.03) 100%)',
            borderRadius: '16px',
            border: '2px dashed rgba(227, 24, 55, 0.2)',
          }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '16px',
              filter: 'drop-shadow(0 4px 8px rgba(227, 24, 55, 0.2))',
            }}>📅</div>
            <h4 style={{ 
              color: '#FFFFFF', 
              fontSize: '16px', 
              marginBottom: '8px',
              fontWeight: 600,
            }}>
              Sin recordatorios
            </h4>
            <p style={{ 
              color: '#999999', 
              fontSize: '13px', 
              margin: 0,
              lineHeight: '1.6',
            }}>
              Haz clic en <strong style={{ color: '#E31837' }}>Agregar</strong> para programar entregas o reuniones
            </p>
          </div>
        ) : (
          sortedDeadlines.map((deadline) => {
            const daysLeft = getDaysLeft(deadline.date)
            const color = getPriorityColor(daysLeft)
            const isPast = daysLeft < 0
            
            return (
              <div
                key={deadline.id}
                className="hover-lift"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: `linear-gradient(135deg, ${color}08 0%, ${color}05 100%)`,
                  border: `1px solid ${color}40`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  opacity: isPast ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${color}60`
                  e.currentTarget.style.background = `linear-gradient(135deg, ${color}12 0%, ${color}08 100%)`
                  e.currentTarget.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${color}40`
                  e.currentTarget.style.background = `linear-gradient(135deg, ${color}08 0%, ${color}05 100%)`
                  e.currentTarget.style.opacity = isPast ? '0.6' : '1'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: deadline.type === 'entrega'
                        ? 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
                        : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      boxShadow: deadline.type === 'entrega'
                        ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                        : '0 4px 12px rgba(139, 92, 246, 0.3)',
                    }}>
                      {deadline.type === 'entrega' ? '📦' : '👥'}
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      lineHeight: '1.4',
                    }}>
                      {deadline.title}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#999999',
                    marginLeft: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span>📅 {dayjs(deadline.date).format('DD MMM YYYY')}</span>
                    {deadline.time && <span>• 🕐 {deadline.time}</span>}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  <div style={{ 
                    textAlign: 'center',
                    minWidth: '60px',
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: color,
                      marginBottom: '2px',
                      lineHeight: 1,
                    }}>
                      {isPast ? '⚠️' : daysLeft}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#999999',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {isPast ? 'Vencido' : daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Día' : 'Días'}
                    </div>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteDeadline(deadline.id)
                    }}
                    style={{ 
                      padding: '8px 10px',
                      height: 'auto',
                      borderRadius: '8px',
                      opacity: 0.6,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
