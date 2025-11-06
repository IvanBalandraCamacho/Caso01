import type { Metadata } from "next";
import "./globals.css"; // La importación de CSS en el layout raíz es correcta

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
      <body>{children}</body>
    </html>
  );
}