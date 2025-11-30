import { useState, useEffect, useCallback, useRef } from "react";
import { useDocumentStatus } from "./useApi";
import { showToast } from "@/components/Toast";
import { DocumentStatus } from "@/types/api";

interface UploadedDocument {
  id: string;
  file_name: string;
  status: DocumentStatus;
}

/**
 * Hook personalizado para hacer polling de múltiples documentos subidos
 * Monitorea el estado de cada documento hasta que esté COMPLETED o FAILED
 * 
 * Now uses exponential backoff internally via useDocumentStatus
 */
export const useDocumentPolling = (onAllCompleted?: () => void) => {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [activePolling, setActivePolling] = useState<Set<string>>(new Set());

  /**
   * Registrar un nuevo documento para hacer polling
   */
  const registerDocument = useCallback((doc: UploadedDocument) => {
    setUploadedDocuments((prev) => {
      // Evitar duplicados
      if (prev.some((d) => d.id === doc.id)) return prev;
      return [...prev, doc];
    });
    setActivePolling((prev) => new Set(prev).add(doc.id));
  }, []);

  /**
   * Limpiar documentos completados/fallidos
   */
  const clearCompleted = useCallback(() => {
    setUploadedDocuments([]);
    setActivePolling(new Set());
  }, []);

  /**
   * Verificar si hay documentos en proceso
   */
  const hasActiveUploads = activePolling.size > 0;

  /**
   * Obtener documentos por estado
   */
  const getDocumentsByStatus = useCallback((status: DocumentStatus) => {
    return uploadedDocuments.filter((doc) => doc.status === status);
  }, [uploadedDocuments]);

  return {
    uploadedDocuments,
    registerDocument,
    clearCompleted,
    hasActiveUploads,
    getDocumentsByStatus,
    activePolling,
    setUploadedDocuments,
    setActivePolling,
  };
};

/**
 * Hook for polling individual document status with automatic notifications
 * Uses exponential backoff via useDocumentStatus
 */
export const useIndividualDocumentPolling = (
  documentId: string,
  fileName: string,
  onStatusChange: (status: DocumentStatus) => void,
  enabled: boolean = true
) => {
  const { data: statusData, isLoading } = useDocumentStatus(documentId, enabled);
  const prevStatusRef = useRef<DocumentStatus | null>(null);

  useEffect(() => {
    if (statusData?.status && statusData.status !== prevStatusRef.current) {
      prevStatusRef.current = statusData.status as DocumentStatus;
      onStatusChange(statusData.status as DocumentStatus);

      // Notificar cuando se complete o falle
      if (statusData.status === "COMPLETED") {
        showToast(`✅ ${fileName} procesado correctamente`, "success");
      } else if (statusData.status === "FAILED") {
        showToast(`❌ Error al procesar ${fileName}`, "error");
      }
    }
  }, [statusData?.status, fileName, onStatusChange]);

  return { status: statusData?.status as DocumentStatus | undefined, isLoading };
};
