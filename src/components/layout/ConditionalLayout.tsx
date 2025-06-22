'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Rutas que NO deben usar el AppShell (sidebar)
  const publicRoutes = [
    '/',
    '/landing', 
    '/login',
    '/registro',
    '/auth',
    '/reset-password'
  ];
  
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Si es una ruta pública, renderizar solo los children sin AppShell
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // Si es una ruta privada, usar AppShell
  return (
    <AppShell>
      {children}
    </AppShell>
  );
} 