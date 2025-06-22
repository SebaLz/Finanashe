import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type CategoryType = 'income' | 'expense' | 'transfer' | 'investment' | 'saving' | 'goal';
export type CategoryContext = 'personal' | 'business';

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string | null;
  emoji?: string | null; // Nuevo campo para emojis estilo Gasti
  type?: CategoryType; // Nuevo campo tipado
  parent_category_id?: string | null; // Para subcategorías
  sort_order?: number; // Orden personalizable
  description?: string | null; // Descripción opcional
  is_default?: boolean;
  is_system?: boolean;
  is_budgetable?: boolean; // Nuevo campo para presupuestos
  context?: CategoryContext; // Contexto de uso
  created_at?: string;
  is_visible?: boolean;  // Campo virtual para indicar visibilidad
  // Campos de visibilidad específicos
  visible_in_transactions?: boolean;
  visible_in_budgets?: boolean;
  visible_in_reports?: boolean;
};

export type CategoryVisibility = {
  id: string;
  user_id: string;
  category_id: string;
  is_visible: boolean;
  visible_in_budgets: boolean; // Campo existente
  visible_in_transactions?: boolean; // Nuevos campos
  visible_in_reports?: boolean;
  created_at?: string;
};

export type CategoryInput = Omit<Category, 'id' | 'created_at'>;

export type CategoryWithVisibility = Category & {
  is_visible: boolean;
  type: CategoryType;
};

export async function getCategories(userId: string) {
  try {
    console.log('Obteniendo categorías para el usuario:', userId);
    
    // 1. Verificar si el usuario existe antes de hacer la consulta
    if (!userId) {
      console.log('No se proporcionó userId');
      return [{
        id: '00000000-0000-0000-0000-000000000000',
        user_id: null,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        is_default: true,
        is_system: true,
        is_visible: true
      }];
    }
    
    // 2. Obtener todas las categorías usando la vista all_categories
    const { data: allCategories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name');

    console.log('Respuesta de Supabase (all_categories):', { allCategories, categoriesError });

    // 3. Si hay error, devolver una categoría por defecto
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return [{
        id: '00000000-0000-0000-0000-000000000000',
        user_id: null,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        is_default: true,
        is_system: true,
        is_visible: true
      }];
    }
    
    // 4. Si no hay categorías o el array está vacío, devolver una categoría por defecto
    if (!allCategories || !Array.isArray(allCategories) || allCategories.length === 0) {
      console.log('No hay categorías o la respuesta no es un array:', allCategories);
      return [{
        id: '00000000-0000-0000-0000-000000000000',
        user_id: null,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        is_default: true,
        is_system: true,
        is_visible: true
      }];
    }

    // 5. Obtener configuración de visibilidad
    const { data: visibilitySettings, error: visibilityError } = await supabase
      .from('category_visibility')
      .select('*')
      .eq('user_id', userId);

    // 6. Crear mapa de visibilidad
    const visibilityMap = new Map();
    if (visibilitySettings && visibilitySettings.length > 0 && !visibilityError) {
      visibilitySettings.forEach(setting => {
        visibilityMap.set(setting.category_id, setting.is_visible);
      });
    }

    // 7. Aplicar visibilidad a las categorías y asegurar que exista una categoría por defecto
    let hasDefaultCategory = false;
    const categoriesWithVisibility = allCategories.map(category => {
      if (category.is_default) {
        hasDefaultCategory = true;
      }
      
      return {
        ...category,
        is_visible: visibilityMap.has(category.id) 
          ? visibilityMap.get(category.id) 
          : true
      };
    });

    // 8. Si no hay categoría por defecto, agregar una
    if (!hasDefaultCategory) {
      categoriesWithVisibility.unshift({
        id: '00000000-0000-0000-0000-000000000000',
        user_id: null,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        is_default: true,
        is_system: true,
        is_visible: true
      });
    }

    console.log('Categorías a devolver:', categoriesWithVisibility);
    return categoriesWithVisibility;
  } catch (error) {
    console.error('Error en getCategories:', error);
    // Devolver al menos una categoría por defecto si hay error
    return [{
      id: '00000000-0000-0000-0000-000000000000',
      user_id: null,
      name: 'Sin categoría',
      color: '#9E9E9E',
      icon: 'help-circle',
      is_default: true,
      is_system: true,
      is_visible: true
    }];
  }
}

export async function getAllCategories(userId: string) {
  const data = await getCategories(userId);
  return data;
}

export async function getVisibleCategories(userId: string) {
  try {
    const allCategories = await getCategories(userId);
    
    const visibleCategories = allCategories.filter(cat => cat.is_visible !== false);
    
    // Siempre incluir al menos una categoría por defecto si no hay ninguna visible
    if (visibleCategories.length === 0) {
      return [{
        id: '00000000-0000-0000-0000-000000000000', 
        user_id: null,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        is_default: true,
        is_system: true,
        is_visible: true
      }];
    }
    
    return visibleCategories;
  } catch (error) {
    console.error('Error getting visible categories:', error);
    return [{
      id: '00000000-0000-0000-0000-000000000000',
      user_id: null,
      name: 'Sin categoría',
      color: '#9E9E9E',
      icon: 'help-circle',
      is_default: true,
      is_system: true,
      is_visible: true
    }];
  }
}

export async function createSystemCategory(category: Omit<CategoryInput, 'user_id' | 'is_system'>) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        id: uuidv4(),
        user_id: null,
        is_system: true,
        type: category.type || 'expense',  // Asegurar que se asigne un tipo por defecto
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating system category:', error);
      throw error;
    }

    return data[0] as Category;
  } catch (error) {
    console.error('Exception in createSystemCategory:', error);
    throw error;
  }
}

export async function createCustomCategory(userId: string, category: {
  name: string;
  color: string;
  icon?: string | null;
  type?: 'income' | 'expense' | 'saving' | 'goal' | 'investment' | 'budget';
}) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: category.name,
        color: category.color,
        icon: category.icon || 'tag',
        type: category.type || 'expense'
      })
      .select();

    if (error) {
      console.error('Error creating custom category:', error);
      throw error;
    }

    return data[0] as Category;
  } catch (error) {
    console.error('Exception in createCustomCategory:', error);
    throw error;
  }
}

export async function createCategory(category: CategoryInput) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        id: uuidv4(),
        type: category.type || 'expense',  // Asegurar que se asigne un tipo por defecto
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }

    return data[0] as Category;
  } catch (error) {
    console.error('Exception in createCategory:', error);
    throw error;
  }
}

export async function updateCategory(categoryId: string, category: {
  name?: string;
  color?: string;
  icon?: string | null;
  type?: 'income' | 'expense' | 'saving' | 'goal' | 'investment';
}) {
  try {
    // 1. Verificar si la categoría existe
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id, is_system')
      .eq('id', categoryId)
      .single();

    if (checkError) {
      console.error('Error checking category existence:', checkError);
      throw new Error('No se pudo verificar la existencia de la categoría');
    }

    // 2. Si es una categoría del sistema, no permitir la actualización
    if (existingCategory.is_system) {
      throw new Error('No se pueden modificar las categorías del sistema');
    }

    // 3. Realizar la actualización
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: category.name,
        color: category.color,
        icon: category.icon,
        type: category.type
      })
      .eq('id', categoryId)
      .select();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No se encontró la categoría para actualizar');
    }

    return data[0] as Category;
  } catch (error) {
    console.error('Exception in updateCategory:', error);
    throw error;
  }
}

export async function setCategoryVisibility(userId: string, categoryId: string, isVisible: boolean) {
  try {
    // 1. Verificar si ya existe un registro de visibilidad para esta categoría
    const { data: existingSettings, error: checkError } = await supabase
      .from('category_visibility')
      .select('id, visible_in_budgets')
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (checkError) {
      console.error('Error checking category visibility settings:', checkError);
      throw new Error('No se pudo verificar la configuración de visibilidad de la categoría');
    }

    // 2. Si existe, actualizar el registro manteniendo el valor de visible_in_budgets
    if (existingSettings && existingSettings.length > 0) {
      const { data, error } = await supabase
        .from('category_visibility')
        .update({ is_visible: isVisible })
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .select();

      if (error) {
        console.error('Error updating category visibility:', error);
        throw error;
      }

      return data[0] as CategoryVisibility;
    } 
    // 3. Si no existe, crear un nuevo registro con ambos valores alineados inicialmente
    else {
      const { data, error } = await supabase
        .from('category_visibility')
        .insert({
          id: uuidv4(),
          user_id: userId,
          category_id: categoryId,
          is_visible: isVisible,
          visible_in_budgets: isVisible, // Inicialmente, ambos valores son iguales
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error creating category visibility:', error);
        throw error;
      }

      return data[0] as CategoryVisibility;
    }
  } catch (error) {
    console.error('Exception in setCategoryVisibility:', error);
    throw error;
  }
}

/**
 * Actualiza la visibilidad de una categoría específicamente para presupuestos
 */
export async function setCategoryBudgetVisibility(userId: string, categoryId: string, visibleInBudget: boolean) {
  try {
    // 1. Verificar si ya existe un registro de visibilidad para esta categoría
    const { data: existingSettings, error: checkError } = await supabase
      .from('category_visibility')
      .select('id, is_visible')
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (checkError) {
      console.error('Error checking category visibility settings:', checkError);
      throw new Error('No se pudo verificar la configuración de visibilidad de la categoría');
    }

    // 2. Si existe, actualizar el registro manteniendo el valor de is_visible
    if (existingSettings && existingSettings.length > 0) {
      const { data, error } = await supabase
        .from('category_visibility')
        .update({ visible_in_budgets: visibleInBudget })
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .select();

      if (error) {
        console.error('Error updating category budget visibility:', error);
        throw error;
      }

      return data[0] as CategoryVisibility;
    } 
    // 3. Si no existe, crear un nuevo registro
    else {
      const { data, error } = await supabase
        .from('category_visibility')
        .insert({
          id: uuidv4(),
          user_id: userId,
          category_id: categoryId,
          is_visible: true, // Por defecto visible en transacciones
          visible_in_budgets: visibleInBudget,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error creating category budget visibility:', error);
        throw error;
      }

      return data[0] as CategoryVisibility;
    }
  } catch (error) {
    console.error('Exception in setCategoryBudgetVisibility:', error);
    throw error;
  }
}

export async function deleteCategory(id: string, userId: string) {
  try {
    // 1. Verificar si la categoría existe y no es del sistema
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id, is_system, is_default, user_id')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Error checking category existence:', checkError);
      throw new Error('No se pudo verificar la existencia de la categoría');
    }

    // 2. No permitir eliminar categorías del sistema o por defecto
    if (existingCategory.is_system || existingCategory.is_default) {
      throw new Error('No se pueden eliminar las categorías del sistema o por defecto');
    }

    // 3. Verificar que la categoría pertenezca al usuario
    if (existingCategory.user_id && existingCategory.user_id !== userId) {
      throw new Error('No tienes permiso para eliminar esta categoría');
    }

    // 4. Eliminar la categoría
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Exception in deleteCategory:', error);
    throw error;
  }
}

export async function getCategoryById(id: string) {
  try {
    // Intentar obtener la categoría de la base de datos
    const { data, error } = await supabase
      .from('all_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching category by ID:', error);
      
      // Si no se encuentra, devolver la categoría por defecto
      if (error.code === 'PGRST116') { // No se encontraron resultados
        return {
          id,
          user_id: null,
          name: 'Sin categoría',
          color: '#9E9E9E',
          icon: 'help-circle',
          is_default: true,
          is_system: true
        };
      }
      
      throw error;
    }

    return data as Category;
  } catch (error) {
    console.error('Exception in getCategoryById:', error);
    
    // En caso de error, devolver la categoría por defecto
    return {
      id,
      user_id: null,
      name: 'Sin categoría',
      color: '#9E9E9E',
      icon: 'help-circle',
      is_default: true,
      is_system: true
    };
  }
}

export async function getCategoriesByIds(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return [];
    }

    // Usar la función RPC para obtener categorías de manera segura
    const { data, error } = await supabase
      .rpc('get_safe_categories', { cat_ids: ids });

    if (error) {
      console.error('Error fetching categories by IDs with RPC:', error);
      
      // Método de respaldo
      const { data: categories, error: altError } = await supabase
        .from('all_categories')
        .select('*')
        .in('id', ids);
        
      if (altError) {
        console.error('Error fetching categories by IDs with traditional method:', altError);
        return [];
      }
      
      return categories;
    }

    return data;
  } catch (error) {
    console.error('Exception in getCategoriesByIds:', error);
    return [];
  }
}

/**
 * Obtiene las categorías específicas para presupuestos
 * Estas son las categorías recomendadas para presupuestos mensuales
 */
export async function getBudgetCategories(userId: string) {
  try {
    if (!userId) {
      console.log('No se proporcionó userId para getBudgetCategories');
      return [];
    }
    
    console.log('getBudgetCategories: INICIANDO BÚSQUEDA ESTRICTA de categorías budget');
    
    // CAMBIO DRÁSTICO: Búsqueda explícita solo de tipo 'budget'
    // La claúsula WHERE type = 'budget' forzará a que solo se retornen categorías de ese tipo
    const { data, error } = await supabase
      .from('categories') // Usar la tabla real, no la vista
      .select('*')
      .eq('type', 'budget')
      .or(`user_id.eq.${userId},user_id.is.null`);
    
    if (error) {
      console.error('Error al buscar categorías budget:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn('No se encontraron categorías de tipo budget');
      return [];
    }
    
    console.log(`getBudgetCategories: ÉXITO! Encontradas ${data.length} categorías de tipo budget:`);
    data.forEach(cat => {
      console.log(`- ${cat.name} (${cat.type}), ID: ${cat.id}`);
    });
    
    // Filtrar cualquier categoría que no tenga explícitamente type='budget'
    // Esto es una precaución adicional
    const strictlyBudgetCategories = data.filter(cat => cat.type === 'budget');
    
    if (strictlyBudgetCategories.length !== data.length) {
      console.warn(`Se eliminaron ${data.length - strictlyBudgetCategories.length} categorías que no tenían tipo 'budget'`);
    }
    
    return strictlyBudgetCategories;
  } catch (error) {
    console.error('Error en getBudgetCategories:', error);
    return [];
  }
}

/**
 * Obtiene las categorías para transacciones (todas las visibles)
 */
export async function getTransactionCategories(userId: string) {
  try {
    const allCategories = await getCategories(userId);
    
    // Filtrar categorías, excluyendo las específicas para objetivos e inversiones
    // y considerando solo las que tienen is_visible = true (o no definido)
    const transactionCategories = allCategories.filter(cat => 
      // Excluir categorías especiales por ID
      cat.id !== '00000000-0000-0000-0000-000000000001' && // Objetivo Sin Categoría
      cat.id !== '00000000-0000-0000-0000-000000000002' && // Inversiones
      // Asegurar que la categoría sea visible para transacciones
      cat.is_visible !== false
    );
    
    // Asegurar que siempre esté la categoría general "Sin categoría"
    if (!transactionCategories.some(cat => cat.id === '00000000-0000-0000-0000-000000000000')) {
      transactionCategories.unshift({
        id: '00000000-0000-0000-0000-000000000000',
        user_id: null,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        is_default: true,
        is_system: true,
        is_visible: true
      });
    }
    
    return transactionCategories;
  } catch (error) {
    console.error('Error obteniendo categorías para transacciones:', error);
    return [{
      id: '00000000-0000-0000-0000-000000000000',
      user_id: null,
      name: 'Sin categoría',
      color: '#9E9E9E',
      icon: 'help-circle',
      is_default: true,
      is_system: true,
      is_visible: true
    }];
  }
}

/**
 * Filtra categorías según su configuración de visibilidad
 */
async function filterVisibleCategories(userId: string, categories: Category[]): Promise<Category[]> {
  try {
    // Si no hay categorías, devolver un array vacío
    if (!categories || categories.length === 0) {
      return [];
    }
    
    // Obtener configuración de visibilidad
    const { data: visibilitySettings, error: visibilityError } = await supabase
      .from('category_visibility')
      .select('*')
      .eq('user_id', userId);
    
    if (visibilityError) {
      console.error('Error obteniendo configuración de visibilidad:', visibilityError);
      return categories; // Por defecto, mostrar todas
    }
    
    // Crear mapa de visibilidad
    const visibilityMap = new Map();
    if (visibilitySettings && visibilitySettings.length > 0) {
      visibilitySettings.forEach(setting => {
        visibilityMap.set(setting.category_id, setting.is_visible);
      });
    }
    
    // Filtrar categorías por visibilidad
    return categories.filter(category => 
      // Si no hay configuración de visibilidad para esta categoría o es visible, incluirla
      !visibilityMap.has(category.id) || visibilityMap.get(category.id) === true
    ).map(category => ({
      ...category,
      is_visible: true // Marcar como visible
    }));
  } catch (error) {
    console.error('Error en filterVisibleCategories:', error);
    return categories; // En caso de error, devolver todas
  }
}

export async function getCategoriesByType(userId: string, type: 'income' | 'expense' | 'saving' | 'goal' | 'investment') {
  try {
    // Obtener categorías personalizadas del usuario
    const { data: userCategories, error: userError } = await supabase
      .from('all_categories')
      .select('*')
      .eq('type', type)
      .or(`user_id.eq.${userId},is_system.eq.true`);
    
    if (userError) throw userError;
    
    // Filtrar categorías que no están ocultas
    const visibleCategories = await filterVisibleCategories(userId, userCategories || []);
    
    return visibleCategories;
  } catch (error) {
    console.error('Error getting categories by type:', error);
    throw error;
  }
}

/**
 * Convierte una categoría existente al tipo 'budget' para usarla en presupuestos
 */
export async function setCategoryAsBudgetType(userId: string, categoryId: string) {
  try {
    // Primero verificar que el usuario tenga permisos para modificar esta categoría
    const { data: category, error: checkError } = await supabase
      .from('categories')
      .select('id, user_id, is_system, name')
      .eq('id', categoryId)
      .single();
    
    if (checkError) {
      console.error('Error verificando categoría:', checkError);
      throw new Error('No se pudo verificar la categoría');
    }
    
    // Si es una categoría del sistema, no permitir modificar directamente
    if (category.is_system && category.user_id === null) {
      // En este caso, creamos una copia personalizada para el usuario
      console.log(`Categoría ${category.name} es del sistema. Creando copia personalizada.`);
      
      const { data: existingCopy, error: copyCheckError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', category.name)
        .single();
      
      // Si ya existe una copia, actualizarla
      if (!copyCheckError && existingCopy) {
        const { data, error } = await supabase
          .from('categories')
          .update({ type: 'budget' })
          .eq('id', existingCopy.id)
          .select();
        
        if (error) {
          console.error('Error actualizando copia existente:', error);
          throw error;
        }
        
        return data[0];
      }
      
      // Si no existe, crear una copia
      const { data: originalData, error: originalError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      
      if (originalError) {
        console.error('Error obteniendo datos originales:', originalError);
        throw originalError;
      }
      
      // Crear una copia personalizada con tipo 'budget'
      const { data: newCategory, error: createError } = await supabase
        .from('categories')
        .insert({
          name: originalData.name,
          color: originalData.color,
          icon: originalData.icon,
          user_id: userId,
          type: 'budget',
          created_at: new Date().toISOString()
        })
        .select();
      
      if (createError) {
        console.error('Error creando copia personalizada:', createError);
        throw createError;
      }
      
      return newCategory[0];
    }
    
    // Si es una categoría del usuario o puede modificarse, actualizar directamente
    const { data, error } = await supabase
      .from('categories')
      .update({ type: 'budget' })
      .eq('id', categoryId)
      .select();
    
    if (error) {
      console.error('Error actualizando tipo de categoría:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error en setCategoryAsBudgetType:', error);
    throw error;
  }
}

/**
 * Convierte varias categorías al tipo 'budget' para usarlas en presupuestos
 */
export async function setMultipleCategoriesAsBudgetType(userId: string, categoryIds: string[]) {
  const results = [];
  const errors = [];
  
  for (const categoryId of categoryIds) {
    try {
      const result = await setCategoryAsBudgetType(userId, categoryId);
      results.push(result);
    } catch (error) {
      errors.push({ categoryId, error });
    }
  }
  
  return { results, errors };
}

// Función moderna para obtener categorías por sección
export async function getCategoriesForSection(userId: string, section: 'transactions' | 'budgets' | 'goals' | 'investments') {
  try {
    const { data, error } = await supabase.rpc('get_categories_for_section', {
      p_user_id: userId,
      p_section: section
    });

    if (error) {
      console.error('Error fetching categories for section:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getCategoriesForSection:', error);
    return [];
  }
}

// Función mejorada para obtener categorías por tipo
export async function getCategoriesByTypeEnhanced(
  userId: string, 
  type?: CategoryType, 
  context: CategoryContext = 'personal'
) {
  try {
    const { data, error } = await supabase.rpc('get_categories_by_type_enhanced', {
      p_user_id: userId,
      p_type: type || null,
      p_context: context
    });

    if (error) {
      console.error('Error fetching categories by type enhanced:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getCategoriesByTypeEnhanced:', error);
    return [];
  }
} 