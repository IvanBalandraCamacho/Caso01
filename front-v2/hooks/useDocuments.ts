import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchWorkspaceDocuments,
  uploadDocumentApi,
  deleteDocumentApi
} from '@/lib/api'

/**
 * Hook para obtener documentos de un workspace
 */
export const useWorkspaceDocuments = (workspaceId: string | null | undefined) => {
  return useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => {
      if (!workspaceId) throw new Error('No workspace ID provided')
      return fetchWorkspaceDocuments(workspaceId)
    },
    enabled: !!workspaceId, // Solo ejecutar si hay workspaceId
    staleTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para subir documento
 */
export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ workspaceId, file, onProgress }: { 
      workspaceId: string; 
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData()
      formData.append('file', file)
      return uploadDocumentApi(workspaceId, formData, onProgress)
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de documentos del workspace específico
      queryClient.invalidateQueries({ 
        queryKey: ['documents', variables.workspaceId] 
      })
    },
  })
}

/**
 * Hook para eliminar documento
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ documentId, workspaceId }: { documentId: string; workspaceId: string }) =>
      deleteDocumentApi(documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['documents', variables.workspaceId] 
      })
    },
  })
}
