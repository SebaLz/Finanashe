import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configuración de clientes
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET handler para verificación
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
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
    console.log('Webhook body:', JSON.stringify(body, null, 2)); // Agregamos log para debug

    if (!body || !body.entry || !Array.isArray(body.entry)) {
      console.log('Invalid webhook body structure');
      return NextResponse.json({ status: 'ok' });
    }

    const entry = body.entry[0];
    if (!entry || !entry.changes || !Array.isArray(entry.changes)) {
      console.log('Invalid entry structure');
      return NextResponse.json({ status: 'ok' });
    }

    const changes = entry.changes[0];
    if (!changes || !changes.value) {
      console.log('Invalid changes structure');
      return NextResponse.json({ status: 'ok' });
    }

    const value = changes.value;
    const message = value.messages?.[0];
    const contact = value.contacts?.[0];

    if (message && message.text) {
      const userNumber = message.from;
      const userWaID = contact?.wa_id || userNumber;
      const userName = contact?.profile?.name || 'Desconocido';
      const textid = message.id;
      const text = message.text.body;
      
      console.log('Mensaje recibido de:', userNumber);
      console.log('WhatsApp ID del usuario:', userWaID);
      console.log('Nombre del usuario:', userName);
      console.log('ID del mensaje:', textid);
      console.log('Texto:', text);

      const userId = await buscarUserIdPorNumero(userNumber);
      if (!userId) {
        await enviarMensajeWhatsApp(userNumber, 'No estás registrado en la web. Registrate primero.');
        return NextResponse.json({ status: 'ok' });
      }

      const resultado = await interpretarMensaje(text);
      console.log('Interpretación IA:', resultado);

      if (resultado && resultado.tipo && resultado.monto && resultado.categoria) {
        let categoriaId = await buscarCategoriaIdPorNombre(resultado.categoria, userId);
        if (!categoriaId) {
          categoriaId = await crearCategoriaSupabase(resultado.categoria, userId);
          if (categoriaId) {
            await enviarMensajeWhatsApp(userNumber, `La categoría "${resultado.categoria}" no existía, pero la creé automáticamente para vos.`);
          } else {
            await enviarMensajeWhatsApp(userNumber, `No pude crear la categoría "${resultado.categoria}".`);
            return NextResponse.json({ status: 'ok' });
          }
        }

        const exito = await guardarTransaccionSupabase({
          user_id: userId,
          tipo: resultado.tipo,
          monto: resultado.monto,
          categoria: categoriaId,
          fecha: new Date().toISOString().slice(0, 10),
          descripcion: text
        });

        if (exito) {
          await enviarMensajeWhatsApp(userNumber, '¡Transacción guardada correctamente en tu web!');
        } else {
          await enviarMensajeWhatsApp(userNumber, 'Ocurrió un error al guardar la transacción.');
        }
      } else {
        await enviarMensajeWhatsApp(userNumber, 'No pude entender tu mensaje. Por favor, intentá de nuevo.');
      }
    } else {
      console.log('No se recibió un mensaje de texto válido.');
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function interpretarMensaje(texto) {
  const prompt = `
Eres un asistente que interpreta mensajes de WhatsApp sobre finanzas personales. 
Tu tarea es extraer el tipo de operación ("expense" o "income"), el monto (solo el número, sin símbolos ni palabras), y la categoría (una sola palabra, en minúsculas) del siguiente mensaje.

Devuelve SOLO un JSON válido con las claves: tipo, monto, categoria. 
No agregues texto extra, solo el JSON.

Ejemplo 1:
Mensaje: "gaste 50mil en supermercado"
Respuesta: {"tipo":"expense","monto":50000,"categoria":"supermercado"}

Ejemplo 2:
Mensaje: "me pagaron 120000 de sueldo"
Respuesta: {"tipo":"income","monto":120000,"categoria":"sueldo"}

Ejemplo 3:
Mensaje: "compré pan por 300"
Respuesta: {"tipo":"expense","monto":300,"categoria":"pan"}

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
    const url = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`;
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
    console.log('Mensaje enviado:', response.data);
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error.response?.data || error.message);
  }
}

async function guardarTransaccionSupabase({ user_id, tipo, monto, categoria, fecha, descripcion }) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id,
      type: tipo,
      amount: monto,
      category_id: categoria,
      date: fecha,
      description: descripcion
    }]);
  if (error) {
    console.error('Error guardando en Supabase:', error);
    return false;
  }
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