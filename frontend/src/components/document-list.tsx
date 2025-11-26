"use client";
import React, { memo } from "react";
import { Document } from "@/context/WorkspaceContext";
import { useDeleteDocument } from "@/hooks/useApi";
import { Trash2, Loader2, FileText, File, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentListProps {
  documents: Document[];
  workspaceId?: string;
  onDeleteSuccess?: () => void;
}

export const DocumentList = memo(({ documents, workspaceId, onDeleteSuccess }: DocumentListProps) => {
  const deleteDocumentMutation = useDeleteDocument();

  const handleDelete = async (documentId: string, fileName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) {
      try {
        await deleteDocumentMutation.mutateAsync({ documentId, workspaceId: workspaceId || '' });
        onDeleteSuccess?.();
      } catch (error) {
        console.error("Error al eliminar documento:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al eliminar el documento: ${errorMessage}`);
      }
    }
  };

  const getFileIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (t.includes('doc')) return <FileText className="h-8 w-8 text-blue-500" />;
    if (t.includes('xls') || t.includes('csv')) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "COMPLETED") {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border border-success/20 bg-success/5 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Completed
        </span>
      );
    }
    if (status === "FAILED") {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border border-danger/20 bg-danger/5 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border border-yellow-500/20 bg-yellow-500/5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        {status}
      </span>
    );
  };

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group"
        >
          <div className="mt-1">
            {getFileIcon(doc.file_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium truncate" title={doc.file_name}>
              {doc.file_name}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground uppercase font-mono bg-secondary px-1 rounded">
                {doc.file_type}
              </span>
              {getStatusBadge(doc.status)}
            </div>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(doc.id, doc.file_name)}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
});

DocumentList.displayName = 'DocumentList';
