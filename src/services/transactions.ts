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
  is_budgetable: boolean;
  created_at?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    emoji?: string | null;
    is_system?: boolean;
    is_default?: boolean;
  };
};

export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'category'>;

export async function getTransactions(userId: string, month?: string) {
  try {
    if (!userId) {
      console.error('getTransactions: userId is required');
      return [];
    }

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories:category_id (*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Si se proporciona un mes, filtrar por ese mes
    if (month) {
      const startDate = `${month}-01`;
      let endDate;
      
      // Determinar el primer día del mes siguiente
      const [year, monthNum] = month.split('-').map(part => parseInt(part));
      if (monthNum === 12) {
        endDate = `${year + 1}-01-01`;
      } else {
        endDate = `${year}-${String(monthNum + 1).padStart(2, '0')}-01`;
      }
      
      query = query
        .gte('date', startDate)
        .lt('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getTransactions:', error);
    return [];
  }
}

// Función para crear transacción
export async function createTransaction(transaction: TransactionInput) {
  try {
    // Validar datos requeridos
    if (!transaction.user_id || !transaction.amount || !transaction.type || !transaction.date) {
      throw new Error('Faltan datos requeridos para crear la transacción');
    }
    
    console.log('Intentando crear transacción:', transaction);
    
    // Asegurarnos de que estamos autenticados primero
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Error al verificar la autenticación:', authError);
      throw new Error(`Error de autenticación: ${authError.message}`);
    }
    
    if (!authData.session) {
      console.error('No hay sesión activa');
      throw new Error('Debes iniciar sesión para crear una transacción');
    }
    
    console.log('Sesión de usuario verificada:', authData.session.user.id);
    
    try {
      console.log('Intentando crear transacción con RPC create_transaction...');
      const { data, error } = await supabase
        .rpc('create_transaction', {
          p_user_id: transaction.user_id,
          p_type: transaction.type,
          p_amount: transaction.amount,
          p_category_id: transaction.category_id,
          p_date: transaction.date,
          p_description: transaction.description || null,
          p_is_budgetable: transaction.is_budgetable !== undefined ? transaction.is_budgetable : true
        });
        
      if (error) {
        console.error('Error con RPC create_transaction:', error);
        throw error;
      }
      
      console.log('Transacción creada con éxito via RPC:', data);
      return data;
    } catch (supabaseError) {
      console.error('Error al crear transacción con RPC:', supabaseError);
      
      // Intentamos crear la transacción directamente
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            id: uuidv4(),
            user_id: transaction.user_id,
            type: transaction.type,
            amount: transaction.amount,
            category_id: transaction.category_id,
            date: transaction.date,
            description: transaction.description || null,
            is_budgetable: transaction.is_budgetable !== undefined ? transaction.is_budgetable : true
          })
          .select();
          
        if (error) {
          console.error('Error al crear transacción directamente:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('No se pudo crear la transacción: respuesta vacía');
        }
        
        // Obtener datos de la categoría para devolver un objeto completo
        const { data: categoryData, error: categoryError } = await supabase
          .from('all_categories')
          .select('id, name, color, icon, is_system, is_default')
          .eq('id', transaction.category_id)
          .single();
          
        const transactionWithCategory = {
          ...data[0],
          category: categoryError ? {
            id: transaction.category_id,
            name: 'Sin categoría',
            color: '#9E9E9E',
            icon: 'help-circle',
            is_system: true,
            is_default: true
          } : categoryData
        };
        
        console.log('Transacción creada con éxito directamente:', transactionWithCategory);
        return transactionWithCategory;
      } catch (directError) {
        console.error('Error al crear transacción directamente:', directError);
        
        // Intentar con API route como último recurso
        console.log('Intentando con API route...');
        
        // Obtener la URL base actual
        const baseUrl = window.location.origin;
        const apiUrl = `${baseUrl}/api/transactions`;
        console.log('Usando API URL:', apiUrl);
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: transaction.type,
              amount: transaction.amount,
              category_id: transaction.category_id,
              date: transaction.date,
              description: transaction.description || null,
              is_budgetable: transaction.is_budgetable !== undefined ? transaction.is_budgetable : true
            }),
            credentials: 'include' // Incluir cookies para autenticación
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error respuesta API route:', response.status, errorText);
            throw new Error(`Error al crear transacción con API route: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          console.log('Transacción creada con API route:', result);
          return result;
        } catch (apiError) {
          console.error('Error con API route:', apiError);
          throw apiError;
        }
      }
    }
  } catch (error) {
    console.error('Exception in createTransaction:', error);
    throw error;
  }
}

export async function updateTransaction(id: string, transaction: Partial<TransactionInput>) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating transaction:', error);
      throw new Error('No se pudo actualizar la transacción');
    }

    if (!data || data.length === 0) {
      throw new Error('No se encontró la transacción para actualizar');
    }

    // Obtener datos de la categoría para devolver un objeto completo
    if (transaction.category_id) {
      const { data: categoryData, error: categoryError } = await supabase
        .from('all_categories')
        .select('id, name, color, icon, is_system, is_default')
        .eq('id', transaction.category_id)
        .single();
        
      const transactionWithCategory = {
        ...data[0],
        category: categoryError ? {
          id: transaction.category_id,
          name: 'Sin categoría',
          color: '#9E9E9E',
          icon: 'help-circle',
          is_system: true,
          is_default: true
        } : categoryData
      };
      
      return transactionWithCategory;
    }

    return data[0];
  } catch (error) {
    console.error('Exception in updateTransaction:', error);
    throw error;
  }
}

export async function deleteTransaction(id: string) {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw new Error('No se pudo eliminar la transacción');
    }

    return true;
  } catch (error) {
    console.error('Exception in deleteTransaction:', error);
    throw error;
  }
}

export async function getTransactionsByCategory(userId: string, startDate: string, endDate: string) {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:category_id (
          id,
          name,
          color,
          icon,
          emoji,
          is_system,
          is_default
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by category:', error);
      throw new Error('No se pudieron cargar las transacciones por categoría');
    }

    // Agrupar transacciones por categoría
    const transactionsByCategory: Record<string, {
      category: any,
      transactions: any[],
      total: number
    }> = {};

    transactions.forEach(transaction => {
      const categoryId = transaction.category_id;
      const categoryInfo = transaction.category || {
        id: categoryId,
        name: 'Sin categoría',
        color: '#9E9E9E',
        icon: 'help-circle',
        emoji: '📊',
        is_system: true,
        is_default: true
      };
      
      if (!transactionsByCategory[categoryId]) {
        transactionsByCategory[categoryId] = {
          category: categoryInfo,
          transactions: [],
          total: 0
        };
      }
      
      transactionsByCategory[categoryId].transactions.push(transaction);
      transactionsByCategory[categoryId].total += parseFloat(transaction.amount);
    });
    
    return Object.values(transactionsByCategory);
  } catch (error) {
    console.error('Exception in getTransactionsByCategory:', error);
    return [];
  }
}

export async function getMonthlyTotals(userId: string, year: number) {
  try {
    // Obtener todas las transacciones del año
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, date, type')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
      
    if (error) {
      console.error('Error fetching transactions for monthly totals:', error);
      throw new Error('No se pudieron cargar las transacciones para totales mensuales');
    }
    
    // Inicializar totales mensuales
    const monthlyTotals = Array(12).fill(0).map(() => ({
      income: 0,
      expense: 0,
      balance: 0
    }));
    
    // Calcular totales por mes
    transactions.forEach(transaction => {
      const month = new Date(transaction.date).getMonth();
      const amount = parseFloat(transaction.amount);
      
      if (transaction.type === 'income') {
        monthlyTotals[month].income += amount;
      } else {
        monthlyTotals[month].expense += amount;
      }
      
      monthlyTotals[month].balance = monthlyTotals[month].income - monthlyTotals[month].expense;
    });
    
    return monthlyTotals;
  } catch (error) {
    console.error('Exception in getMonthlyTotals:', error);
    return Array(12).fill(0).map(() => ({
      income: 0,
      expense: 0,
      balance: 0
    }));
  }
}

export async function checkTransactionsTable() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .limit(1);
    
  if (error) {
    console.error('Error checking transactions table:', error);
    return false;
  }
  
  return true;
}

export async function getTransactionsByMonth(userId: string, month: string, type?: 'income' | 'expense') {
  try {
    // Convertir mes (formato YYYY-MM) a fechas de inicio y fin
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-');
    let nextMonth: string;
    let nextYear: string = year;
    
    if (parseInt(monthNum) === 12) {
      nextMonth = '01';
      nextYear = (parseInt(year) + 1).toString();
    } else {
      nextMonth = (parseInt(monthNum) + 1).toString().padStart(2, '0');
    }
    
    const endDate = `${nextYear}-${nextMonth}-01`;
    
    // Construir consulta base
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:category_id (
          id,
          name,
          color,
          icon,
          emoji,
          is_system,
          is_default
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lt('date', endDate);
      
    // Filtrar por tipo si se especifica
    if (type) {
      query = query.eq('type', type);
    }
    
    // Ordenar por fecha descendente
    query = query.order('date', { ascending: false });
    
    // Ejecutar consulta
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('Error fetching transactions by month:', error);
      throw new Error('No se pudieron cargar las transacciones del mes');
    }
    
    return transactions || [];
  } catch (error) {
    console.error('Exception in getTransactionsByMonth:', error);
    return [];
  }
}