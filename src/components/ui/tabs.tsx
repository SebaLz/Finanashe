"use client";

import { ReactNode } from 'react';

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  onClick?: () => void;
}

interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function Tabs({ 
  children, 
  defaultValue, 
  value, 
  onValueChange, 
  className = '' 
}: TabsProps) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`inline-flex items-center justify-center rounded-md bg-muted p-1 ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ 
  children, 
  value, 
  className = '',
  onClick
}: TabsTriggerProps) {
  // Idealmente deberíamos acceder al contexto de Tabs aquí para determinar si está activo
  // Para simplificar, usaremos onClick para manejar el estado externamente
  
  return (
    <button
      role="tab"
      data-value={value}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TabsContent({ 
  children, 
  value, 
  className = '' 
}: TabsContentProps) {
  // Idealmente deberíamos acceder al contexto de Tabs aquí para determinar si está activo
  
  return (
    <div
      role="tabpanel"
      data-value={value}
      className={`mt-2 ${className}`}
    >
      {children}
    </div>
  );
} 