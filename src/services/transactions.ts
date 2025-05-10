import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type Transaction = {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  date: string;
  description: string | null;
  created_at?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    is_system?: boolean;
  };
};

export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'category'>;

export async function getTransactions(userId: string) {
  try {
    console.log('Fetching transactions for userId:', userId);
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      console.error('Error details:', JSON.stringify(transactionsError));
      throw new Error('No se pudieron cargar las transacciones');
    }

    if (!transactions || transactions.length === 0) {
      return [];
    }

    const categoryIds = [...new Set(transactions.map(t => t.category_id))];
    
    const { data: categories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('id, name, color, icon, is_system')
      .in('id', categoryIds);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return transactions;
    }

    const categoryMap = new Map();
    if (categories) {
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });
    }

    const transactionsWithCategories = transactions.map(transaction => {
      return {
        ...transaction,
        categories: categoryMap.get(transaction.category_id) || null
      };
    });

    return transactionsWithCategories;
  } catch (error) {
    console.error('Exception in getTransactions:', error);
    return [];
  }
}

export async function createTransaction(transaction: TransactionInput) {
  try {
    // Validar datos requeridos
    if (!transaction.user_id || !transaction.amount || !transaction.type || !transaction.date) {
      throw new Error('Faltan datos requeridos para crear la transacción');
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Error creating transaction:', error);
      console.error('Transaction data:', transaction);
      throw new Error('No se pudo crear la transacción');
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Exception in createTransaction:', error);
    throw error;
  }
}

export async function updateTransaction(id: string, transaction: Partial<TransactionInput>) {
  const { data, error } = await supabase
    .from('transactions')
    .update(transaction)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating transaction:', error);
    throw new Error('No se pudo actualizar la transacción');
  }

  return data[0];
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('No se pudo eliminar la transacción');
  }

  return true;
}

export async function getTransactionsByCategory(userId: string, startDate: string, endDate: string) {
  try {
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('amount, type, category_id')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (transactionsError) {
      console.error('Error fetching transactions by category:', transactionsError);
      throw new Error('No se pudieron cargar las transacciones por categoría');
    }

    if (!transactions || transactions.length === 0) {
      return [];
    }

    const categoryIds = [...new Set(transactions.map(t => t.category_id))];
    
    const { data: categories, error: categoriesError } = await supabase
      .from('all_categories')
      .select('id, name, color, is_system')
      .in('id', categoryIds);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return transactions;
    }

    const categoryMap = new Map();
    if (categories) {
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });
    }

    const transactionsWithCategories = transactions.map(transaction => {
      return {
        ...transaction,
        categories: categoryMap.get(transaction.category_id) || null
      };
    });

    return transactionsWithCategories;
  } catch (error) {
    console.error('Exception in getTransactionsByCategory:', error);
    return [];
  }
}

export async function getMonthlyTotals(userId: string, year: number) {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching monthly totals:', error);
      throw new Error('No se pudieron cargar los totales mensuales');
    }

    // Procesar los datos para obtener los totales mensuales
    const monthlyTotals = Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));
    
    if (data && data.length > 0) {
      data.forEach((transaction) => {
        const month = new Date(transaction.date).getMonth();
        if (transaction.type === 'income') {
          monthlyTotals[month].income += transaction.amount;
        } else {
          monthlyTotals[month].expense += transaction.amount;
        }
      });
    }

    return monthlyTotals;
  } catch (error) {
    console.error('Exception in getMonthlyTotals:', error);
    return Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));
  }
}

// Función para verificar si la tabla transactions existe
export async function checkTransactionsTable() {
  try {
    const { data, error } = await supabase
      .rpc('check_transactions_table');
    
    if (error) {
      console.error('Error checking transactions table:', error);
      console.error('Error details:', JSON.stringify(error));
      return {
        exists: false,
        error: error
      };
    }
    
    return data;
  } catch (error) {
    console.error('Exception checking transactions table:', error);
    return {
      exists: false,
      error: error
    };
  }
}