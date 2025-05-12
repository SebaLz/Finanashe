export type BudgetMethodType = 'salary' | 'all_income' | 'salary_plus_selected';

export type BudgetMethodConfiguration = {
  id: string;
  user_id: string;
  budget_type: BudgetMethodType;
  salary_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type BudgetIncomeInclusion = {
  id: string;
  user_id: string;
  transaction_id: string;
  month: string;
  is_included: boolean;
  created_at: string;
};

export type BudgetMonthlyTotal = {
  id: string;
  user_id: string;
  month: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}; 