import { useState, useEffect, useCallback, useRef } from "react";
import { useDocumentStatus } from "./useApi";
import { showToast } from "@/components/Toast";

interface UploadedDocument {
  id: string;
  file_name: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

/**
 * Hook personalizado para hacer polling de múltiples documentos subidos
 * Monitorea el estado de cada documento hasta que esté COMPLETED o FAILED
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
  const getDocumentsByStatus = (status: UploadedDocument["status"]) => {
    return uploadedDocuments.filter((doc) => doc.status === status);
  };

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
 * Componente interno para hacer polling de un documento individual
 */
export const useIndividualDocumentPolling = (
  documentId: string,
  fileName: string,
  onStatusChange: (status: string) => void,
  enabled: boolean = true
) => {
  const { data: statusData, isLoading } = useDocumentStatus(documentId, enabled);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (statusData?.status && statusData.status !== prevStatusRef.current) {
      prevStatusRef.current = statusData.status;
      onStatusChange(statusData.status);

      // Notificar cuando se complete o falle
      if (statusData.status === "COMPLETED") {
        showToast(`✅ ${fileName} procesado correctamente`, "success");
      } else if (statusData.status === "FAILED") {
        showToast(`❌ Error al procesar ${fileName}`, "error");
      }
    }
  }, [statusData?.status, fileName, onStatusChange]);

  return { status: statusData?.status, isLoading };
};
