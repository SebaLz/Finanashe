import LoginForm from '@/components/Auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | FinanzApp',
  description: 'Inicia sesión en tu cuenta de FinanzApp para gestionar tus finanzas personales.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">FinanzApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona tus finanzas personales de manera inteligente
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
} 