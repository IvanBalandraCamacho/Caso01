"use client"

import React, { useEffect, useState } from 'react'
import { Card, Progress, Tag, Spin, App, Tooltip, Button, Input, DatePicker, TimePicker } from 'antd'
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
import { useLocalStorage } from '@/hooks/useLocalStorage'
import dayjs from 'dayjs'

interface DashboardStatsProps {
  workspaceCount?: number
  documentCount?: number
  analysisCount?: number
  completionRate?: number
  token?: string
  autoFetch?: boolean
}

export function DashboardStats({
  workspaceCount = 0,
  documentCount = 0,
  analysisCount = 0,
  completionRate = 0,
  token,
  autoFetch = false,
}: DashboardStatsProps) {
  const { message } = App.useApp()
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
    return '#94A3B8'
  }

  const stats = [
    {
      title: 'Workspaces Activos',
      value: displayWorkspaceCount,
      icon: <FileTextOutlined />,
      color: '#E31837',
      change: `${getTrendIcon()} ${Math.abs(displayTrendPercentage)}%`,
      changeColor: getTrendColor(),
      tooltip: (
        <div className="p-1">
          <p className="font-semibold mb-1">¿Qué son los Workspaces?</p>
          <p className="text-zinc-400 text-xs">Espacios de trabajo donde organizas tus proyectos, clientes y documentos.</p>
        </div>
      ),
    },
    {
      title: 'Documentos Analizados',
      value: displayDocumentCount,
      icon: <FileCheck size={20} />,
      color: '#FF6B00',
      change: `${getTrendIcon()} ${Math.abs(displayTrendPercentage)}%`,
      changeColor: getTrendColor(),
      tooltip: (
        <div className="p-1">
          <p className="font-semibold mb-1">Todos tus documentos</p>
          <p className="text-zinc-400 text-xs">Total de archivos que has subido y el sistema ha procesado.</p>
        </div>
      ),
    },
    {
      title: 'RFPs Procesados',
      value: displayAnalysisCount,
      icon: <Target size={20} />,
      color: '#3B82F6',
      change: `↑ 15%`,
      changeColor: '#10B981',
      tooltip: (
        <div className="p-1">
          <p className="font-semibold mb-1">Análisis inteligente</p>
          <p className="text-zinc-400 text-xs">RFPs que han sido completamente analizados mediante IA.</p>
        </div>
      ),
    },
    {
      title: 'Tasa de Éxito',
      value: `${displayCompletionRate}%`,
      icon: <TrophyOutlined />,
      color: '#10B981',
      change: '↑ 8%',
      changeColor: '#10B981',
      tooltip: (
        <div className="p-1">
          <p className="font-semibold mb-1">Efectividad</p>
          <p className="text-zinc-400 text-xs">Porcentaje de documentos procesados exitosamente.</p>
        </div>
      ),
    },
  ]

  if (loading && autoFetch) {
    return (
      <div className="flex justify-center p-10">
        <Spin />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-[#1E1F20] border border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group"
        >
          <div className="flex justify-between items-start mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: stat.color }}
            >
              {stat.icon}
            </div>
            <Tooltip title={stat.tooltip} color="#252627">
              <QuestionCircleOutlined className="text-zinc-400 hover:text-zinc-200 cursor-help" />
            </Tooltip>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-white">
              {stat.value}
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-400">
                {stat.title}
              </span>
              <span 
                className="text-xs font-bold"
                style={{ color: stat.changeColor }}
              >
                {stat.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodoList() {
  const [todos, setTodos] = useLocalStorage<Array<{ id: number; text: string; completed: boolean }>>(
    'dashboard_todos',
    []
  )
  const [newTodo, setNewTodo] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }])
      setNewTodo('')
      setIsAdding(false)
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <div className="bg-[#1E1F20] border border-zinc-800 rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircleOutlined className="text-[#10B981]" />
          Tareas
        </h3>
        <Button 
          type="text" 
          icon={<PlusOutlined />} 
          onClick={() => setIsAdding(true)}
          className="text-[#10B981] hover:bg-[#10B981]/10 rounded-lg"
        >
          Nueva
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 space-y-2">
          <Input
            placeholder="¿Qué hay que hacer?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onPressEnter={addTodo}
            className="bg-zinc-900 border-zinc-800 text-white rounded-xl"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="small" type="primary" onClick={addTodo} className="bg-[#10B981] border-none rounded-lg flex-1">Añadir</Button>
            <Button size="small" onClick={() => setIsAdding(false)} className="rounded-lg flex-1">Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {todos.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm italic">
            No hay tareas pendientes
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`group flex items-center gap-3 p-3 rounded-xl transition-colors ${
                todo.completed ? 'bg-zinc-900/50' : 'bg-zinc-900'
              }`}
            >
              <div 
                onClick={() => toggleTodo(todo.id)}
                className={`w-5 h-5 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all ${
                  todo.completed ? 'bg-[#10B981] border-[#10B981]' : 'border-zinc-700'
                }`}
              >
                {todo.completed && <CheckCircleOutlined className="text-white text-[10px]" />}
              </div>
              <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                {todo.text}
              </span>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined className="text-xs" />}
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ComplianceScore({ score = 0 }: { score?: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return '#10B981'
    if (s >= 60) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="bg-[#1E1F20] border border-zinc-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-6">Cumplimiento</h3>
      
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative flex items-center justify-center mb-4">
          <Progress 
            type="circle" 
            percent={score} 
            strokeColor={getColor(score)}
            railColor="rgba(148, 163, 184, 0.1)"
            size={120}
            strokeWidth={10}
            format={(p) => (
              <span className="text-2xl font-bold dark:text-white">{p}%</span>
            )}
          />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
          Requisitos obligatorios cumplidos
        </p>
      </div>
    </div>
  )
}

export function UpcomingDeadlines() {
  const [deadlines, setDeadlines] = useLocalStorage<Array<{
    id: number; title: string; date: string; time?: string; type: 'entrega' | 'reunion'
  }>>(
    'dashboard_deadlines',
    []
  )
  const [isAdding, setIsAdding] = useState(false)
  const [newDeadline, setNewDeadline] = useState({ title: '', date: '', time: '', type: 'entrega' as 'entrega' | 'reunion' })

  const addDeadline = () => {
    if (newDeadline.title.trim() && newDeadline.date) {
      setDeadlines([...deadlines, { ...newDeadline, title: newDeadline.title.trim(), id: Date.now() }])
      setNewDeadline({ title: '', date: '', time: '', type: 'entrega' })
      setIsAdding(false)
    }
  }

  const deleteDeadline = (id: number) => {
    setDeadlines(deadlines.filter(dl => dl.id !== id))
  }

  return (
    <div className="bg-[#1E1F20] border border-zinc-800 rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={18} className="text-[#E31837]" />
          Próximas Fechas
        </h3>
        <Button 
          type="text" 
          icon={<PlusOutlined />} 
          onClick={() => setIsAdding(true)}
          className="text-[#E31837] hover:bg-[#E31837]/10 rounded-lg"
        >
          Añadir
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-zinc-900 rounded-xl space-y-3">
          <Input
            placeholder="Título..."
            value={newDeadline.title}
            onChange={(e) => setNewDeadline({ ...newDeadline, title: e.target.value })}
            className="bg-zinc-950 border-zinc-800 text-white"
          />
          <DatePicker 
            className="w-full" 
            onChange={(date) => setNewDeadline({ ...newDeadline, date: date ? date.format('YYYY-MM-DD') : '' })} 
          />
          <div className="flex gap-2">
            <Button type="primary" onClick={addDeadline} className="bg-[#E31837] border-none flex-1">Guardar</Button>
            <Button onClick={() => setIsAdding(false)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3 overflow-y-auto flex-1">
        {deadlines.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm italic">Sin fechas límite</div>
        ) : (
          deadlines.map((dl) => (
            <div key={dl.id} className="group p-3 bg-zinc-900 rounded-xl border border-transparent hover:border-zinc-700 transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-zinc-200 flex-1">{dl.title}</span>
                <div className="flex items-center gap-2">
                  <Tag color={dl.type === 'entrega' ? 'blue' : 'purple'} className="m-0 text-[10px] rounded-md border-none">
                    {dl.type.toUpperCase()}
                  </Tag>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined className="text-xs" />}
                    onClick={() => deleteDeadline(dl.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                {dayjs(dl.date).format('DD MMM YYYY')} {dl.time && `• ${dl.time}`}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}