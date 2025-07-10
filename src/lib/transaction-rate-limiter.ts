import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase';

export interface TransactionRateLimitResult {
  allowed: boolean;
  currentUsage: number;
  monthlyLimit: number;
  plan: string;
  message?: string;
}

export interface WarningMetrics {
  used: number;
  total: number;
  remaining: number;
  percentage: number;
  plan: string;
  resetTime: Date;
}

/**
 * Rate Limiter para TRANSACCIONES (NO mensajes de WhatsApp)
 * Se aplica DESPUÉS de guardar exitosamente una transacción en la BD
 */
export class TransactionRateLimiter {
  private supabase: SupabaseClient<Database>;
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }

  /**
   * Verificar si el usuario puede registrar una transacción más este mes
   * IMPORTANTE: Solo se ejecuta DESPUÉS de guardar la transacción
   */
  async checkTransactionRateLimit(userId: string): Promise<TransactionRateLimitResult> {
    try {
      console.log(`🔍 Checking monthly transaction limit for user: ${userId}`);
      
      // Obtener plan del usuario
      const planType = await this.getUserPlan(userId);
      
      // Obtener límite mensual según el plan
      const monthlyLimit = this.getMonthlyLimit(planType);
      
      // Contar transacciones del mes actual
      const currentUsage = await this.getMonthlyTransactionCount(userId);
      
      console.log(`📊 Transaction count: ${currentUsage}/${monthlyLimit} (plan: ${planType})`);
      
      const allowed = currentUsage < monthlyLimit;
      
      return {
        allowed,
        currentUsage,
        monthlyLimit,
        plan: planType,
        message: allowed ? undefined : this.generateLimitMessage(planType, currentUsage, monthlyLimit)
      };
      
    } catch (error) {
      console.error('❌ Error checking transaction rate limit:', error);
      // Fail-open: permitir en caso de error para no romper el flujo
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
   * Se ejecuta DESPUÉS de guardar exitosamente en transactions table
   */
  async logTransaction(
    userId: string,
    transactionId: string,
    planType: string
  ): Promise<void> {
    try {
      const currentCount = await this.getMonthlyTransactionCount(userId);
      
      const logData = {
        user_id: userId,
        ip_address: '127.0.0.1', // IP fija para transacciones del bot WhatsApp
        endpoint: '/api/whatsapp-webhook',
        limit_type: 'monthly_transaction',
        current_count: currentCount + 1,
        limit_threshold: this.getMonthlyLimit(planType),
        plan_type: planType,
        blocked: false,
        reason: 'WhatsApp bot transaction registered successfully',
        request_metadata: { 
          transaction_id: transactionId,
          month: new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7) // YYYY-MM en timezone Argentina
        }
      };
      
      console.log('📝 Attempting to log transaction with data:', logData);
      
      const { data, error } = await this.supabase
        .from('rate_limit_logs')
        .insert(logData)
        .select();
      
      if (error) {
        console.error('❌ Supabase error logging transaction:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ Transaction logged successfully for rate limiting: ${transactionId}`);
        console.log('📝 Logged data:', data);
      }
        
    } catch (error) {
      console.error('❌ Error logging transaction for rate limiting:', error);
      if (error instanceof Error) {
        console.error('❌ Stack trace:', error.stack);
      }
      // No fallar el flujo principal si falla el logging
    }
  }

  /**
   * Revertir transacción cuando excede rate limit
   */
  async revertTransaction(transactionId: string): Promise<void> {
    try {
      console.log(`🔄 Reverting transaction due to rate limit: ${transactionId}`);
      
      // Marcar transacción como revertida
      const { error } = await this.supabase
        .from('transactions')
        .update({ 
          description: '[REVERTIDA POR LÍMITE] ' + (await this.getTransactionDescription(transactionId)),
          is_budgetable: false 
        })
        .eq('id', transactionId);
      
      if (error) {
        console.error('❌ Error reverting transaction:', error);
      } else {
        console.log(`✅ Transaction reverted successfully: ${transactionId}`);
      }
      
    } catch (error) {
      console.error('❌ Error in revertTransaction:', error);
    }
  }

  /**
   * Obtener conteo de transacciones del mes actual (timezone Argentina)
   */
  private async getMonthlyTransactionCount(userId: string): Promise<number> {
    try {
      // Usar función de base de datos para obtener el inicio del mes en Argentina
      const { data: monthStart, error: monthError } = await this.supabase
        .rpc('get_month_start_argentina');
      
      if (monthError) {
        console.error('❌ Error getting month start:', monthError);
        // Fallback a cálculo manual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        // Ajustar para Argentina (UTC-3)
        startOfMonth.setHours(startOfMonth.getHours() + 3);
        
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
      
      const { count, error } = await this.supabase
        .from('rate_limit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('limit_type', 'monthly_transaction')
        .eq('blocked', false)
        .gte('created_at', monthStart);
      
      if (error) {
        console.error('❌ Error counting monthly transactions:', error);
        return 0;
      }
      
      return count || 0;
      
    } catch (error) {
      console.error('❌ Error in getMonthlyTransactionCount:', error);
      return 0;
    }
  }

  /**
   * Obtener plan del usuario
   */
  private async getUserPlan(userId: string): Promise<string> {
    try {
      // Buscar suscripción activa
      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .select('plan_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        return 'free'; // Default a plan gratuito
      }
      
      return data.plan_type;
      
    } catch (error) {
      console.error('❌ Error getting user plan:', error);
      return 'free';
    }
  }

  /**
   * Obtener límite mensual según el plan
   */
  private getMonthlyLimit(planType: string): number {
    switch (planType) {
      case 'premium':
        return 300;
      case 'free':
      default:
        return 10;
    }
  }

  /**
   * Generar mensaje de límite alcanzado
   */
  private generateLimitMessage(planType: string, currentUsage: number, limit: number): string {
    if (planType === 'free') {
      return `🚫 *Límite Mensual Alcanzado*\n\n` +
             `Has alcanzado tu límite de *${limit} transacciones mensuales* del plan gratuito.\n\n` +
             `📊 Transacciones registradas este mes: *${currentUsage}/${limit}*\n\n` +
             `🚀 *¡Upgrade a Premium!*\n` +
             `✨ *300 transacciones mensuales*\n` +
             `💎 Solo *$29.99 ARS/mes*\n\n` +
             `🔄 Tu límite se resetea el 1ro del próximo mes\n` +
             `👉 Upgrade: https://tu-dominio.com/upgrade\n\n` +
             `💬 Esta transacción ha sido revertida y no se registró.`;
    } else {
      return `⚠️ *Límite Premium Alcanzado*\n\n` +
             `Has alcanzado tu límite de *${limit} transacciones mensuales*.\n\n` +
             `📊 Transacciones registradas este mes: *${currentUsage}/${limit}*\n\n` +
             `🔄 Tu límite se resetea el 1ro del próximo mes\n` +
             `📞 Si necesitas más transacciones, contáctanos: /soporte\n\n` +
             `💬 Esta transacción ha sido revertida y no se registró.`;
    }
  }

  /**
   * Obtener descripción de transacción para revert
   */
  private async getTransactionDescription(transactionId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('transactions')
        .select('description')
        .eq('id', transactionId)
        .single();
      
      return data?.description || 'Transacción sin descripción';
    } catch {
      return 'Transacción sin descripción';
    }
  }

  /**
   * Obtener métricas para notificaciones
   */
  async getWarningMetrics(currentUsage: number, monthlyLimit: number, planType: string): Promise<WarningMetrics> {
    const remaining = monthlyLimit - currentUsage;
    const percentage = Math.round((currentUsage / monthlyLimit) * 100);
    
    return {
      used: currentUsage,
      total: monthlyLimit,
      remaining,
      percentage,
      plan: planType,
      resetTime: await this.getNextMonthStart()
    };
  }

  /**
   * Obtener fecha de inicio del próximo mes (timezone Argentina)
   */
  private async getNextMonthStart(): Promise<Date> {
    try {
      const { data: nextMonthStart, error } = await this.supabase
        .rpc('get_next_month_start_argentina');
      
      if (error) {
        console.error('❌ Error getting next month start:', error);
        // Fallback a cálculo manual ajustado para Argentina
        const now = new Date();
        // Ajustar para Argentina (UTC-3)
        now.setHours(now.getHours() - 3);
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      
      return new Date(nextMonthStart);
    } catch (error) {
      console.error('❌ Error in getNextMonthStart:', error);
      // Fallback
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }
}

/**
 * Helper function para crear instancia
 */
export function createTransactionRateLimiter(): TransactionRateLimiter {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  return new TransactionRateLimiter(supabase);
} 