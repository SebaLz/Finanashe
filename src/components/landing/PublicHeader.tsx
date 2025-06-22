'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleRegisterAction = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/registro');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              FinanzApp
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="#features" 
              className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Funciones
            </a>
            <a 
              href="#pricing" 
              className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Precios
            </a>
            <a 
              href="#" 
              className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Ayuda
            </a>
          </nav>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoading && (
              <>
                <button 
                  onClick={handleAuthAction}
                  className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
                >
                  {isAuthenticated ? 'Ir al Dashboard' : 'Iniciar Sesión'}
                </button>
                <Button 
                  onClick={handleRegisterAction}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {isAuthenticated ? 'Dashboard' : 'Registrarse Gratis'}
                </Button>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-6 space-y-4">
            <a 
              href="#features" 
              className="block text-gray-600 hover:text-blue-600 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Funciones
            </a>
            <a 
              href="#pricing" 
              className="block text-gray-600 hover:text-blue-600 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Precios
            </a>
            <a 
              href="#" 
              className="block text-gray-600 hover:text-blue-600 transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Ayuda
            </a>
            
            <div className="pt-4 border-t border-gray-100 space-y-3">
              {!isLoading && (
                <>
                  <button 
                    onClick={() => {
                      handleAuthAction();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-center py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
                  >
                    {isAuthenticated ? 'Ir al Dashboard' : 'Iniciar Sesión'}
                  </button>
                  <Button 
                    onClick={() => {
                      handleRegisterAction();
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    {isAuthenticated ? 'Dashboard' : 'Registrarse Gratis'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 