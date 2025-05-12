import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Tipos para integraciones entre presupuesto y objetivos
export type BudgetGoalLink = {
  id: string;
  user_id: string;
  budget_id: string;
  goal_id: string;
  monthly_amount: number;
  auto_contribute: boolean;
  created_at?: string;
};

export type BudgetGoalLinkWithDetails = BudgetGoalLink & {
  goal: {
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
  };
  budget: {
    category_name: string;
    amount: number;
  };
};

export type BudgetGoalLinkInput = Omit<BudgetGoalLink, 'id' | 'created_at'>;

// Verificar si la tabla budget_goal_links existe
async function checkBudgetGoalLinksTable(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('budget_goal_links')
      .select('*', { count: 'exact', head: true });
    
    return !error;
  } catch (error) {
    console.error('Error verificando tabla budget_goal_links:', error);
    return false;
  }
}

/**
 * Obtiene todas las vinculaciones entre presupuestos y objetivos para un usuario
 * @param userId ID del usuario
 * @returns Lista de vinculaciones con detalles
 */
export async function getBudgetGoalLinks(userId: string): Promise<BudgetGoalLinkWithDetails[]> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('budget_goal_links')
      .select(`
        *,
        goal:goals(name, target_amount, current_amount, target_date),
        budget:budgets(category:categories(name), amount)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error obteniendo vinculaciones de presupuesto-objetivo:', error);
      return [];
    }

    return data as BudgetGoalLinkWithDetails[];
  } catch (error) {
    console.error('Error inesperado obteniendo vinculaciones de presupuesto-objetivo:', error);
    return [];
  }
}

/**
 * Crea una nueva vinculación entre un presupuesto y un objetivo
 * @param link Datos de la vinculación
 * @returns La vinculación creada
 */
export async function createBudgetGoalLink(link: BudgetGoalLinkInput): Promise<BudgetGoalLink | null> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    throw new Error('No se pudo crear la vinculación porque la tabla no existe');
  }

  try {
    const { data, error } = await supabase
      .from('budget_goal_links')
      .insert({
        ...link,
        id: uuidv4(),
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creando vinculación de presupuesto-objetivo:', error);
      throw new Error('No se pudo crear la vinculación');
    }

    return data[0] as BudgetGoalLink;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('No se pudo crear la vinculación');
  }
}

/**
 * Actualiza una vinculación existente entre presupuesto y objetivo
 * @param id ID de la vinculación
 * @param updates Campos a actualizar
 * @returns La vinculación actualizada
 */
export async function updateBudgetGoalLink(
  id: string,
  updates: Partial<BudgetGoalLinkInput>
): Promise<BudgetGoalLink | null> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('budget_goal_links')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error actualizando vinculación de presupuesto-objetivo:', error);
      throw new Error('No se pudo actualizar la vinculación');
    }

    return data[0] as BudgetGoalLink;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('No se pudo actualizar la vinculación');
  }
}

/**
 * Elimina una vinculación entre presupuesto y objetivo
 * @param id ID de la vinculación
 * @returns true si se eliminó correctamente
 */
export async function deleteBudgetGoalLink(id: string): Promise<boolean> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return false;
  }

  try {
    const { error } = await supabase
      .from('budget_goal_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando vinculación de presupuesto-objetivo:', error);
      throw new Error('No se pudo eliminar la vinculación');
    }

    return true;
  } catch (error) {
    console.error('Error inesperado eliminando vinculación:', error);
    return false;
  }
}

/**
 * Procesa las contribuciones automáticas a objetivos desde presupuestos
 * @param userId ID del usuario
 * @param month Mes en formato YYYY-MM
 * @returns Número de contribuciones realizadas
 */
export async function processAutomaticContributions(
  userId: string,
  month: string
): Promise<number> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return 0;
  }

  try {
    // Llamar a la función de base de datos que procesa las contribuciones
    const { data, error } = await supabase
      .rpc('process_budget_goal_contributions', {
        p_user_id: userId,
        p_month: month
      });
      
    if (error) {
      console.error('Error procesando contribuciones automáticas:', error);
      return 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error inesperado procesando contribuciones automáticas:', error);
    return 0;
  }
}

/**
 * Obtiene los objetivos vinculados a un presupuesto específico
 * @param budgetId ID del presupuesto
 * @returns Lista de vinculaciones con detalles
 */
export async function getGoalsForBudget(budgetId: string): Promise<BudgetGoalLinkWithDetails[]> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('budget_goal_links')
      .select(`
        *,
        goal:goals(name, target_amount, current_amount, target_date),
        budget:budgets(category:categories(name), amount)
      `)
      .eq('budget_id', budgetId);

    if (error) {
      console.error('Error obteniendo objetivos para presupuesto:', error);
      return [];
    }

    return data as BudgetGoalLinkWithDetails[];
  } catch (error) {
    console.error('Error inesperado obteniendo objetivos para presupuesto:', error);
    return [];
  }
}

/**
 * Obtiene los presupuestos vinculados a un objetivo específico
 * @param goalId ID del objetivo
 * @returns Lista de vinculaciones con detalles
 */
export async function getBudgetsForGoal(goalId: string): Promise<BudgetGoalLinkWithDetails[]> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('budget_goal_links')
      .select(`
        *,
        goal:goals(name, target_amount, current_amount, target_date),
        budget:budgets(category:categories(name), amount)
      `)
      .eq('goal_id', goalId);

    if (error) {
      console.error('Error obteniendo presupuestos para objetivo:', error);
      return [];
    }

    return data as BudgetGoalLinkWithDetails[];
  } catch (error) {
    console.error('Error inesperado obteniendo presupuestos para objetivo:', error);
    return [];
  }
}

/**
 * Calcula los descuentos totales de presupuesto por objetivos para una categoría
 * @param userId ID del usuario
 * @param categoryId ID de la categoría
 * @param month Mes en formato YYYY-MM
 * @returns Total de descuentos para la categoría por objetivos
 */
export async function calculateGoalDeductionsForCategory(
  userId: string,
  categoryId: string,
  month: string
): Promise<number> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return 0;
  }

  try {
    // Primero necesitamos obtener el ID del presupuesto para esta categoría/mes
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('month', month)
      .single();

    if (budgetError || !budgetData) {
      console.error('Error obteniendo presupuesto para calcular deducciones:', budgetError);
      return 0; // Si no hay presupuesto, no hay deducciones
    }

    // Ahora obtenemos las vinculaciones para este presupuesto
    const budgetId = budgetData.id;
    const links = await getGoalsForBudget(budgetId);
    
    // Sumamos todas las contribuciones mensuales
    const totalDeductions = links.reduce((sum, link) => sum + link.monthly_amount, 0);
    
    return totalDeductions;
  } catch (error) {
    console.error('Error calculando deducciones de presupuesto por objetivos:', error);
    return 0;
  }
}

/**
 * Obtiene todas las deducciones de presupuesto por objetivos para un mes
 * @param userId ID del usuario
 * @param month Mes en formato YYYY-MM
 * @returns Mapa de categorías a montos de deducción
 */
export async function getAllGoalDeductionsForMonth(
  userId: string,
  month: string
): Promise<Record<string, number>> {
  // Verificar si la tabla existe
  const tableExists = await checkBudgetGoalLinksTable();
  if (!tableExists) {
    console.warn('La tabla budget_goal_links no existe en la base de datos.');
    return {};
  }

  try {
    // Obtenemos todos los presupuestos para este mes
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('id, category_id')
      .eq('user_id', userId)
      .eq('month', month);
    
    if (budgetsError || !budgets || budgets.length === 0) {
      console.error('Error obteniendo presupuestos para deducciones:', budgetsError);
      return {};
    }
    
    // Creamos un mapa para almacenar las deducciones por categoría
    const deductions: Record<string, number> = {};
    
    // Para cada presupuesto, calculamos las deducciones por objetivos
    for (const budget of budgets) {
      const links = await getGoalsForBudget(budget.id);
      const categoryDeduction = links.reduce((sum, link) => sum + link.monthly_amount, 0);
      
      if (categoryDeduction > 0) {
        deductions[budget.category_id] = categoryDeduction;
      }
    }
    
    return deductions;
  } catch (error) {
    console.error('Error obteniendo todas las deducciones por objetivos:', error);
    return {};
  }
} 