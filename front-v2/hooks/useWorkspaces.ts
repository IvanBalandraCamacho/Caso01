import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchWorkspaces, 
  createWorkspaceApi,
  updateWorkspaceApi,
  deleteWorkspaceApi
} from '@/lib/api'
import type { WorkspaceCreate, WorkspaceUpdate } from '@/types/api'

/**
 * Hook para obtener todos los workspaces
 * Incluye cache automático y refetch inteligente
 */
export const useWorkspaces = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
    staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados "frescos"
    refetchOnWindowFocus: true, // Refetch al volver a la ventana
    refetchOnMount: true,
  })
}

/**
 * Hook para crear workspace
 * Invalida cache automáticamente tras éxito
 */
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: WorkspaceCreate) => createWorkspaceApi(data),
    onSuccess: () => {
      // Invalidar cache para forzar refetch
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => {
      console.error('Error creating workspace:', error)
    },
  })
}

/**
 * Hook para actualizar workspace
 */
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkspaceUpdate }) => 
      updateWorkspaceApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

/**
 * Hook para eliminar workspace
 */
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteWorkspaceApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}
