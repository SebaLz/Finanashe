import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase';
import { WarningMetrics } from './transaction-rate-limiter';
import axios from 'axios';

/**
 * Servicio de notificaciones para rate limiting de transacciones
 */
export class TransactionRateLimitNotificationService {
  private supabase: SupabaseClient<Database>;
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }

  /**
   * Procesar advertencias automáticas después de registrar una transacción
   */
  async processWarnings(
    userId: string, 
    currentUsage: number, 
    monthlyLimit: number, 
    planType: string
  ): Promise<void> {
    try {
      console.log(`🔔 Processing rate limit warnings for user: ${userId}`);
      
      const percentage = (currentUsage / monthlyLimit) * 100;
      
      // Solo enviar notificaciones si está cerca del límite
      if (percentage >= 80) {
        const metrics: WarningMetrics = {
          used: currentUsage,
          total: monthlyLimit,
          remaining: monthlyLimit - currentUsage,
          percentage: Math.round(percentage),
          plan: planType,
          resetTime: await this.getNextMonthStart()
        };
        
        if (percentage >= 90) {
          // Advertencia crítica al 90%
          await this.sendCriticalWarning(userId, metrics);
          
          // Enviar recordatorio de upgrade si es usuario free
          if (planType === 'free') {
            await this.sendUpgradeReminder(userId, metrics);
          }
        } else if (percentage >= 80) {
          // Advertencia al 80%
          await this.sendLimitWarning(userId, metrics);
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing rate limit warnings:', error);
    }
  }

  /**
   * Enviar advertencia de límite (80-89%)
   */
  private async sendLimitWarning(userId: string, metrics: WarningMetrics): Promise<boolean> {
    try {
      // Verificar si ya se envió una advertencia reciente
      const recentWarning = await this.hasRecentWarning(userId, 'limit_warning_80');
      if (recentWarning) {
        console.log(`⚠️ Recent warning already sent for user: ${userId}`);
        return false;
      }
      
      // Obtener datos del usuario
      const userData = await this.getUserData(userId);
      if (!userData?.whatsapp) {
        console.log(`❌ No WhatsApp number for user: ${userId}`);
        return false;
      }
      
      // Generar mensaje de advertencia
      const message = this.generateWarningMessage(metrics, false);
      
      // Enviar mensaje por WhatsApp
      await this.sendWhatsAppMessage(userData.whatsapp, message);
      
      // Registrar notificación
      await this.logNotification(userId, 'limit_warning_80', metrics);
      
      console.log(`✅ Warning sent to user: ${userId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending limit warning:', error);
      return false;
    }
  }

  /**
   * Enviar advertencia crítica (90%+)
   */
  private async sendCriticalWarning(userId: string, metrics: WarningMetrics): Promise<boolean> {
    try {
      // Verificar si ya se envió una advertencia crítica reciente
      const recentWarning = await this.hasRecentWarning(userId, 'limit_warning_90');
      if (recentWarning) {
        console.log(`🚨 Recent critical warning already sent for user: ${userId}`);
        return false;
      }
      
      // Obtener datos del usuario
      const userData = await this.getUserData(userId);
      if (!userData?.whatsapp) {
        console.log(`❌ No WhatsApp number for user: ${userId}`);
        return false;
      }
      
      // Generar mensaje de advertencia crítica
      const message = this.generateWarningMessage(metrics, true);
      
      // Enviar mensaje por WhatsApp
      await this.sendWhatsAppMessage(userData.whatsapp, message);
      
      // Registrar notificación
      await this.logNotification(userId, 'limit_warning_90', metrics);
      
      console.log(`🚨 Critical warning sent to user: ${userId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending critical warning:', error);
      return false;
    }
  }

  /**
   * Enviar recordatorio de upgrade para usuarios free
   */
  private async sendUpgradeReminder(userId: string, metrics: WarningMetrics): Promise<boolean> {
    try {
      // Solo para usuarios free
      if (metrics.plan !== 'free') {
        return false;
      }
      
      // Verificar si ya se envió un recordatorio reciente
      const recentReminder = await this.hasRecentWarning(userId, 'upgrade_reminder');
      if (recentReminder) {
        console.log(`💎 Recent upgrade reminder already sent for user: ${userId}`);
        return false;
      }
      
      // Obtener datos del usuario
      const userData = await this.getUserData(userId);
      if (!userData?.whatsapp) {
        return false;
      }
      
      // Generar mensaje de upgrade
      const message = this.generateUpgradeMessage(metrics);
      
      // Enviar mensaje por WhatsApp
      await this.sendWhatsAppMessage(userData.whatsapp, message);
      
      // Registrar notificación
      await this.logNotification(userId, 'upgrade_reminder', metrics);
      
      console.log(`💎 Upgrade reminder sent to user: ${userId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending upgrade reminder:', error);
      return false;
    }
  }

  /**
   * Generar mensaje de advertencia
   */
  private generateWarningMessage(metrics: WarningMetrics, isCritical: boolean): string {
    const { used, total, remaining, percentage, plan } = metrics;
    
    if (isCritical) {
      return `🚨 *ALERTA CRÍTICA - Límite Mensual*\n\n` +
             `Has usado *${used} de ${total}* transacciones WhatsApp este mes (${percentage}%)\n\n` +
             `⚠️ Te quedan solo *${remaining} transacciones*\n\n` +
             (plan === 'free' 
               ? `🚀 *¡Upgrade a Premium AHORA!*\n` +
                 `✨ *300 transacciones mensuales*\n` +
                 `💎 Solo *$29.99 ARS/mes*\n` +
                 `👉 https://tu-dominio.com/upgrade\n\n`
               : '') +
             `🔄 Tu límite se resetea el 1ro del próximo mes\n\n` +
             `💡 *Tip:* Usa comandos más específicos para aprovechar mejor tus transacciones.`;
    } else {
      return `⚠️ *Advertencia - Límite Mensual*\n\n` +
             `Has usado *${used} de ${total}* transacciones WhatsApp este mes (${percentage}%)\n\n` +
             `📊 Te quedan *${remaining} transacciones*\n\n` +
             (plan === 'free' 
               ? `💡 *Tip:* Con Premium tendrías *300 transacciones/mes*\n` +
                 `👉 https://tu-dominio.com/upgrade\n\n`
               : '') +
             `🔄 Tu límite se resetea el 1ro del próximo mes\n\n` +
             `📝 Sigue registrando tus transacciones normalmente.`;
    }
  }

  /**
   * Generar mensaje de upgrade
   */
  private generateUpgradeMessage(metrics: WarningMetrics): string {
    const { used, total, remaining } = metrics;
    
    return `💎 *¡Aprovecha el Poder de Premium!*\n\n` +
           `Has usado *${used} de ${total}* transacciones gratuitas este mes.\n\n` +
           `🚀 *Con Premium obtienes:*\n` +
           `✨ *300 transacciones mensuales* (30x más)\n` +
           `📊 *Análisis avanzados*\n` +
           `🎯 *Metas personalizadas*\n` +
           `⚡ *Soporte prioritario*\n\n` +
           `💵 Solo *$29.99 ARS/mes*\n` +
           `🎁 *7 días de prueba GRATIS*\n\n` +
           `👉 ¡Upgrade ahora: https://tu-dominio.com/upgrade\n\n` +
           `Te quedan *${remaining} transacciones* este mes.`;
  }

  /**
   * Verificar si hay una advertencia reciente
   */
  private async hasRecentWarning(userId: string, notificationType: string): Promise<boolean> {
    try {
      const hoursAgo = 24; // No enviar la misma advertencia por 24 horas
      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('rate_limit_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('notification_type', notificationType)
        .gte('created_at', cutoffTime.toISOString())
        .single();
      
      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Obtener datos del usuario
   */
  private async getUserData(userId: string): Promise<{ whatsapp: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('whatsapp')
        .eq('id', userId)
        .single();
      
      if (error || !data?.whatsapp) {
        return null;
      }
      
      return { whatsapp: data.whatsapp };
    } catch {
      return null;
    }
  }

  /**
   * Enviar mensaje por WhatsApp
   */
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      // Usar las mismas variables que el webhook principal
      const phoneNumberId = process.env.PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_TOKEN;
      
      if (!phoneNumberId || !accessToken) {
        console.error('❌ Missing WhatsApp credentials for notifications');
        throw new Error('Missing WhatsApp configuration for notifications');
      }
      
      const whatsappUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      
      const response = await axios.post(whatsappUrl, {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📱 WhatsApp notification sent to ${phoneNumber}: ${response.status}`);
    } catch (error) {
      console.error('❌ Error sending WhatsApp notification:', error);
      throw error;
    }
  }

  /**
   * Registrar notificación en la base de datos
   */
  private async logNotification(userId: string, notificationType: string, metrics: WarningMetrics): Promise<void> {
    try {
      await this.supabase
        .from('rate_limit_notifications')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          trigger_usage: metrics.used,
          trigger_limit: metrics.total,
          plan_type: metrics.plan,
          metadata: {
            percentage: metrics.percentage,
            remaining: metrics.remaining,
            reset_time: metrics.resetTime.toISOString()
          },
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
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
export function createTransactionRateLimitNotificationService(): TransactionRateLimitNotificationService {
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
  
  return new TransactionRateLimitNotificationService(supabase);
} 