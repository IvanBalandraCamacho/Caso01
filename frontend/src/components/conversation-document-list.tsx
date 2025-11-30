"use client";
import React, { memo, useState } from "react";
import { Document } from "@/context/WorkspaceContext";
import { useDeleteDocument } from "@/hooks/useApi";
import { Trash2, Loader2, FileText, File, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showToast } from "@/components/Toast";

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
  const { activeWorkspace } = useWorkspaces();
  const deleteDocumentMutation = useDeleteDocument();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteClick = (documentId: string, fileName: string) => {
    setDeleteConfirm({ id: documentId, name: fileName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteDocumentMutation.mutateAsync({
        documentId: deleteConfirm.id,
        workspaceId: activeWorkspace?.id || ''
      });
      showToast(`Documento "${deleteConfirm.name}" eliminado correctamente`, "success");
      onDocumentsChange?.();
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      showToast(`Error al eliminar el documento: ${errorMessage}`, "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (t.includes('doc')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (t.includes('xls') || t.includes('csv')) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
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
    <div className="space-y-2 max-h-[14rem] overflow-y-auto">
      {/* Documents List - Compacto */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-3 w-3" />
            Documentos ({documents.length})
          </h4>
          <ul className="space-y-1">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 p-2 rounded-md bg-card border border-border hover:border-primary/50 transition-all group"
              >
                <div>
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate text-xs" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusBadge(doc.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteClick(doc.id, doc.file_name)}
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

      {documents.length === 0 && (
        <div className="text-center py-2 text-muted-foreground">
          <p className="text-xs">Sin documentos en esta conversación</p>
        </div>
      )}
      
      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar documento"
        description={`¿Estás seguro de que quieres eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
});

ConversationDocumentList.displayName = 'ConversationDocumentList';
