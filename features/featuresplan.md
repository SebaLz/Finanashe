# 🚀 Plan de Implementación - Rate Limiting WhatsApp Webhook

> **Objetivo:** Implementar sistema de rate limiting robusto para el webhook `/api/whatsapp-webhook` con límites dinámicos según el plan del usuario

## 📋 **Resumen del Feature Spec**

**Límites por Plan:**
- **Gratuito**: 10 transacciones WhatsApp/día
- **Premium**: 300 transacciones WhatsApp/día

**Requisitos Críticos:**
- ✅ Validación por IP y user_id 
- ✅ Bloqueo con mensajes claros
- ✅ Logging completo de intentos
- ✅ Configuración dinámica (no hardcoded)
- ✅ Extensible para futuros límites
- ✅ Compatible con SSR/Edge Functions

---

## 🎯 **Fase 1: Fundación del Sistema (Días 1-2)**

### **Tarea 1.1: Estructura de Base de Datos**
**Duración:** 4 horas
**Prioridad:** 🚨 Crítica

```sql
-- Tabla para logging de rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL DEFAULT '/api/whatsapp-webhook',
  limit_type TEXT NOT NULL, -- 'daily', 'hourly', 'per_minute'
  current_count INTEGER NOT NULL,
  limit_threshold INTEGER NOT NULL,
  plan_type TEXT NOT NULL, -- 'free', 'premium'
  blocked BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  user_agent TEXT,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para configuración dinámica de límites
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE,
  daily_limit INTEGER NOT NULL,
  hourly_limit INTEGER,
  minute_limit INTEGER,
  burst_limit INTEGER DEFAULT 5, -- Límite de ráfaga por minuto
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuraciones por defecto
INSERT INTO public.rate_limit_config (plan_type, daily_limit, hourly_limit, minute_limit) VALUES
('free', 10, 5, 2),
('premium', 300, 50, 10)
ON CONFLICT (plan_type) DO UPDATE SET
  daily_limit = EXCLUDED.daily_limit,
  hourly_limit = EXCLUDED.hourly_limit,
  minute_limit = EXCLUDED.minute_limit;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_date ON rate_limit_logs(user_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_date ON rate_limit_logs(ip_address, DATE(created_at));
```

### **Tarea 1.2: Servicios Core de Rate Limiting**
**Duración:** 6 horas
**Prioridad:** 🚨 Crítica

**Archivo:** `src/lib/rate-limiter.ts`

```typescript
export interface RateLimitConfig {
  dailyLimit: number;
  hourlyLimit: number;
  minuteLimit: number;
  burstLimit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    daily: number;
    hourly: number;
    minute: number;
  };
  resetTime: {
    daily: Date;
    hourly: Date;
    minute: Date;
  };
  currentPlan: string;
  reason?: string;
}

export class WhatsAppRateLimiter {
  private supabase: SupabaseClient;
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async checkRateLimit(
    userId: string, 
    ipAddress: string,
    userAgent?: string
  ): Promise<RateLimitResult> {
    // Implementación detallada
  }

  async incrementUsage(
    userId: string,
    ipAddress: string,
    allowed: boolean,
    reason?: string
  ): Promise<void> {
    // Log del intento
  }

  private async getRateLimitConfig(planType: string): Promise<RateLimitConfig> {
    // Obtener configuración dinámica
  }

  private async getCurrentCounts(
    userId: string,
    ipAddress: string
  ): Promise<UsageCounts> {
    // Contar usos actuales
  }
}
```

---

## 🔧 **Fase 2: Integración con Webhook (Días 3-4)**

### **Tarea 2.1: Middleware de Rate Limiting**
**Duración:** 4 horas
**Prioridad:** 🚨 Crítica

**Archivo:** `src/middleware/rate-limit-middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppRateLimiter } from '@/lib/rate-limiter';
import { createClient } from '@supabase/supabase-js';

export async function rateLimitMiddleware(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  
  const rateLimiter = new WhatsAppRateLimiter(supabase);
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const result = await rateLimiter.checkRateLimit(
      userId, 
      ipAddress, 
      userAgent
    );
    
    if (!result.allowed) {
      // Log del intento bloqueado
      await rateLimiter.incrementUsage(userId, ipAddress, false, result.reason);
      
      // Respuesta de rate limit excedido
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: generateRateLimitMessage(result),
          retryAfter: result.resetTime.daily,
          plan: result.currentPlan
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining-Daily': result.remaining.daily.toString(),
            'X-RateLimit-Reset-Daily': result.resetTime.daily.toISOString()
          }
        }
      );
    }
    
    // Incrementar contador para intento exitoso
    await rateLimiter.incrementUsage(userId, ipAddress, true);
    
    // Agregar headers informativos
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining-Daily', result.remaining.daily.toString());
    response.headers.set('X-RateLimit-Plan', result.currentPlan);
    
    return null; // Continuar con el request
    
  } catch (error) {
    console.error('Rate limiter error:', error);
    // En caso de error, permitir el request pero logear
    return null;
  }
}

function generateRateLimitMessage(result: RateLimitResult): string {
  if (result.currentPlan === 'free') {
    return `🚫 Has alcanzado tu límite de 10 transacciones diarias.\n\n` +
           `🚀 ¡Upgrade a Premium y obtén 300 transacciones diarias!\n` +
           `💎 Solo $29.99/mes\n` +
           `👉 Upgrade: tu-app.com/upgrade`;
  } else {
    return `⚠️ Has alcanzado tu límite diario de transacciones.\n` +
           `🔄 Tu límite se resetea mañana a las 00:00.\n` +
           `📞 Si necesitas más transacciones, contáctanos.`;
  }
}
```

### **Tarea 2.2: Modificación del Webhook Principal**
**Duración:** 3 horas
**Prioridad:** 🚨 Crítica

**Archivo:** `src/app/api/whatsapp-webhook/route.js`

```javascript
import { rateLimitMiddleware } from '@/middleware/rate-limit-middleware';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validar estructura básica del webhook
    if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return NextResponse.json({ status: 'ok' });
    }
    
    const message = body.entry[0].changes[0].value.messages[0];
    const whatsappNumber = message.from;
    
    // Buscar usuario
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .in('whatsapp', [whatsappNumber, `+${whatsappNumber}`]);

    if (!users || users.length === 0) {
      console.log('❌ Usuario no registrado:', whatsappNumber);
      await enviarMensajeWhatsApp(
        whatsappNumber, 
        '¡Hola! 👋 Para usar este servicio, primero necesitas registrarte en nuestra web.'
      );
      return NextResponse.json({ status: 'ok' });
    }

    const user = users[0];
    
    // 🚨 APLICAR RATE LIMITING
    const rateLimitResponse = await rateLimitMiddleware(request, user.id);
    if (rateLimitResponse) {
      // Si hay rate limiting, enviar mensaje al usuario también
      const rateLimitData = await rateLimitResponse.json();
      await enviarMensajeWhatsApp(whatsappNumber, rateLimitData.message);
      return rateLimitResponse;
    }
    
    // Continuar con procesamiento normal del mensaje
    console.log('✅ Rate limit passed, processing message');
    await procesarMensaje(message, body);
    
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('❌ Error crítico en webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

---

## 📊 **Fase 3: Monitoreo y Analytics (Días 5-6)**

### **Tarea 3.1: Dashboard de Rate Limiting**
**Duración:** 6 horas
**Prioridad:** 🎯 Media

**Archivo:** `src/app/admin/rate-limits/page.tsx`

```typescript
export default function RateLimitDashboard() {
  return (
    <div className="space-y-6">
      <h1>Rate Limiting Analytics</h1>
      
      {/* Métricas en tiempo real */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Requests Today" value={todayRequests} />
        <MetricCard title="Blocked Today" value={blockedToday} />
        <MetricCard title="Free Users Hitting Limit" value={freeUsersBlocked} />
        <MetricCard title="Premium Conversion Rate" value={conversionRate} />
      </div>
      
      {/* Gráficos de uso */}
      <RateLimitChart />
      
      {/* Tabla de logs recientes */}
      <RateLimitLogsTable />
      
      {/* Configuración dinámica */}
      <RateLimitConfigPanel />
    </div>
  );
}
```

### **Tarea 3.2: Funciones SQL para Analytics**
**Duración:** 3 horas
**Prioridad:** 🎯 Media

```sql
-- Función para obtener estadísticas diarias
CREATE OR REPLACE FUNCTION get_rate_limit_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_requests BIGINT,
  blocked_requests BIGINT,
  unique_users BIGINT,
  free_users_blocked BIGINT,
  premium_users_blocked BIGINT,
  top_blocked_ips JSON
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE blocked = true) as blocked_requests,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE blocked = true AND plan_type = 'free') as free_users_blocked,
    COUNT(*) FILTER (WHERE blocked = true AND plan_type = 'premium') as premium_users_blocked,
    json_agg(DISTINCT ip_address) FILTER (WHERE blocked = true) as top_blocked_ips
  FROM rate_limit_logs 
  WHERE DATE(created_at) = target_date;
END;
$$;

-- Función para detectar usuarios cerca del límite
CREATE OR REPLACE FUNCTION get_users_near_limit()
RETURNS TABLE(
  user_id UUID,
  current_usage BIGINT,
  daily_limit INTEGER,
  usage_percentage NUMERIC,
  plan_type TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH daily_usage AS (
    SELECT 
      rl.user_id,
      COUNT(*) as current_usage,
      rlc.daily_limit,
      rlc.plan_type
    FROM rate_limit_logs rl
    JOIN rate_limit_config rlc ON rl.plan_type = rlc.plan_type
    WHERE DATE(rl.created_at) = CURRENT_DATE
      AND rl.blocked = false
    GROUP BY rl.user_id, rlc.daily_limit, rlc.plan_type
  )
  SELECT 
    du.user_id,
    du.current_usage,
    du.daily_limit,
    ROUND((du.current_usage::NUMERIC / du.daily_limit) * 100, 2) as usage_percentage,
    du.plan_type
  FROM daily_usage du
  WHERE (du.current_usage::NUMERIC / du.daily_limit) > 0.8 -- 80% del límite
  ORDER BY usage_percentage DESC;
END;
$$;
```

---

## 🔔 **Fase 4: Notificaciones Proactivas (Día 7)**

### **Tarea 4.1: Sistema de Alertas Automáticas**
**Duración:** 4 horas
**Prioridad:** 🎯 Media

**Archivo:** `src/lib/rate-limit-notifications.ts`

```typescript
export class RateLimitNotificationService {
  
  async sendLimitWarning(userId: string, usage: number, limit: number): Promise<void> {
    const percentage = (usage / limit) * 100;
    
    if (percentage >= 80 && percentage < 90) {
      // Advertencia al 80%
      await this.sendWarningNotification(userId, 'near_limit', {
        used: usage,
        total: limit,
        remaining: limit - usage
      });
    } else if (percentage >= 90) {
      // Advertencia crítica al 90%
      await this.sendWarningNotification(userId, 'critical_limit', {
        used: usage,
        total: limit,
        remaining: limit - usage
      });
    }
  }
  
  async sendUpgradeReminder(userId: string): Promise<void> {
    // Recordatorio de upgrade para usuarios que hitting limit frecuentemente
  }
  
  private async sendWarningNotification(
    userId: string, 
    type: string, 
    data: any
  ): Promise<void> {
    // Implementar notificación (email, push, WhatsApp)
  }
}
```

### **Tarea 4.2: Job Scheduler para Monitoreo**
**Duración:** 3 horas
**Prioridad:** 🔧 Baja

**Archivo:** `src/lib/rate-limit-jobs.ts`

```typescript
// Job que corre cada hora para detectar patrones
export async function rateLimitMonitoringJob(): Promise<void> {
  const stats = await supabase.rpc('get_rate_limit_stats');
  const nearLimitUsers = await supabase.rpc('get_users_near_limit');
  
  // Enviar notificaciones a usuarios cerca del límite
  for (const user of nearLimitUsers.data || []) {
    if (user.usage_percentage > 80) {
      await notificationService.sendLimitWarning(
        user.user_id, 
        user.current_usage, 
        user.daily_limit
      );
    }
  }
  
  // Alertas para admin si hay patrones sospechosos
  if (stats.data?.[0]?.blocked_requests > 100) {
    await sendAdminAlert('High rate limit blocks detected');
  }
}
```

---

## ⚡ **Fase 5: Optimización y Edge Cases (Día 8)**

### **Tarea 5.1: Edge Functions (Opcional)**
**Duración:** 6 horas
**Prioridad:** 🔧 Baja

```typescript
// Edge function para rate limiting ultra-rápido
// supabase/functions/rate-limiter/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { userId, ipAddress } = await req.json()
  
  // Verificación de rate limit en edge
  const allowed = await checkRateLimitEdge(userId, ipAddress)
  
  return new Response(
    JSON.stringify({ allowed, remaining: 5 }),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

### **Tarea 5.2: Configuración Dinámica desde Admin**
**Duración:** 4 horas
**Prioridad:** 🎯 Media

```typescript
// Panel para modificar límites en tiempo real
export function RateLimitConfigPanel() {
  const [config, setConfig] = useState<RateLimitConfig[]>([]);
  
  const updateLimits = async (planType: string, newLimits: any) => {
    await supabase
      .from('rate_limit_config')
      .update(newLimits)
      .eq('plan_type', planType);
      
    // Invalidar cache si existe
    await invalidateRateLimitCache();
  };
  
  return (
    <div>
      {config.map(plan => (
        <ConfigEditor 
          key={plan.plan_type}
          plan={plan}
          onUpdate={updateLimits}
        />
      ))}
    </div>
  );
}
```

---

## 🧪 **Fase 6: Testing y QA (Día 9)**

### **Tarea 6.1: Tests Unitarios**
**Duración:** 4 horas
**Prioridad:** 🚨 Crítica

```typescript
// tests/rate-limiter.test.ts
describe('WhatsAppRateLimiter', () => {
  test('should allow requests under limit', async () => {
    const result = await rateLimiter.checkRateLimit('user1', '1.1.1.1');
    expect(result.allowed).toBe(true);
  });
  
  test('should block requests over daily limit', async () => {
    // Simular 11 requests para usuario gratuito
    for (let i = 0; i < 11; i++) {
      await rateLimiter.checkRateLimit('user1', '1.1.1.1');
    }
    const result = await rateLimiter.checkRateLimit('user1', '1.1.1.1');
    expect(result.allowed).toBe(false);
  });
  
  test('should handle premium vs free users differently', async () => {
    // Test de diferencias entre planes
  });
});
```

### **Tarea 6.2: Tests de Integración**
**Duración:** 3 horas
**Prioridad:** 🚨 Crítica

```typescript
// tests/webhook-rate-limit.test.ts
describe('Webhook Rate Limiting Integration', () => {
  test('should return 429 when limit exceeded', async () => {
    const response = await request(app)
      .post('/api/whatsapp-webhook')
      .send(mockWebhookPayload);
      
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Rate limit exceeded');
  });
});
```

---

## 📊 **Métricas de Éxito**

### **KPIs Técnicos:**
- ✅ 0% false positives en rate limiting
- ✅ < 50ms latencia adicional por verificación
- ✅ 99.9% uptime del sistema de rate limiting
- ✅ 0 requests perdidos por errores de rate limiter

### **KPIs de Negocio:**
- ✅ 25% conversion rate de usuarios que hitting limit
- ✅ 50% reducción en abuso de API
- ✅ 30% aumento en upgrade rate después de warnings
- ✅ 0 complaints por falsos positivos

### **KPIs de Performance:**
- ✅ Rate limiter cache hit rate > 95%
- ✅ Database queries para rate limiting < 100ms p95
- ✅ Memory usage < 50MB para rate limiter
- ✅ Log storage growth < 1GB/month

---

## 🔧 **Configuración y Deployment**

### **Variables de Entorno:**
```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_CACHE_TTL=300
RATE_LIMIT_LOG_RETENTION_DAYS=90
RATE_LIMIT_BURST_PROTECTION=true

# Notificaciones
RATE_LIMIT_NOTIFICATIONS_ENABLED=true
RATE_LIMIT_WARNING_THRESHOLD=0.8
RATE_LIMIT_CRITICAL_THRESHOLD=0.9

# Performance
RATE_LIMIT_CACHE_SIZE=10000
RATE_LIMIT_BATCH_SIZE=100
```

### **Scripts de Migración:**
```sql
-- Script que debes ejecutar en Supabase para que funcione:
\i 'migrations/001_rate_limit_tables.sql'
\i 'migrations/002_rate_limit_functions.sql'  
\i 'migrations/003_rate_limit_policies.sql'
```

---

## 🚀 **Cronograma de Implementación**

| Día | Tareas | Duración | Prioridad |
|-----|--------|----------|-----------|
| 1-2 | Base de datos + Servicios core | 10h | 🚨 Crítica |
| 3-4 | Integración webhook + Middleware | 7h | 🚨 Crítica |  
| 5-6 | Analytics + Dashboard | 9h | 🎯 Media |
| 7 | Notificaciones | 7h | 🎯 Media |
| 8 | Optimización + Edge cases | 10h | 🔧 Baja |
| 9 | Testing + QA | 7h | 🚨 Crítica |

**Total: 50 horas (1.5 semanas)**

## ✅ **Checklist de Finalización**

- [ ] Tablas de base de datos creadas y pobladas
- [ ] Rate limiter service implementado y testeado
- [ ] Middleware integrado en webhook
- [ ] Logging funcionando correctamente
- [ ] Dashboard de analytics operativo
- [ ] Notificaciones automáticas configuradas
- [ ] Tests unitarios e integración passing
- [ ] Performance optimizado (< 50ms overhead)
- [ ] Documentación completa
- [ ] Deployment en producción exitoso

---

## 🎯 **Siguientes Pasos Post-Implementación**

1. **Monitoreo de 48h** para ajustar límites
2. **A/B testing** de mensajes de upgrade
3. **Analytics de conversión** rate limit → upgrade
4. **Optimización** basada en patrones reales de uso
5. **Expansión** a otros endpoints de la API
