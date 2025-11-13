"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = `toast-${toastId++}`;
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex gap-3 items-start p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-right pointer-events-auto ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200"
              : toast.type === "error"
              ? "bg-red-50 border border-red-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div>
            {toast.type === "success" && (
              <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
            )}
          </div>
          <p
            className={`text-sm font-medium ${
              toast.type === "success"
                ? "text-green-800"
                : toast.type === "error"
                ? "text-red-800"
                : "text-blue-800"
            }`}
          >
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
