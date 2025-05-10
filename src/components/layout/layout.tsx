"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  BarChart2, 
  DollarSign, 
  PieChart, 
  Target, 
  TrendingUp,
  Calendar,
  Receipt,
  LogOut
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { href: '/transacciones', label: 'Transacciones', icon: <DollarSign size={20} /> },
    { href: '/presupuesto', label: 'Presupuesto', icon: <PieChart size={20} /> },
    { href: '/gastos-fijos', label: 'Gastos Fijos', icon: <Receipt size={20} /> },
    { href: '/tareas-financieras', label: 'Tareas Financieras', icon: <Calendar size={20} /> },
    { href: '/objetivos', label: 'Objetivos', icon: <Target size={20} /> },
    { href: '/inversiones', label: 'Inversiones', icon: <TrendingUp size={20} /> },
    { href: '/estadisticas', label: 'Estadísticas', icon: <BarChart2 size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold">FinanzApp</h1>
        </div>
        <nav className="px-3 py-2">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    pathname === item.href 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute bottom-4 left-3 right-3">
          <Link 
            href="/auth/logout" 
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted w-full"
          >
            <LogOut size={20} />
            <span>Cerrar sesión</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default Layout; 