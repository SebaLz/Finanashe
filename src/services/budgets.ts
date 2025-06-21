import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getTotalFixedExpensesByCategory, getFixedExpensesByCategory, FixedExpenseWithCategory } from './fixed-expenses';
import { getAllGoalDeductionsForMonth, calculateGoalDeductionsForCategory } from './budget-goals';

// Añadimos nuevos tipos para la personalización del presupuesto
export type BudgetSettings = {
  id: string;
  user_id: string;
  budget_id: string;
  fixed_expense_id: string;
  is_included: boolean;
  created_at?: string;
};

export type BudgetSettingsInput = Omit<BudgetSettings, 'id' | 'created_at'>;

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  percentage: number | null;
  month: string;
  created_at?: string;
};

export type BudgetWithCategory = Budget & {
  category: {
    name: string;
    color: string;
    icon: string | null;
    is_system?: boolean;
  };
};

export type BudgetWithFixedExpenses = BudgetWithCategory & {
  fixed_expenses_amount: number;
  available_amount: number;
  fixed_expenses?: FixedExpenseWithCategory[];
  excluded_fixed_expenses?: FixedExpenseWithCategory[];
};

export type BudgetInput = Omit<Budget, 'id' | 'created_at'>;

export async function getBudgets(userId: string, month: string) {
  try {
    // 1. Obtener todos los presupuestos
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month);

    if (budgetsError) {
      console.error('Error fetching budgets:', budgetsError);
      throw new Error('No se pudieron cargar los presupuestos');
    }

    if (!budgets || budgets.length === 0) {
      return [];
    }

    // 2. Obtener todas las categorías necesarias
    const categoryIds = [...new Set(budgets.map(b => b.category_id))];
    
    const { data: categories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .in('id', categoryIds);

    if (categoriesError) {
      console.error('Error fetching categories for budgets:', categoriesError);
      // Devolver presupuestos sin categorías si hay error
      return budgets;
    }

    // 3. Crear un mapa de categorías para acceso rápido
    const categoryMap = new Map();
    if (categories) {
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });
    }

    // 4. Adjuntar categorías a los presupuestos
    const budgetsWithCategories = budgets.map(budget => {
      return {
        ...budget,
        category: categoryMap.get(budget.category_id) || null
      };
    });

    return budgetsWithCategories as BudgetWithCategory[];
  } catch (error) {
    console.error('Error in getBudgets:', error);
    throw error;
  }
}

export async function createBudget(budget: BudgetInput) {
  const { data, error } = await supabase
    .from('budgets')
    .insert({
      ...budget,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error('Error creating budget:', error);
    throw new Error('No se pudo crear el presupuesto');
  }

  return data[0] as Budget;
}

export async function updateBudget(id: string, budget: Partial<BudgetInput>) {
  const { data, error } = await supabase
    .from('budgets')
    .update(budget)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating budget:', error);
    throw new Error('No se pudo actualizar el presupuesto');
  }

  return data[0] as Budget;
}

export async function deleteBudget(id: string) {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting budget:', error);
    throw new Error('No se pudo eliminar el presupuesto');
  }

  return true;
}

// Nuevas funciones para gestionar la personalización del presupuesto

// Obtener configuración de gastos fijos incluidos/excluidos
export async function getBudgetSettings(userId: string, budgetId: string) {
  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('budget_id', budgetId);

  if (error) {
    console.error('Error fetching budget settings:', error);
    throw new Error('No se pudieron cargar la configuración del presupuesto');
  }

  return data as BudgetSettings[];
}

// Actualizar inclusión/exclusión de un gasto fijo en el presupuesto
export async function updateBudgetFixedExpenseSetting(
  userId: string, 
  budgetId: string, 
  fixedExpenseId: string, 
  isIncluded: boolean
) {
  // Verificar si ya existe una configuración para este gasto fijo
  const { data: existingSettings, error: fetchError } = await supabase
    .from('budget_settings')
    .select('id')
    .eq('user_id', userId)
    .eq('budget_id', budgetId)
    .eq('fixed_expense_id', fixedExpenseId);

  if (fetchError) {
    console.error('Error checking budget settings:', fetchError);
    throw new Error('Error al verificar la configuración del presupuesto');
  }

  if (existingSettings && existingSettings.length > 0) {
    // Actualizar configuración existente
    const { error: updateError } = await supabase
      .from('budget_settings')
      .update({ is_included: isIncluded })
      .eq('id', existingSettings[0].id);

    if (updateError) {
      console.error('Error updating budget settings:', updateError);
      throw new Error('No se pudo actualizar la configuración del presupuesto');
    }
  } else {
    // Crear nueva configuración
    const { error: insertError } = await supabase
      .from('budget_settings')
      .insert({
        id: uuidv4(),
        user_id: userId,
        budget_id: budgetId,
        fixed_expense_id: fixedExpenseId,
        is_included: isIncluded
      });

    if (insertError) {
      console.error('Error creating budget settings:', insertError);
      throw new Error('No se pudo crear la configuración del presupuesto');
    }
  }

  return true;
}

// Obtener presupuesto detallado con gastos fijos incluidos/excluidos
export async function getDetailedBudget(userId: string, budgetId: string) {
  try {
    // Obtener el presupuesto básico
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (budgetError) {
      console.error('Error fetching budget for details:', budgetError);
      throw new Error('No se pudo cargar el presupuesto');
    }

    // Obtener la categoría
    const { data: categoryData, error: categoryError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .eq('id', budget.category_id)
      .single();

    if (categoryError) {
      console.error('Error fetching category for budget:', categoryError);
      // Continuar sin la categoría
    }

    // Añadir la categoría al presupuesto
    const budgetWithCategory = {
      ...budget,
      category: categoryData || null
    };

    // Obtener todos los gastos fijos de esta categoría
    const fixedExpenses = await getFixedExpensesByCategory(userId, budget.category_id);
    
    // Obtener configuración de inclusión/exclusión
    const settings = await getBudgetSettings(userId, budgetId);
    
    // Filtrar gastos fijos incluidos y excluidos
    const settingsMap = new Map();
    settings.forEach(setting => {
      settingsMap.set(setting.fixed_expense_id, setting.is_included);
    });
    
    const includedExpenses: FixedExpenseWithCategory[] = [];
    const excludedExpenses: FixedExpenseWithCategory[] = [];
    
    fixedExpenses.forEach(expense => {
      // Si existe configuración, usar esa, de lo contrario incluir por defecto
      const isIncluded = settingsMap.has(expense.id) ? settingsMap.get(expense.id) : true;
      
      if (isIncluded) {
        includedExpenses.push(expense);
      } else {
        excludedExpenses.push(expense);
      }
    });
    
    // Calcular monto de gastos fijos incluidos
    const includedAmount = includedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Obtener deducciones por objetivos para esta categoría/presupuesto
    const goalDeductionsAmount = await calculateGoalDeductionsForCategory(
      userId, 
      budget.category_id, 
      budget.month
    );
    
    // Calcular el total realmente disponible (presupuesto - gastos fijos - objetivos)
    const totalDeductions = includedAmount + goalDeductionsAmount;
    const availableAmount = budget.amount - totalDeductions;
    
    return {
      ...budgetWithCategory,
      fixed_expenses: includedExpenses,
      excluded_fixed_expenses: excludedExpenses,
      fixed_expenses_amount: includedAmount,
      goal_deductions_amount: goalDeductionsAmount,
      available_amount: availableAmount,
      total_deductions: totalDeductions
    } as BudgetWithFixedExpenses;
  } catch (error) {
    console.error('Error getting detailed budget:', error);
    throw new Error('No se pudo cargar el presupuesto detallado');
  }
}

// Actualizar getBudgetSummary para incluir deducciones de objetivos
export async function getBudgetSummary(userId: string, month: string) {
  try {
    console.log('Obteniendo resumen de presupuestos para:', userId, month);
    
    // Obtener presupuestos del mes actual
    const budgets = await getBudgets(userId, month);
    
    if (!budgets || budgets.length === 0) {
      console.log('No hay presupuestos configurados para este mes');
      return [];
    }
    
    // Calcular gastos del mes actual
    const monthStart = `${month}-01`;
    const nextMonth = month.split('-');
    let year = parseInt(nextMonth[0]);
    let monthNum = parseInt(nextMonth[1]);
    
    if (monthNum === 12) {
      monthNum = 1;
      year++;
    } else {
      monthNum++;
    }
    
    const nextMonthStr = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    
    // Obtener transacciones del mes
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lt('date', nextMonthStr)
      .eq('type', 'expense');
    
    if (transError) {
      console.error('Error obteniendo transacciones:', transError);
    }
    
    // Calcular gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    
    if (transactions) {
      transactions.forEach((transaction: any) => {
        if (!transaction.category_id) return;
        
        if (!expensesByCategory[transaction.category_id]) {
          expensesByCategory[transaction.category_id] = 0;
        }
        expensesByCategory[transaction.category_id] += transaction.amount;
      });
    }
    
    // Combinar presupuestos con gastos reales
    const budgetSummary = budgets.map(budget => {
      const spent = expensesByCategory[budget.category_id] || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      
      return {
        ...budget,
        spent,
        percentage,
        remaining,
        isExceeded: spent > budget.amount,
        available_amount: budget.amount
      };
    });
    
    return budgetSummary;
  } catch (error) {
    console.error('Error en getBudgetSummary:', error);
    return [];
  }
}

// Versión anterior para compatibilidad
async function getBudgetSummaryLegacy(
  userId: string, 
  month: string, 
  budgets: BudgetWithCategory[], 
  fixedExpensesByCategory: Record<string, number>
) {
  try {
    // Obtener transacciones del mes para calcular gastos reales
    const monthStart = `${month}-01`;
    const nextMonth = month.substring(0, 7).split('-');
    const year = parseInt(nextMonth[0]);
    let monthNum = parseInt(nextMonth[1]);
    
    // Calcular el primer día del mes siguiente
    if (monthNum === 12) {
      monthNum = 1;
      monthNum++;
    } else {
      monthNum++;
    }
    
    const nextMonthStr = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    
    // Usar el rango de fechas en lugar de LIKE
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lt('date', nextMonthStr)
      .eq('type', 'expense');
    
    // Si hay error al obtener transacciones, registramos detalles y continuamos con presupuestos sin gastos
    if (error) {
      console.error('Error fetching transactions for budget summary:', error);
      
      // Devolver presupuestos con gastos en cero y gastos fijos
      return budgets.map(budget => {
        const fixedExpensesAmount = fixedExpensesByCategory[budget.category_id] || 0;
        return {
          ...budget,
          spent: 0,
          percentage: 0,
          remaining: budget.amount,
          isExceeded: false,
          fixed_expenses_amount: fixedExpensesAmount,
          available_amount: budget.amount - fixedExpensesAmount
        };
      });
    }
    
    // Si no hay transacciones, devolver presupuestos con gastos en cero y gastos fijos
    if (!transactions || transactions.length === 0) {
      return budgets.map(budget => {
        const fixedExpensesAmount = fixedExpensesByCategory[budget.category_id] || 0;
        return {
          ...budget,
          spent: 0,
          percentage: 0,
          remaining: budget.amount,
          isExceeded: false,
          fixed_expenses_amount: fixedExpensesAmount,
          available_amount: budget.amount - fixedExpensesAmount
        };
      });
    }
    
    // Calcular gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    
    transactions.forEach((transaction: any) => {
      if (!transaction.category_id) return; // Ignorar transacciones sin categoría
      
      if (!expensesByCategory[transaction.category_id]) {
        expensesByCategory[transaction.category_id] = 0;
      }
      expensesByCategory[transaction.category_id] += transaction.amount;
    });
    
    // Combinar presupuestos con gastos reales y gastos fijos
    const budgetSummary = budgets.map(budget => {
      const spent = expensesByCategory[budget.category_id] || 0;
      const fixedExpensesAmount = fixedExpensesByCategory[budget.category_id] || 0;
      const available = budget.amount - fixedExpensesAmount;
      const percentage = available > 0 ? Math.round((spent / available) * 100) : 0;
      
      return {
        ...budget,
        spent,
        percentage,
        remaining: available - spent,
        isExceeded: spent > available,
        fixed_expenses_amount: fixedExpensesAmount,
        available_amount: available
      };
    });
    
    return budgetSummary;
  } catch (error) {
    console.error('Error en getBudgetSummaryLegacy:', error);
    return [];
  }
}

// Nuevos tipos para la configuración de categorías
export type BudgetCategorySettings = {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  is_included: boolean;
  created_at?: string;
};

export type BudgetCategorySettingsInput = Omit<BudgetCategorySettings, 'id' | 'created_at'>;

// Obtener configuración de categorías incluidas/excluidas para un mes específico
export async function getBudgetCategorySettings(userId: string, month: string) {
  const { data, error } = await supabase
    .from('budget_category_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month);

  if (error) {
    console.error('Error fetching budget category settings:', error);
    throw new Error('No se pudieron cargar la configuración de categorías');
  }

  return data as BudgetCategorySettings[];
}

// Actualizar inclusión/exclusión de una categoría en el presupuesto
export async function updateCategoryInclusion(
  userId: string, 
  categoryId: string, 
  month: string,
  isIncluded: boolean
) {
  // Verificar si ya existe una configuración para esta categoría
  const { data: existingSettings, error: fetchError } = await supabase
    .from('budget_category_settings')
    .select('id')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('month', month);

  if (fetchError) {
    console.error('Error checking category settings:', fetchError);
    throw new Error('Error al verificar la configuración de categorías');
  }

  if (existingSettings && existingSettings.length > 0) {
    // Actualizar configuración existente
    const { error: updateError } = await supabase
      .from('budget_category_settings')
      .update({ is_included: isIncluded })
      .eq('id', existingSettings[0].id);

    if (updateError) {
      console.error('Error updating category settings:', updateError);
      throw new Error('No se pudo actualizar la configuración de categorías');
    }
  } else {
    // Crear nueva configuración
    const { error: insertError } = await supabase
      .from('budget_category_settings')
      .insert({
        id: uuidv4(),
        user_id: userId,
        category_id: categoryId,
        month: month,
        is_included: isIncluded
      });

    if (insertError) {
      console.error('Error creating category settings:', insertError);
      throw new Error('No se pudo crear la configuración de categorías');
    }
  }

  return true;
}

// Obtener solo las categorías seleccionadas por el usuario para un mes específico
export async function getSelectedCategories(userId: string, month: string) {
  try {
    // Obtener todas las categorías disponibles (propias del usuario y predeterminadas)
    const { data: allCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`);
    
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw new Error('No se pudieron cargar las categorías');
    }
    
    // Obtener configuración de inclusión/exclusión
    const settings = await getBudgetCategorySettings(userId, month);
    
    // Crear un mapa con la configuración por categoría
    const settingsMap = new Map();
    settings.forEach(setting => {
      settingsMap.set(setting.category_id, setting.is_included);
    });
    
    // Filtrar categorías según configuración (o incluir por defecto si no hay configuración)
    const selectedCategories = allCategories.filter(category => {
      // Si hay configuración para esta categoría, usar su valor
      if (settingsMap.has(category.id)) {
        return settingsMap.get(category.id);
      }
      // Si no hay configuración, incluir por defecto
      return true;
    });
    
    return selectedCategories;
  } catch (error) {
    console.error('Error getting selected categories:', error);
    throw new Error('No se pudieron obtener las categorías seleccionadas');
  }
}

// Obtener todas las configuraciones para un presupuesto específico
export async function getBudgetFixedExpenseSettings(userId: string, budgetId: string): Promise<BudgetSettings[]> {
  try {
    const { data, error } = await supabase
      .from('budget_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('budget_id', budgetId);

    if (error) {
      console.error('Error al obtener configuraciones del presupuesto:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener configuraciones:', error);
    return [];
  }
} 