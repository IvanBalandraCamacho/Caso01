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
import { FileText, UploadCloud, X, Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocumentApi } from "@/lib/api";
import { useNotificationsWS, NotificationMessage } from "@/hooks/useNotificationsWS";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Extended status to include document processing states
type FileUploadStatus = "pending" | "uploading" | "processing" | "success" | "error";

interface UploadableFile {
  file: File;
  status: FileUploadStatus;
  documentId?: string; // Track the document ID returned from API
  errorMessage?: string;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { activeWorkspace } = useWorkspaces();
  const [files, setFiles] = useState<UploadableFile[]>([]);

  // Handle WebSocket notifications for document processing status
  const handleWSNotification = useCallback((msg: NotificationMessage) => {
    console.log("📩 UploadModal recibió notificación:", msg);
    
    if (msg.document_id && (msg.status === "COMPLETED" || msg.status === "ERROR")) {
      setFiles(prev => prev.map(f => {
        if (f.documentId === msg.document_id) {
          if (msg.status === "COMPLETED") {
            return { ...f, status: "success" };
          } else if (msg.status === "ERROR") {
            return { ...f, status: "error", errorMessage: msg.error || "Error al procesar documento" };
          }
        }
        return f;
      }));

      // Notify success to refresh document list when completed
      if (msg.status === "COMPLETED" && onSuccess) {
        onSuccess();
      }
    }
  }, [onSuccess]);

  // Connect to WebSocket when there are files being processed
  const hasProcessingFiles = files.some(f => f.status === "processing" || f.status === "uploading");
  
  useNotificationsWS({
    workspaceId: activeWorkspace?.id,
    onMessage: handleWSNotification,
    enabled: isOpen && hasProcessingFiles,
  });

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
          const response = await uploadDocumentApi(activeWorkspace.id, formData);
          
          // 2. Marcar como "processing" y guardar el document_id
          // El documento se subió pero aún se está procesando/indexando
          setFiles(prev => prev.map(f => 
            f.file.name === uploadableFile.file.name 
              ? { ...f, status: 'processing', documentId: response.id } 
              : f
          ));

          // NO llamamos onSuccess aquí - esperamos la notificación WS de COMPLETED

        } catch (error) {
          console.error("Error en la subida:", error);
          const errorMessage = error instanceof Error ? error.message : "Error al subir el archivo";
          // 3. Marcar como "error" y guardar el mensaje
          setFiles(prev => prev.map(f => 
            f.file.name === uploadableFile.file.name 
              ? { ...f, status: 'error', errorMessage } 
              : f
          ));
        }
      });
    
    // Esperar a que todas las subidas terminen (pero no el procesamiento)
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

  // Check if all files are done (success or error) - NOT processing
  const allDone = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');
  
  // Check if any file is still being processed or uploaded
  const isProcessingOrUploading = files.some(f => f.status === 'uploading' || f.status === 'processing');
  
  // Check if there are pending files to upload
  const hasPendingFiles = files.some(f => f.status === 'pending');

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
            "border-2 border-dashed border-gray-600 rounded-lg p-12 text-center transition-colors",
            isDragActive ? "border-brand-red bg-brand-red/10" : "hover:border-gray-500",
            isProcessingOrUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          <input {...getInputProps()} disabled={isProcessingOrUploading} />
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          {isProcessingOrUploading ? (
            <p className="mt-2 text-yellow-400">Espera a que termine el procesamiento...</p>
          ) : isDragActive ? (
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
                  {/* Mostrar estado de procesamiento */}
                  {status === 'processing' && (
                    <div className="flex items-center gap-1 mt-1 pl-1">
                      <Clock className="h-3 w-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Procesando documento...</span>
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
                {status === 'processing' && <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />}
                {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {status === 'error' && <X className="h-5 w-5 text-red-500" />}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button 
            variant="ghost" 
            onClick={handleClose}
            disabled={isProcessingOrUploading} // No permitir cerrar mientras procesa
          >
            {allDone ? "Cerrar" : "Cancelar"}
          </Button>

          {/* --- Lógica de botones: bloquear hasta que termine el procesamiento --- */}
          {allDone ? (
            <Button 
              className="bg-brand-red text-white hover:bg-red-700" 
              onClick={handleReset}
            >
              Subir Más
            </Button>
          ) : isProcessingOrUploading ? (
            <Button 
              className="bg-brand-red text-white" 
              disabled={true}
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </Button>
          ) : (
            <Button 
              className="bg-brand-red text-white hover:bg-red-700" 
              onClick={handleUpload}
              disabled={!hasPendingFiles}
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