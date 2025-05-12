import { createClient } from '@supabase/supabase-js';

// Usar variables de entorno para las credenciales de service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente Supabase con permisos administrativos (solo usar en el servidor)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// NOTA: Este cliente solo debe usarse en operaciones del lado del servidor
// que requieran permisos administrativos, nunca en el cliente. 