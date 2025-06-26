// Logger específico para el sistema de sincronización de categorías
export interface CategorySyncMetrics {
  timestamp: string;
  user_id: string;
  search_text: string;
  search_type: 'exact' | 'fuzzy' | 'synonym' | 'fallback';
  result_found: boolean;
  category_id?: string;
  category_name?: string;
  similarity_score?: number;
  fallback_used: boolean;
  processing_time_ms: number;
  source: 'whatsapp' | 'web' | 'api';
}

export interface DuplicateDetectionMetrics {
  timestamp: string;
  user_id: string;
  transaction_amount: number;
  transaction_type: 'income' | 'expense';
  is_duplicate: boolean;
  confidence_level: 'high' | 'medium' | 'low';
  exact_matches_count: number;
  similar_matches_count: number;
  recommendation: 'block' | 'warn' | 'allow';
  processing_time_ms: number;
}

class CategorySyncLogger {
  private isEnabled: boolean;
  private metricsBuffer: Array<CategorySyncMetrics | DuplicateDetectionMetrics> = [];
  private bufferSize = 100;
  private flushInterval = 60000; // 1 minuto

  constructor() {
    this.isEnabled = process.env.ENABLE_CATEGORY_LOGGING === 'true';
    
    if (this.isEnabled) {
      // Flush periódico del buffer
      setInterval(() => {
        this.flushMetrics();
      }, this.flushInterval);
      
      console.log('📊 Category Sync Logger inicializado');
    }
  }

  /**
   * Registra métricas de búsqueda de categorías
   */
  logCategorySearch(metrics: CategorySyncMetrics): void {
    if (!this.isEnabled) return;

    console.log('🔍 Category Search:', {
      text: metrics.search_text,
      type: metrics.search_type,
      found: metrics.result_found,
      category: metrics.category_name,
      score: metrics.similarity_score,
      time: `${metrics.processing_time_ms}ms`
    });

    this.addToBuffer(metrics);
  }

  /**
   * Registra métricas de detección de duplicados
   */
  logDuplicateDetection(metrics: DuplicateDetectionMetrics): void {
    if (!this.isEnabled) return;

    console.log('🔄 Duplicate Check:', {
      amount: metrics.transaction_amount,
      type: metrics.transaction_type,
      isDuplicate: metrics.is_duplicate,
      confidence: metrics.confidence_level,
      recommendation: metrics.recommendation,
      exactMatches: metrics.exact_matches_count,
      similarMatches: metrics.similar_matches_count,
      time: `${metrics.processing_time_ms}ms`
    });

    this.addToBuffer(metrics);
  }

  /**
   * Registra eventos específicos del sistema
   */
  logEvent(event: string, data: any): void {
    if (!this.isEnabled) return;

    console.log(`📝 Category Sync Event [${event}]:`, data);
  }

  /**
   * Registra errores críticos
   */
  logError(error: string, context: any): void {
    if (!this.isEnabled) return;

    console.error(`❌ Category Sync Error:`, {
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtiene estadísticas agregadas del período actual
   */
  getAggregatedStats(): {
    categorySearches: {
      total: number;
      successRate: number;
      averageScore: number;
      fallbackRate: number;
    };
    duplicateDetections: {
      total: number;
      duplicatesFound: number;
      blockedTransactions: number;
      warningsSent: number;
    };
  } {
    const categoryMetrics = this.metricsBuffer.filter(
      m => 'search_text' in m
    ) as CategorySyncMetrics[];
    
    const duplicateMetrics = this.metricsBuffer.filter(
      m => 'transaction_amount' in m
    ) as DuplicateDetectionMetrics[];

    return {
      categorySearches: {
        total: categoryMetrics.length,
        successRate: categoryMetrics.length > 0 
          ? categoryMetrics.filter(m => m.result_found).length / categoryMetrics.length
          : 0,
        averageScore: categoryMetrics.length > 0
          ? categoryMetrics
              .filter(m => m.similarity_score !== undefined)
              .reduce((sum, m) => sum + (m.similarity_score || 0), 0) / categoryMetrics.length
          : 0,
        fallbackRate: categoryMetrics.length > 0
          ? categoryMetrics.filter(m => m.fallback_used).length / categoryMetrics.length
          : 0
      },
      duplicateDetections: {
        total: duplicateMetrics.length,
        duplicatesFound: duplicateMetrics.filter(m => m.is_duplicate).length,
        blockedTransactions: duplicateMetrics.filter(m => m.recommendation === 'block').length,
        warningsSent: duplicateMetrics.filter(m => m.recommendation === 'warn').length
      }
    };
  }

  /**
   * Añade métricas al buffer
   */
  private addToBuffer(metrics: CategorySyncMetrics | DuplicateDetectionMetrics): void {
    this.metricsBuffer.push(metrics);
    
    // Si el buffer está lleno, hacer flush
    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }
  }

  /**
   * Envía las métricas acumuladas (aquí se podría integrar con servicios externos)
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;

    const stats = this.getAggregatedStats();
    
    console.log('📊 Category Sync Stats:', {
      period: new Date().toISOString(),
      ...stats
    });

    // Aquí se podría enviar a servicios de analytics externos:
    // - Google Analytics
    // - Mixpanel
    // - PostHog
    // - Custom API endpoint
    
    // Por ahora solo log local
    if (this.isEnabled && process.env.NODE_ENV === 'development') {
      console.log('📈 Detailed Metrics Buffer:', this.metricsBuffer);
    }

    // Limpiar buffer
    this.metricsBuffer = [];
  }

  /**
   * Fuerza el flush manual del buffer
   */
  forceFlush(): void {
    this.flushMetrics();
  }
}

// Singleton instance
export const categorySyncLogger = new CategorySyncLogger();

// Funciones de conveniencia para usar desde otros módulos
export function logCategorySearchMetrics(
  searchText: string,
  resultFound: boolean,
  searchType: 'exact' | 'fuzzy' | 'synonym' | 'fallback',
  categoryId?: string,
  categoryName?: string,
  similarityScore?: number,
  fallbackUsed: boolean = false,
  processingTimeMs: number = 0,
  userId: string = 'unknown',
  source: 'whatsapp' | 'web' | 'api' = 'whatsapp'
): void {
  const metrics: CategorySyncMetrics = {
    timestamp: new Date().toISOString(),
    user_id: userId,
    search_text: searchText,
    search_type: searchType,
    result_found: resultFound,
    category_id: categoryId,
    category_name: categoryName,
    similarity_score: similarityScore,
    fallback_used: fallbackUsed,
    processing_time_ms: processingTimeMs,
    source
  };

  categorySyncLogger.logCategorySearch(metrics);
}

export function logDuplicateDetectionMetrics(
  userId: string,
  transactionAmount: number,
  transactionType: 'income' | 'expense',
  isDuplicate: boolean,
  confidenceLevel: 'high' | 'medium' | 'low',
  exactMatchesCount: number,
  similarMatchesCount: number,
  recommendation: 'block' | 'warn' | 'allow',
  processingTimeMs: number = 0
): void {
  const metrics: DuplicateDetectionMetrics = {
    timestamp: new Date().toISOString(),
    user_id: userId,
    transaction_amount: transactionAmount,
    transaction_type: transactionType,
    is_duplicate: isDuplicate,
    confidence_level: confidenceLevel,
    exact_matches_count: exactMatchesCount,
    similar_matches_count: similarMatchesCount,
    recommendation,
    processing_time_ms: processingTimeMs
  };

  categorySyncLogger.logDuplicateDetection(metrics);
}

export function logCategorySyncEvent(event: string, data: any): void {
  categorySyncLogger.logEvent(event, data);
}

export function logCategorySyncError(error: string, context: any): void {
  categorySyncLogger.logError(error, context);
} 