/**
 * Utilidades para manejar categorías y evitar errores null
 */

import { FixedExpenseWithCategory, FixedExpense } from '@/services/fixed-expenses';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  is_default?: boolean;
  is_system?: boolean;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id: string;
  frequency: string;
  due_date: number;
  active: boolean;
  created_at?: string;
  description?: string;
  installments?: number;
  category?: Category;
}

/**
 * Asegura que una categoría siempre tenga propiedades válidas
 * @param category - La categoría que puede ser null o incompleta
 * @returns Una categoría con propiedades por defecto si es necesario
 */
export const ensureValidCategory = (category: Category | null | undefined): Category => {
  if (!category) {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Sin categoría',
      color: '#9E9E9E',
      icon: 'help-circle',
      is_default: true,
      is_system: true
    };
  }

  // Si la categoría existe pero algunas propiedades son null
  return {
    ...category,
    name: category.name || 'Sin categoría',
    color: category.color || '#9E9E9E',
    icon: category.icon || 'help-circle',
    is_default: typeof category.is_default === 'boolean' ? category.is_default : false,
    is_system: typeof category.is_system === 'boolean' ? category.is_system : false
  };
};

/**
 * Asegura que un array de categorías siempre tenga objetos válidos
 * @param categories - Array de categorías o respuesta de API que puede contener nulls
 * @returns Array de categorías con propiedades por defecto donde sea necesario
 */
export const ensureValidCategories = (categories: any[]): Category[] => {
  if (!Array.isArray(categories)) {
    console.warn('No se proporcionó un array de categorías válido:', categories);
    return [];
  }
  
  return categories.map(category => ({
    id: category.id || '0',
    name: category.name || 'Sin nombre',
    color: category.color || '#cccccc',
    icon: category.icon || null,
    is_system: category.is_system || false
  }));
};

/**
 * Obtiene una categoría por ID de un array, con valor por defecto si no existe
 * @param categories - Array de categorías
 * @param categoryId - ID de la categoría a buscar
 * @returns La categoría encontrada o una por defecto
 */
export const getCategoryById = (categories: Category[] | null | undefined, categoryId: string | null | undefined): Category => {
  if (!categories || !Array.isArray(categories) || !categoryId) {
    return ensureValidCategory(null);
  }

  const found = categories.find(cat => cat && cat.id === categoryId);
  return ensureValidCategory(found);
};

/**
 * Aplica un color por defecto a todas las categorías de un presupuesto
 * @param budgets - Array de presupuestos
 * @returns Presupuestos con categorías validadas
 */
export const ensureValidBudgetCategories = <T extends { category?: Category | null }>(budgets: T[] | null | undefined): T[] => {
  if (!budgets || !Array.isArray(budgets)) {
    return [];
  }

  return budgets.map(budget => {
    if (!budget) return null as any;
    
    return {
      ...budget,
      category: ensureValidCategory(budget.category)
    };
  }).filter(Boolean); // Eliminar cualquier null
};

/**
 * Aplica colores por defecto a todas las categorías de gastos fijos
 * @param fixedExpenses - Array de gastos fijos o respuesta de API
 * @returns Gastos fijos con categorías validadas
 */
export const ensureValidFixedExpenseCategories = (expenses: any[]): FixedExpenseWithCategory[] => {
  if (!Array.isArray(expenses)) {
    console.warn('No se proporcionó un array de gastos fijos válido:', expenses);
    return [];
  }
  
  return expenses.map(expense => {
    // Asegurarnos de que la categoría existe y tiene propiedades básicas
    const category = expense.category || {};
    
    return {
      ...expense,
      id: expense.id || '0',
      name: expense.name || 'Sin nombre',
      amount: typeof expense.amount === 'number' ? expense.amount : 0,
      category_id: expense.category_id || '0',
      frequency: (expense.frequency as 'monthly' | 'weekly' | 'biweekly') || 'monthly',
      due_date: typeof expense.due_date === 'number' ? expense.due_date : 1,
      active: typeof expense.active === 'boolean' ? expense.active : true,
      description: expense.description || null,
      total_installments: expense.total_installments || null,
      paid_installments: expense.paid_installments || null,
      // Asegurar que la categoría tiene valores predeterminados
      category: {
        name: category.name || 'Sin categoría',
        color: category.color || '#cccccc',
        icon: category.icon || null,
        is_system: category.is_system || false
      }
    };
  });
}; 