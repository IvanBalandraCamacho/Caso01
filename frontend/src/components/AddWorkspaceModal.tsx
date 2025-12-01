"use client";
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWorkspace } from "@/hooks/useApi";
import { WorkspacePublic } from "@/types/api";
import { Loader2, Upload, X, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadDocumentApi } from "@/lib/api";
import { useNotificationsWS, NotificationMessage } from "@/hooks/useNotificationsWS";

interface AddWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type DocumentProcessingStatus = "idle" | "uploading" | "processing" | "completed" | "error";

export function AddWorkspaceModal({ isOpen, onClose, onSuccess }: AddWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<DocumentProcessingStatus>("idle");
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [createdWorkspace, setCreatedWorkspace] = useState<WorkspacePublic | null>(null);
  const router = useRouter();

  const createWorkspaceMutation = useCreateWorkspace();

  // Handle WebSocket notifications for document processing
  const handleWSNotification = useCallback((msg: NotificationMessage) => {
    console.log("📩 AddWorkspaceModal recibió notificación:", msg);
    
    if (msg.document_id === uploadedDocumentId) {
      if (msg.status === "COMPLETED") {
        setDocumentStatus("completed");
        // Now we can navigate to the workspace
        if (createdWorkspace) {
          setTimeout(() => {
            onClose();
            onSuccess?.();
            if (createdWorkspace.default_conversation_id) {
              router.push(`/p/${createdWorkspace.id}/c/${createdWorkspace.default_conversation_id}`);
            } else {
              router.push(`/p/${createdWorkspace.id}`);
            }
            // Reset state
            resetForm();
          }, 500);
        }
      } else if (msg.status === "ERROR") {
        setDocumentStatus("error");
      }
    }
  }, [uploadedDocumentId, createdWorkspace, router, onClose, onSuccess]);

  // Connect to WebSocket when document is processing
  useNotificationsWS({
    workspaceId: createdWorkspace?.id,
    documentId: uploadedDocumentId || undefined,
    onMessage: handleWSNotification,
    enabled: isOpen && documentStatus === "processing",
  });

  const resetForm = () => {
    setName("");
    setInstructions("");
    setSelectedFile(null);
    setDocumentStatus("idle");
    setUploadedDocumentId(null);
    setCreatedWorkspace(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("El nombre del workspace es requerido");
      return;
    }

    try {
      const workspace = await createWorkspaceMutation.mutateAsync({
        name: name.trim(),
        description: null, // Siempre enviar null
        instructions: instructions.trim() || null,
      });

      const ws = workspace as WorkspacePublic;
      setCreatedWorkspace(ws);

      // Si hay un archivo seleccionado, subirlo al workspace y esperar procesamiento
      if (selectedFile) {
        setIsUploading(true);
        setDocumentStatus("uploading");
        
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);
          const uploadedDoc = await uploadDocumentApi(ws.id, formData);
          console.log("Archivo subido correctamente, esperando procesamiento...");
          
          // Guardar ID del documento y cambiar a estado "processing"
          setUploadedDocumentId(uploadedDoc.id);
          setDocumentStatus("processing");
          setIsUploading(false);
          
          // NO navegamos aquí - esperamos la notificación WS de COMPLETED
          return;
          
        } catch (uploadError) {
          console.error("Error al subir archivo:", uploadError);
          setDocumentStatus("error");
          setIsUploading(false);
          alert("Workspace creado, pero hubo un error al subir el archivo. Puedes continuar sin el archivo.");
          // Aún así podemos navegar al workspace
        }
      }

      // Si no hay archivo, navegar directamente
      resetForm();
      onClose();
      onSuccess?.();

      if (ws.default_conversation_id) {
        router.push(`/p/${ws.id}/c/${ws.default_conversation_id}`);
      } else {
        router.push(`/p/${ws.id}`);
      }
    } catch (error: unknown) {
      console.error("Error al crear workspace:", error as Error);
      alert(`Error al crear workspace: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleClose = () => {
    // No permitir cerrar mientras se está procesando
    if (!createWorkspaceMutation.isPending && !isUploading && documentStatus !== "processing") {
      resetForm();
      onClose();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-brand-dark-secondary border-gray-700 text-gray-300 max-w-2xl rounded-[20_!important] pt-6">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Crear Nuevo Workspace</DialogTitle>
          <DialogDescription className="text-gray-400">
            Crea un nuevo espacio de trabajo para organizar tus documentos y conversaciones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 pb-4 pt-6">
            {/* Nombre del Workspace */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Workspace <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Proyecto Marketing Q4"
                className="bg-brand-dark border-gray-700 text-white focus-visible:ring-brand-red rounded-[8_!important]"
                disabled={createWorkspaceMutation.isPending || isUploading}
                required
              />
            </div>

            {/* Archivo para subir */}
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
                Subir Archivo (Opcional)
              </label>
              <div className="space-y-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.xlsx,.txt,.csv"
                  className="bg-brand-dark border-gray-700 text-white focus-visible:ring-brand-red rounded-[8_!important] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700"
                  disabled={createWorkspaceMutation.isPending || isUploading || documentStatus === "processing"}
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md border border-gray-700">
                    {documentStatus === "processing" ? (
                      <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />
                    ) : documentStatus === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Upload className="h-4 w-4 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <span className="text-sm text-gray-300">{selectedFile.name}</span>
                      {documentStatus === "processing" && (
                        <p className="text-xs text-yellow-400">Procesando documento...</p>
                      )}
                      {documentStatus === "completed" && (
                        <p className="text-xs text-green-400">¡Documento procesado!</p>
                      )}
                      {documentStatus === "error" && (
                        <p className="text-xs text-red-400">Error al procesar</p>
                      )}
                    </div>
                    {documentStatus === "idle" && (
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        disabled={createWorkspaceMutation.isPending || isUploading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                PDF, DOCX, XLSX, CSV, TXT soportados
              </p>
            </div>

            {/* Instrucciones para el LLM */}
            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-300 mb-2">
                Instrucciones para el LLM (Opcional)
              </label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ej: Responde siempre en español formal. Enfócate en análisis de marketing..."
                className="bg-brand-dark border-gray-700 text-white focus-visible:ring-brand-red min-h-[100px] resize-none rounded-[8_!important] "
                disabled={createWorkspaceMutation.isPending || isUploading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Estas instrucciones guiarán el comportamiento del asistente en este workspace.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-[8_!important] border-none"
              disabled={createWorkspaceMutation.isPending || isUploading || documentStatus === "processing"}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-red text-white hover:bg-red-700 rounded-[8_!important]"
              disabled={createWorkspaceMutation.isPending || isUploading || documentStatus === "processing" || !name.trim()}
            >
              {documentStatus === "processing" ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-pulse" />
                  Procesando documento...
                </>
              ) : createWorkspaceMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "Subiendo archivo..." : "Creando..."}
                </>
              ) : (
                "Crear Workspace"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
