"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spin } from "antd"
import { useWorkspaceContext } from "@/context/WorkspaceContext"
import { useUser } from "@/hooks/useUser"

/**
 * Página intermedia de workspaces que redirige al primer workspace disponible
 * o a la página principal si no hay workspaces.
 */
export default function WorkspacePage() {
  const router = useRouter()
  const { workspaces, isLoading } = useWorkspaceContext()
  const { user, isLoading: userLoading } = useUser()

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (!isLoading) {
      if (workspaces && workspaces.length > 0) {
        // Redirigir al primer workspace
        router.push(`/workspace/${workspaces[0].id}`)
      } else {
        // No hay workspaces, redirigir a la página principal
        router.push('/')
      }
    }
  }, [isLoading, workspaces, router, user, userLoading])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1c 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ color: '#FFFFFF', marginTop: '20px', fontSize: '14px' }}>
          Cargando workspaces...
        </p>
      </div>
    </div>
  )
}
