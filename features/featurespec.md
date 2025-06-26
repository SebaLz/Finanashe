🧠 Spec – Sincronización Inteligente de Categorías (WhatsApp ↔ Supabase)
🎯 Objetivo principal
El objetivo de esta feature es asegurar que las transacciones registradas por el bot de WhatsApp, usando OpenAI para interpretar los mensajes, se sincronicen correctamente con las categorías existentes en Supabase, respetando la estética visual (emojis) y manteniendo la coherencia total en la base de datos y la web app.

🔍 Funcionalidad a implementar
1. Validación de usuario
Verificar que el número o email del usuario exista en Supabase.

Si no existe, no continuar con el flujo.

2. Recepción del mensaje desde WhatsApp + JSON de OpenAI
Ya existente: se recibe un JSON con los campos:

tipo, fecha, categoría, monto, medio_pago.

3. Validación inteligente de categoría
Comparar el valor de categoría recibido con las categorías existentes en Supabase.

Implementar fuzzy matching:

Case-insensitive

Permitir errores tipográficos leves (Levenshtein, similaridad, etc.)

Soportar sinónimos simples (opcional)

Si se encuentra coincidencia:

Usar la categoría original desde Supabase (con emoji y formato exacto, ej: "💻 Tecnología").

Si no se encuentra coincidencia:

Usar la categoría "Otros" que ya debe existir en Supabase.

Esta lógica aplica tanto para tipo: ingreso como tipo: gasto.

4. Prevención de duplicados
Antes de insertar, verificar que no exista ya una transacción idéntica:

Mismo usuario, monto, fecha, tipo y categoría.

5. Guardar transacción en Supabase
Insertar en la tabla transactions con los siguientes campos:

user_id

tipo

fecha

monto

medio_pago

categoría (con emoji y formato final)

6. Sincronización con frontend
Como las categorías ya están integradas correctamente en la web, no requiere ajustes en la UI, siempre que el dato insertado mantenga el formato.

✨ Estética como regla fundamental
Todas las categorías deben guardarse con su emoji, según lo definido en Supabase.

El texto de las transacciones debe ser limpio, legible y coherente visualmente.

Este principio aplica a todos los puntos del flujo: backend, base de datos, frontend y WhatsApp.