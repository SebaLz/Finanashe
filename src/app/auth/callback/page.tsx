'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener la sesión después del OAuth
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error en callback de auth:', error);
          router.push('/login?error=oauth_error');
          return;
        }

        if (session) {
          console.log('✅ OAUTH LOGIN EXITOSO:', session.user.email);
          
          // Obtener redirectTo de la URL
          const redirectTo = searchParams.get('redirectTo') || '/dashboard';
          
          // Pequeño delay para asegurar que las cookies se establezcan
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Redirigir al destino final
          window.location.href = redirectTo;
        } else {
          console.log('❌ No hay sesión después del OAuth');
          router.push('/login?error=no_session');
        }
      } catch (error) {
        console.error('Error procesando callback:', error);
        router.push('/login?error=callback_error');
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-2xl font-bold text-white">F</span>
        </div>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-700">
            Completando inicio de sesión...
          </span>
        </div>
        <p className="text-gray-500">
          Te redirigiremos en un momento
        </p>
      </div>
    </div>
  );
} 