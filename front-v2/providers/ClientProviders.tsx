"use client";

import { ConfigProvider, App, theme } from "antd";
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
        algorithm: theme.darkAlgorithm,
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
      <div suppressHydrationWarning style={{ height: '100%' }}>
        <App style={{ height: '100%' }}>
          <ToastInitializer>
            {children}
          </ToastInitializer>
        </App>
      </div>
    </ConfigProvider>
  );
}

export default ClientProviders;
