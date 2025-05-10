"use client";

import { SidebarNav } from './sidebar-nav';
import { PieChart, LineChart, Wallet, Target, DollarSign, Home, Receipt, Calendar } from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navItems = [
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
  ];

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
        
        <SidebarNav items={navItems} />
      </div>
    </>
  );
} 