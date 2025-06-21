'use client';

import { useState } from 'react';
import { resetPassword } from '@/lib/supabase';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, Check, ArrowLeft } from 'lucide-react';

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: any) {
      console.error('Error al enviar email de recuperación:', error);
      setError(error.message || 'Error al enviar el email de recuperación');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100">
          {/* Gradiente de fondo decorativo */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50 opacity-50"></div>
          
          {/* Elementos decorativos */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
          
          <div className="relative z-10 p-8 text-center">
            {/* Success icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
              <Check className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Email enviado!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Hemos enviado un enlace de recuperación a <br />
              <strong className="text-blue-600">{email}</strong>
              <br /><br />
              Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </p>
            
            <div className="space-y-3">
              <Link 
                href="/login"
                className="
                  inline-flex items-center space-x-2 w-full justify-center
                  bg-gradient-to-r from-blue-500 to-purple-600 
                  hover:from-blue-600 hover:to-purple-700
                  text-white font-semibold py-3 px-6 rounded-xl
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200 ease-in-out
                  shadow-lg hover:shadow-xl
                "
              >
                <span>Ir a Iniciar Sesión</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              
              <button
                onClick={() => setSuccess(false)}
                className="
                  inline-flex items-center space-x-2 w-full justify-center
                  text-gray-600 hover:text-gray-800 
                  font-medium py-2 px-4
                  transition-colors duration-200
                "
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Enviar otro email</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card principal con gradiente y sombra moderna */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100">
        {/* Gradiente de fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-red-50 opacity-50"></div>
        
        {/* Elementos decorativos */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        
        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h2>
            <p className="text-gray-600">No te preocupes, te ayudamos a recuperar el acceso a tu cuenta</p>
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
                    focus:border-orange-500 focus:ring-4 focus:ring-orange-100
                    transition-all duration-200 ease-in-out
                    text-gray-900 placeholder-gray-400
                    hover:border-orange-300 hover:shadow-sm
                  "
                  placeholder="Ingresa tu email registrado"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-4 px-6 
                bg-gradient-to-r from-orange-500 to-red-600 
                hover:from-orange-600 hover:to-red-700
                disabled:from-gray-400 disabled:to-gray-500
                text-white font-semibold rounded-xl
                transform hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200 ease-in-out
                shadow-lg hover:shadow-xl
                flex items-center justify-center space-x-2
                focus:ring-4 focus:ring-orange-100
              "
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enviando email...</span>
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  <span>Enviar enlace de recuperación</span>
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
              <span className="px-4 bg-white text-gray-500 font-medium">¿Recordaste tu contraseña?</span>
            </div>
          </div>

          {/* Back to login */}
          <div className="text-center space-y-4">
            <Link 
              href="/login"
              className="
                inline-flex items-center space-x-2 
                text-gray-700 hover:text-orange-600 
                font-medium transition-colors duration-200
                hover:underline
              "
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a iniciar sesión</span>
            </Link>
            
            <div className="text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-orange-600 hover:text-orange-700 font-medium hover:underline">
                Crear una cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 