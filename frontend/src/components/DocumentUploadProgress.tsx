"use client";
import React, { useEffect } from "react";
import { Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { DocumentStatus } from "@/types/api";

interface DocumentUploadProgressItemProps {
  documentId: string;
  fileName: string;
  status: DocumentStatus;
}

const DocumentUploadProgressItem: React.FC<DocumentUploadProgressItemProps> = React.memo(({
  documentId,
  fileName,
  status,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "PROCESSING":
      case "PENDING":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "COMPLETED":
        return "Completado";
      case "FAILED":
        return "Error";
      case "PROCESSING":
        return "Procesando...";
      case "PENDING":
        return "En cola...";
      default:
        return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "COMPLETED":
        return "text-green-500";
      case "FAILED":
        return "text-red-500";
      case "PROCESSING":
      case "PENDING":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-md">
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
        <p className={`text-xs ${getStatusColor()}`}>{getStatusText()}</p>
      </div>
    </div>
  );
});

DocumentUploadProgressItem.displayName = "DocumentUploadProgressItem";

interface DocumentUploadProgressProps {
  documents: Array<{
    id: string;
    file_name: string;
    status: DocumentStatus;
  }>;
  onAllCompleted?: () => void;
}

export const DocumentUploadProgress: React.FC<DocumentUploadProgressProps> = React.memo(({
  documents,
  onAllCompleted,
}) => {
  useEffect(() => {
    // Verificar si todos los documentos están completados o fallidos
    const allFinished = documents.every(
      (doc) => doc.status === "COMPLETED" || doc.status === "FAILED"
    );

    if (allFinished && documents.length > 0 && onAllCompleted) {
      onAllCompleted();
    }
  }, [documents, onAllCompleted]);

  if (documents.length === 0) return null;

  const pendingCount = documents.filter(
    d => d.status !== "COMPLETED" && d.status !== "FAILED"
  ).length;

  return (
    <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-lg">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">
        Procesando documentos ({pendingCount}/{documents.length})
      </h4>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {documents.map((doc) => (
          <DocumentUploadProgressItem
            key={doc.id}
            documentId={doc.id}
            fileName={doc.file_name}
            status={doc.status}
          />
        ))}
      </div>
    </div>
  );
});

DocumentUploadProgress.displayName = "DocumentUploadProgress";
