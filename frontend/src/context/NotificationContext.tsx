"use client";
import React from "react";
import { useWorkspaces } from "./WorkspaceContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { notifications } = useWorkspaces();

  React.useEffect(() => {
    if (notifications.length > 0) {
      const lastNotification = notifications[notifications.length - 1];
      switch (lastNotification.type) {
        case "success":
          toast.success(lastNotification.message);
          break;
        case "error":
          toast.error(lastNotification.message);
          break;
        case "info":
          toast.info(lastNotification.message);
          break;
      }
    }
  }, [notifications]);

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
