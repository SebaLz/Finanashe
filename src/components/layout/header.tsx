"use client";

import { useState, useEffect } from 'react';
import { Bell, User, Menu, Home, DollarSign } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut } from '@/services/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // No mostrar header en páginas de autenticación y landing
  const hideHeader = ['/login', '/registro', '/reset-password', '/', '/landing'].includes(pathname);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error al obtener el usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/dashboard': 'Panel Principal',
      '/transacciones': 'Transacciones',
      '/presupuesto': 'Presupuesto',
      '/gastos-fijos': 'Gastos Fijos',
      '/tareas-financieras': 'Tareas Pendientes',
      '/estadisticas': 'Estadísticas',
      '/objetivos': 'Objetivos',
      '/inversiones': 'Inversiones',
      '/perfil': 'Mi Perfil'
    };
    return titles[pathname] || 'FinanzApp';
  };

  if (hideHeader) {
    return null;
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-16 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Lado izquierdo - Menú móvil y título */}
          <div className="flex items-center space-x-4">
            <button
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden transition-colors"
              onClick={onMenuClick}
              aria-label="Abrir menú de navegación"
            >
              <Menu size={20} />
            </button>

            {/* Título de página */}
            <div className="lg:hidden">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {getPageTitle()}
              </h1>
            </div>

            {/* Breadcrumb en desktop */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Lado derecho - Acciones del usuario */}
          <div className="flex items-center space-x-3">
            {/* Toggle de tema */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Notificaciones */}
            <button 
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors relative"
              aria-label="Ver notificaciones"
            >
              <Bell size={18} />
              {/* Indicador de notificaciones nuevas */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            </button>

            {/* Perfil de usuario */}
            <div className="relative">
              {loading ? (
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
              ) : !user ? (
                <button
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
                  onClick={() => router.push('/login')}
                >
                  Iniciar sesión
                </button>
              ) : (
                <>
                  <button
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-label="Menú de usuario"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                      {user.email ? user.email.charAt(0).toUpperCase() : <User size={16} />}
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 py-2 z-20">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.email?.split('@')[0] || 'Usuario'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </div>
                        </div>
                        
                        <Link
                          href="/perfil"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <User size={16} className="mr-3 text-gray-400" />
                          <div>
                            <div className="font-medium">Mi Perfil</div>
                            <div className="text-xs text-gray-500">Configurar cuenta</div>
                          </div>
                        </Link>

                        <hr className="border-gray-200 dark:border-gray-600 my-1" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <div>
                            <div className="font-medium">Cerrar Sesión</div>
                            <div className="text-xs text-red-500/70">Salir de la aplicación</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 