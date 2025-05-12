import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | FinanzApp',
  description: 'Restablece tu contraseña de FinanzApp.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">FinanzApp</h1>
          <p className="mt-2 text-sm text-gray-600">
            Restablece tu contraseña
          </p>
        </div>
        
        <ResetPasswordForm />
      </div>
    </div>
  );
} 