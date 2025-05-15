import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configuración de clientes
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Cliente de Supabase con service role para el webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Función para limpiar el log de mensajes
function logMessage(message) {
  const { from, text, type } = message;
  console.log(`📱 Mensaje recibido:
    De: ${from}
    Tipo: ${type}
    Texto: ${text?.body || 'N/A'}
  `);
}

// Función para limpiar el log de estados
function logStatus(status) {
  const { status: messageStatus, timestamp, recipient_id } = status;
  console.log(`📨 Estado del mensaje:
    Para: ${recipient_id}
    Estado: ${messageStatus}
    Timestamp: ${new Date(timestamp * 1000).toLocaleString()}
  `);
}

// GET handler para verificación
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Webhook verificado correctamente');
      return NextResponse.json(parseInt(challenge));
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
}

// POST handler para mensajes
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Verificar si es un mensaje
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      logMessage(message);
      
      // Buscar usuario en la base de datos
      console.log('🔍 Buscando usuario con WhatsApp:', message.from);
      console.log('Valor recibido:', message.from, typeof message.from);
      
      // Normalizar el número de teléfono (eliminar caracteres no numéricos)
      const normalizedPhone = message.from;
      console.log('Número normalizado:', normalizedPhone);
      
      // Primero, veamos todos los usuarios y sus números
      console.log('Consultando tabla public.users...');
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, whatsapp, phone');
      
      console.log('Resultado de la consulta:', { data: allUsers, error: allUsersError });
      
      // Ahora intentamos la búsqueda específica
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .in('whatsapp', [normalizedPhone, `+${normalizedPhone}`]);

      console.log('Usuarios encontrados en la búsqueda específica:', users);
      if (error) {
        console.error('Error en la búsqueda:', error);
      }
      if (allUsersError) {
        console.error('Error obteniendo todos los usuarios:', allUsersError);
      }

      if (!users || users.length === 0) {
        console.log('❌ No se encontró ningún usuario con ese número de WhatsApp');
        await enviarMensajeWhatsApp(message.from, '¡Hola! Para usar este servicio, primero necesitas registrarte en nuestra web.');
        return NextResponse.json({ status: 'ok' });
      }

      console.log('✅ Usuario encontrado:', users[0].email);
      
      // Procesar el mensaje según el tipo
      if (message.type === 'text') {
        const resultado = await interpretarMensaje(message.text.body);
        if (resultado) {
          // Procesar la transacción
          console.log('✅ Mensaje interpretado:', resultado);
          
          // Buscar o crear la categoría
          let categoriaId = await buscarCategoriaIdPorNombre(resultado.categoría, users[0].id);
          if (!categoriaId) {
            categoriaId = await crearCategoriaSupabase(resultado.categoría, users[0].id);
          }

          // Guardar la transacción
          const transaccion = {
            user_id: users[0].id,
            tipo: resultado.tipo === 'gasto' ? 'expense' : resultado.tipo === 'ingreso' ? 'income' : resultado.tipo,
            monto: resultado.monto,
            categoria: categoriaId,
            fecha: resultado.fecha === 'hoy' ? new Date().toISOString() : resultado.fecha,
            descripcion: message.text.body
          };

          console.log('Intentando guardar transacción:', transaccion);
          const guardado = await guardarTransaccionSupabase(transaccion);
          
          if (guardado) {
            await enviarMensajeWhatsApp(message.from, '¡Transacción registrada correctamente!');
          } else {
            await enviarMensajeWhatsApp(message.from, 'Hubo un error al guardar la transacción. Por favor, intenta de nuevo.');
          }
        } else {
          await enviarMensajeWhatsApp(message.from, 'Lo siento, no pude entender tu mensaje. Por favor, intenta de nuevo.');
        }
      }

      return NextResponse.json({ status: 'ok' });
    }
    
    // Verificar si es un estado
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const status = body.entry[0].changes[0].value.statuses[0];
      logStatus(status);
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Error en el webhook:', error.message);
    // Siempre devolvemos 200 para evitar reintentos
    return NextResponse.json({ status: 'ok' });
  }
}

async function interpretarMensaje(texto) {
  const prompt = `
Sos un asistente financiero que recibe mensajes cortos de texto por WhatsApp para registrar transacciones personales.

Tu objetivo es interpretar el mensaje y devolver un JSON con esta estructura:
{
  "tipo": "...",         // Puede ser: gasto, ingreso, presupuesto, inversión o desconocido
  "fecha": "...",        // Fecha mencionada o "hoy" si no hay fecha
  "categoría": "...",    // Rubro del gasto/ingreso/inversión/presupuesto
  "monto": ...,          // Solo el número, sin signos ni símbolos
  "medio_pago": "..."    // Medio si está presente: efectivo, tarjeta, transferencia, etc. Si no, devolver vacío ""
}

Reglas:
- Si el monto empieza con "-" es gasto.
- Si empieza con "+" es ingreso.
- Si no tiene signo, inferí el tipo por palabras clave como: gasté, compré, invertí, ingreso, cobré, gané, presupuesto, ahorré, etc.
- Si no se puede determinar el tipo, devolver "desconocido".
- Fecha puede ser: hoy, ayer, 11-May-2025, mañana, etc.
- Categoría debe ser simple y representativa.
- Medio de pago es opcional. Si no se menciona, dejar vacío.
- Nunca devuelvas texto fuera del JSON. Solo el JSON.
- No incluyas notas, ni explicaciones, ni respuestas amigables.

Mensaje: "${texto}"
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages: [
      { role: 'system', content: 'Sos un asistente experto en finanzas personales.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 100,
    temperature: 0
  });

  try {
    const respuesta = completion.choices[0].message.content;
    return JSON.parse(respuesta);
  } catch (e) {
    console.error('Error interpretando la respuesta de OpenAI:', e);
    return null;
  }
}

async function enviarMensajeWhatsApp(numeroDestino, texto) {
  try {
    // Obtener el phone_number_id del webhook
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      throw new Error('PHONE_NUMBER_ID no está configurado');
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'text',
      text: { body: texto }
    };
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    };
    const response = await axios.post(url, data, { headers });
    console.log('✅ Mensaje enviado correctamente');
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando mensaje de WhatsApp:', error.response?.data || error.message);
    throw error;
  }
}

async function guardarTransaccionSupabase({ user_id, tipo, monto, categoria, fecha, descripcion }) {
  console.log('Guardando transacción con datos:', { user_id, tipo, monto, categoria, fecha, descripcion });
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id,
      type: tipo,
      amount: monto,
      category_id: categoria,
      date: fecha,
      description: descripcion
    }])
    .select();

  if (error) {
    console.error('Error detallado guardando en Supabase:', {
      error,
      datos_enviados: { user_id, tipo, monto, categoria, fecha, descripcion }
    });
    return false;
  }
  console.log('Transacción guardada exitosamente:', data);
  return true;
}

async function buscarCategoriaIdPorNombre(nombreCategoria, user_id) {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', nombreCategoria)
    .eq('user_id', user_id)
    .single();

  if (error) {
    console.error('Error buscando categoría:', error);
    return null;
  }
  return data?.id;
}

async function crearCategoriaSupabase(nombreCategoria, user_id) {
  const { data, error } = await supabase
    .from('categories')
    .insert([{
      name: nombreCategoria,
      user_id: user_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creando categoría:', error);
    return null;
  }
  return data?.id;
}

async function buscarUserIdPorNumero(numero) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', numero)
    .single();

  if (error) {
    console.error('Error buscando usuario:', error);
    return null;
  }
  return data?.id;
} 