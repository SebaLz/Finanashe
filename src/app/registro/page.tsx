import SignUpForm from '@/components/Auth/SignUpForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro | FinanzApp',
  description: 'Crea una cuenta en FinanzApp para empezar a gestionar tus finanzas personales.',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-bounce"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-bounce"></div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 lg:px-8">
        {/* Header con branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-600 rounded-3xl mb-6 shadow-2xl">
            <span className="text-3xl font-bold text-white">F</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">FinanzApp</h1>
          <p className="text-lg text-gray-600">
            Crea tu cuenta para gestionar tus finanzas personales
          </p>
        </div>
        
        <SignUpForm />
      </div>
    </div>
  );
} 