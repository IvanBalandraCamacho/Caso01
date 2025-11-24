"use client";

type ToastType = "success" | "error" | "info" | "welcome";

let toastContainer: HTMLDivElement | null = null;

export function showToast(message: string, type: ToastType = "info") {
  // Crear contenedor si no existe
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  // Crear toast
  const toast = document.createElement("div");
  toast.style.cssText = `
    background: ${getBackgroundColor(type)};
    color: white;
    padding: ${type === "welcome" ? "20px 24px" : "16px 20px"};
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-size: ${type === "welcome" ? "18px" : "14px"};
    font-weight: ${type === "welcome" ? "600" : "500"};
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  // Agregar icono según el tipo
  const icon = document.createElement("span");
  icon.textContent = getIcon(type);
  icon.style.fontSize = type === "welcome" ? "24px" : "20px";
  toast.appendChild(icon);

  // Agregar mensaje
  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);

  // Agregar animación CSS
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  toastContainer.appendChild(toast);

  // Remover después de un tiempo (más tiempo para welcome)
  const duration = type === "welcome" ? 4000 : 3000;
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

function getBackgroundColor(type: ToastType): string {
  switch (type) {
    case "success":
      return "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    case "error":
      return "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
    case "welcome":
      return "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";
    case "info":
    default:
      return "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
  }
}

function getIcon(type: ToastType): string {
  switch (type) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    case "welcome":
      return "👋";
    case "info":
    default:
      return "ℹ";
  }
}
