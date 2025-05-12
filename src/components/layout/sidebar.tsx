"use client";

import { useState } from 'react';
import { SidebarNav } from './sidebar-nav';
import { PieChart, LineChart, Wallet, Target, DollarSign, Home, Receipt, Calendar, LogOut, User } from 'lucide-react';
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
    pathname === '/reset-password'
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

  // Definir los items de navegación según el estado de autenticación
  const navItems = !isLoading && user ? [
    {
      title: 'Inicio',
      href: '/',
      icon: <Home size={24} />
    },
    {
      title: 'Transacciones',
      href: '/transacciones',
      icon: <Wallet size={24} />
    },
    {
      title: 'Presupuesto',
      href: '/presupuesto',
      icon: <PieChart size={24} />
    },
    {
      title: 'Gastos Fijos',
      href: '/gastos-fijos',
      icon: <Receipt size={24} />
    },
    {
      title: 'Tareas Financieras',
      href: '/tareas-financieras',
      icon: <Calendar size={24} />
    },
    {
      title: 'Estadísticas',
      href: '/estadisticas',
      icon: <LineChart size={24} />
    },
    {
      title: 'Objetivos',
      href: '/objetivos',
      icon: <Target size={24} />
    },
    {
      title: 'Inversiones',
      href: '/inversiones',
      icon: <DollarSign size={24} />
    }
  ] : !isLoading ? [
    {
      title: 'Iniciar Sesión',
      href: '/login',
      icon: <User size={24} />
    },
    {
      title: 'Registrarse',
      href: '/registro',
      icon: <User size={24} />
    }
  ] : [];

  return (
    <>
      <div 
        className={`fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden ${
          open ? 'block' : 'hidden'
        }`} 
        onClick={onClose}
      />
      
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transition duration-300 transform bg-white lg:translate-x-0 lg:static lg:inset-0 dark:bg-gray-900 ${
          open ? 'translate-x-0 ease-out' : '-translate-x-full ease-in lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-500">
            FinanzApp
          </Link>
          <button 
            className="p-1 -mr-1 rounded-md lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <SidebarNav items={navItems} />
            
            {/* Perfil de usuario */}
            {user && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-800">
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                        {user.email}
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                      <Link href="/perfil" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Mi Perfil
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center">
                          <LogOut size={16} className="mr-2" />
                          Cerrar Sesión
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