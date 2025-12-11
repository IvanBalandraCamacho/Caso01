"use client";

import { ConfigProvider, App } from "antd";
import { ToastInitializer } from "@/components/ToastInitializer";

interface ClientProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper that includes:
 * - Ant Design ConfigProvider with dark theme
 * - Ant Design App component for message/modal/notification context
 * - ToastInitializer to set up the global toast API
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgBase: "#000000",
          colorTextBase: "#FFFFFF",
          colorBorder: "#2A2A2D",
          colorBgContainer: "#1A1A1A",
          colorPrimaryText: "#FFFFFF",
        },
        components: {
          Modal: {
            contentBg: "#1A1A1A",
            headerBg: "#1A1A1A",
            footerBg: "#1A1A1A",
          },
        },
      }}
    >
      <App>
        <ToastInitializer>
          {children}
        </ToastInitializer>
      </App>
    </ConfigProvider>
  );
}

export default ClientProviders;
