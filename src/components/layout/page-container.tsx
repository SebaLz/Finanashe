"use client";

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PageContainer({ 
  children, 
  className = '',
  maxWidth = '2xl',
  padding = 'lg'
}: PageContainerProps) {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-7xl',
    'full': 'max-w-full'
  };

  const paddingClasses = {
    'sm': 'px-4 py-4',
    'md': 'px-6 py-6', 
    'lg': 'px-6 py-8 lg:px-8',
    'xl': 'px-8 py-10 lg:px-12'
  };

  return (
    <div className={`w-full ${paddingClasses[padding]} ${className}`}>
      <div className={`mx-auto ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  );
} 