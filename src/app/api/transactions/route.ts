import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/admin-supabase';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    console.log('URL de la solicitud:', requestUrl.toString());
    console.log('Cookies presentes:', request.headers.get('cookie') ? 'Sí' : 'No');

    // MIGRACIÓN: Patrón moderno de manejo de cookies con @supabase/ssr
    // Solo usar getAll() y setAll() como recomienda la nueva versión
    const cookieStore = await cookies();
    console.log('Cookies disponibles:', cookieStore.getAll().map((c: any) => c.name));
    
    // MIGRACIÓN: Reemplazado createRouteHandlerClient con createServerClient
    // El nuevo patrón requiere configurar cookies.getAll y cookies.setAll
    const supabaseAuth = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Las cookies setAll pueden fallar en algunos contextos de API routes
              // Esto es esperado y no rompe la funcionalidad
              console.warn('No se pudieron establecer todas las cookies:', error);
            }
          },
        },
      }
    );
    
    console.log('Verificando sesión de usuario...');
    const { data: sessionData, error: sessionError } = await supabaseAuth.auth.getSession();
    
    if (sessionError) {
      console.error('Error al obtener la sesión:', sessionError);
      return NextResponse.json(
        { error: `Error de autenticación: ${sessionError.message}` },
        { status: 401 }
      );
    }
    
    if (!sessionData.session) {
      console.error('No se encontró sesión de usuario');
      console.log('Cookies disponibles:', cookieStore.getAll().map((c: any) => `${c.name}=${c.value.substring(0, 10)}...`));
      
      // MIGRACIÓN: Mantenido el logging pero adaptado para el nuevo cliente
      // Las cookies de autenticación pueden tener nombres diferentes con @supabase/ssr
      const authCookies = cookieStore.getAll().filter((c: any) => 
        c.name.includes('supabase') || c.name.includes('sb-')
      );
      if (authCookies.length === 0) {
        console.error('No se encontraron cookies de autenticación de Supabase');
      } else {
        console.log('Cookies de autenticación presentes pero sesión no válida:', 
          authCookies.map((c: any) => c.name));
      }
      
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }
    
    const userId = sessionData.session.user.id;
    console.log('Usuario autenticado:', userId);
    
    const requestData = await request.json();
    console.log('Datos recibidos para crear transacción:', requestData);
    
    // Validar datos
    if (!requestData.type || !requestData.amount || !requestData.category_id || !requestData.date) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    try {
      // Usar la función RPC
      console.log('Intentando crear transacción con RPC desde API route...');
      const { data, error } = await supabaseAdmin.rpc('create_transaction', {
        p_user_id: userId,
        p_type: requestData.type,
        p_amount: requestData.amount,
        p_category_id: requestData.category_id,
        p_date: requestData.date,
        p_description: requestData.description || null,
        p_is_budgetable: requestData.is_budgetable || false
      });
      
      if (error) {
        console.error('Error al crear transacción con RPC:', error);
        throw error;
      }
      
      console.log('Transacción creada exitosamente con RPC:', data);
      return NextResponse.json(data);
    } catch (rpcError: any) {
      console.error('Error con RPC desde API route:', rpcError);
      
      // Si falla RPC, intentar insert directo
      try {
        // Crear objeto de transacción
        const transactionData = {
          id: uuidv4(),
          user_id: userId,
          type: requestData.type,
          amount: requestData.amount,
          category_id: requestData.category_id,
          date: requestData.date,  // La tabla ya debería ser de tipo date
          description: requestData.description || null,
          created_at: new Date().toISOString(),
          is_budgetable: requestData.is_budgetable || false
        };
        
        console.log('Creando transacción con insert directo desde API route:', transactionData);
        
        // Usar el cliente admin para insert
        const { data, error } = await supabaseAdmin
          .from('transactions')
          .insert(transactionData)
          .select('*')
          .single();
        
        if (error) {
          console.error('Error al crear transacción:', error);
          return NextResponse.json(
            { error: `Error al crear transacción: ${error.message}` },
            { status: 500 }
          );
        }
        
        console.log('Transacción creada exitosamente:', data);
        return NextResponse.json(data);
      } catch (insertError: any) {
        console.error('Error con insert directo desde API route:', insertError);
        return NextResponse.json(
          { error: `Error al crear transacción: ${insertError.message}` },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error('Error en API route transactions:', error);
    return NextResponse.json(
      { error: `Error interno del servidor: ${error.message}` },
      { status: 500 }
    );
  }
} 