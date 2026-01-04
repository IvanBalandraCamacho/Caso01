import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AntdStyleRegistry } from "@/lib/AntdRegistry"
import { ClientProviders } from "@/providers/ClientProviders"
import QueryProvider from "@/providers/QueryProvider"
import { WorkspaceProvider } from "@/context/WorkspaceContext"
import { AuthGuard } from "@/components/AuthGuard"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { CopilotProvider } from "@/providers/CopilotProvider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TIVIT Chat",
  description: "Chat con IA powered by Almaviva Group",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <AntdStyleRegistry>
          <ClientProviders>
            <CopilotProvider>
              <QueryProvider>
                <WorkspaceProvider>
                  <ErrorBoundary>
                    <AuthGuard>
                      {children}
                    </AuthGuard>
                  </ErrorBoundary>
                </WorkspaceProvider>
              </QueryProvider>
            </CopilotProvider>
          </ClientProviders>
        </AntdStyleRegistry>
        <Analytics />
      </body>
    </html>
  )
}
