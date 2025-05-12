import SignUpForm from '@/components/Auth/SignUpForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro | FinanzApp',
  description: 'Crea una cuenta en FinanzApp para empezar a gestionar tus finanzas personales.',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">FinanzApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Crea tu cuenta para gestionar tus finanzas personales
          </p>
        </div>
        
        <SignUpForm />
      </div>
    </div>
  );
} 