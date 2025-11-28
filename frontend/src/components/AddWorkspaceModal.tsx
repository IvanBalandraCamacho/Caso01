"use client";
import { useState } from "react";
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
import { Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadDocumentApi } from "@/lib/api";

interface AddWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddWorkspaceModal({ isOpen, onClose, onSuccess }: AddWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const createWorkspaceMutation = useCreateWorkspace();

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

      console.log(workspace);

      // Si hay un archivo seleccionado, subirlo al workspace
      if (selectedFile) {
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);
          await uploadDocumentApi((workspace as WorkspacePublic).id, formData);
          console.log("Archivo subido correctamente");
        } catch (uploadError) {
          console.error("Error al subir archivo:", uploadError);
          alert("Workspace creado, pero hubo un error al subir el archivo");
        } finally {
          setIsUploading(false);
        }
      }

      // Limpiar formulario
      setName("");
      setInstructions("");
      setSelectedFile(null);

      // Cerrar modal y notificar éxito
      onClose();
      onSuccess?.();

      // Redireccionar a la conversación creada por defecto si existe, si no al workspace
      const ws = workspace as WorkspacePublic;
      if (ws.default_conversation_id) {
        router.push(`/p/${ws.id}/c/${ws.default_conversation_id}`);
      } else {
        router.push(`/p/${workspace.id}`);
      }
    } catch (error: unknown) {
      console.error("Error al crear workspace:", error as Error);
      alert(`Error al crear workspace: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleClose = () => {
    if (!createWorkspaceMutation.isPending && !isUploading) {
      setName("");
      setInstructions("");
      setSelectedFile(null);
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
                  disabled={createWorkspaceMutation.isPending || isUploading}
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md border border-gray-700">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300 flex-1">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      disabled={createWorkspaceMutation.isPending || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </button>
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
              disabled={createWorkspaceMutation.isPending || isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-red text-white hover:bg-red-700 rounded-[8_!important]"
              disabled={createWorkspaceMutation.isPending || isUploading || !name.trim()}
            >
              {createWorkspaceMutation.isPending || isUploading ? (
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
