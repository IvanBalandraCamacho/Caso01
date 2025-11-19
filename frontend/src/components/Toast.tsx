"use client";

type ToastType = "success" | "error" | "info";

export function showToast(message: string, type: ToastType = "info") {
  // Implementación simple con console por ahora
  // En producción se usaría una librería como react-hot-toast o sonner
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Mostrar alerta nativa como fallback temporal
  if (type === "error") {
    alert(`Error: ${message}`);
  }
}
