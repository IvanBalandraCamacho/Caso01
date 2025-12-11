"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkAuthMe } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

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
        // Token inválido o expirado - intentar con mock para desarrollo
        const mockToken = token?.startsWith('mock_token_');
        if (mockToken) {
          // Permitir tokens mock en desarrollo
          setIsAuthenticated(true);
          return;
        }
        
        console.log("Invalid token, redirecting to login");
        localStorage.removeItem('access_token');
        router.push('/login');
      }
    };

    checkAuth();
  }, [pathname, router, isMounted]);

  // No renderizar nada hasta que el componente esté montado (solo cliente)
  if (!isMounted || isAuthenticated === null) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div 
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #1f2937',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: '#9ca3af', margin: 0 }}>Verificando autenticación...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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

export default AuthGuard;
