import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type FixedExpense = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id: string;
  frequency: 'monthly' | 'weekly' | 'biweekly';
  due_date: number;
  active: boolean;
  description?: string | null;
  total_installments?: number | null;
  paid_installments?: number | null;
  created_at?: string;
  installments?: number | null;
};

export type FixedExpenseWithCategory = FixedExpense & {
  category: {
    name: string;
    color: string;
    icon: string | null;
    is_system?: boolean;
  };
};

export type FixedExpenseInput = Omit<FixedExpense, 'id' | 'created_at'>;

export async function getFixedExpenses(userId: string) {
  try {
    // 1. Obtener todos los gastos fijos
    const { data: expenses, error: expensesError } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (expensesError) {
      console.error('Error fetching fixed expenses:', expensesError);
      return { data: [], error: expensesError };
    }

    if (!expenses || expenses.length === 0) {
      return { data: [], error: null };
    }

    // 2. Obtener todas las categorías necesarias
    const categoryIds = [...new Set(expenses.map(e => e.category_id))];
    
    const { data: categories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .in('id', categoryIds);

    if (categoriesError) {
      console.error('Error fetching categories for fixed expenses:', categoriesError);
      // Devolver gastos fijos sin categorías si hay error
      return { data: expenses, error: null };
    }

    // 3. Crear un mapa de categorías para acceso rápido
    const categoryMap = new Map();
    if (categories) {
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });
    }

    // 4. Adjuntar categorías a los gastos fijos
    const expensesWithCategories = expenses.map(expense => {
      return {
        ...expense,
        category: categoryMap.get(expense.category_id) || null
      };
    });

    return { data: expensesWithCategories, error: null };
  } catch (error) {
    console.error('Error in getFixedExpenses:', error);
    return { data: [], error };
  }
}

export async function getActiveFixedExpenses(userId: string) {
  try {
    // 1. Obtener todos los gastos fijos activos
    const { data: expenses, error: expensesError } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('name');

    if (expensesError) {
      console.error('Error fetching active fixed expenses:', expensesError);
      return { data: [], error: expensesError };
    }

    if (!expenses || expenses.length === 0) {
      return { data: [], error: null };
    }

    // 2. Obtener todas las categorías necesarias
    const categoryIds = [...new Set(expenses.map(e => e.category_id))];
    
    const { data: categories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .in('id', categoryIds);

    if (categoriesError) {
      console.error('Error fetching categories for active fixed expenses:', categoriesError);
      // Devolver gastos fijos sin categorías si hay error
      return { data: expenses, error: null };
    }

    // 3. Crear un mapa de categorías para acceso rápido
    const categoryMap = new Map();
    if (categories) {
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });
    }

    // 4. Adjuntar categorías a los gastos fijos
    const expensesWithCategories = expenses.map(expense => {
      return {
        ...expense,
        category: categoryMap.get(expense.category_id) || null
      };
    });

    return { data: expensesWithCategories, error: null };
  } catch (error) {
    console.error('Error in getActiveFixedExpenses:', error);
    return { data: [], error };
  }
}

export async function getFixedExpenseById(id: string) {
  try {
    // 1. Obtener el gasto fijo
    const { data: expense, error: expenseError } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (expenseError) {
      console.error('Error fetching fixed expense:', expenseError);
      throw new Error('No se pudo cargar el gasto fijo');
    }

    // 2. Obtener la categoría
    const { data: category, error: categoryError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .eq('id', expense.category_id)
      .single();

    if (categoryError) {
      console.error('Error fetching category for fixed expense:', categoryError);
      // Devolver gasto fijo sin categoría si hay error
      return expense;
    }

    // 3. Adjuntar categoría al gasto fijo
    return {
      ...expense,
      category
    } as FixedExpenseWithCategory;
  } catch (error) {
    console.error('Error in getFixedExpenseById:', error);
    throw error;
  }
}

export async function createFixedExpense(fixedExpense: FixedExpenseInput) {
  try {
    // Validar que los campos requeridos estén presentes
    if (!fixedExpense.user_id || !fixedExpense.name || !fixedExpense.amount || 
        !fixedExpense.category_id || !fixedExpense.frequency || fixedExpense.due_date === undefined) {
      throw new Error('Faltan campos requeridos para crear el gasto fijo');
    }

    // Si tiene cuotas, inicializar contador de cuotas pagadas
    const paidInstallments = fixedExpense.total_installments ? 0 : null;

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        ...fixedExpense,
        id: uuidv4(),
        paid_installments: paidInstallments,
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Error creating fixed expense:', error);
      throw new Error('No se pudo crear el gasto fijo');
    }

    return data[0] as FixedExpense;
  } catch (error) {
    console.error('Error in createFixedExpense:', error);
    throw error;
  }
}

export async function updateFixedExpense(id: string, fixedExpense: Partial<FixedExpenseInput>) {
  try {
    // Si se está actualizando total_installments, validar que paid_installments sea coherente
    if (fixedExpense.total_installments !== undefined) {
      // Obtener el gasto fijo actual para ver sus cuotas pagadas
      const { data: currentExpense, error: fetchError } = await supabase
        .from('fixed_expenses')
        .select('paid_installments, total_installments')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching current fixed expense:', fetchError);
        throw new Error('No se pudo obtener la información del gasto fijo');
      }

      // Si el nuevo total de cuotas es menor que las ya pagadas, ajustar
      if (currentExpense.paid_installments && 
          fixedExpense.total_installments && 
          fixedExpense.total_installments < currentExpense.paid_installments) {
        fixedExpense.paid_installments = fixedExpense.total_installments;
      }

      // Si cambia de tener cuotas a no tenerlas o viceversa
      if (currentExpense.total_installments === null && fixedExpense.total_installments !== null) {
        // Comienza a tener cuotas, inicializar contador
        fixedExpense.paid_installments = 0;
      } else if (currentExpense.total_installments !== null && fixedExpense.total_installments === null) {
        // Deja de tener cuotas
        fixedExpense.paid_installments = null;
      }
    }

    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(fixedExpense)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating fixed expense:', error);
      throw new Error('No se pudo actualizar el gasto fijo');
    }

    return data[0] as FixedExpense;
  } catch (error) {
    console.error('Error in updateFixedExpense:', error);
    throw error;
  }
}

export async function deleteFixedExpense(id: string) {
  try {
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fixed expense:', error);
      throw new Error('No se pudo eliminar el gasto fijo');
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFixedExpense:', error);
    throw error;
  }
}

export async function getFixedExpensesByCategory(userId: string, categoryId: string) {
  try {
    const { data: expenses, error: expensesError } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        category:category_id (
          id, name, color, icon, is_system
        )
      `)
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('name');

    if (expensesError) {
      console.error('Error fetching fixed expenses by category:', expensesError);
      throw new Error('No se pudieron cargar los gastos fijos por categoría');
    }

    return expenses as FixedExpenseWithCategory[];
  } catch (error) {
    console.error('Error in getFixedExpensesByCategory:', error);
    throw error;
  }
}

export async function getTotalFixedExpensesByCategory(userId: string) {
  try {
    const { data: expenses, error: expensesError } = await supabase
      .from('fixed_expenses')
      .select('category_id, amount')
      .eq('user_id', userId)
      .eq('active', true);

    if (expensesError) {
      console.error('Error fetching fixed expenses for total by category:', expensesError);
      throw new Error('No se pudieron cargar los gastos fijos para totales por categoría');
    }

    const totalsByCategory: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const categoryId = expense.category_id;
      const amount = parseFloat(expense.amount);
      
      if (!totalsByCategory[categoryId]) {
        totalsByCategory[categoryId] = 0;
      }
      
      totalsByCategory[categoryId] += amount;
    });
    
    return totalsByCategory;
  } catch (error) {
    console.error('Error in getTotalFixedExpensesByCategory:', error);
    throw error;
  }
}

export async function toggleFixedExpenseStatus(id: string, active: boolean) {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({ active })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error toggling fixed expense status:', error);
      throw new Error('No se pudo cambiar el estado del gasto fijo');
    }

    return data[0] as FixedExpense;
  } catch (error) {
    console.error('Error in toggleFixedExpenseStatus:', error);
    throw error;
  }
}

export async function updateFixedExpenseCategory(id: string, categoryId: string, userId: string) {
  try {
    // Validar primero que la categoría existe
    const { data: category, error: categoryError } = await supabase
      .from('all_categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      console.error('Error validating category existence:', categoryError);
      throw new Error('La categoría seleccionada no existe');
    }

    // Actualizar el gasto fijo
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({ category_id: categoryId })
      .eq('id', id)
      .eq('user_id', userId) // Asegurar que pertenece al usuario
      .select();

    if (error) {
      console.error('Error updating fixed expense category:', error);
      throw new Error('No se pudo actualizar la categoría del gasto fijo');
    }

    return data[0] as FixedExpense;
  } catch (error) {
    console.error('Error in updateFixedExpenseCategory:', error);
    throw error;
  }
}

export async function updatePaidInstallments(id: string, paidInstallments: number) {
  try {
    // Usar la función RPC para actualizar las cuotas pagadas
    const { data, error } = await supabase
      .rpc('update_fixed_expense_installments', {
        p_fixed_expense_id: id,
        p_paid_installments: paidInstallments
      });

    if (error) {
      console.error('Error updating paid installments with RPC:', error);
      
      // Método alternativo si la RPC falla
      const { data: directData, error: directError } = await supabase
        .from('fixed_expenses')
        .update({ paid_installments: paidInstallments })
        .eq('id', id)
        .select();

      if (directError) {
        console.error('Error updating paid installments directly:', directError);
        throw new Error('No se pudieron actualizar las cuotas pagadas');
      }

      return directData[0] as FixedExpense;
    }

    return data as FixedExpense;
  } catch (error) {
    console.error('Error in updatePaidInstallments:', error);
    throw error;
  }
}

export async function incrementPaidInstallments(id: string) {
  try {
    // Obtener el gasto fijo actual para ver sus cuotas pagadas
    const { data: currentExpense, error: fetchError } = await supabase
      .from('fixed_expenses')
      .select('paid_installments, total_installments')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current fixed expense:', fetchError);
      throw new Error('No se pudo obtener la información del gasto fijo');
    }

    // Si no tiene cuotas o ya están todas pagadas, no hacer nada
    if (currentExpense.total_installments === null || 
        currentExpense.paid_installments >= currentExpense.total_installments) {
      return currentExpense as FixedExpense;
    }

    // Incrementar en 1 el contador de cuotas pagadas
    const newPaidInstallments = (currentExpense.paid_installments || 0) + 1;
    
    // Llamar a la función para actualizar las cuotas pagadas
    return await updatePaidInstallments(id, newPaidInstallments);
  } catch (error) {
    console.error('Error in incrementPaidInstallments:', error);
    throw error;
  }
}

export async function generateFinancialTasks(userId: string, month: string) {
  try {
    // Usar la función RPC para generar tareas financieras
    const { data, error } = await supabase
      .rpc('generate_tasks_from_fixed_expenses', {
        p_user_id: userId,
        p_month: month
      });

    if (error) {
      console.error('Error generating financial tasks:', error);
      throw new Error('No se pudieron generar las tareas financieras');
    }

    return data;
  } catch (error) {
    console.error('Error in generateFinancialTasks:', error);
    throw error;
  }
} 