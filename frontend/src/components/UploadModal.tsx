"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { FileText, UploadCloud, X, Loader2, CheckCircle, AlertTriangle } from "lucide-react"; // <-- AÑADIDO: AlertTriangle
import { cn } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type FileUploadStatus = "pending" | "uploading" | "success" | "error";

interface UploadableFile {
  file: File;
  status: FileUploadStatus;
  errorMessage?: string; // <-- AÑADIDO: Para mostrar errores
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { activeWorkspace } = useWorkspaces();
  const [files, setFiles] = useState<UploadableFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: "pending" as FileUploadStatus,
    }));
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
  });

  const removeFile = (fileName: string) => {
    setFiles(files.filter((f) => f.file.name !== fileName));
  };

  const handleUpload = async () => {
    if (!activeWorkspace) return;

    // Crear un array de promesas para subir todos los archivos en paralelo
    const uploadPromises = files
      .filter(f => f.status === 'pending') // Solo subir los pendientes
      .map(async (uploadableFile) => {
        // 1. Marcar como "uploading"
        setFiles(prev => prev.map(f => 
          f.file.name === uploadableFile.file.name ? { ...f, status: 'uploading' } : f
        ));

        const formData = new FormData();
        formData.append("file", uploadableFile.file);

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
          const token = localStorage.getItem("access_token");
          const response = await fetch(
            `${apiUrl}/api/v1/workspaces/${activeWorkspace.id}/upload`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          if (!response.ok) {
            // --- CORRECCIÓN CRÍTICA ---
            // Capturar el error del backend si no fue 2xx
            const errorData = await response.json();
            throw new Error(errorData.detail || "Error al subir el archivo");
            // --------------------------
          }
          
          // 2. Marcar como "success"
          setFiles(prev => prev.map(f => 
            f.file.name === uploadableFile.file.name ? { ...f, status: 'success' } : f
          ));

          // 3. Notificar éxito para refrescar lista
          if (onSuccess) {
            onSuccess();
          }

        } catch (error: any) {
          console.error("Error en la subida:", error);
          // 3. Marcar como "error" y guardar el mensaje
          setFiles(prev => prev.map(f => 
            f.file.name === uploadableFile.file.name 
              ? { ...f, status: 'error', errorMessage: error.message } 
              : f
          ));
        }
      });
    
    // Esperar a que todas las subidas terminen
    await Promise.all(uploadPromises);
  };

  // --- CORRECCIÓN: Lógica del botón "Subir Más" ---
  const handleReset = () => {
    setFiles([]); // Limpiar la lista de archivos
  };
  // ---------------------------------------------

  const handleClose = () => {
    setFiles([]); // Limpiar archivos al cerrar
    onClose();
  };

  const allDone = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-brand-dark-secondary border-gray-700 text-brand-light">
        <DialogHeader>
          <DialogTitle>Subir Documentos</DialogTitle>
          <DialogDescription>
            Añadir archivos al workspace:{" "}
            <span className="font-semibold text-brand-red">{activeWorkspace?.name}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer transition-colors",
            isDragActive ? "border-brand-red bg-brand-red/10" : "hover:border-gray-500"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          {isDragActive ? (
            <p className="mt-2">Suelta los archivos aquí...</p>
          ) : (
            <p className="mt-2">Arrastra y suelta archivos aquí, o haz clic para seleccionar</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Soporta: PDF, DOCX, XLSX, CSV, TXT</p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-2">
            <h3 className="text-sm font-medium">Archivos Seleccionados:</h3>
            {files.map(({ file, status, errorMessage }) => (
              <div key={file.name} className="flex items-center justify-between bg-gray-700/50 p-2 rounded">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-300" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-500 uppercase">{file.type || file.name.split('.').pop()}</span>
                    </div>
                  </div>
                  {/* --- AÑADIDO: Mostrar mensaje de error --- */}
                  {status === 'error' && (
                    <div className="flex items-center gap-1 mt-1 pl-1">
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      <span className="text-xs text-red-400">{errorMessage || "Error desconocido"}</span>
                    </div>
                  )}
                </div>
                {/* -------------------------------------- */}

                {status === 'pending' && (
                  <Button variant="ghost" size="icon" onClick={() => removeFile(file.name)} className="h-6 w-6">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {status === 'uploading' && <Loader2 className="h-5 w-5 text-brand-red animate-spin" />}
                {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {status === 'error' && <X className="h-5 w-5 text-red-500" />}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={handleClose}>
            {allDone ? "Cerrar" : "Cancelar"}
          </Button>

          {/* --- CORRECCIÓN: Lógica de botones --- */}
          {allDone ? (
            <Button 
              className="bg-brand-red text-white hover:bg-red-700" 
              onClick={handleReset} // <-- Usar handleReset
            >
              Subir Más
            </Button>
          ) : (
            <Button 
              className="bg-brand-red text-white hover:bg-red-700" 
              onClick={handleUpload} // <-- Usar handleUpload
              disabled={files.some(f => f.status === 'uploading') || files.filter(f => f.status === 'pending').length === 0}
            >
              Subir {files.filter(f => f.status === 'pending').length} Archivo(s)
            </Button>
          )}
          {/* ------------------------------------- */}

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}