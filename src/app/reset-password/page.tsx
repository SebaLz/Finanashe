import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | FinanzApp',
  description: 'Restablece tu contraseña de FinanzApp.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-bounce"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-rose-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-bounce"></div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 lg:px-8">
        {/* Header con branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl mb-6 shadow-2xl">
            <span className="text-3xl font-bold text-white">F</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">FinanzApp</h1>
          <p className="text-lg text-gray-600">
            Restablece tu contraseña
          </p>
        </div>
        
        <ResetPasswordForm />
      </div>
    </div>
  );
} 