import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string | null;
  is_system?: boolean;      // Indica si es una categoría del sistema
  created_at?: string;
  is_visible?: boolean;     // Campo virtual para indicar visibilidad
};

export type CategoryVisibility = {
  id: string;
  user_id: string;
  category_id: string;
  is_visible: boolean;
  created_at?: string;
};

export type CategoryInput = Omit<Category, 'id' | 'created_at'>;

export async function getCategories(userId: string) {
  try {
    // Usar la función RPC para obtener todas las categorías en una sola llamada
    const { data: allCategories, error: categoriesError } = await supabase
      .rpc('get_all_categories', { p_user_id: userId });

    if (categoriesError) {
      console.error('Error fetching categories with RPC:', categoriesError);
      
      // Fallback al método anterior si falla la RPC
      return getFallbackCategories(userId);
    }

    // Obtener configuración de visibilidad
    const { data: visibilitySettings, error: visibilityError } = await supabase
      .from('category_visibility')
      .select('*')
      .eq('user_id', userId);

    if (visibilityError) {
      console.error('Error fetching category visibility:', visibilityError);
      // Continuar sin visibilidad, todas las categorías serán visibles por defecto
    }

    // Crear mapa de visibilidad
    const visibilityMap = new Map();
    if (visibilitySettings && visibilitySettings.length > 0) {
      visibilitySettings.forEach(setting => {
        visibilityMap.set(setting.category_id, setting.is_visible);
      });
    }

    // Aplicar visibilidad a las categorías
    const categoriesWithVisibility = allCategories.map(category => {
      // Si hay configuración de visibilidad para esta categoría, usarla
      if (visibilityMap.has(category.id)) {
        return {
          ...category,
          is_visible: visibilityMap.get(category.id)
        };
      }
      // Sin configuración, todas son visibles por defecto
      return { 
        ...category, 
        is_visible: true
      };
    });

    // Por defecto, devolver todas las categorías con su estado de visibilidad
    return categoriesWithVisibility;
  } catch (error) {
    console.error('Error en getCategories:', error);
    return getFallbackCategories(userId);
  }
}

// Método de respaldo por si la función RPC falla
async function getFallbackCategories(userId: string) {
  try {
    // Obtener todas las categorías usando la vista all_categories
    const { data: allCategories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories with fallback:', categoriesError);
      throw new Error('No se pudieron cargar las categorías');
    }

    // Obtener configuración de visibilidad
    const { data: visibilitySettings, error: visibilityError } = await supabase
      .from('category_visibility')
      .select('*')
      .eq('user_id', userId);

    if (visibilityError) {
      console.error('Error fetching category visibility:', visibilityError);
      // Continuar sin visibilidad, todas las categorías serán visibles por defecto
    }

    // Crear mapa de visibilidad
    const visibilityMap = new Map();
    if (visibilitySettings && visibilitySettings.length > 0) {
      visibilitySettings.forEach(setting => {
        visibilityMap.set(setting.category_id, setting.is_visible);
      });
    }

    // Aplicar visibilidad a las categorías
    const categoriesWithVisibility = allCategories.map(category => {
      // Si hay configuración de visibilidad para esta categoría, usarla
      if (visibilityMap.has(category.id)) {
        return {
          ...category,
          is_visible: visibilityMap.get(category.id)
        };
      }
      // Sin configuración, todas son visibles por defecto
      return { 
        ...category, 
        is_visible: true
      };
    });

    return categoriesWithVisibility;
  } catch (error) {
    console.error('Error en getFallbackCategories:', error);
    return [];
  }
}

// Obtener todas las categorías, incluyendo las ocultas
export async function getAllCategories(userId: string) {
  try {
    const categories = await getCategories(userId);
    return categories;
  } catch (error) {
    console.error('Error en getAllCategories:', error);
    throw error;
  }
}

// Obtener solo las categorías visibles
export async function getVisibleCategories(userId: string) {
  try {
    const categories = await getCategories(userId);
    return categories.filter(category => category.is_visible !== false);
  } catch (error) {
    console.error('Error en getVisibleCategories:', error);
    throw error;
  }
}

// Crear una categoría del sistema (solo para administradores)
export async function createSystemCategory(category: Omit<CategoryInput, 'user_id' | 'is_system'>) {
  const { data, error } = await supabase
    .from('system_categories')
    .insert({
      ...category,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error('Error creating system category:', error);
    throw new Error('No se pudo crear la categoría del sistema');
  }

  return data[0];
}

// Crear una categoría personalizada para un usuario
export async function createCustomCategory(userId: string, categoryData: { name: string, color: string, icon: string }) {
  const { data, error } = await supabase
    .from('user_categories')
    .insert({
      user_id: userId,
      name: categoryData.name,
      color: categoryData.color,
      icon: categoryData.icon,
      created_at: new Date().toISOString(),
      id: uuidv4()
    })
    .select();

  if (error) {
    console.error('Error creating custom category:', error);
    throw new Error('No se pudo crear la categoría personalizada');
  }

  return data[0];
}

// Para mantener compatibilidad con el código existente
export async function createCategory(category: CategoryInput) {
  // Si es una categoría del sistema, usar createSystemCategory
  if (category.is_system) {
    const { user_id, is_system, ...systemCategoryData } = category;
    return await createSystemCategory(systemCategoryData);
  }
  
  // Si es una categoría de usuario, usar createCustomCategory
  if (category.user_id) {
    return await createCustomCategory(category.user_id, {
      name: category.name,
      color: category.color,
      icon: category.icon || 'tag'
    });
  }
  
  throw new Error('La categoría debe ser del sistema o de usuario');
}

export async function updateCategory(id: string, categoryData: { name?: string, color?: string, icon?: string }) {
  try {
    // Primero verificamos si la categoría es del sistema o de usuario
    const { data: categoryInfo, error: infoError } = await supabase
      .from('all_categories')
      .select('*')
      .eq('id', id)
      .single();
      
    if (infoError) {
      console.error('Error checking category:', infoError);
      throw new Error('No se pudo verificar la categoría');
    }
    
    // Si es una categoría del sistema, solo permitir ciertos cambios
    if (categoryInfo.is_system) {
      // Para categorías del sistema solo permitimos actualizar color e icono
      const safeUpdates = {
        color: categoryData.color,
        icon: categoryData.icon
      };
      
      const { data, error } = await supabase
        .from('system_categories')
        .update(safeUpdates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating system category:', error);
        throw new Error('No se pudo actualizar la categoría del sistema');
      }

      return data[0];
    } else {
      // Para categorías de usuario, permitir actualizaciones completas
      const { data, error } = await supabase
        .from('user_categories')
        .update(categoryData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating user category:', error);
        throw new Error('No se pudo actualizar la categoría');
      }

      return data[0];
    }
  } catch (error) {
    console.error('Error en updateCategory:', error);
    throw error;
  }
}

// Establecer visibilidad de una categoría para un usuario
export async function setCategoryVisibility(userId: string, categoryId: string, isVisible: boolean) {
  try {
    // Verificar si ya existe una configuración de visibilidad
    const { data: existingSettings, error: checkError } = await supabase
      .from('category_visibility')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (checkError) {
      console.error('Error checking category visibility:', checkError);
      throw new Error('Error al verificar la visibilidad de la categoría');
    }

    if (existingSettings && existingSettings.length > 0) {
      // Actualizar configuración existente
      const { error: updateError } = await supabase
        .from('category_visibility')
        .update({ is_visible: isVisible })
        .eq('id', existingSettings[0].id);

      if (updateError) {
        console.error('Error updating category visibility:', updateError);
        throw new Error('No se pudo actualizar la visibilidad de la categoría');
      }
    } else {
      // Crear nueva configuración
      const { error: insertError } = await supabase
        .from('category_visibility')
        .insert({
          id: uuidv4(),
          user_id: userId,
          category_id: categoryId,
          is_visible: isVisible
        });

      if (insertError) {
        console.error('Error creating category visibility:', insertError);
        throw new Error('No se pudo establecer la visibilidad de la categoría');
      }
    }

    return true;
  } catch (error) {
    console.error('Error en setCategoryVisibility:', error);
    throw error;
  }
}

// En lugar de eliminar categorías del sistema, las ocultamos
export async function deleteCategory(id: string, userId: string) {
  try {
    // Verificar si la categoría existe y si es del sistema o de usuario
    const { data: categoryData, error: categoryError } = await supabase
      .from('all_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (categoryError) {
      console.error('Error checking category:', categoryError);
      throw new Error('No se pudo verificar la categoría');
    }

    // Si es una categoría del sistema, en lugar de eliminarla, configuramos su visibilidad en falso
    if (categoryData.is_system) {
      // Ocultar la categoría para este usuario en lugar de eliminarla
      return await setCategoryVisibility(userId, id, false);
    }

    // Verificar si hay transacciones asociadas
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) {
      console.error('Error checking transactions:', countError);
      throw new Error('No se pudo verificar las transacciones asociadas');
    }

    if (count && count > 0) {
      // Si hay transacciones asociadas, ocultar en lugar de eliminar
      return await setCategoryVisibility(userId, id, false);
    }

    // Si no es del sistema y no tiene transacciones, eliminarla
    const { error } = await supabase
      .from('user_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error('No se pudo eliminar la categoría');
    }

    return true;
  } catch (error) {
    console.error('Error en deleteCategory:', error);
    throw error;
  }
}

// Lista de categorías predeterminadas para inicialización
export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id' | 'created_at' | 'is_system'>> = [
  { 
    user_id: null, 
    name: 'Alimentación', 
    color: '#3B82F6', 
    icon: 'shopping-cart'
  },
  { 
    user_id: null, 
    name: 'Vivienda', 
    color: '#8B5CF6', 
    icon: 'home'
  },
  { 
    user_id: null, 
    name: 'Transporte', 
    color: '#10B981', 
    icon: 'car'
  },
  { 
    user_id: null, 
    name: 'Entretenimiento', 
    color: '#EF4444', 
    icon: 'film'
  },
  { 
    user_id: null, 
    name: 'Salud', 
    color: '#F59E0B', 
    icon: 'heart'
  },
  { 
    user_id: null, 
    name: 'Educación', 
    color: '#0EA5E9', 
    icon: 'book'
  },
  { 
    user_id: null, 
    name: 'Ahorro', 
    color: '#14B8A6', 
    icon: 'piggy-bank'
  },
  { 
    user_id: null, 
    name: 'Sueldo', 
    color: '#22C55E', 
    icon: 'briefcase'
  },
  { 
    user_id: null, 
    name: 'Otros Ingresos', 
    color: '#6366F1', 
    icon: 'dollar-sign'
  },
  { 
    user_id: null, 
    name: 'Otros Gastos', 
    color: '#71717A', 
    icon: 'tag'
  },
]; 