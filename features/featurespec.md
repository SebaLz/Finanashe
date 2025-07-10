# 🔍 **2️⃣ Spec – Funcionalidad a Implementar: Rate Limiting WhatsApp Webhook**

**Objetivo Principal:** Garantizar la seguridad, estabilidad y buen uso del endpoint `/api/whatsapp-webhook`, controlando la frecuencia de uso según el plan del usuario y asegurando una experiencia coherente con toda la plataforma.

1️⃣ El sistema debe limitar peticiones entrantes validando la IP y el ID de usuario proveniente de Supabase.
2️⃣ El límite de peticiones se ajusta dinámicamente según el plan de usuario:

* Plan **Gratuito**: máximo 10 peticiones/día.
* Plan **Premium**: máximo 300 peticiones/día.
  3️⃣ Si se excede el límite, se debe bloquear la petición, responder con un mensaje de error claro y registrar la incidencia.
  4️⃣ Registrar cada intento bloqueado en una tabla `rate_limit_logs` (o equivalente) con: timestamp, IP, ID de usuario, motivo del bloqueo.
  5️⃣ La solución debe ser extensible para futuros límites (por minuto, hora, etc.).
  6️⃣ Mantener coherencia con la estructura de base de datos existente en Supabase.
  7️⃣ Respetar la coherencia visual y los mensajes consistentes en toda la app.
  8️⃣ Evitar hardcodear valores: usar configuración dinámica para planes y límites.
  9️⃣ El Spec no impone herramientas: dejar a Cursor proponer la mejor estrategia de implementación (middleware, edge, serverless, etc.).
  🔟 Verificar compatibilidad con SSR y edge functions si se opta por usarlas.