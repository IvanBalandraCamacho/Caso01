"use client";
import React from "react";
import { Document } from "@/context/WorkspaceContext";
import { useDeleteDocument } from "@/hooks/useApi";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentListProps {
  documents: Document[];
  workspaceId?: string;
  onDeleteSuccess?: () => void;
}

export function DocumentList({ documents, workspaceId, onDeleteSuccess }: DocumentListProps) {
  const deleteDocumentMutation = useDeleteDocument();

  const handleDelete = async (documentId: string, fileName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) {
      try {
        await deleteDocumentMutation.mutateAsync({ documentId, workspaceId: workspaceId || '' });
        onDeleteSuccess?.();
      } catch (error: any) {
        console.error("Error al eliminar documento:", error);
        const errorMessage = error?.response?.data?.detail || error?.message || "Error desconocido";
        alert(`Error al eliminar el documento: ${errorMessage}`);
      }
    }
  };

  return (
    <ul>
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex justify-between items-center p-2 rounded-lg hover:bg-brand-dark group"
        >
          <div className="flex-1">
            <p className="text-white font-medium">{doc.file_name}</p>
            <p className="text-gray-400 text-sm">{doc.file_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                doc.status === "COMPLETED"
                  ? "bg-green-500/20 text-green-400"
                  : doc.status === "FAILED"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {doc.status}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(doc.id, doc.file_name)}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
