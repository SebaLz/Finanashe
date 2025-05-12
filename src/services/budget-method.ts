import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { 
  BudgetMethodConfiguration, 
  BudgetMethodType as BudgetMethodTypeImport,
  BudgetIncomeInclusion,
  BudgetMonthlyTotal
} from '@/types/budget-method';
import { format } from 'date-fns';

// Re-exportar el tipo para que pueda ser usado por los componentes
export type BudgetMethodType = BudgetMethodTypeImport;

/**
 * Tipos de configuración de presupuesto:
 * 
 * 1. salary: Utiliza solo el sueldo fijo mensual definido en la configuración.
 *    - Total = salary_amount (valor definido por el usuario)
 * 
 * 2. all_income: Utiliza todos los ingresos del mes actual.
 *    - Total = suma de todas las transacciones de tipo 'income' del mes, independientemente de is_budgetable
 * 
 * 3. salary_plus_selected: Utiliza solo los ingresos marcados como is_budgetable=true.
 *    - Total = suma de transacciones de tipo 'income' del mes con is_budgetable=true
 */

export async function getBudgetMethodConfiguration(userId: string) {
  try {
    const { data, error } = await supabase
      .from('budget_method_configuration')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 es "no rows returned", no es un error crítico
      if (error.code !== 'PGRST116') {
        console.error('Error fetching budget method configuration:', error);
        throw new Error('No se pudieron cargar la configuración del método de presupuesto');
      }
      return null;
    }

    return data as BudgetMethodConfiguration;
  } catch (error) {
    console.error('Exception in getBudgetMethodConfiguration:', error);
    throw error;
  }
}

export async function updateBudgetMethodConfiguration(
  userId: string, 
  config: Partial<BudgetMethodConfiguration>
) {
  try {
    const { data, error } = await supabase
      .from('budget_method_configuration')
      .upsert({
        id: config.id || uuidv4(),
        user_id: userId,
        budget_type: config.budget_type || 'all_income',
        salary_amount: config.salary_amount || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating budget method configuration:', error);
      throw new Error('No se pudo actualizar la configuración del método de presupuesto');
    }

    // Obtener el mes actual para recalcular el presupuesto
    const currentMonth = new Date().toISOString().substring(0, 7); // Formato YYYY-MM
    
    // Recalcular el total del presupuesto para el mes actual
    try {
      await supabase.rpc('calculate_monthly_budget_total', {
        p_user_id: userId,
        p_month: currentMonth
      });
    } catch (recalculateError) {
      console.error('Error recalculating budget total after configuration update:', recalculateError);
      // No lanzamos error ya que la operación principal ya se completó
    }

    return data as BudgetMethodConfiguration;
  } catch (error) {
    console.error('Exception in updateBudgetMethodConfiguration:', error);
    throw error;
  }
}

export async function toggleTransactionInclusion(
  userId: string, 
  transactionId: string, 
  month: string, 
  isIncluded: boolean
) {
  try {
    // Verificar si ya existe una configuración
    const { data: existingData, error: checkError } = await supabase
      .from('budget_income_inclusions')
      .select('id')
      .eq('user_id', userId)
      .eq('transaction_id', transactionId)
      .eq('month', month)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking transaction inclusion:', checkError);
      throw new Error('No se pudo verificar la inclusión de la transacción');
    }

    // Actualizar o insertar según corresponda
    let result;
    if (existingData) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('budget_income_inclusions')
        .update({
          is_included: isIncluded,
        })
        .eq('id', existingData.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction inclusion:', error);
        throw new Error('No se pudo actualizar la inclusión de la transacción');
      }
      result = data;
    } else {
      // Insertar nuevo
      const { data, error } = await supabase
        .from('budget_income_inclusions')
        .insert({
          id: uuidv4(),
          user_id: userId,
          transaction_id: transactionId,
          month,
          is_included: isIncluded,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting transaction inclusion:', error);
        throw new Error('No se pudo actualizar la inclusión de la transacción');
      }
      result = data;
    }

    // Recalcular el total del presupuesto mensual
    try {
      await supabase.rpc('calculate_monthly_budget_total', {
        p_user_id: userId,
        p_month: month
      });
    } catch (rpcError) {
      console.error('Error recalculating budget total after toggle:', rpcError);
      // No lanzamos error ya que la operación principal ya se completó
    }

    return result as BudgetIncomeInclusion;
  } catch (error) {
    console.error('Exception in toggleTransactionInclusion:', error);
    throw error;
  }
}

export async function getMonthlyBudgetTotal(userId: string, month: string): Promise<number> {
  try {
    if (!userId || !month) {
      console.warn('getMonthlyBudgetTotal: userId y month son requeridos');
      return 0;
    }
    
    // Usar la función RPC para obtener el total mensual
    const { data, error } = await supabase
      .rpc('calculate_monthly_budget_total', {
        p_user_id: userId,
        p_month: month
      });

    if (error) {
      console.error('Error calculando total mensual:', error);
      return 0;
    }
    
    // Extraer el monto total del resultado
    if (data && typeof data === 'object' && 'total_amount' in data) {
      return data.total_amount || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error en getMonthlyBudgetTotal:', error);
    return 0;
  }
}

export async function getIncludedTransactions(userId: string, month: string) {
  try {
    if (!userId || !month) {
      console.warn('getIncludedTransactions: se requiere userId y month');
      return [];
    }
    
    // Usar la función RPC para obtener transacciones
    const { data, error } = await supabase
      .rpc('get_budget_transactions', {
        p_user_id: userId,
        p_month: month,
        p_is_included: true
      });

    if (error) {
      console.error('Error fetching included transactions:', error);
      throw new Error('No se pudieron cargar las transacciones incluidas');
    }

    if (!data) {
      console.warn('get_budget_transactions devolvió null o undefined');
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.warn('get_budget_transactions no devolvió un array:', typeof data);
      
      // Intentar convertir a array si es posible
      if (typeof data === 'object') {
        try {
          // Si es un objeto JSON, intentar extraer valores
          return Object.values(data);
        } catch (conversionError) {
          console.error('No se pudo convertir a array:', conversionError);
        }
      }
      
      return [];
    }

    return data;
  } catch (error) {
    console.error('Exception in getIncludedTransactions:', error);
    
    // Devolvemos un array vacío en lugar de fallar
    return [];
  }
}

export async function setManualBudgetTotal(
  userId: string,
  month: string,
  amount: number
) {
  try {
    // Verificar si ya existe un total para este mes
    const { data: existingTotal, error: checkError } = await supabase
      .from('budget_monthly_totals')
      .select('id')
      .eq('user_id', userId)
      .eq('month', month)
      .single();

    // Actualizar o insertar según corresponda
    let result;
    if (!checkError && existingTotal) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('budget_monthly_totals')
        .update({
          total_amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTotal.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating manual budget total:', error);
        throw new Error('No se pudo actualizar el total manual del presupuesto');
      }
      result = data;
    } else {
      // Insertar nuevo
      const { data, error } = await supabase
        .from('budget_monthly_totals')
        .insert({
          id: uuidv4(),
          user_id: userId,
          month,
          total_amount: amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting manual budget total:', error);
        throw new Error('No se pudo establecer el total manual del presupuesto');
      }
      result = data;
    }

    // Obtener la configuración actual o crear una nueva con 'all_income'
    const { data: configData, error: configError } = await supabase
      .from('budget_method_configuration')
      .select('id, budget_type')
      .eq('user_id', userId)
      .single();

    if (configError && configError.code === 'PGRST116') {
      // La configuración no existe, crear una nueva con tipo 'all_income'
      const { error: insertError } = await supabase
        .from('budget_method_configuration')
        .insert({
          id: uuidv4(),
          user_id: userId,
          budget_type: 'all_income',
          salary_amount: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating budget method configuration:', insertError);
        // No lanzamos error ya que la operación principal ya se completó
      }
    }

    return result as BudgetMonthlyTotal;
  } catch (error) {
    console.error('Exception in setManualBudgetTotal:', error);
    throw error;
  }
} 