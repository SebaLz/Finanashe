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
  installments?: number | null;
  created_at?: string;
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
      throw new Error('No se pudieron cargar los gastos fijos');
    }

    if (!expenses || expenses.length === 0) {
      return [];
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
      return expenses;
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

    return expensesWithCategories as FixedExpenseWithCategory[];
  } catch (error) {
    console.error('Error in getFixedExpenses:', error);
    throw error;
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
      throw new Error('No se pudieron cargar los gastos fijos activos');
    }

    if (!expenses || expenses.length === 0) {
      return [];
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
      return expenses;
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

    return expensesWithCategories as FixedExpenseWithCategory[];
  } catch (error) {
    console.error('Error in getActiveFixedExpenses:', error);
    throw error;
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
  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      ...fixedExpense,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error('Error creating fixed expense:', error);
    throw new Error('No se pudo crear el gasto fijo');
  }

  return data[0] as FixedExpense;
}

export async function updateFixedExpense(id: string, fixedExpense: Partial<FixedExpenseInput>) {
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
}

export async function deleteFixedExpense(id: string) {
  const { error } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting fixed expense:', error);
    throw new Error('No se pudo eliminar el gasto fijo');
  }

  return true;
}

export async function getFixedExpensesByCategory(userId: string, categoryId: string) {
  try {
    // Obtener todos los gastos fijos de esta categoría
    const { data: expenses, error: expensesError } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('active', true);

    if (expensesError) {
      console.error('Error fetching fixed expenses by category:', expensesError);
      throw new Error('No se pudieron cargar los gastos fijos por categoría');
    }

    if (!expenses || expenses.length === 0) {
      return [];
    }

    // Obtener la categoría
    const { data: category, error: categoryError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      console.error('Error fetching category for fixed expenses by category:', categoryError);
      // Devolver gastos fijos sin categoría si hay error
      return expenses;
    }

    // Adjuntar categoría a todos los gastos fijos
    const expensesWithCategory = expenses.map(expense => {
      return {
        ...expense,
        category
      };
    });

    return expensesWithCategory as FixedExpenseWithCategory[];
  } catch (error) {
    console.error('Error in getFixedExpensesByCategory:', error);
    throw error;
  }
}

export async function getTotalFixedExpensesByCategory(userId: string) {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select(`
      category_id,
      amount
    `)
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.error('Error fetching total fixed expenses by category:', error);
    throw new Error('No se pudieron cargar los totales de gastos fijos por categoría');
  }

  // Calcular totales por categoría
  const totalsByCategory: Record<string, number> = {};

  data.forEach((item) => {
    if (!totalsByCategory[item.category_id]) {
      totalsByCategory[item.category_id] = 0;
    }
    totalsByCategory[item.category_id] += item.amount;
  });

  return totalsByCategory;
}

export async function toggleFixedExpenseStatus(id: string, active: boolean) {
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
}

export async function updateFixedExpenseCategory(id: string, categoryId: string, userId: string) {
  // Primero, obtenemos el gasto fijo para validar que pertenece al usuario
  const { data: expense, error: fetchError } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching fixed expense for category update:', fetchError);
    throw new Error('No se pudo encontrar el gasto fijo');
  }

  // Luego, actualizamos la categoría
  const { data, error } = await supabase
    .from('fixed_expenses')
    .update({ category_id: categoryId })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating fixed expense category:', error);
    throw new Error('No se pudo actualizar la categoría del gasto fijo');
  }

  return data[0] as FixedExpense;
} 