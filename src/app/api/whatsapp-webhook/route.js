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

// Función para capitalizar la primera letra
function capitalizarPrimeraLetra(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Función para formatear la fecha
function formatearFecha(fecha) {
  if (!fecha) {
    const hoy = new Date();
    return `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
  }
  
  if (fecha.toLowerCase() === 'hoy') {
    const hoy = new Date();
    return `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
  }

  // Si la fecha ya viene en formato YYYY-MM-DD
  if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  // Si la fecha viene en otro formato, intentamos parsearla
  const fechaObj = new Date(fecha);
  if (!isNaN(fechaObj.getTime())) {
    return `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getFullYear()}`;
  }

  // Si no podemos parsear la fecha, retornamos la fecha actual
  const hoy = new Date();
  return `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
}

// Clase para manejar el contexto de la conversación
class ConversationContext {
  constructor() {
    this.sessions = new Map();
  }

  getSession(whatsappId) {
    if (!this.sessions.has(whatsappId)) {
      this.sessions.set(whatsappId, {
        lastTransaction: null,
        lastInteraction: Date.now(),
        pendingConfirmation: false,
        messageId: null
      });
    }
    return this.sessions.get(whatsappId);
  }

  updateSession(whatsappId, data) {
    const session = this.getSession(whatsappId);
    Object.assign(session, data);
    session.lastInteraction = Date.now();
    return session;
  }

  setPendingTransaction(whatsappId, transactionData, messageId) {
    const session = this.getSession(whatsappId);
    session.lastTransaction = transactionData;
    session.pendingConfirmation = true;
    session.messageId = messageId;
    session.lastInteraction = Date.now();
    return session;
  }

  getPendingTransaction(whatsappId) {
    const session = this.getSession(whatsappId);
    if (session.pendingConfirmation && session.lastTransaction) {
      return {
        data: session.lastTransaction,
        messageId: session.messageId,
        timestamp: session.lastInteraction
      };
    }
    return null;
  }

  clearPendingTransaction(whatsappId) {
    const session = this.getSession(whatsappId);
    session.pendingConfirmation = false;
    session.lastTransaction = null;
    session.messageId = null;
  }

  clearSession(whatsappId) {
    this.sessions.delete(whatsappId);
  }

  // Limpiar sesiones expiradas (más de 10 minutos)
  cleanExpiredSessions() {
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10 minutos
    
    for (const [whatsappId, session] of this.sessions.entries()) {
      if (now - session.lastInteraction > expireTime) {
        this.sessions.delete(whatsappId);
      }
    }
  }
}

const conversationContext = new ConversationContext();

// Función para analizar la intención del mensaje
function analizarIntencion(texto) {
  return {
    esCorreccion: /^(eran?|en realidad|perdón|corrección|quise decir)/i.test(texto),
    tieneMonto: /(\d+(?:[.,]\d+)?(?:\s*mil|\s*k)?|\b(?:mil|un millón)\b)/i.test(texto),
    tieneCategoria: /(inversiones|alimentación|transporte|servicios)/i.test(texto),
    tipoTransaccion: /(gasto|ingreso|reembolso|transferencia)/i.test(texto)
  };
}

// Función para procesar el mensaje
async function procesarMensaje(message, body) {
  const whatsappId = message.from;
  const contactName = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || 'Usuario';
  
  // Limpiar sesiones expiradas
  conversationContext.cleanExpiredSessions();
  
  // Analizar la intención del mensaje
  const intencion = analizarIntencion(message.text.body);
  
  // Verificar si hay una transacción pendiente
  const pendingTransaction = conversationContext.getPendingTransaction(whatsappId);

  // Si es una corrección y hay una transacción pendiente
  if (intencion.esCorreccion && pendingTransaction) {
    console.log('🔄 Procesando corrección para transacción pendiente');
    
    const resultado = await interpretarMensaje(message.text.body, pendingTransaction.data);
    
    if (resultado) {
      // Validar que los cambios sean lógicos
      if (!intencion.tieneMonto) resultado.monto = pendingTransaction.data.monto;
      if (!intencion.tieneCategoria) resultado.categoría = pendingTransaction.data.categoría;
      if (!intencion.tipoTransaccion) resultado.tipo = pendingTransaction.data.tipo;
      
      // Actualizar la transacción pendiente
      conversationContext.setPendingTransaction(whatsappId, resultado, message.text.body);

      // Enviar mensaje de confirmación
      const mensajeConfirmacion = generarMensajeConfirmacion(contactName, resultado);
      await enviarMensajeWhatsAppConBotones(whatsappId, mensajeConfirmacion);
    } else {
      await enviarMensajeWhatsApp(
        whatsappId,
        'Lo siento, no pude entender los cambios. Por favor, especifica claramente qué quieres modificar.'
      );
    }
  } else {
    // Procesar nuevo mensaje
    console.log('📝 Procesando nuevo mensaje de transacción');
    
    const resultado = await interpretarMensaje(message.text.body, null);
    if (resultado) {
      // Guardar la transacción pendiente en el contexto
      conversationContext.setPendingTransaction(whatsappId, resultado, message.text.body);

      // Enviar mensaje de confirmación
      const mensajeConfirmacion = generarMensajeConfirmacion(contactName, resultado);
      await enviarMensajeWhatsAppConBotones(whatsappId, mensajeConfirmacion);
    } else {
      await enviarMensajeWhatsApp(
        whatsappId,
        'Lo siento, no pude entender bien tu mensaje. Por favor, sé más específico.\n\n💡 *Ejemplos:*\n• "Gasto $500 en alimentación"\n• "Ingreso 2000 trabajo hoy"'
      );
    }
  }
}

// Función para generar el mensaje de confirmación
function generarMensajeConfirmacion(contactName, resultado) {
  let mensajeConfirmacion = `¡Hola ${contactName}! 📋 Confirma esta operación:\n\n`;
  
  // Emoji según el tipo de transacción
  const emoji = resultado.tipo.toLowerCase() === 'ingreso' ? '💰' : '💸';
  
  mensajeConfirmacion += `${emoji} **${capitalizarPrimeraLetra(resultado.tipo)}**\n`;
  mensajeConfirmacion += `🏷️ Categoría: ${capitalizarPrimeraLetra(resultado.categoría)}\n`;
  mensajeConfirmacion += `💵 Importe: $${resultado.monto.toLocaleString('es-AR')}\n`;
  mensajeConfirmacion += `📅 Fecha: ${formatearFecha(resultado.fecha)}\n`;
  
  if (resultado.medio_pago) {
    mensajeConfirmacion += `💳 Medio: ${capitalizarPrimeraLetra(resultado.medio_pago)}\n`;
  }
  
  mensajeConfirmacion += `\n¿Confirmas esta transacción? ✅\n`;
  mensajeConfirmacion += `\n💡 *Si algo no está bien, presiona NO y te ayudo a corregirlo*`;
  
  return mensajeConfirmacion;
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
    console.log('🔔 Webhook recibido:', JSON.stringify(body, null, 2));
    
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      console.log('📱 Mensaje recibido:', {
        from: message.from,
        type: message.type,
        text: message.text?.body,
        interactive: message.interactive,
        button: message.button
      });
      
      logMessage(message);
      
      // Buscar usuario
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .in('whatsapp', [message.from, `+${message.from}`]);

      if (!users || users.length === 0) {
        console.log('❌ Usuario no registrado:', message.from);
        await enviarMensajeWhatsApp(message.from, '¡Hola! 👋 Para usar este servicio, primero necesitas registrarte en nuestra web: https://tu-dominio.com');
        return NextResponse.json({ status: 'ok' });
      }

      console.log('✅ Usuario encontrado:', users[0].email);

      // Procesar según el tipo de mensaje
      if (message.type === 'text') {
        console.log('📝 Procesando mensaje de texto');
        await procesarMensaje(message, body);
      } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
        console.log('🔘 Procesando respuesta de botón interactivo:', message.interactive.button_reply);
        await procesarRespuestaBoton(message, users[0]);
      } else if (message.type === 'button') {
        console.log('🔘 Procesando respuesta de botón legacy:', message.button);
        await procesarRespuestaBoton(message, users[0]);
      } else {
        console.log('❓ Tipo de mensaje no soportado:', message.type);
      }
    }
    
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Error crítico en el webhook:', {
      message: error.message,
      stack: error.stack,
      body: await request.text().catch(() => 'No se pudo leer el body')
    });
    return NextResponse.json({ status: 'ok' });
  }
}

async function interpretarMensaje(texto, previousData = null) {
  // Primero analizar si el mensaje es una corrección
  const esCorrección = texto.toLowerCase().includes('eran') || 
                      texto.toLowerCase().includes('era') ||
                      texto.toLowerCase().includes('en realidad') ||
                      texto.toLowerCase().includes('corrección') ||
                      texto.toLowerCase().includes('perdón');

  const prompt = `
Eres un asistente financiero experto que procesa mensajes de WhatsApp sobre transacciones personales.

OBJETIVO:
${esCorrección ? 'Interpretar una corrección sobre la transacción anterior, manteniendo todos los datos que no se modifican explícitamente.' 
: 'Interpretar el mensaje y devolver un JSON estructurado con la información de la transacción.'}

${previousData ? `
DATOS ANTERIORES:
${JSON.stringify(previousData, null, 2)}

IMPORTANTE: Si el usuario solo está corrigiendo un valor específico (como el monto o la categoría), 
DEBES MANTENER TODOS LOS DEMÁS VALORES DE LOS DATOS ANTERIORES.
` : ''}

ESTRUCTURA DEL JSON:
{
  "tipo": "gasto" | "ingreso" | "reembolso" | "transferencia",  // Tipo de transacción
  "fecha": "DD/MM/YYYY",                                        // Fecha en formato DD/MM/YYYY
  "categoría": string,                                          // Categoría del movimiento
  "monto": number,                                              // Monto como número positivo
  "medio_pago": string,                                         // Método de pago (opcional)
  "confianza": number,                                          // Nivel de confianza (0-1)
  "etiquetas": string[]                                         // Tags relevantes (opcional)
}

REGLAS DE INTERPRETACIÓN:

1. Tipo de Transacción:
   - "gasto": compras, pagos, débitos (palabras: gasté, compré, pagué, debité)
   - "ingreso": cobros, ventas, créditos (palabras: cobré, vendí, recibí, ingresé, gané)
   - "reembolso": devoluciones (palabras: me devolvieron, reembolso)
   - "transferencia": movimientos entre cuentas (palabras: transferí, moví)
   ${previousData?.tipo ? `\n   - Si no se especifica explícitamente un cambio, MANTENER: "${previousData.tipo}"` : ''}

2. Fecha:
   - Si no se especifica, usar fecha actual
   - Formatos aceptados: "hoy", "ayer", "mañana", "DD/MM", "DD-MM", "DD/MM/YYYY"
   - Palabras como "este lunes", "el viernes", etc.
   ${previousData?.fecha ? `\n   - Si no se especifica explícitamente un cambio, MANTENER: "${previousData.fecha}"` : ''}

3. Monto:
   - Extraer números incluso si están escritos con palabras (mil = 1000)
   - Interpretar "15mil" o "15k" como 15000
   - Si dice "eran X" o "era X", interpretar X como el nuevo monto
   - Ignorar el símbolo de moneda ($, USD, €)
   - Interpretar números con puntos o comas como separadores de miles
   - Siempre devolver el monto como número entero en pesos argentinos
   ${previousData?.monto ? `\n   - Si no se especifica explícitamente un cambio, MANTENER: ${previousData.monto}` : ''}

4. Categoría:
   Categorías comunes:
   - Alimentación: comida, restaurantes, supermercado, verdulería
   - Transporte: taxi, uber, combustible, estacionamiento, peaje
   - Servicios: luz, agua, gas, internet, teléfono, streaming
   - Salud: médico, farmacia, análisis, tratamientos
   - Educación: cursos, libros, materiales
   - Entretenimiento: cine, teatro, eventos, juegos
   - Hogar: alquiler, mantenimiento, muebles, electrodomésticos
   - Ropa: vestimenta, calzado, accesorios
   - Inversiones: acciones, bonos, criptomonedas, plazo fijo
   - Otros: cuando no encaja en ninguna categoría específica
   ${previousData?.categoría ? `\n   - Si no se especifica explícitamente un cambio, MANTENER: "${previousData.categoría}"` : ''}

5. Medio de Pago:
   - efectivo: cash, en mano, papel
   - tarjeta_debito: débito, banco
   - tarjeta_credito: crédito, visa, mastercard
   - transferencia: banco, mercadopago, uala
   - cripto: bitcoin, eth, usdt
   ${previousData?.medio_pago ? `\n   - Si no se especifica explícitamente un cambio, MANTENER: "${previousData.medio_pago}"` : ''}

6. Nivel de Confianza:
   - 1.0: Información completa y clara
   - 0.8: Falta información menor pero hay buena confianza
   - 0.5: Interpretación parcial o con ambigüedades
   - 0.3: Alta incertidumbre
   - 0.0: No se pudo interpretar

7. Etiquetas:
   - Palabras clave relevantes encontradas
   - Información adicional útil
   - Array vacío si no hay etiquetas relevantes

IMPORTANTE:
- No incluir texto fuera del JSON
- No incluir explicaciones ni mensajes adicionales
- El JSON debe ser válido y seguir exactamente la estructura especificada
- Usar UTF-8 para caracteres especiales
- Si es una corrección, MANTENER TODOS LOS VALORES ANTERIORES excepto los que se están corrigiendo explícitamente
- Para montos, interpretar números escritos en palabras (mil, diez mil, etc.)
- Si el mensaje menciona "eran X" o similar, es una corrección del monto
- Si el mensaje solo menciona un monto, mantener tipo y categoría anteriores

Mensaje a procesar: "${texto}"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    messages: [
      { 
        role: 'system', 
        content: 'Eres un experto en procesamiento de lenguaje natural especializado en finanzas personales. Tu objetivo es extraer información estructurada de mensajes de texto, manteniendo el contexto de la conversación.' 
      },
      { 
        role: 'user', 
        content: prompt 
      }
    ],
    max_tokens: 150,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  try {
    const respuesta = completion.choices[0].message.content;
    const resultado = JSON.parse(respuesta);

    // Si es una corrección y tenemos datos anteriores, asegurarnos de mantener el contexto
    if (esCorrección && previousData) {
      resultado.tipo = resultado.tipo || previousData.tipo;
      resultado.categoría = resultado.categoría || previousData.categoría;
      resultado.fecha = resultado.fecha || previousData.fecha;
      resultado.medio_pago = resultado.medio_pago || previousData.medio_pago;
    }

    // Validación básica del resultado
    if (!resultado.tipo || !resultado.monto || resultado.monto <= 0) {
      console.warn('Respuesta inválida de OpenAI:', resultado);
      return null;
    }

    // Si la confianza es muy baja, mejor no procesar
    if (resultado.confianza < 0.3) {
      console.warn('Confianza muy baja en la interpretación:', resultado);
      return null;
    }

    return resultado;
  } catch (e) {
    console.error('Error interpretando la respuesta de OpenAI:', e);
    return null;
  }
}

// Función para enviar mensajes de WhatsApp con mejor manejo de errores
async function enviarMensajeWhatsApp(numeroDestino, texto) {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      throw new Error('PHONE_NUMBER_ID no está configurado');
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: numeroDestino,
      type: 'text',
      text: { 
        preview_url: false,
        body: texto 
      }
    };
    
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(url, data, { 
      headers,
      timeout: 10000 // 10 segundos de timeout
    });

    if (response.status !== 200) {
      throw new Error(`Error en la API de WhatsApp: ${response.status} - ${response.statusText}`);
    }

    console.log('✅ Mensaje enviado correctamente:', {
      to: numeroDestino,
      status: response.status,
      data: response.data
    });

    return response.data;
  } catch (error) {
    let errorMessage = 'Error enviando mensaje de WhatsApp';
    
    if (axios.isAxiosError(error)) {
      errorMessage += error.response 
        ? `: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : `: ${error.message}`;
        
      console.error('❌ Error de Axios:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    } else {
      errorMessage += `: ${error.message}`;
      console.error('❌ Error no relacionado con Axios:', error);
    }

    // No relanzamos el error, pero lo registramos
    console.error(errorMessage);
    return null;
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

// Función para enviar mensajes con botones
async function enviarMensajeWhatsAppConBotones(numeroDestino, texto) {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      throw new Error('PHONE_NUMBER_ID no está configurado');
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: numeroDestino,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: texto
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'SI',
                title: 'SI'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'NO',
                title: 'NO'
              }
            }
          ]
        }
      }
    };

    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(url, data, { 
      headers,
      timeout: 10000 // 10 segundos de timeout
    });

    if (response.status !== 200) {
      throw new Error(`Error en la API de WhatsApp: ${response.status} - ${response.statusText}`);
    }

    console.log('✅ Mensaje con botones enviado correctamente:', {
      to: numeroDestino,
      status: response.status,
      data: response.data
    });

    return response.data;
  } catch (error) {
    let errorMessage = 'Error enviando mensaje de WhatsApp con botones';
    
    if (axios.isAxiosError(error)) {
      errorMessage += error.response 
        ? `: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : `: ${error.message}`;
        
      console.error('❌ Error de Axios:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    } else {
      errorMessage += `: ${error.message}`;
      console.error('❌ Error no relacionado con Axios:', error);
    }

    // No relanzamos el error, pero lo registramos
    console.error(errorMessage);
    return null;
  }
}

// Función para procesar respuestas de botones
async function procesarRespuestaBoton(message, user) {
  const whatsappId = message.from;
  
  try {
    console.log('🔄 Iniciando procesamiento de respuesta de botón');
    console.log('👤 Usuario:', user.email, 'ID:', user.id);
    
    // Obtener el payload del botón, considerando ambos formatos posibles
    const buttonPayload = message.button?.payload || 
                         message.interactive?.button_reply?.id;

    console.log('📋 Datos del botón:', {
      whatsappId,
      buttonPayload,
      messageType: message.type,
      userId: user.id,
      userEmail: user.email
    });

    if (!buttonPayload) {
      console.error('❌ No se pudo obtener el payload del botón');
      await enviarMensajeWhatsApp(
        whatsappId,
        '❌ Error procesando tu respuesta. Por favor, intenta de nuevo enviando un mensaje de texto.'
      );
      return;
    }

    // Buscar transacción pendiente en el contexto
    console.log('🔍 Buscando transacción pendiente en contexto para:', whatsappId);
    
    const pendingTransaction = conversationContext.getPendingTransaction(whatsappId);

    if (!pendingTransaction) {
      console.log('⚠️ No se encontró transacción pendiente en contexto');
      await enviarMensajeWhatsApp(
        whatsappId,
        '⚠️ No encontré una transacción pendiente. La sesión puede haber expirado.\n\nPor favor, envía un nuevo mensaje con tu transacción.'
      );
      return;
    }

    console.log('✅ Transacción encontrada en contexto:', {
      hasData: !!pendingTransaction.data,
      timestamp: new Date(pendingTransaction.timestamp).toLocaleString()
    });

    if (buttonPayload === 'SI') {
      console.log('✅ Procesando confirmación positiva');
      await procesarConfirmacionPositiva(pendingTransaction, user, whatsappId);
    } else if (buttonPayload === 'NO') {
      console.log('❌ Procesando respuesta negativa');
      await procesarRespuestaNegativa(pendingTransaction, whatsappId);
    } else {
      console.log('❓ Payload de botón no reconocido:', buttonPayload);
      await enviarMensajeWhatsApp(
        whatsappId,
        '❓ No entendí tu respuesta. Por favor, usa los botones SI o NO, o envía un mensaje de texto.'
      );
    }
    
  } catch (error) {
    console.error('❌ Error crítico procesando respuesta de botón:', {
      error: error.message,
      stack: error.stack,
      whatsappId,
      userId: user?.id || 'unknown'
    });
    
    await enviarMensajeWhatsApp(
      whatsappId,
      '❌ Ocurrió un error inesperado. Por favor, intenta de nuevo enviando tu transacción.'
    );
  }
}

// Función separada para procesar confirmación positiva
async function procesarConfirmacionPositiva(pendingTransaction, user, whatsappId) {
  try {
    console.log('💾 Iniciando guardado de transacción confirmada');
    
    const resultado = pendingTransaction.data;
    
    // Validar que tenemos todos los datos necesarios
    if (!resultado.tipo || !resultado.monto || !resultado.categoría) {
      console.error('❌ Datos incompletos en la transacción:', resultado);
      await enviarMensajeWhatsApp(
        whatsappId,
        '❌ Los datos de la transacción están incompletos. Por favor, envía un nuevo mensaje.'
      );
      return;
    }

    // Buscar o crear la categoría
    console.log('🔍 Buscando categoría:', resultado.categoría);
    let categoriaId = await buscarCategoriaIdPorNombre(resultado.categoría, user.id);
    
    if (!categoriaId) {
      console.log('➕ Creando nueva categoría:', resultado.categoría);
      categoriaId = await crearCategoriaSupabase(resultado.categoría, user.id);
    }
    
    if (!categoriaId) {
      console.error('❌ No se pudo obtener o crear la categoría');
      await enviarMensajeWhatsApp(
        whatsappId,
        '❌ Error con la categoría. Por favor, intenta de nuevo.'
      );
      return;
    }

    console.log('✅ Categoría obtenida:', categoriaId);

    // Mapear el tipo de transacción
    const tipoTransaccion = mapearTipoTransaccion(resultado.tipo);
    console.log('🔄 Tipo mapeado:', resultado.tipo, '->', tipoTransaccion);

    // Preparar los datos de la transacción
    const transaccionData = {
      user_id: user.id,
      type: tipoTransaccion,
      amount: parseFloat(resultado.monto),
      category_id: categoriaId,
      date: formatearFechaParaDB(resultado.fecha),
      description: `WhatsApp: ${pendingTransaction.messageId}`,
      is_budgetable: true
    };

    console.log('📄 Datos de transacción a guardar:', transaccionData);

    // Guardar directamente en la tabla transactions
    const { data: nuevaTransaccion, error: saveError } = await supabase
      .from('transactions')
      .insert([transaccionData])
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error guardando transacción:', saveError);
      await enviarMensajeWhatsApp(
        whatsappId,
        '❌ Error al guardar la transacción. Por favor, intenta de nuevo.'
      );
      return;
    }

    console.log('✅ Transacción guardada exitosamente:', nuevaTransaccion);

    // Limpiar la transacción pendiente del contexto
    conversationContext.clearPendingTransaction(whatsappId);

    // Enviar mensaje de confirmación con más detalles
    const tipoEmoji = resultado.tipo.toLowerCase() === 'ingreso' ? '💰' : '💸';
    const mensajeFinal = `✅ ¡Transacción registrada exitosamente!\n\n` +
                        `${tipoEmoji} ${capitalizarPrimeraLetra(resultado.tipo)}: $${resultado.monto.toLocaleString('es-AR')}\n` +
                        `🏷️ Categoría: ${capitalizarPrimeraLetra(resultado.categoría)}\n` +
                        `📅 Fecha: ${formatearFecha(resultado.fecha)}\n\n` +
                        `Puedes ver tus transacciones en la app web 📱`;

    await enviarMensajeWhatsApp(whatsappId, mensajeFinal);

  } catch (error) {
    console.error('❌ Error en procesarConfirmacionPositiva:', {
      error: error.message,
      stack: error.stack,
      whatsappId
    });
    
    await enviarMensajeWhatsApp(
      whatsappId,
      '❌ Error al procesar la confirmación. Por favor, intenta de nuevo.'
    );
  }
}

// Función separada para procesar respuesta negativa
async function procesarRespuestaNegativa(pendingTransaction, whatsappId) {
  try {
    console.log('❌ Procesando respuesta negativa');
    
    await enviarMensajeWhatsApp(
      whatsappId,
      '👌 Entendido. Envíame los cambios que necesitas hacer y mantendré el resto de la información.\n\n' +
      '💡 *Ejemplos:*\n' +
      '• "Eran $500" (cambiar monto)\n' +
      '• "Era para alimentación" (cambiar categoría)\n' +
      '• "Era un gasto" (cambiar tipo)'
    );

    // La transacción permanece en contexto para correcciones futuras
    console.log('📝 Transacción mantenida en contexto para correcciones');

  } catch (error) {
    console.error('❌ Error en procesarRespuestaNegativa:', error);
    await enviarMensajeWhatsApp(
      whatsappId,
      '❌ Error procesando tu respuesta. Por favor, intenta de nuevo.'
    );
  }
}

// Función auxiliar para formatear fecha para la base de datos
function formatearFechaParaDB(fecha) {
  try {
    // Si ya viene en formato YYYY-MM-DD, devolverla tal como está
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }
    
    // Si viene en formato DD/MM/YYYY, convertirla
    if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, año] = fecha.split('/');
      return `${año}-${mes}-${dia}`;
    }
    
    // Si no podemos parsear, usar fecha actual
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formateando fecha:', error);
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }
}

// Función auxiliar para mapear tipos de transacción
function mapearTipoTransaccion(tipo) {
  const tipoLower = tipo.toLowerCase().trim();
  
  const mapping = {
    'gasto': 'expense',
    'gastos': 'expense',
    'expense': 'expense',
    'ingreso': 'income',
    'ingresos': 'income',
    'income': 'income',
    'reembolso': 'income', // Los reembolsos son ingresos
    'transferencia': 'expense', // Las transferencias las tratamos como gastos por defecto
    'pago': 'expense'
  };
  
  const result = mapping[tipoLower] || 'expense'; // Por defecto es gasto
  console.log(`🔄 Mapeo de tipo: "${tipo}" -> "${result}"`);
  return result;
} 