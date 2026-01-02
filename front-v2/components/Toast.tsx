"use client";

import { App } from "antd";
import type { MessageInstance } from "antd/es/message/interface";

type ToastType = "success" | "error" | "info" | "welcome" | "warning";

// Global message instance holder
let messageApi: MessageInstance | null = null;

/**
 * Set the message API instance from the App context
 * This should be called once in a component that has access to App.useApp()
 */
export function setMessageApi(api: MessageInstance) {
  messageApi = api;
}

/**
 * Hook to initialize the message API from App context
 * Use this in your root layout or a high-level component
 */
export function useInitializeToast() {
  const { message } = App.useApp();

  // Set the message API on mount
  if (messageApi !== message) {
    messageApi = message;
  }

  return message;
}

/**
 * Show a toast notification using Ant Design's message API
 * This is a wrapper to provide a consistent API across the application
 */
export function showToast(content: string, type: ToastType = "info") {
  if (!messageApi) {
    console.warn("Toast: messageApi not initialized. Make sure useInitializeToast is called.");
    return;
  }

  const duration = type === "welcome" ? 4 : 3;

  switch (type) {
    case "success":
      messageApi.success(content, duration);
      break;
    case "error":
      messageApi.error(content, duration);
      break;
    case "warning":
      messageApi.warning(content, duration);
      break;
    case "welcome":
      messageApi.success({
        content: `👋 ${content}`,
        duration,
        style: {
          marginTop: '20px',
        },
      });
      break;
    case "info":
    default:
      messageApi.info(content, duration);
      break;
  }
}

/**
 * Toast component - exports the showToast function for use across the app
 * Note: In Ant Design, we use the message API directly, so no component is needed
 * The App wrapper in layout.tsx provides the necessary context
 */
export const Toast = {
  success: (content: string) => showToast(content, "success"),
  error: (content: string) => showToast(content, "error"),
  info: (content: string) => showToast(content, "info"),
  warning: (content: string) => showToast(content, "warning"),
  welcome: (content: string) => showToast(content, "welcome"),
};

export const showSuccessToast = (content: string) => showToast(content, "success");
export const showErrorToast = (content: string) => showToast(content, "error");
export const showInfoToast = (content: string) => showToast(content, "info");
export const showWarningToast = (content: string) => showToast(content, "warning");

export default Toast;
