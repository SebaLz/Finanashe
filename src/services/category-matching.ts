import Fuse from 'fuse.js';
import { supabase } from '@/lib/supabase';
import { Category } from './categories';
import { logCategorySyncError } from '../lib/category-sync-logger';

// Tipos para el resultado del matching
export interface CategoryMatch {
  id: string;
  name: string;
  emoji?: string;
  color: string;
  icon: string;
  score: number;
  is_exact_match: boolean;
  is_fuzzy_match: boolean;
  matched_term?: string;
}

// Configuración de Fuse.js para fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'description', weight: 0.3 }
  ],
  threshold: 0.4, // 0 = exact match, 1 = match anything
  distance: 100,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  findAllMatches: true
};

// Mapeo de sinónimos para mejorar el matching
const SYNONYMS_MAP: Record<string, string[]> = {
  'alimentación': ['comida', 'comidas', 'alimento', 'alimentos', 'food', 'mercado', 'supermercado', 'verduleria'],
  'transporte': ['transport', 'viaje', 'viajes', 'taxi', 'uber', 'colectivo', 'subte', 'tren', 'combustible', 'nafta'],
  'salud': ['medicina', 'medico', 'doctor', 'farmacia', 'hospital', 'clinica', 'seguro'],
  'entretenimiento': ['diversion', 'ocio', 'cine', 'teatro', 'juegos', 'streaming', 'netflix'],
  'servicios': ['luz', 'agua', 'gas', 'internet', 'telefono', 'cable', 'wifi'],
  'hogar': ['casa', 'alquiler', 'expensas', 'muebles', 'decoracion', 'limpieza'],
  'ropa': ['vestimenta', 'zapatos', 'calzado', 'accesorios', 'moda'],
  'educación': ['estudio', 'curso', 'libro', 'universidad', 'colegio', 'capacitacion']
};

// ID de la categoría "Otros" como fallback
const FALLBACK_CATEGORY_ID = '00000000-0000-0000-0000-000000000099';

/**
 * Busca la mejor coincidencia de categoría usando fuzzy matching
 */
export async function findBestCategoryMatch(
  searchText: string,
  userId: string,
  transactionType: 'income' | 'expense' = 'expense'
): Promise<CategoryMatch | null> {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Iniciando búsqueda de categoría:`, {
      searchText,
      userId,
      transactionType,
      timestamp: new Date().toISOString()
    });

    if (!searchText || searchText.trim().length < 2) {
      console.warn('❌ Texto de búsqueda muy corto o vacío');
      return null;
    }

    // Normalizar texto de búsqueda
    const normalizedSearch = normalizeSearchText(searchText);
    console.log(`📝 Texto normalizado: "${searchText}" → "${normalizedSearch}"`);

    // Obtener categorías del usuario y del sistema
    const categories = await getCategoriesForMatching(userId, transactionType);
    console.log(`📂 Categorías obtenidas: ${categories.length} total`);

    if (categories.length === 0) {
      console.warn('❌ No se encontraron categorías para comparar');
      return null;
    }

    // 1. Primero intentar coincidencia exacta (case-insensitive)
    const exactMatch = findExactMatch(categories, normalizedSearch);
    if (exactMatch) {
      console.log(`✅ Coincidencia exacta encontrada:`, exactMatch);
      const result = {
        ...exactMatch,
        score: 1.0,
        is_exact_match: true,
        is_fuzzy_match: false,
        matched_term: searchText
      };
      
      // Log metrics
      logCategorySearchSuccess(searchText, result, 'exact', 1.0);
      
      return result;
    }

    // 2. Intentar con sinónimos
    const synonymMatch = findSynonymMatch(categories, normalizedSearch);
    if (synonymMatch) {
      console.log(`🔄 Coincidencia por sinónimo encontrada:`, synonymMatch);
      const result = {
        ...synonymMatch,
        score: 0.9,
        is_exact_match: false,
        is_fuzzy_match: true,
        matched_term: searchText
      };
      
      // Log metrics
      logCategorySearchSuccess(searchText, result, 'synonym', 0.9);
      
      return result;
    }

    // 3. Usar fuzzy matching con Fuse.js
    const fuzzyMatch = findFuzzyMatch(categories, normalizedSearch);
    if (fuzzyMatch) {
      console.log(`🎯 Coincidencia fuzzy encontrada:`, fuzzyMatch);
      
      // Log metrics
      logCategorySearchSuccess(searchText, fuzzyMatch, 'fuzzy', fuzzyMatch.score);
      
      return fuzzyMatch;
    }

    console.log(`❌ No se encontró ninguna coincidencia para: "${searchText}"`);
    
    // Log failed search
    console.log(`❌ Búsqueda fallida para: "${searchText}"`);
    
    return null;

  } catch (error: any) {
    console.error('❌ Error en findBestCategoryMatch:', error);
    logCategorySyncError('findBestCategoryMatch failed', { searchText, userId, error: error?.message });
    return null;
  }
}

/**
 * Obtiene la categoría fallback "Otros" o la crea si no existe
 */
export async function getCategoryFallback(userId: string): Promise<string> {
  try {
    console.log(`🛡️ Obteniendo categoría fallback para usuario: ${userId}`);

    // Primero intentar obtener la categoría "Otros" del sistema
    const { data: fallbackCategory, error } = await supabase
      .from('categories')
      .select('id, name, emoji')
      .eq('id', FALLBACK_CATEGORY_ID)
      .single();

    if (!error && fallbackCategory) {
      console.log(`✅ Categoría fallback encontrada:`, fallbackCategory);
      return fallbackCategory.id;
    }

    console.log('⚠️ Categoría fallback no encontrada, creando nueva...');

    // Si no existe, crearla
    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert({
        id: FALLBACK_CATEGORY_ID,
        user_id: null,
        name: 'Otros',
        color: '#9E9E9E',
        icon: 'help-circle',
        emoji: '❓',
        type: 'expense',
        is_default: false,
        is_system: true,
        is_budgetable: true,
        description: 'Categoría para gastos no clasificados'
      })
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Error creando categoría fallback:', createError);
      throw new Error('No se pudo crear la categoría fallback');
    }

    console.log(`✅ Categoría fallback creada exitosamente:`, newCategory);
    return newCategory.id;

  } catch (error) {
    console.error('❌ Error crítico en getCategoryFallback:', error);
    // Retornar el ID hardcodeado como último recurso
    return FALLBACK_CATEGORY_ID;
  }
}

/**
 * Obtiene todas las categorías relevantes para el matching
 */
async function getCategoriesForMatching(userId: string, type: string): Promise<Category[]> {
  try {
    // Intentar primero con la vista all_categories (nueva versión con emoji)
    let { data: categories, error } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, emoji, description, type, is_system, is_default')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('is_system', { ascending: false }) // Priorizar categorías del usuario
      .order('name');

    // Si falla porque no existe la columna emoji, usar consulta directa a la tabla
    if (error && error.code === '42703') {
      console.log('📋 Vista all_categories sin emoji, usando tabla categories directamente');
      
      const result = await supabase
        .from('categories')
        .select('id, name, color, icon, emoji, description, type, is_system, is_default, user_id')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('is_system', { ascending: false })
        .order('name');
        
      categories = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }

    // Asegurar que todas las categorías tienen las propiedades requeridas
    const validCategories = (categories || []).map(cat => ({
      ...cat,
      emoji: cat.emoji || undefined, // Convertir null a undefined
      user_id: cat.user_id || undefined // Agregar user_id si falta
    }));
    
    return validCategories;
  } catch (error) {
    console.error('Error en getCategoriesForMatching:', error);
    return [];
  }
}

/**
 * Normaliza el texto de búsqueda
 */
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\w\s]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, ' '); // Normalizar espacios
}

/**
 * Busca coincidencia exacta (case-insensitive)
 */
function findExactMatch(categories: Category[], searchText: string): Category | null {
  return categories.find(cat => 
    normalizeSearchText(cat.name) === searchText
  ) || null;
}

/**
 * Busca coincidencia usando sinónimos
 */
function findSynonymMatch(categories: Category[], searchText: string): Category | null {
  for (const category of categories) {
    const catName = normalizeSearchText(category.name);
    
    // Buscar si el texto de búsqueda es sinónimo de alguna categoría
    for (const [mainTerm, synonyms] of Object.entries(SYNONYMS_MAP)) {
      if (catName.includes(mainTerm) || mainTerm.includes(catName)) {
        if (synonyms.some(synonym => 
          searchText.includes(synonym) || synonym.includes(searchText)
        )) {
          return category;
        }
      }
    }
  }
  return null;
}

/**
 * Busca coincidencia usando fuzzy matching
 */
function findFuzzyMatch(categories: Category[], searchText: string): CategoryMatch | null {
  const fuse = new Fuse(categories, fuseOptions);
  const results = fuse.search(searchText);

  if (results.length === 0) {
    return null;
  }

  const bestResult = results[0];
  const score = 1 - (bestResult.score || 1); // Convertir score de Fuse (menor es mejor) a nuestro sistema (mayor es mejor)
  
  // Solo aceptar resultados con score decente
  const threshold = parseFloat(process.env.CATEGORY_MATCH_THRESHOLD || '0.6');
  if (score < threshold) {
    console.log(`⚠️ Score insuficiente: ${score} < ${threshold}`);
    return null;
  }

  return {
    ...bestResult.item,
    score,
    is_exact_match: false,
    is_fuzzy_match: true,
    matched_term: bestResult.matches?.[0]?.value || searchText
  };
}

/**
 * Registra métricas de búsqueda exitosa
 */
function logCategorySearchSuccess(
  searchText: string,
  result: CategoryMatch,
  matchType: string,
  score: number
): void {
  if (process.env.ENABLE_CATEGORY_LOGGING !== 'true') {
    return;
  }

  const metrics = {
    timestamp: new Date().toISOString(),
    search_text: searchText,
    result_found: true,
    match_type: matchType,
    score: score,
    category_found: result.name
  };

  console.log('📊 Category Search Success:', metrics);
} 