# 📋 Backlog de Tareas - FinanzApp

> Sistema de finanzas personales integrado con WhatsApp Business

## 🚨 Tareas Críticas (High Priority)

### Backend - Core
1. **[BE-001]** Implementar rate limiting en el webhook de WhatsApp
   - Prevenir abuso del endpoint `/api/whatsapp-webhook`
   - Configurar límites por usuario y por IP
   - **ACTUALIZADO:** Integrar límites de plan (10 gratuito, 300 premium)
   - Agregar logs de intentos bloqueados

1.1. **[PLAN-001]** Sistema de planes y suscripciones
   - Tabla `user_subscriptions` con plan actual y límites
   - Plan gratuito: 10 transacciones WhatsApp/mes
   - Plan premium: 300 transacciones WhatsApp/mes
   - Tabla `monthly_usage` para tracking de uso mensual
   - Reset automático mensual de contadores

1.2. **[PLAN-002]** Validación de límites en webhook
   - Verificar límite de plan antes de procesar mensaje
   - Contador de transacciones WhatsApp por usuario/mes
   - Mensaje informativo cuando se alcanza el límite
   - Sugerencia de upgrade a plan premium

2. **[BE-002]** Crear sistema de reintentos para mensajes fallidos de WhatsApp
   - Cola de mensajes con reintentos exponenciales
   - Almacenar mensajes fallidos en base de datos
   - Dashboard para monitorear mensajes no entregados

3. **[BE-003]** Implementar cache para categorías y configuraciones de usuario
   - Usar Redis/Memcached para reducir queries a Supabase
   - Cache de categorías por usuario
   - Invalidación de cache automática

### Seguridad y Validaciones
4. **[SEC-001]** Auditoría completa de RLS (Row Level Security) en Supabase
   - Revisar todas las políticas de seguridad existentes
   - Agregar políticas faltantes para nuevas tablas
   - Tests automatizados de permisos

5. **[SEC-002]** Implementar validación de webhooks de WhatsApp
   - Verificar firma de webhooks de Meta
   - Rechazar requests no autenticados
   - Logging de intentos sospechosos

6. **[SEC-003]** Sanitización de inputs del usuario
   - Validar y limpiar todos los inputs de WhatsApp
   - Prevenir inyección SQL en queries raw
   - Escapar caracteres especiales en mensajes

## 🎯 Funcionalidades Pendientes (Medium Priority)

### Sistema de Monetización
7. **[PLAN-003]** Sistema de pagos y facturación
   - Integración con Stripe/MercadoPago para Argentina
   - Webhooks de confirmación de pago
   - Generación automática de facturas
   - Manejo de reembolsos y cancelaciones

8. **[PLAN-004]** Dashboard de uso para usuarios
   - Mostrar transacciones WhatsApp usadas del mes
   - Progreso visual del límite (ej: 7/10 gratuitas)
   - Predicción de uso basado en histórico
   - Call-to-action para upgrade cuando se acerque al límite

9. **[PLAN-005]** Página de pricing y planes
   - Landing page atractiva con comparación de planes
   - Calculadora de ahorro/ROI para plan premium
   - Testimonios y casos de éxito
   - Botón de upgrade integrado en la app

10. **[PLAN-006]** Notificaciones de límites
    - WhatsApp: Aviso cuando quedan 2 transacciones
    - Email: Resumen mensual de uso
    - Push: Límite alcanzado + opción de upgrade
    - WhatsApp: Mensaje informativo cuando se alcanza límite

### Backend - Features
11. **[BE-004]** Sistema de notificaciones push programadas
    - Recordatorios de pagos de gastos fijos
    - Alertas de presupuesto excedido
    - Resumen semanal/mensual automático

12. **[BE-005]** Implementar comandos avanzados para WhatsApp
    
    **Comandos Básicos (Fase 1 - Semana 1):**
    - `/ayuda` - Lista completa de comandos disponibles + onboarding
    - `/plan` - Ver plan actual, transacciones usadas/restantes + CTA upgrade
    - `/resumen` - Resumen del mes (ingresos, gastos, balance)
    
    **Comandos Intermedios (Fase 2 - Semana 2):**
    - `/balance` - Balance actual con comparativa mes anterior
    - `/categorias` - Lista de categorías con emojis y contadores de uso
    - `/gastos` - Top 5 categorías de gastos del mes
    
    **Comandos Premium (Fase 3 - Solo plan premium):**
    - `/exportar` - Generar y enviar reporte PDF por WhatsApp
    - `/presupuesto` - Estado detallado del presupuesto por categorías
    - `/metas` - Progreso de objetivos de ahorro
    - `/prediccion` - Proyección de gastos basada en histórico
    
    **Comandos en Lenguaje Natural:**
    - "resumen del mes" → `/resumen`
    - "cuánto gasté" → `/gastos`
    - "mi plan" → `/plan`
    - "ayuda" → `/ayuda`
    
    **Integraciones Requeridas:**
    - Validación de plan antes de ejecutar comandos premium
    - Logging de uso de comandos para analytics
    - Rate limiting específico para comandos (5 comandos/minuto)
    - Respuestas contextuales según el plan del usuario

13. **[BE-006]** API REST completa para la aplicación
    - Endpoints RESTful documentados con OpenAPI
    - Versionado de API
    - Rate limiting por endpoint

14. **[BE-007]** Sistema de exportación de datos mejorado
    - Exportar a Excel con formato profesional
    - Generar PDFs de reportes mensuales
    - Exportación programada automática

14.1. **[COMMAND-001]** Sistema de detección inteligente de comandos
    - Procesar comandos antes que transacciones
    - Detección de comandos en lenguaje natural con IA
    - Rate limiting específico para comandos (diferente a transacciones)
    - Analytics de comandos más utilizados
    - Respuestas contextuales según historial del usuario

14.2. **[COMMAND-002]** Comandos premium como diferenciador de valor
    - `/exportar` solo para usuarios premium
    - `/prediccion` con análisis predictivo avanzado
    - `/presupuesto` con alertas inteligentes
    - Mensajes de upgrade cuando usuario gratuito intenta comando premium
    - Preview limitado de comandos premium para generar FOMO

### Frontend - UI/UX
11. **[FE-001]** Dashboard interactivo mejorado
    - Gráficos animados con transiciones suaves
    - Widgets arrastrables y personalizables
    - Modo de vista compacta para móviles

12. **[FE-002]** Onboarding guiado para nuevos usuarios
    - Tour interactivo de las funcionalidades
    - Configuración inicial paso a paso
    - Videos tutoriales integrados

13. **[FE-003]** Sistema de filtros avanzados en transacciones
    - Filtros múltiples combinables
    - Rangos de fechas personalizados
    - Búsqueda por múltiples categorías
    - Guardar filtros favoritos

14. **[FE-004]** Vista de calendario para transacciones
    - Visualización mensual tipo calendario
    - Drag & drop para mover transacciones
    - Vista de heatmap de gastos

/* 15. **[FE-005]** Modo offline con sincronización
    - PWA con service workers
    - Almacenamiento local de datos críticos
    - Cola de sincronización cuando vuelve la conexión */

### Integración API/IA
16. **[AI-001]** Mejorar interpretación de mensajes con GPT-4
    - Upgrade a GPT-4 para mejor comprensión
    - Entrenamiento con ejemplos específicos del dominio
    - Detección de idioma automática

17. **[AI-002]** Análisis predictivo de gastos
    - Predicción de gastos futuros basado en histórico
    - Alertas proactivas de posibles excesos
    - Sugerencias de ahorro personalizadas

18. **[AI-003]** Categorización automática inteligente
    - Aprendizaje de patrones del usuario
    - Sugerencias de categorías basadas en descripción
    - Auto-categorización con confirmación

19. **[AI-004]** Chatbot conversacional avanzado
    - Mantener contexto de conversaciones largas
    - Respuestas más naturales y personalizadas
    - Soporte para consultas complejas

## 🔧 Mejoras Técnicas (Low Priority)

### Backend - Optimización
20. **[BE-008]** Optimización de queries a la base de datos
    - Índices faltantes en tablas grandes
    - Queries paginadas para listas largas
    - Vistas materializadas para reportes

21. **[BE-009]** Sistema de logs estructurados
    - Implementar Winston/Pino para logging
    - Logs en formato JSON
    - Integración con servicios de monitoreo

22. **[BE-010]** Migración a Edge Functions de Supabase
    - Mover lógica compleja a Edge Functions
    - Reducir latencia en operaciones críticas
    - Mejor manejo de errores

### Frontend - Performance
23. **[FE-006]** Optimización de bundle size
    - Code splitting por rutas
    - Lazy loading de componentes pesados
    - Optimización de imágenes con next/image

24. **[FE-007]** Implementar virtualización para listas largas
    - React Virtual para tabla de transacciones
    - Infinite scroll optimizado
    - Reducir consumo de memoria

25. **[FE-008]** Sistema de caché del lado del cliente
    - React Query/SWR para gestión de estado
    - Caché persistente en IndexedDB
    - Estrategias de invalidación inteligentes

### UI/UX - Polish
26. **[UX-001]** Micro-interacciones y animaciones
    - Animaciones de carga skeleton mejoradas
    - Transiciones suaves entre estados
    - Feedback háptico en móviles

27. **[UX-002]** Accesibilidad completa (WCAG 2.1)
    - Navegación completa por teclado
    - Screen reader friendly
    - Alto contraste y temas personalizables

28. **[UX-003]** Diseño responsive mejorado
    - Breakpoints optimizados para todos los dispositivos
    - Gestos táctiles para acciones rápidas
    - Modo landscape optimizado

## 📚 Documentación y Testing

29. **[DOC-001]** Documentación técnica completa
    - API documentation con Swagger/OpenAPI
    - Guía de contribución
    - Arquitectura del sistema documentada

30. **[DOC-002]** Documentación de usuario
    - Base de conocimientos searchable
    - FAQs interactivas
    - Guías paso a paso con screenshots

31. **[TEST-001]** Suite de tests completa
    - Tests unitarios para servicios críticos
    - Tests de integración para flujos principales
    - Tests E2E con Cypress/Playwright

32. **[TEST-002]** Tests de carga y performance
    - Load testing del webhook de WhatsApp
    - Performance testing de queries complejas
    - Monitoreo de métricas de rendimiento

## 🚀 Features Avanzadas (Future)

33. **[ADV-001]** Multi-moneda y conversión automática
    - Soporte para múltiples monedas
    - Tasas de cambio en tiempo real
    - Conversión automática en reportes

34. **[ADV-002]** Compartir gastos y cuentas familiares
    - Cuentas compartidas para familias/parejas
    - División automática de gastos
    - Aprobaciones y permisos granulares

35. **[ADV-003]** Integración con bancos y tarjetas
    - Importación automática de transacciones
    - Reconciliación con extractos bancarios
    - Alertas de movimientos sospechosos

36. **[ADV-004]** Marketplace de plantillas de presupuesto
    - Plantillas predefinidas por expertos
    - Compartir configuraciones entre usuarios
    - Sistema de ratings y reviews

37. **[ADV-005]** Gamificación del ahorro
    - Logros y badges por metas cumplidas
    - Desafíos mensuales de ahorro
    - Leaderboards opcionales entre amigos

## 🐛 Bugs y Fixes Conocidos

38. **[BUG-001]** Corregir duplicación de categorías al cambiar entre pestañas
    - Investigar re-renderizado innecesario
    - Implementar memoización correcta
    - Agregar debouncing en llamadas a API

39. **[BUG-002]** Mejorar manejo de errores en webhook
    - Respuestas más descriptivas para debugging
    - Retry automático en fallos temporales
    - Dead letter queue para mensajes perdidos

40. **[BUG-003]** Sincronización de estado entre WhatsApp y Web
    - Webhooks para actualización en tiempo real
    - WebSockets para sincronización bidireccional
    - Resolución de conflictos automática

## 📊 Métricas y Analytics

41. **[METRICS-001]** Dashboard de métricas de uso
    - Usuarios activos diarios/mensuales
    - Features más utilizadas
    - Tasa de retención

42. **[METRICS-002]** Analytics de comportamiento financiero
    - Patrones de gasto por categoría
    - Tendencias temporales
    - Comparativas anónimas con otros usuarios

43. **[METRICS-003]** Monitoreo de salud del sistema
    - Uptime de servicios críticos
    - Latencia de APIs
    - Tasa de error por endpoint

44. **[METRICS-004]** Analytics de monetización (NUEVO)
    - Tasa de conversión Gratuito → Premium
    - Churn rate por plan
    - Revenue mensual y proyecciones
    - Usuarios cerca del límite (propensos a upgrade)
    - Métricas de uso por plan

45. **[METRICS-005]** Alertas de negocio (NUEVO)
    - Notificación cuando revenue baja 20%
    - Alerta si churn rate > 15%
    - Warning si < 25% upgrade rate
    - Monitor de límites de uso promedio

## 🔄 Migraciones y Mantenimiento

44. **[MIG-001]** Migración a TypeScript estricto
    - Habilitar strict mode gradualmente
    - Eliminar todos los `any` types
    - Documentar tipos complejos

45. **[MIG-002]** Actualización de dependencias
    - Audit de vulnerabilidades
    - Actualización a últimas versiones estables
    - Testing exhaustivo post-actualización

46. **[MIG-003]** Refactoring de código legacy
    - Separar lógica de negocio de controllers
    - Implementar patrón repository
    - Reducir acoplamiento entre módulos

## 🎨 Branding y Marketing

47. **[BRAND-001]** Landing page profesional
    - Diseño moderno y atractivo
    - Animaciones y micro-interacciones
    - SEO optimizado

48. **[BRAND-002]** Material de marketing
    - Screenshots y videos demostrativos
    - Casos de éxito de usuarios
    - Blog con tips financieros

49. **[BRAND-003]** Programa de referidos
    - Sistema de invitaciones con beneficios
    - Tracking de conversiones
    - Rewards automáticos

50. **[BRAND-004]** Integración con redes sociales
    - Compartir logros y metas cumplidas
    - Login social (Facebook, Twitter)
    - Import de contactos para compartir

---

## 📝 Notas de Implementación

### Priorización ACTUALIZADA
- **🚨 Críticas**: Sistema de planes, seguridad, y estabilidad del core
- **🎯 Medium**: Features que mejoran UX y monetización
- **🔧 Low**: Optimizaciones y mejoras técnicas
- **🚀 Future**: Features avanzadas para diferenciación

### Nueva Prioridad de Implementación (con planes)
**Semana 1:** PLAN-001, PLAN-002, BE-001 (base del sistema de límites)
**Semana 1.5:** COMMAND-001, BE-005 Fase 1 (comandos básicos: /plan, /ayuda)
**Semana 2:** PLAN-003, PLAN-004 (pagos y dashboard de uso)
**Semana 2.5:** BE-005 Fase 2 (comandos intermedios: /resumen, /balance)
**Semana 3:** PLAN-005, PLAN-006 (marketing y notificaciones)
**Semana 3.5:** COMMAND-002, BE-005 Fase 3 (comandos premium como diferenciador)
**Semana 4:** SEC-002, SEC-003 (seguridad)

### Modelo de Negocio
- **Plan Gratuito**: 10 transacciones WhatsApp/mes (FREE)
- **Plan Premium**: 300 transacciones WhatsApp/mes ($29.99 ARS/mes)
- **Target**: 30% de usuarios upgradeando al mes 2
- **LTV estimado**: $89.97 ARS (3 meses promedio)

### Estimaciones de Tiempo
- Tareas pequeñas (1-2 días): Fixes, pequeñas mejoras UI
- Tareas medianas (3-5 días): Features nuevas, integraciones
- Tareas grandes (1-2 semanas): Refactoring mayor, sistemas complejos

### Dependencies
- Algunas tareas dependen de otras (ej: Analytics requiere logging mejorado)
- Los comandos premium requieren sistema de planes funcionando
- Las migraciones deben hacerse en orden y con cuidado
- Testing debe acompañar cada nueva feature

### Ejemplos de Implementación de Comandos Críticos

**Comando `/plan` (Crítico para monetización):**
```javascript
// Respuesta ejemplo para usuario gratuito cerca del límite
"📊 Plan Gratuito: 8/10 transacciones usadas
⚠️ ¡Solo te quedan 2 transacciones!
🚀 Upgrade a Premium: 300 transacciones/mes
💳 Solo $29.99 - Upgrade: tu-app.com/upgrade"
```

**Comando `/ayuda` (Onboarding crítico):**
```javascript
// Respuesta contextual según plan del usuario
"🤖 Comandos disponibles:
/plan - Ver tu uso actual
/resumen - Balance del mes
/ayuda - Esta lista

💡 Escribe transacciones normalmente:
'Gasté $500 en comida'
'Ingreso 2000 freelance'

🔒 Comandos Premium: /exportar /prediccion
👉 Upgrade: tu-app.com/upgrade"
```

### Métricas de Éxito para Comandos
- **Adoption Rate**: % usuarios que usan al menos 1 comando/semana
- **Command Usage**: Comandos más utilizados por plan
- **Conversion Trigger**: % usuarios que upgraden después de usar comando premium
- **Engagement**: Usuarios con comandos vs solo transacciones
- **Retention**: Usuarios que usan comandos tienen mayor retención

Este script debes de ejecutar en supabase para que funcione: [[memory:6981019243630000699]]
```sql
-- SISTEMA DE PLANES Y SUSCRIPCIONES --

-- Tabla de planes disponibles
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  whatsapp_transaction_limit INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar planes por defecto
INSERT INTO public.subscription_plans (id, name, price, whatsapp_transaction_limit, duration_days, features) VALUES
('00000000-0000-0000-0000-000000000001', 'Gratuito', 0, 10, 30, '["Dashboard básico", "Categorización manual", "10 transacciones WhatsApp/mes"]'),
('00000000-0000-0000-0000-000000000002', 'Premium', 2999, 300, 30, '["Dashboard avanzado", "Categorización automática", "300 transacciones WhatsApp/mes", "Reportes PDF", "Soporte prioritario"]')
ON CONFLICT (id) DO NOTHING;

-- Tabla de suscripciones de usuarios
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'pending')),
  started_at TIMESTAMPTZ DEFAULT now(),   
  expires_at TIMESTAMPTZ NOT NULL,
  payment_id TEXT, -- ID de Stripe/MercadoPago
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_id, started_at)
);

-- Tabla de uso mensual por usuario
CREATE TABLE IF NOT EXISTS public.monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  whatsapp_transactions_used INTEGER DEFAULT 0,
  whatsapp_transactions_limit INTEGER NOT NULL,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Función para obtener el plan actual del usuario
CREATE OR REPLACE FUNCTION get_user_current_plan(p_user_id UUID)
RETURNS TABLE(
  plan_name TEXT,
  whatsapp_limit INTEGER,
  expires_at TIMESTAMPTZ,
  status TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.whatsapp_transaction_limit,
    us.expires_at,
    us.status
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id 
    AND us.status = 'active'
    AND us.expires_at > now()
  ORDER BY us.expires_at DESC
  LIMIT 1;
  
  -- Si no tiene plan activo, devolver plan gratuito
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'Gratuito'::TEXT,
      10::INTEGER,
      (now() + INTERVAL '30 days')::TIMESTAMPTZ,
      'active'::TEXT;
  END IF;
END;
$$;

-- Función para verificar límite de uso
CREATE OR REPLACE FUNCTION check_whatsapp_usage_limit(p_user_id UUID)
RETURNS TABLE(
  can_use BOOLEAN,
  used_count INTEGER,
  limit_count INTEGER,
  remaining INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now());
  current_month INTEGER := EXTRACT(MONTH FROM now());
  user_plan RECORD;
  usage_record RECORD;
BEGIN
  -- Obtener plan actual
  SELECT * INTO user_plan FROM get_user_current_plan(p_user_id) LIMIT 1;
  
  -- Obtener o crear registro de uso mensual
  SELECT * INTO usage_record 
  FROM monthly_usage 
  WHERE user_id = p_user_id 
    AND year = current_year 
    AND month = current_month;
    
  -- Si no existe, crear registro
  IF NOT FOUND THEN
    INSERT INTO monthly_usage (user_id, year, month, whatsapp_transactions_limit)
    VALUES (p_user_id, current_year, current_month, user_plan.whatsapp_limit)
    RETURNING * INTO usage_record;
  END IF;
  
  -- Devolver resultado
  RETURN QUERY
  SELECT 
    (usage_record.whatsapp_transactions_used < usage_record.whatsapp_transactions_limit)::BOOLEAN,
    usage_record.whatsapp_transactions_used::INTEGER,
    usage_record.whatsapp_transactions_limit::INTEGER,
    (usage_record.whatsapp_transactions_limit - usage_record.whatsapp_transactions_used)::INTEGER;
END;
$$;

-- Función para incrementar uso de WhatsApp
CREATE OR REPLACE FUNCTION increment_whatsapp_usage(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now());
  current_month INTEGER := EXTRACT(MONTH FROM now());
BEGIN
  -- Incrementar contador
  UPDATE monthly_usage 
  SET whatsapp_transactions_used = whatsapp_transactions_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id 
    AND year = current_year 
    AND month = current_month;
    
  RETURN FOUND;
END;
$$;

-- Políticas RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- Los planes son públicos para lectura
CREATE POLICY "Plans are viewable by everyone" ON subscription_plans FOR SELECT USING (true);

-- Usuarios solo ven sus propias suscripciones
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Usuarios solo ven su propio uso
CREATE POLICY "Users can view own usage" ON monthly_usage FOR SELECT USING (auth.uid() = user_id);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON monthly_usage(user_id, year, month);

-- Trigger para asignar plan gratuito a nuevos usuarios
CREATE OR REPLACE FUNCTION assign_free_plan_to_new_user()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Asignar plan gratuito por 30 días
  INSERT INTO user_subscriptions (user_id, plan_id, expires_at)
  VALUES (
    NEW.id, 
    '00000000-0000-0000-0000-000000000001', 
    now() + INTERVAL '30 days'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_free_plan_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION assign_free_plan_to_new_user();
```
