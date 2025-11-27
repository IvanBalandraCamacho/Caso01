"use client";
import React, { memo, useState, useCallback } from "react";
import { Document } from "@/context/WorkspaceContext";
import { useDeleteDocument } from "@/hooks/useApi";
import { Trash2, Loader2, FileText, File, FileSpreadsheet, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { useDropzone } from "react-dropzone";

interface ConversationDocumentListProps {
  conversationId: string;
  documents: Document[];
  onDocumentsChange?: () => void;
}

export const ConversationDocumentList = memo(({
  conversationId,
  documents,
  onDocumentsChange
}: ConversationDocumentListProps) => {
  const { activeWorkspace, uploadDocumentToConversation } = useWorkspaces();
  const deleteDocumentMutation = useDeleteDocument();
  const [isUploading, setIsUploading] = useState(false);

  const handleDelete = async (documentId: string, fileName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) {
      try {
        await deleteDocumentMutation.mutateAsync({
          documentId,
          workspaceId: activeWorkspace?.id || ''
        });
        onDocumentsChange?.();
      } catch (error) {
        console.error("Error al eliminar documento:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        alert(`Error al eliminar el documento: ${errorMessage}`);
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!activeWorkspace || !conversationId) return;

    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        await uploadDocumentToConversation(conversationId, formData);
      }
      onDocumentsChange?.();
    } catch (error) {
      console.error("Error al subir documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al subir el documento: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  }, [activeWorkspace, conversationId, uploadDocumentToConversation, onDocumentsChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    disabled: isUploading,
  });

  const getFileIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (t.includes('doc')) return <FileText className="h-6 w-6 text-blue-500" />;
    if (t.includes('xls') || t.includes('csv')) return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
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
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isUploading
                ? "Subiendo documentos..."
                : isDragActive
                ? "Suelta los archivos aquí"
                : "Arrastra archivos o haz clic para subir"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, XLSX, CSV, TXT soportados
            </p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos de esta conversación ({documents.length})
          </h4>
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all group"
              >
                <div className="mt-0.5">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate text-sm" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
        </div>
      )}

      {documents.length === 0 && !isUploading && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay documentos en esta conversación</p>
          <p className="text-xs mt-1">Sube archivos específicos para esta conversación</p>
        </div>
      )}
    </div>
  );
});

ConversationDocumentList.displayName = 'ConversationDocumentList';
