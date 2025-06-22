"use client";

import { useState } from 'react';
import { SidebarNav } from './sidebar-nav';
import { 
  BarChart3, 
  TrendingUp, 
  Wallet, 
  Target, 
  DollarSign, 
  Home, 
  Receipt, 
  Calendar, 
  LogOut, 
  User,
  PieChart,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, loading: isLoading, signOut: userSignOut } = useUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();

  // No mostrar el sidebar en las páginas de autenticación
  if (
    pathname === '/login' ||
    pathname === '/registro' ||
    pathname === '/reset-password' ||
    pathname === '/' ||
    pathname === '/landing'
  ) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await userSignOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Items principales ordenados por importancia/frecuencia de uso
  const mainNavItems = !isLoading && user ? [
    {
      title: 'Panel Principal',
      href: '/dashboard',
      icon: <Home size={18} />,
      description: 'Resumen general'
    },
    {
      title: 'Transacciones',
      href: '/transacciones',
      icon: <Wallet size={18} />,
      description: 'Ingresos y gastos'
    },
    {
      title: 'Presupuesto',
      href: '/presupuesto',
      icon: <PieChart size={18} />,
      description: 'Planificación mensual'
    },
    {
      title: 'Gastos Fijos',
      href: '/gastos-fijos',
      icon: <Receipt size={18} />,
      description: 'Gastos recurrentes'
    }
  ] : [];

  // Items secundarios para usuarios avanzados
  const secondaryNavItems = !isLoading && user ? [
    {
      title: 'Tareas Pendientes',
      href: '/tareas-financieras',
      icon: <Calendar size={18} />,
      description: 'Recordatorios'
    },
    {
      title: 'Estadísticas',
      href: '/estadisticas',
      icon: <BarChart3 size={18} />,
      description: 'Análisis de datos'
    },
    {
      title: 'Objetivos',
      href: '/objetivos',
      icon: <Target size={18} />,
      description: 'Metas de ahorro'
    },
    {
      title: 'Inversiones',
      href: '/inversiones',
      icon: <TrendingUp size={18} />,
      description: 'Inversiones y ganancias'
    }
  ] : [];

  return (
    <>
      {/* Overlay para móvil */}
      <div 
        className={`fixed inset-0 z-40 transition-opacity bg-black/50 lg:hidden ${
          open ? 'block' : 'hidden'
        }`} 
        onClick={onClose}
      />
      
      {/* Sidebar fija */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen transition-transform duration-300 bg-white lg:translate-x-0 lg:static lg:inset-0 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header del Sidebar */}
        <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <DollarSign size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              FinanzApp
            </span>
          </Link>
          <button 
            className="p-1.5 rounded-lg lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Navegación principal */}
            <div className="flex-1 py-4 overflow-y-auto min-h-0">
              {user && (
                <>
                  <div className="px-4 mb-3">
                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Principal
                    </h2>
                  </div>
                  <SidebarNav items={mainNavItems} />
                  
                  <div className="px-4 mt-6 mb-3">
                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Herramientas
                    </h2>
                  </div>
                  <SidebarNav items={secondaryNavItems} />
                </>
              )}
            </div>
            
            {/* Perfil de usuario - Fijo en la parte inferior */}
            {user && (
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 group"
                    aria-label="Menú de usuario"
                  >
                    <div className="flex items-center min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-xs font-semibold">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {user.email?.split('@')[0] || 'Usuario'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Mi cuenta
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-1">
                      <svg
                        className={`w-3 h-3 transform transition-transform text-gray-400 group-hover:text-gray-600 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-30">
                      <Link 
                        href="/perfil" 
                        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User size={14} className="mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">Mi Perfil</div>
                          <div className="text-xs text-gray-500">Configurar cuenta</div>
                        </div>
                      </Link>
                      <hr className="border-gray-200 dark:border-gray-600 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut size={14} className="mr-2" />
                        <div>
                          <div className="font-medium">Cerrar Sesión</div>
                          <div className="text-xs text-red-500/70">Salir de la app</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
} 