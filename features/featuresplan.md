# 🚀 Plan de Implementación - Rate Limiting WhatsApp Webhook

> **Objetivo:** Implementar sistema de rate limiting robusto para el webhook `/api/whatsapp-webhook` con límites dinámicos según el plan del usuario

## 📋 **Resumen del Feature Spec**

**Límites por Plan:**
- **Gratuito**: 10 transacciones WhatsApp/mes
- **Premium**: 300 transacciones WhatsApp/mes

**IMPORTANTE:** Una "transacción" se cuenta solo cuando se registra exitosamente en la base de datos, NO por cada mensaje de WhatsApp.

**Requisitos Críticos:**
- ✅ Validación por user_id (NO por mensajes, solo por transacciones guardadas)
- ✅ Conteo mensual de transacciones registradas en BD
- ✅ Bloqueo con mensajes claros y revert de transacción
- ✅ Logging completo de transacciones
- ✅ Configuración dinámica (no hardcoded)
- ✅ Notificaciones proactivas al 80% y 90%
- ✅ Compatible con WhatsApp Bot workflow

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
('free', 10, NULL, NULL),
('premium', 300, NULL, NULL)
ON CONFLICT (plan_type) DO UPDATE SET
  daily_limit = EXCLUDED.daily_limit;

-- NOTA: daily_limit se usa como monthly_limit (10 transacciones/mes para free, 300/mes para premium)
-- hourly_limit y minute_limit se setean a NULL ya que no se usan

-- Índices para performance (sin funciones para compatibilidad total con Supabase)
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_created ON rate_limit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_created ON rate_limit_logs(ip_address, created_at);

-- Índices adicionales para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_blocked ON rate_limit_logs(blocked, created_at) WHERE blocked = true;
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_plan_type ON rate_limit_logs(plan_type, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_endpoint ON rate_limit_logs(endpoint, created_at);

-- Índices para consultas por fecha específica (evitando funciones)
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_date ON rate_limit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_blocked ON rate_limit_logs(user_id, blocked);
```

### **Tarea 1.2: Servicios Core de Rate Limiting**
**Duración:** 6 horas
**Prioridad:** 🚨 Crítica

**Archivo:** `src/lib/rate-limiter.ts`

```typescript
export interface RateLimitConfig {
  monthlyLimit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    monthly: number;
  };
  resetTime: {
    monthly: Date;
  };
  currentPlan: string;
  currentUsage: number;
  monthlyLimit: number;
  reason?: string;
}

export interface TransactionRateLimitResult {
  allowed: boolean;
  currentUsage: number;
  monthlyLimit: number;
  plan: string;
  message?: string;
}

export class WhatsAppRateLimiter {
  private supabase: SupabaseClient;
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Verificar si el usuario puede registrar una transacción más este mes
   */
  async checkTransactionRateLimit(userId: string): Promise<TransactionRateLimitResult> {
    try {
      // Obtener plan del usuario
      const planType = await this.getUserPlan(userId);
      
      // Obtener configuración de límites mensuales
      const config = await this.getRateLimitConfig(planType);
      
      // Contar transacciones del mes actual
      const monthlyCount = await this.getMonthlyTransactionCount(userId);
      
      const allowed = monthlyCount < config.monthlyLimit;
      
      return {
        allowed,
        currentUsage: monthlyCount,
        monthlyLimit: config.monthlyLimit,
        plan: planType,
        message: allowed ? undefined : this.generateLimitMessage(planType, monthlyCount, config.monthlyLimit)
      };
      
    } catch (error) {
      console.error('❌ Error checking transaction rate limit:', error);
      // Fail-open: permitir en caso de error
      return {
        allowed: true,
        currentUsage: 0,
        monthlyLimit: 999,
        plan: 'unknown'
      };
    }
  }

  /**
   * Registrar una transacción para rate limiting
   */
  async logTransaction(
    userId: string,
    transactionId: string,
    planType: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('rate_limit_logs')
        .insert({
          user_id: userId,
          ip_address: 'whatsapp',
          endpoint: '/api/whatsapp-webhook',
          limit_type: 'monthly_transaction',
          current_count: await this.getMonthlyTransactionCount(userId) + 1,
          limit_threshold: planType === 'free' ? 10 : 300,
          plan_type: planType,
          blocked: false,
          reason: 'Transaction registered successfully',
          request_metadata: { transaction_id: transactionId }
        });
        
    } catch (error) {
      console.error('❌ Error logging transaction:', error);
    }
  }

  /**
   * Obtener count de transacciones del mes actual
   */
  private async getMonthlyTransactionCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count, error } = await this.supabase
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('limit_type', 'monthly_transaction')
      .eq('blocked', false)
      .gte('created_at', startOfMonth.toISOString());
    
    if (error) {
      console.error('❌ Error counting monthly transactions:', error);
      return 0;
    }
    
    return count || 0;
  }

  private generateLimitMessage(planType: string, currentUsage: number, limit: number): string {
    if (planType === 'free') {
      return `🚫 *Límite Mensual Alcanzado*\n\n` +
             `Has alcanzado tu límite de *${limit} transacciones mensuales* del plan gratuito.\n\n` +
             `📊 Transacciones usadas: *${currentUsage}/${limit}*\n\n` +
             `🚀 *¡Upgrade a Premium!*\n` +
             `✨ *300 transacciones mensuales*\n` +
             `💎 Solo *$29.99 ARS/mes*\n\n` +
             `🔄 Tu límite se resetea el 1ro del próximo mes\n` +
             `👉 Upgrade: https://tu-dominio.com/upgrade`;
    } else {
      return `⚠️ *Límite Premium Alcanzado*\n\n` +
             `Has alcanzado tu límite de *${limit} transacciones mensuales*.\n\n` +
             `📊 Transacciones usadas: *${currentUsage}/${limit}*\n\n` +
             `🔄 Tu límite se resetea el 1ro del próximo mes\n` +
             `📞 Si necesitas más transacciones, contáctanos: /soporte`;
    }
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
    
    // Procesar mensaje normalmente (SIN rate limiting aún)
    console.log('📝 Processing message normally');
    const transactionResult = await procesarMensaje(message, body);
    
    // 🚨 APLICAR RATE LIMITING SOLO SI SE GUARDÓ UNA TRANSACCIÓN
    if (transactionResult.transactionSaved) {
      const rateLimitResult = await checkTransactionRateLimit(user.id);
      
      if (!rateLimitResult.allowed) {
        // REVERTIR la transacción guardada
        await revertTransaction(transactionResult.transactionId);
        
        // Enviar mensaje de límite alcanzado
        await enviarMensajeWhatsApp(whatsappNumber, rateLimitResult.message);
        
        return NextResponse.json({ 
          status: 'rate_limited', 
          reason: 'Monthly transaction limit exceeded' 
        });
      } else {
        // Enviar notificaciones proactivas si está cerca del límite
        await rateLimitNotificationService.processWarnings(
          user.id, 
          rateLimitResult.currentUsage, 
          rateLimitResult.monthlyLimit, 
          rateLimitResult.plan
        );
      }
    }
    
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('❌ Error crítico en webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

---

## 📊 **Fase 3: Monitoreo y Analytics (OMITIDA)**

> **🚫 FASE OMITIDA TEMPORALMENTE**
> 
> Esta fase requiere un panel de administrador que no está implementado en el proyecto actual.
> Se implementará en el futuro cuando se desarrolle la infraestructura de admin.

---

## 🔔 **Fase 4: Notificaciones Proactivas (Día 7)**

### **Tarea 4.1: Sistema de Alertas Automáticas**
**Duración:** 4 horas
**Prioridad:** 🎯 Media

**Archivo:** `src/lib/rate-limit-notifications.ts`

```typescript
export class RateLimitNotificationService {
  
  /**
   * Procesar advertencias automáticas después de registrar una transacción
   */
  async processWarnings(
    userId: string, 
    currentUsage: number, 
    monthlyLimit: number, 
    planType: string
  ): Promise<void> {
    const percentage = (currentUsage / monthlyLimit) * 100;
    
    if (percentage >= 80 && percentage < 90) {
      // Advertencia al 80%
      await this.sendLimitWarning(userId, {
        used: currentUsage,
        total: monthlyLimit,
        remaining: monthlyLimit - currentUsage,
        percentage: Math.round(percentage),
        plan: planType,
        resetTime: this.getNextMonthStart()
      });
    } else if (percentage >= 90) {
      // Advertencia crítica al 90%
      await this.sendLimitWarning(userId, {
        used: currentUsage,
        total: monthlyLimit,
        remaining: monthlyLimit - currentUsage,
        percentage: Math.round(percentage),
        plan: planType,
        resetTime: this.getNextMonthStart()
      });
      
      // Enviar recordatorio de upgrade si es usuario free
      if (planType === 'free') {
        await this.sendUpgradeReminder(userId);
      }
    }
  }
  
  async sendLimitWarning(userId: string, metrics: WarningMetrics): Promise<boolean> {
    try {
      // Verificar si ya se envió una advertencia reciente
      const recentWarning = await this.hasRecentWarning(userId, 'limit_warning');
      if (recentWarning) {
        return false;
      }
      
      // Obtener datos del usuario
      const userData = await this.getUserData(userId);
      if (!userData?.whatsapp) {
        return false;
      }
      
      // Generar mensaje de advertencia
      const message = this.generateWarningMessage(metrics);
      
      // Enviar mensaje por WhatsApp
      await this.sendWhatsAppMessage(userData.whatsapp, message);
      
      // Registrar notificación
      await this.logNotification(userId, 'limit_warning', metrics);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error sending limit warning:', error);
      return false;
    }
  }
  
  private generateWarningMessage(metrics: WarningMetrics): string {
    const { used, total, remaining, percentage, plan } = metrics;
    
    if (percentage >= 90) {
      return `⚠️ *ALERTA CRÍTICA!*\n\n` +
             `Has usado *${used} de ${total}* transacciones WhatsApp este mes (${percentage}%)\n` +
             `📊 Te quedan solo *${remaining} transacciones*\n\n` +
             (plan === 'free' 
               ? `🚀 *¡Upgrade a Premium para 300 transacciones!*\n👉 https://tu-dominio.com/upgrade\n\n`
               : '') +
             `🔄 Tu límite se resetea el 1ro del próximo mes`;
    } else {
      return `⚠️ *Advertencia de Límite*\n\n` +
             `Has usado *${used} de ${total}* transacciones WhatsApp este mes (${percentage}%)\n` +
             `📊 Te quedan *${remaining} transacciones*\n\n` +
             (plan === 'free' 
               ? `💡 *Tip:* Con Premium tendrías 300 transacciones/mes\n👉 https://tu-dominio.com/upgrade\n\n`
               : '') +
             `🔄 Tu límite se resetea el 1ro del próximo mes`;
    }
  }
  
  private getNextMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
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

### **Tarea 5.2: Configuración Dinámica desde Admin (OMITIDA)**
**Duración:** 4 horas
**Prioridad:** 🎯 Media

> **🚫 TAREA OMITIDA TEMPORALMENTE**
> 
> Esta tarea requiere un panel de administrador que no está implementado en el proyecto actual.
> Se implementará en el futuro cuando se desarrolle la infraestructura de admin.

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
| ~~5-6~~ | ~~Analytics + Dashboard~~ | ~~9h~~ | ~~🎯 Media~~ |
| 5 | Notificaciones | 7h | 🎯 Media |
| 6 | Optimización + Edge cases | 6h | 🔧 Baja |
| 7 | Testing + QA | 7h | 🚨 Crítica |

**Total: 37 horas (1 semana)**

> **Nota:** Se omitieron las tareas que requieren panel de administrador (Fase 3 y Tarea 5.2) para implementar posteriormente.

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
