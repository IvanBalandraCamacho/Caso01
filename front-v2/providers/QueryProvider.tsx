'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Crear el QueryClient dentro del componente para evitar problemas con SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configuración por defecto para queries
            staleTime: 60 * 1000, // Los datos se consideran "frescos" por 1 minuto
            gcTime: 5 * 60 * 1000, // Los datos no usados se mantienen en cache por 5 minutos (antes cacheTime)
            retry: 1, // Reintentar una vez en caso de error
            refetchOnWindowFocus: false, // No refetch automático al cambiar de ventana
          },
          mutations: {
            // Configuración por defecto para mutaciones
            retry: 0, // No reintentar mutaciones automáticamente
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
