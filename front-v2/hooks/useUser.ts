"use client"

import { useState, useEffect } from "react"
import { checkAuthMe } from "@/lib/api"

export interface UserData {
  email: string
  full_name?: string | null
  profile_picture?: string | null
  created_at?: string
}

/**
 * Hook para obtener los datos del usuario autenticado
 * Primero intenta obtener de la API, luego del localStorage como fallback
 */
export function useUser() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const userData = await checkAuthMe()
        setUser({
          email: userData.email,
          full_name: userData.full_name ?? undefined,
          profile_picture: userData.profile_picture,
          created_at: userData.created_at,
        })
        // También guardar en localStorage para uso offline
        localStorage.setItem("user_data", JSON.stringify(userData))
      } catch (err) {
        console.error("Error fetching user:", err)
        setError(err instanceof Error ? err : new Error("Error desconocido"))
        
        // Fallback: intentar obtener del localStorage
        const storedUser = localStorage.getItem("user_data")
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
          } catch {
            setUser(null)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, isLoading, error }
}

export default useUser