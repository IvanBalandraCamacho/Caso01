"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { checkAuthMe } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Rutas públicas que no requieren autenticación
      const publicRoutes = ['/login', '/register'];
      
      if (publicRoutes.includes(pathname)) {
        setIsAuthenticated(true);
        return;
      }

      // Verificar si hay token
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.log("No token found, redirecting to login");
        router.push('/login');
        return;
      }

      // Verificar si el token es válido con el backend
      try {
        await checkAuthMe();
        setIsAuthenticated(true);
      } catch (error) {
        // Token inválido o expirado
        console.log("Invalid token, redirecting to login");
        localStorage.removeItem('access_token');
        router.push('/login');
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Mostrar loading mientras verifica
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, mostrar el contenido
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Si no está autenticado, no mostrar nada (ya se redirigió)
  return null;
}
