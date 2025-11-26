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
import { Loader2 } from "lucide-react";

interface AddWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddWorkspaceModal({ isOpen, onClose, onSuccess }: AddWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  const createWorkspaceMutation = useCreateWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("El nombre del workspace es requerido");
      return;
    }

    try {
      await createWorkspaceMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
      });

      // Limpiar formulario
      setName("");
      setDescription("");
      setInstructions("");

      // Cerrar modal y notificar éxito
      onClose();
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error al crear workspace:", error as Error);
      alert(`Error al crear workspace: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleClose = () => {
    if (!createWorkspaceMutation.isPending) {
      setName("");
      setDescription("");
      setInstructions("");
      onClose();
    }
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
                disabled={createWorkspaceMutation.isPending}
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Descripción (Opcional)
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del workspace..."
                className="bg-brand-dark border-gray-700 text-white focus-visible:ring-brand-red min-h-[80px] resize-none rounded-[8_!important]"
                disabled={createWorkspaceMutation.isPending}
              />
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
                disabled={createWorkspaceMutation.isPending}
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
              disabled={createWorkspaceMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-red text-white hover:bg-red-700 rounded-[8_!important]"
              disabled={createWorkspaceMutation.isPending || !name.trim()}
            >
              {createWorkspaceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
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
