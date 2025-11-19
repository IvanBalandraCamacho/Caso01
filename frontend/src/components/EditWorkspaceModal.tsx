"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Importar Textarea
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaces, Workspace, Document } from "@/context/WorkspaceContext";
import { FileText, Trash2, Plus, Loader2, FileSpreadsheet, Presentation, File, FileType } from "lucide-react";
import { UploadModal } from "./UploadModal"; // Reusamos el modal de subida
import { useDeleteDocument, useUpdateWorkspace } from "@/hooks/useApi";

// Helper para obtener el icono según el tipo de archivo
const getFileIcon = (fileName: string, fileType: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const type = fileType?.toLowerCase() || '';
  
  // Priorizar la extensión del nombre del archivo
  if (ext === 'pdf' || type.includes('pdf')) {
    return <FileType className="h-5 w-5 text-red-500 shrink-0" />;
  } else if (ext === 'docx' || ext === 'doc' || type.includes('word') || type === 'docx' || type === 'doc') {
    return <FileText className="h-5 w-5 text-blue-500 shrink-0" />;
  } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || type.includes('excel') || type === 'xlsx' || type === 'xls' || type === 'csv') {
    return <FileSpreadsheet className="h-5 w-5 text-green-500 shrink-0" />;
  } else if (ext === 'pptx' || ext === 'ppt' || type.includes('powerpoint') || type === 'pptx' || type === 'ppt') {
    return <Presentation className="h-5 w-5 text-orange-500 shrink-0" />;
  } else if (ext === 'txt' || type.includes('text') || type === 'txt') {
    return <File className="h-5 w-5 text-gray-400 shrink-0" />;
  }
  
  return <FileText className="h-5 w-5 text-gray-400 shrink-0" />;
};

// Helper para limpiar el nombre del archivo (quitar extensión)
const getCleanFileName = (fileName: string) => {
  return fileName.replace(/\.[^/.]+$/, '');
};

// Helper para obtener la extensión del archivo
const getFileExtension = (fileName: string, fileType: string) => {
  // Primero intentar obtener del nombre del archivo
  const match = fileName.match(/\.([^/.]+)$/);
  if (match) {
    return match[1].toUpperCase();
  }
  
  // Si no, mapear desde el tipo MIME
  const type = fileType?.toLowerCase() || '';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('docx')) return 'DOCX';
  if (type.includes('excel') || type.includes('xlsx')) return 'XLSX';
  if (type.includes('powerpoint') || type.includes('pptx')) return 'PPTX';
  if (type.includes('csv')) return 'CSV';
  if (type.includes('text') || type.includes('txt')) return 'TXT';
  
  return 'FILE';
};

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
}

export function EditWorkspaceModal({ isOpen, onClose, workspace }: EditWorkspaceModalProps) {
  // Estado para los campos del formulario
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [instructions, setInstructions] = useState(""); // Se cargará desde la API
  
  // Estado para la lista de documentos
  const { documents, fetchDocuments, isLoadingDocs } = useWorkspaces();
  const [isUploading, setIsUploading] = useState(false); // Para el modal de subida

  // Estado para la lógica de guardado
  const [isSaving, setIsSaving] = useState(false);
  
  // Hooks de mutación
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteDocumentMutation = useDeleteDocument();

  // Cargar datos del workspace (incluyendo 'instructions') y sus documentos
  useEffect(() => {
    if (isOpen) {
      // 1. Cargar detalles del workspace (para 'instructions')
      const fetchWorkspaceDetails = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspace.id}`);
          if (response.ok) {
            const data: Workspace & { instructions?: string } = await response.json();
            setName(data.name);
            setDescription(data.description || "");
            setInstructions(data.instructions || ""); // Cargar instrucciones
          }
        } catch (error) {
          console.error("Error al cargar detalles del workspace", error);
        }
      };
      
      fetchWorkspaceDetails();
      // 2. Cargar la lista de documentos
      fetchDocuments(workspace.id);
    }
  }, [isOpen, workspace.id, fetchDocuments]);

  // Lógica para guardar los cambios del workspace
  const handleUpdate = async () => {
    setIsSaving(true);
    
    try {
      await updateWorkspaceMutation.mutateAsync({
        id: workspace.id,
        updates: { name, description, instructions }
      });
      onClose(); // Cerrar al guardar
    } catch (error: any) {
      console.error("Error al actualizar workspace:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Error desconocido";
      alert(`Error al actualizar el workspace: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Lógica para eliminar un documento
  const handleDeleteDocument = async (docId: string, fileName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) return;
    
    try {
      await deleteDocumentMutation.mutateAsync({ 
        documentId: docId, 
        workspaceId: workspace.id 
      });
      // Refrescar la lista de documentos
      fetchDocuments(workspace.id);
    } catch (error: any) {
      console.error("Error al eliminar documento:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Error desconocido";
      alert(`Error al eliminar el documento: ${errorMessage}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-brand-dark-secondary border-gray-700 text-brand-light max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Propiedades</DialogTitle>
          </DialogHeader>
          
          {/* Contenido del formulario */}
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="nombre">
                Nombre
              </label>
              <Input
                id="nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="descripcion">
                Descripción
              </label>
              <Input
                id="descripcion"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Instrucciones (System Prompt) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="instrucciones">
                Instrucciones (System Prompt)
              </label>
              <Textarea
                id="instrucciones"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                rows={6}
                placeholder="Ej: Eres un asistente experto en finanzas. Responde de forma concisa..."
              />
            </div>
            
            {/* Conocimientos (Lista de Documentos) */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Conocimientos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isLoadingDocs && <Loader2 className="animate-spin" />}
                
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-gray-800 p-3 rounded-lg flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {getFileIcon(doc.file_name, doc.file_type)}
                      <div className="flex-grow overflow-hidden">
                        <p className="text-sm text-white truncate font-medium">{getCleanFileName(doc.file_name)}</p>
                        <p className="text-xs text-gray-400 uppercase">{getFileExtension(doc.file_name, doc.file_type)}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-400 shrink-0"
                      onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                      disabled={deleteDocumentMutation.isPending}
                    >
                      {deleteDocumentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
                
                {/* Botón para añadir más */}
                <button 
                  className="bg-gray-700 p-3 rounded-lg flex items-center justify-center gap-2 text-gray-300 hover:bg-gray-600 transition-colors"
                  onClick={() => setIsUploading(true)} // Abre el otro modal
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Añadir archivo</span>
                </button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button 
              className="bg-brand-red text-white hover:bg-red-700" 
              onClick={handleUpdate}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reutilizamos el UploadModal. 
        Este modal usará automáticamente el 'activeWorkspace' del contexto.
      */}
      <UploadModal 
        isOpen={isUploading} 
        onClose={() => {
          setIsUploading(false);
        }} 
        onSuccess={() => {
          fetchDocuments(workspace.id); // Refrescar la lista de documentos
        }}
      />
    </>
  );
}