import { FixedExpenseWithCategory } from '@/services/fixed-expenses';

export type FinancialTask = {
  id: string;
  user_id: string;
  fixed_expense_id: string | null;
  title: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid';
  payment_date: string | null;
  description: string | null;
  is_installment: boolean;
  installment_number: number | null;
  created_at?: string;
};

export type FinancialTaskWithDetails = FinancialTask & {
  fixed_expense?: FixedExpenseWithCategory;
};

export type FinancialTaskInput = Omit<FinancialTask, 'id' | 'created_at'>;

export type TaskComment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
  } | null;
}; 