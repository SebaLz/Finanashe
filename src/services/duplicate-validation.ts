import { supabase } from '@/lib/supabase';

// Tipos para la validación de duplicados
export interface TransactionData {
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  date: string;
  description?: string;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  exact_matches: any[];
  similar_matches: any[];
  confidence_level: 'high' | 'medium' | 'low';
  recommendation: 'block' | 'warn' | 'allow';
}

export interface SimilarTransaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  category_name: string;
  similarity_score: number;
  days_difference: number;
}

/**
 * Verifica si una transacción es duplicada basándose en criterios estrictos
 */
export async function checkDuplicateTransaction(
  transactionData: TransactionData
): Promise<DuplicateCheckResult> {
  try {
    console.log('🔍 Iniciando validación de duplicados:', {
      user_id: transactionData.user_id,
      amount: transactionData.amount,
      date: transactionData.date,
      type: transactionData.type
    });

    // Configuración desde variables de entorno
    const checkHours = parseInt(process.env.DUPLICATE_CHECK_HOURS || '24');
    const amountTolerance = 1; // ±$1 de tolerancia

    // Calcular rango de fechas para la búsqueda
    const targetDate = new Date(transactionData.date);
    const startDate = new Date(targetDate);
    startDate.setHours(startDate.getHours() - checkHours);
    
    const endDate = new Date(targetDate);
    endDate.setHours(endDate.getHours() + checkHours);

    console.log(`🕒 Buscando duplicados en ventana de ${checkHours} horas:`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // 1. Buscar coincidencias exactas
    const exactMatches = await findExactMatches(transactionData, startDate, endDate, amountTolerance);
    
    // 2. Buscar coincidencias similares (rango más amplio)
    const similarMatches = await findSimilarTransactions(transactionData);

    // 3. Determinar el nivel de confianza y recomendación
    const result = analyzeMatches(exactMatches, similarMatches);

    console.log('📊 Resultado de validación de duplicados:', result);

    return result;

  } catch (error) {
    console.error('❌ Error en checkDuplicateTransaction:', error);
    // En caso de error, ser conservador y permitir la transacción
    return {
      is_duplicate: false,
      exact_matches: [],
      similar_matches: [],
      confidence_level: 'low',
      recommendation: 'allow'
    };
  }
}

/**
 * Busca transacciones exactamente iguales o muy similares
 */
async function findExactMatches(
  transactionData: TransactionData,
  startDate: Date,
  endDate: Date,
  amountTolerance: number
): Promise<any[]> {
  try {
    const { data: exactMatches, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        date,
        description,
        created_at,
        categories:category_id (name, emoji)
      `)
      .eq('user_id', transactionData.user_id)
      .eq('type', transactionData.type)
      .eq('category_id', transactionData.category_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .gte('amount', transactionData.amount - amountTolerance)
      .lte('amount', transactionData.amount + amountTolerance);

    if (error) {
      console.error('Error buscando coincidencias exactas:', error);
      return [];
    }

    console.log(`🎯 Coincidencias exactas encontradas: ${exactMatches?.length || 0}`);
    return exactMatches || [];

  } catch (error) {
    console.error('Error en findExactMatches:', error);
    return [];
  }
}

/**
 * Busca transacciones similares en un rango más amplio (±2 días, ±5% monto)
 */
export async function findSimilarTransactions(
  transactionData: TransactionData
): Promise<SimilarTransaction[]> {
  try {
    const targetDate = new Date(transactionData.date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 2); // ±2 días
    
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 2);

    // Calcular rango de montos (±5%)
    const amountTolerance = transactionData.amount * 0.05;
    const minAmount = transactionData.amount - amountTolerance;
    const maxAmount = transactionData.amount + amountTolerance;

    console.log(`🔍 Buscando transacciones similares:`, {
      dateRange: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
      amountRange: `$${minAmount.toFixed(2)} - $${maxAmount.toFixed(2)}`
    });

    const { data: similarTransactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        date,
        description,
        categories:category_id (name, emoji)
      `)
      .eq('user_id', transactionData.user_id)
      .eq('type', transactionData.type)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .gte('amount', minAmount)
      .lte('amount', maxAmount)
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error buscando transacciones similares:', error);
      return [];
    }

    // Calcular scores de similitud
    const similarWithScores = (similarTransactions || []).map(transaction => {
      const daysDiff = Math.abs(
        (new Date(transaction.date).getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const amountDiff = Math.abs(transaction.amount - transactionData.amount);
      const amountSimilarity = 1 - (amountDiff / transactionData.amount);
      const dateSimilarity = 1 - (daysDiff / 2); // Normalizar sobre 2 días
      
      const similarity_score = (amountSimilarity * 0.6 + dateSimilarity * 0.4);

      return {
        id: transaction.id,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description || '',
        category_name: (transaction.categories as any)?.name || 'Sin categoría',
        similarity_score: Math.round(similarity_score * 100) / 100,
        days_difference: Math.round(daysDiff * 10) / 10
      };
    });

    // Filtrar solo las que tienen alta similitud
    const highSimilarity = similarWithScores.filter(t => t.similarity_score >= 0.7);
    
    console.log(`🎯 Transacciones similares encontradas: ${highSimilarity.length}`);
    return highSimilarity;

  } catch (error) {
    console.error('Error en findSimilarTransactions:', error);
    return [];
  }
}

/**
 * Analiza las coincidencias y determina la recomendación
 */
function analyzeMatches(exactMatches: any[], similarMatches: SimilarTransaction[]): DuplicateCheckResult {
  // Si hay coincidencias exactas, es muy probable que sea duplicado
  if (exactMatches.length > 0) {
    return {
      is_duplicate: true,
      exact_matches: exactMatches,
      similar_matches: similarMatches,
      confidence_level: 'high',
      recommendation: 'block'
    };
  }

  // Si hay muchas transacciones similares con alta similitud
  const highSimilarityMatches = similarMatches.filter(t => t.similarity_score >= 0.85);
  if (highSimilarityMatches.length >= 2) {
    return {
      is_duplicate: true,
      exact_matches: exactMatches,
      similar_matches: similarMatches,
      confidence_level: 'medium',
      recommendation: 'warn'
    };
  }

  // Si hay algunas transacciones similares
  if (similarMatches.length > 0) {
    return {
      is_duplicate: false,
      exact_matches: exactMatches,
      similar_matches: similarMatches,
      confidence_level: 'low',
      recommendation: 'warn'
    };
  }

  // No hay duplicados
  return {
    is_duplicate: false,
    exact_matches: exactMatches,
    similar_matches: similarMatches,
    confidence_level: 'high',
    recommendation: 'allow'
  };
}

/**
 * Genera un mensaje amigable sobre el estado de duplicados
 */
export function generateDuplicateMessage(result: DuplicateCheckResult): string {
  if (result.recommendation === 'block') {
    return `⚠️ **Posible duplicado detectado**
    
Se encontraron ${result.exact_matches.length} transacciones muy similares recientes.
    
¿Estás seguro de que quieres continuar?`;
  }

  if (result.recommendation === 'warn' && result.similar_matches.length > 0) {
    const recentTransaction = result.similar_matches[0];
    return `💡 **Nota:** Se encontró una transacción similar reciente:
    
📅 ${recentTransaction.date} - $${recentTransaction.amount} (${recentTransaction.category_name})
    
¿Confirmas que es una transacción diferente?`;
  }

  return ''; // No hay advertencias
}

/**
 * Registra métricas de duplicados para monitoreo
 */
export function logDuplicateMetrics(
  transactionData: TransactionData,
  result: DuplicateCheckResult
): void {
  if (process.env.ENABLE_CATEGORY_LOGGING !== 'true') {
    return;
  }

  const metrics = {
    timestamp: new Date().toISOString(),
    user_id: transactionData.user_id,
    amount: transactionData.amount,
    is_duplicate: result.is_duplicate,
    confidence_level: result.confidence_level,
    recommendation: result.recommendation,
    exact_matches_count: result.exact_matches.length,
    similar_matches_count: result.similar_matches.length
  };

  console.log('📊 Duplicate Check Metrics:', metrics);

  // Aquí se podría enviar a un servicio de analytics en el futuro
  // analytics.track('duplicate_check', metrics);
} 