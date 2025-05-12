import { Category } from './category';
import { FixedExpenseWithCategory } from '@/services/fixed-expenses';

// Tipo para presupuesto con categoría
export type BudgetWithCategory = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  percentage: number;
  month: string;
  category: Category;
};

// Tipo para presupuesto con gastos y deducciones calculadas
export type BudgetWithSpent = BudgetWithCategory & {
  spent?: number;
  remaining?: number;
  isExceeded?: boolean;
};

// Tipo para presupuesto con gastos fijos calculados
export type BudgetWithFixedExpenses = BudgetWithSpent & {
  fixed_expenses?: FixedExpenseWithCategory[];
  excluded_fixed_expenses?: FixedExpenseWithCategory[];
  fixed_expenses_amount?: number;
  goal_deductions_amount?: number; // Monto deducido para objetivos
  total_deductions?: number; // Total de deducciones (gastos fijos + objetivos)
  available_amount?: number; // Monto disponible después de deducciones
};

// Tipo para los totales mensuales de presupuesto
export type BudgetMonthlyTotal = {
  id: string;
  user_id: string;
  month: string;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
}; 