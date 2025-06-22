'use client';

import { useState, useEffect } from 'react';
import { signInWithPassword } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Obtener el parámetro redirectTo de la URL
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  // Verificar si hay errores de OAuth en la URL
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      switch (oauthError) {
        case 'oauth_error':
          setError('Error al conectar con Google. Intenta nuevamente.');
          break;
        case 'no_session':
          setError('No se pudo completar el inicio de sesión con Google.');
          break;
        case 'callback_error':
          setError('Error en el proceso de autenticación. Intenta nuevamente.');
          break;
        default:
          setError('Ocurrió un error durante el inicio de sesión.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPassword(email, password);
      console.log(`✅ LOGIN EXITOSO - Session:`, result.session ? 'Exists' : 'Missing');
      console.log(`✅ LOGIN EXITOSO - User:`, result.user ? result.user.email : 'Missing');
      console.log(`✅ LOGIN EXITOSO - Redirigiendo a: ${redirectTo}`);
      
      // Pequeño delay para asegurar que las cookies se establezcan
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Usar window.location.href para forzar una navegación completa
      // que incluya las cookies de sesión actualizadas
      window.location.href = redirectTo;
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      setError(error.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card principal con gradiente y sombra moderna */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100">
        {/* Gradiente de fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-50"></div>
        
        {/* Elementos decorativos */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        
        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido de vuelta!</h2>
            <p className="text-gray-600">Inicia sesión para continuar con FinanzApp</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-pulse">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="
                    w-full pl-12 pr-4 py-4 
                    bg-white border border-gray-300 rounded-xl
                    focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                    transition-all duration-200 ease-in-out
                    text-gray-900 placeholder-gray-400
                    hover:border-blue-300 hover:shadow-sm
                  "
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="
                    w-full pl-12 pr-12 py-4 
                    bg-white border border-gray-300 rounded-xl
                    focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                    transition-all duration-200 ease-in-out
                    text-gray-900 placeholder-gray-400
                    hover:border-blue-300 hover:shadow-sm
                  "
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-blue-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link 
                href="/reset-password" 
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-4 px-6 
                bg-gradient-to-r from-blue-500 to-purple-600 
                hover:from-blue-600 hover:to-purple-700
                disabled:from-gray-400 disabled:to-gray-500
                text-white font-semibold rounded-xl
                transform hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200 ease-in-out
                shadow-lg hover:shadow-xl
                flex items-center justify-center space-x-2
                focus:ring-4 focus:ring-blue-100
              "
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">o continúa con</span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleSignInButton 
            redirectTo={redirectTo}
            text="Iniciar sesión con Google"
          />

          {/* Second Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">¿Nuevo en FinanzApp?</span>
            </div>
          </div>

          {/* Register link */}
          <div className="text-center">
            <Link 
              href="/registro"
              className="
                inline-flex items-center space-x-2 
                text-gray-700 hover:text-blue-600 
                font-medium transition-colors duration-200
                hover:underline
              "
            >
              <span>Crear una cuenta nueva</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 