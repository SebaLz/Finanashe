'use client';

import { useState } from 'react';
import { signUp } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Check, X } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Validación de contraseña en tiempo real
  const passwordValidation = {
    length: password.length >= 8,
    match: password === confirmPassword && confirmPassword !== '',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validar la fortaleza de la contraseña
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { user, session } = await signUp(email, password);
      
      if (user) {
        if (user.identities?.length === 0) {
          setError('Ya existe una cuenta con este correo electrónico');
        } else if (session) {
          // Si el usuario ya está confirmado y hay sesión, redirigir
          router.refresh();
          router.push('/');
        } else {
          // Si el usuario necesita confirmar su correo
          setSuccess(true);
        }
      }
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      setError(error.message || 'Error al registrar usuario');
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
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Revisa tu correo!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Hemos enviado un enlace de confirmación a <br />
              <strong className="text-blue-600">{email}</strong>
              <br /><br />
              Por favor, revisa tu bandeja de entrada y sigue las instrucciones para completar tu registro.
            </p>
            
            <Link 
              href="/login"
              className="
                inline-flex items-center space-x-2 
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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 opacity-50"></div>
        
        {/* Elementos decorativos */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        
        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Crear tu cuenta</h2>
            <p className="text-gray-600">Únete a FinanzApp y toma control de tus finanzas</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-pulse">
              <div className="flex">
                <div className="flex-shrink-0">
                  <X className="h-5 w-5 text-red-400" />
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
                    focus:border-purple-500 focus:ring-4 focus:ring-purple-100
                    transition-all duration-200 ease-in-out
                    text-gray-900 placeholder-gray-400
                    hover:border-purple-300 hover:shadow-sm
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
                    focus:border-purple-500 focus:ring-4 focus:ring-purple-100
                    transition-all duration-200 ease-in-out
                    text-gray-900 placeholder-gray-400
                    hover:border-purple-300 hover:shadow-sm
                  "
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-purple-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password validation */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center space-x-2 text-xs ${passwordValidation.length ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${passwordValidation.length ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span>Mínimo 8 caracteres</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="
                    w-full pl-12 pr-12 py-4 
                    bg-white border border-gray-300 rounded-xl
                    focus:border-purple-500 focus:ring-4 focus:ring-purple-100
                    transition-all duration-200 ease-in-out
                    text-gray-900 placeholder-gray-400
                    hover:border-purple-300 hover:shadow-sm
                  "
                  placeholder="Confirma tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-purple-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password match validation */}
              {confirmPassword && (
                <div className="mt-2">
                  <div className={`flex items-center space-x-2 text-xs ${passwordValidation.match ? 'text-green-600' : 'text-red-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${passwordValidation.match ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{passwordValidation.match ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !passwordValidation.length || !passwordValidation.match}
              className="
                w-full py-4 px-6 
                bg-gradient-to-r from-purple-500 to-blue-600 
                hover:from-purple-600 hover:to-blue-700
                disabled:from-gray-400 disabled:to-gray-500
                text-white font-semibold rounded-xl
                transform hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200 ease-in-out
                shadow-lg hover:shadow-xl
                flex items-center justify-center space-x-2
                focus:ring-4 focus:ring-purple-100
                disabled:cursor-not-allowed disabled:transform-none
              "
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <span>Crear Cuenta</span>
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
              <span className="px-4 bg-white text-gray-500 font-medium">o regístrate con</span>
            </div>
          </div>

          {/* Google Sign Up */}
          <GoogleSignInButton 
            redirectTo="/dashboard"
            text="Registrarse con Google"
          />

          {/* Second Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">¿Ya tienes cuenta?</span>
            </div>
          </div>

          {/* Login link */}
          <div className="text-center">
            <Link 
              href="/login"
              className="
                inline-flex items-center space-x-2 
                text-gray-700 hover:text-purple-600 
                font-medium transition-colors duration-200
                hover:underline
              "
            >
              <span>Iniciar sesión</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 