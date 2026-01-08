/**
 * Utilidades para manejar el almacenamiento local del dashboard
 */

// Claves de localStorage
export const STORAGE_KEYS = {
  TODOS: 'dashboard_todos',
  DEADLINES: 'dashboard_deadlines',
} as const

// Tipos
export interface Todo {
  id: number
  text: string
  completed: boolean
}

export interface Deadline {
  id: number
  title: string
  date: string
  time?: string
  type: 'entrega' | 'reunion'
}

/**
 * Obtener todos del localStorage
 */
export function getTodos(): Todo[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TODOS)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading todos:', error)
    return []
  }
}

/**
 * Guardar todos en localStorage
 */
export function saveTodos(todos: Todo[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos))
  } catch (error) {
    console.error('Error saving todos:', error)
  }
}

/**
 * Obtener deadlines del localStorage
 */
export function getDeadlines(): Deadline[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DEADLINES)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading deadlines:', error)
    return []
  }
}

/**
 * Guardar deadlines en localStorage
 */
export function saveDeadlines(deadlines: Deadline[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.DEADLINES, JSON.stringify(deadlines))
  } catch (error) {
    console.error('Error saving deadlines:', error)
  }
}

/**
 * Limpiar todos los datos del dashboard
 */
export function clearDashboardData(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEYS.TODOS)
    localStorage.removeItem(STORAGE_KEYS.DEADLINES)
  } catch (error) {
    console.error('Error clearing dashboard data:', error)
  }
}

/**
 * Exportar todos los datos del dashboard como JSON
 */
export function exportDashboardData(): string {
  return JSON.stringify({
    todos: getTodos(),
    deadlines: getDeadlines(),
    exportDate: new Date().toISOString(),
  }, null, 2)
}

/**
 * Importar datos del dashboard desde JSON
 */
export function importDashboardData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData)
    if (data.todos) saveTodos(data.todos)
    if (data.deadlines) saveDeadlines(data.deadlines)
    return true
  } catch (error) {
    console.error('Error importing dashboard data:', error)
    return false
  }
}
