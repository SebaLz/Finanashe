# 🚨 Guía de Troubleshooting - WhatsApp Business API

## 📋 Error Identificado
```
❌ Error de Axios: {
  message: 'Request failed with status code 400',
  status: 400,
  data: {
    error: {
      message: '(#10) Application does not have permission for this action',
      type: 'OAuthException',
      code: 10
    }
  }
}
```

## 🔍 Diagnóstico del Error

**Error #10 - OAuthException** = Problema de permisos/autenticación

### ✅ Lo que SÍ funciona:
- Webhook recibe mensajes correctamente
- Sistema encuentra usuarios en la base de datos
- Nuestro sistema de categorías procesa sin errores
- OpenAI interpreta mensajes (aunque "hola" no es transacción)

### ❌ Lo que NO funciona:
- **Envío de mensajes de respuesta** - Por permisos insuficientes

---

## 🛠️ Soluciones por Orden de Probabilidad

### **1. 🔑 Token de Acceso Expirado (MÁS PROBABLE)**

**Problema:** Los tokens de WhatsApp Business API tienen vencimiento limitado.

**Solución:**
1. Ir a [Facebook Developers Console](https://developers.facebook.com/)
2. Seleccionar tu aplicación
3. Ir a WhatsApp > Configuración
4. **Generar nuevo token de acceso**
5. Actualizar la variable `WHATSAPP_TOKEN` en `.env.local`

```env
# En tu archivo .env.local
WHATSAPP_TOKEN=tu_nuevo_token_aqui
```

### **2. 📋 Permisos Insuficientes de la Aplicación**

**Problema:** La app de Facebook no tiene los permisos correctos.

**Verificación:**
1. En Facebook Developers Console
2. Tu App > WhatsApp > Configuración
3. Verificar que estén habilitados:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`

**Solución:**
- Solicitar permisos adicionales si están faltando
- Verificar que la app esté en modo "Producción" no "Desarrollo"

### **3. 🔒 Número de Teléfono No Autorizado**

**Problema:** En modo desarrollo, solo ciertos números pueden recibir mensajes.

**Verificación:**
1. Facebook Developers > Tu App > WhatsApp
2. Ir a "Números de teléfono de prueba"
3. Verificar que `5493516838013` esté en la lista

**Solución:**
- Agregar el número a la lista de prueba
- O solicitar aprobación para modo producción

### **4. ⚙️ Configuración de Webhook Incorrecta**

**Problema:** Webhook configurado para recibir pero no para enviar.

**Verificación:**
```bash
# Verificar variables de entorno
echo $PHONE_NUMBER_ID
echo $WHATSAPP_TOKEN
echo $WHATSAPP_VERIFY_TOKEN
```

**Variables requeridas:**
```env
PHONE_NUMBER_ID=450936411444382  # ✅ Se ve correcto en logs
WHATSAPP_TOKEN=EAAg8tlZCAQqQBO...  # ❌ Probablemente expirado
WHATSAPP_VERIFY_TOKEN=tu_verify_token
```

### **5. 🏢 Límites de Cuenta Business**

**Problema:** Cuenta nueva con restricciones.

**Verificación:**
1. Facebook Business Manager
2. WhatsApp Business Account
3. Revisar estado de la cuenta y límites

---

## 🔧 Pasos de Resolución Inmediata

### **Paso 1: Verificar Estado del Token**
```bash
# Probar el token actual
curl -X GET "https://graph.facebook.com/v17.0/450936411444382" \
  -H "Authorization: Bearer TU_TOKEN_ACTUAL"
```

### **Paso 2: Regenerar Token (RECOMENDADO)**
1. Ir a Facebook Developers Console
2. WhatsApp > Configuración  
3. **Generar nuevo token**
4. Actualizar `.env.local`
5. Reiniciar servidor de desarrollo

### **Paso 3: Verificar Funcionamiento**
Enviar mensaje de prueba que SÍ sea una transacción:
```
"Gasto $100 en alimentación"
```

---

## 📱 Testing del Sistema

### **Mensajes de Prueba Recomendados:**
```
✅ "Gasto 500 pesos en alimentación"
✅ "Ingreso 2000 trabajo hoy"  
✅ "Gasté 150 en transporte"
✅ "Cobré 1500 freelance ayer"
❌ "hola" (no es transacción válida)
```

### **Lo que Debería Pasar:**
1. 📨 **Recibir mensaje** → ✅ Ya funciona
2. 🧠 **OpenAI procesar** → ✅ Ya funciona  
3. 🏷️ **Categoría inteligente** → ✅ Nuestro sistema listo
4. 📤 **Enviar confirmación** → ❌ Bloqueado por permisos
5. ✅ **Confirmar SI/NO** → ❌ Bloqueado por permisos
6. 💾 **Guardar en DB** → ✅ Backend listo

---

## 🚀 Una vez solucionado, verás:

```
🔔 Webhook recibido: mensaje de usuario
✅ Usuario encontrado: matiasmaldonado.eth@gmail.com
🔍 Buscando categoría con matching inteligente: alimentación
✅ Categoría encontrada: 🛒 Alimentación (score: 1.0)
✅ Mensaje enviado correctamente
```

---

## 📞 Contacto con Meta/Facebook

Si ninguna solución funciona:
1. [Meta Business Help Center](https://business.facebook.com/help)
2. WhatsApp Business API Support
3. Verificar el status de [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)

---

**🎯 RESUMEN:** El problema NO está en nuestro código sino en la configuración/permisos de WhatsApp Business API. Nuestro sistema de categorías inteligentes está listo y funcionando. 