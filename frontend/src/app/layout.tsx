import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css"; // La importación de CSS en el layout raíz es correcta
import QueryProvider from "@/providers/QueryProvider";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Velvet Chat",
  description: "Velvet AI Chat Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Aplicamos la fuente (importada en globals.css) y el modo 'dark'
    <html lang="en" className="dark" style={{ fontFamily: 'Roboto, sans-serif' }}>
      <body>
        <QueryProvider>
          <WorkspaceProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </WorkspaceProvider>
        </QueryProvider>
        {/* Polyfill para Speech Recognition en navegadores que lo necesiten */}
        <Script
          src="https://unpkg.com/regenerator-runtime@0.13.11/runtime.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}