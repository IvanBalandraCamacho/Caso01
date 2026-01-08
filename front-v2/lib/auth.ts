/**
 * Utilidades de autenticación para el frontend
 */

/**
 * Obtiene el token JWT del localStorage y valida su expiración
 * @returns Token válido o null si está expirado/inválido
 */
export const getValidToken = (): string | null => {
  if (typeof window === 'undefined') return null
  
  const token = localStorage.getItem('access_token')
  if (!token) return null
  
  try {
    // Decodificar JWT y verificar expiración
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // Convertir a ms
    
    if (Date.now() >= exp) {
      // Token expirado - limpiar
      localStorage.removeItem('access_token')
      return null
    }
    
    return token
  } catch (error) {
    // Token malformado - limpiar
    console.error('Invalid token format:', error)
    localStorage.removeItem('access_token')
    return null
  }
}

/**
 * Guarda el token en localStorage
 */
export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token)
  }
}

/**
 * Elimina el token del localStorage
 */
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
  }
}

/**
 * Verifica si el usuario está autenticado con token válido
 */
export const isAuthenticated = (): boolean => {
  return getValidToken() !== null
}
