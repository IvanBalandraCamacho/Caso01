"use client";

import { useEffect } from "react";
import { useInitializeToast } from "./Toast";

/**
 * Component that initializes the Toast message API from App context
 * Must be placed inside an App component from Ant Design
 */
export function ToastInitializer({ children }: { children: React.ReactNode }) {
  useInitializeToast();
  
  return <>{children}</>;
}

export default ToastInitializer;
