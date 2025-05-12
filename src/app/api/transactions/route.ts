import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/admin-supabase';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    console.log('URL de la solicitud:', requestUrl.toString());
    console.log('Cookies presentes:', request.headers.get('cookie') ? 'Sí' : 'No');

    // Usar el cliente de Supabase con cookies para obtener la sesión
    const cookieStore = cookies();
    console.log('Cookies disponibles:', cookieStore.getAll().map(c => c.name));
    
    // Crear cliente con tipado correcto
    const supabaseAuth = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
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
      console.log('Cookies disponibles:', cookieStore.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`));
      
      const authCookie = cookieStore.get('sb-auth-token');
      if (!authCookie) {
        console.error('No se encontró cookie de autenticación');
      } else {
        console.log('Cookie de autenticación presente pero sesión no válida');
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