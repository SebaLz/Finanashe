import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { FixedExpenseWithCategory, incrementPaidInstallments } from './fixed-expenses';
import { addDays, format, getDate, getDay, getMonth, isAfter, isSameMonth } from 'date-fns';

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

export async function getFinancialTasks(userId: string, month: string): Promise<FinancialTaskWithDetails[]> {
  try {
    // Parsear el mes (formato YYYY-MM)
    const [year, monthNum] = month.split('-');
    const firstDayOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const lastDayOfMonth = new Date(parseInt(year), parseInt(monthNum), 0);

    console.log('Fetching tasks for month:', month);

    // 1. Obtener las tareas financieras
    const { data: tasks, error: tasksError } = await supabase
      .from('financial_tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', format(firstDayOfMonth, 'yyyy-MM-dd'))
      .lte('due_date', format(lastDayOfMonth, 'yyyy-MM-dd'))
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('Error fetching financial tasks:', tasksError);
      throw new Error('No se pudieron cargar las tareas financieras');
    }

    if (!tasks || tasks.length === 0) {
      console.log('No tasks found for the period');
      return [];
    }

    console.log('Tasks found:', tasks.length);

    // 2. Obtener los IDs de gastos fijos únicos
    const fixedExpenseIds = [...new Set(tasks
      .map(task => task.fixed_expense_id)
      .filter((id): id is string => id !== null))];

    console.log('Fixed expense IDs:', fixedExpenseIds);

    // 3. Obtener los gastos fijos con sus categorías
    let fixedExpensesMap = new Map();
    if (fixedExpenseIds.length > 0) {
      // Primero obtener los gastos fijos
      const { data: fixedExpenses, error: fixedExpensesError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .in('id', fixedExpenseIds);

      if (fixedExpensesError) {
        console.error('Error fetching fixed expenses:', fixedExpensesError);
        console.error('Error details:', {
          message: fixedExpensesError.message,
          details: fixedExpensesError.details,
          hint: fixedExpensesError.hint
        });
      } else if (fixedExpenses && fixedExpenses.length > 0) {
        console.log('Fixed expenses found:', fixedExpenses.length);
        
        // Obtener los IDs de categorías únicos
        const categoryIds = [...new Set(fixedExpenses.map(fe => fe.category_id))];
        
        // Obtener las categorías
        const { data: categories, error: categoriesError } = await supabase
          .from('all_categories')
          .select('*')
          .in('id', categoryIds);

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
        } else {
          // Crear un mapa de categorías
          const categoryMap = new Map(
            categories?.map(category => [category.id, category]) || []
          );

          // Combinar gastos fijos con sus categorías
          fixedExpensesMap = new Map(
            fixedExpenses.map(expense => [
              expense.id,
              {
                ...expense,
                category: categoryMap.get(expense.category_id) || null
              }
            ])
          );
        }
      } else {
        console.log('No fixed expenses found for the given IDs');
      }
    }

    // 4. Combinar las tareas con sus gastos fijos y categorías
    const tasksWithDetails = tasks.map(task => {
      const fixedExpense = task.fixed_expense_id ? fixedExpensesMap.get(task.fixed_expense_id) : null;
      console.log('Mapping task:', {
        taskId: task.id,
        fixedExpenseId: task.fixed_expense_id,
        hasFixedExpense: !!fixedExpense,
        categoryInfo: fixedExpense?.category
      });
      return {
        ...task,
        fixed_expense: fixedExpense
      };
    });

    return tasksWithDetails as FinancialTaskWithDetails[];

  } catch (error) {
    console.error('Error in getFinancialTasks:', error);
    throw error;
  }
}

export async function getFinancialTaskById(id: string) {
  try {
    // Obtener la tarea
    const { data: task, error: taskError } = await supabase
      .from('financial_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError) {
      console.error('Error fetching financial task:', taskError);
      throw new Error('No se pudo cargar la tarea financiera');
    }

    // Si tiene un gasto fijo asociado, obtenerlo con su categoría
    if (task.fixed_expense_id) {
      const { data: fixedExpense, error: fixedExpenseError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('id', task.fixed_expense_id)
        .single();

      if (fixedExpenseError) {
        console.error('Error fetching fixed expense for task:', fixedExpenseError);
        return task; // Devolver la tarea sin el gasto fijo si hay error
      }

      // Obtener la categoría para este gasto fijo
      const { data: category, error: categoryError } = await supabase
        .from('all_categories')
        .select('id, name, color, icon, is_system')
        .eq('id', fixedExpense.category_id)
        .single();

      if (categoryError) {
        console.error('Error fetching category for fixed expense:', categoryError);
        // Devolver la tarea con el gasto fijo pero sin categoría
        return {
          ...task,
          fixed_expense: fixedExpense
        };
      }

      // Devolver la tarea con el gasto fijo y su categoría
      return {
        ...task,
        fixed_expense: {
          ...fixedExpense,
          category
        }
      } as FinancialTaskWithDetails;
    }

    // Si no tiene gasto fijo asociado, devolver la tarea tal cual
    return task as FinancialTaskWithDetails;
  } catch (error) {
    console.error('Error in getFinancialTaskById:', error);
    throw error;
  }
}

export async function createFinancialTask(task: FinancialTaskInput) {
  try {
    // Validar que los campos requeridos estén presentes
    if (!task.user_id || !task.title || !task.amount || !task.due_date) {
      throw new Error('Faltan campos requeridos para crear la tarea financiera');
    }

    const { data, error } = await supabase
      .from('financial_tasks')
      .insert({
        ...task,
        id: uuidv4(),
        status: task.status || 'pending',
        is_installment: task.is_installment || false,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating financial task:', error);
      throw new Error('No se pudo crear la tarea financiera');
    }

    return data[0] as FinancialTask;
  } catch (error) {
    console.error('Error in createFinancialTask:', error);
    throw error;
  }
}

export async function updateFinancialTask(id: string, task: Partial<FinancialTaskInput>) {
  try {
    const { data, error } = await supabase
      .from('financial_tasks')
      .update(task)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating financial task:', error);
      throw new Error('No se pudo actualizar la tarea financiera');
    }

    return data[0] as FinancialTask;
  } catch (error) {
    console.error('Error in updateFinancialTask:', error);
    throw error;
  }
}

export async function deleteFinancialTask(id: string) {
  try {
    const { error } = await supabase
      .from('financial_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting financial task:', error);
      throw new Error('No se pudo eliminar la tarea financiera');
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFinancialTask:', error);
    throw error;
  }
}

export async function markTaskAsPaid(id: string, paymentDate: Date = new Date()) {
  try {
    // Usar la función RPC para marcar como pagada y actualizar cuotas si es necesario
    const { data, error } = await supabase
      .rpc('mark_task_as_paid', {
        p_task_id: id,
        p_payment_date: format(paymentDate, 'yyyy-MM-dd')
      });

    if (error) {
      console.error('Error marking task as paid with RPC:', error);

      // Método alternativo si la RPC falla
      // 1. Obtener la tarea para ver si está asociada a un gasto fijo por cuotas
      const { data: task, error: taskError } = await supabase
        .from('financial_tasks')
        .select('fixed_expense_id, is_installment, installment_number')
        .eq('id', id)
        .single();

      if (taskError) {
        console.error('Error fetching task details:', taskError);
        throw new Error('No se pudo obtener información de la tarea');
      }

      // 2. Actualizar la tarea como pagada
      const { data: updatedTask, error: updateError } = await supabase
        .from('financial_tasks')
        .update({
          status: 'paid',
          payment_date: format(paymentDate, 'yyyy-MM-dd')
        })
        .eq('id', id)
        .select();

      if (updateError) {
        console.error('Error updating task status:', updateError);
        throw new Error('No se pudo marcar la tarea como pagada');
      }

      // 3. Si es una cuota, actualizar el contador de cuotas pagadas
      if (task.fixed_expense_id && task.is_installment && task.installment_number) {
        try {
          await incrementPaidInstallments(task.fixed_expense_id);
        } catch (installmentError) {
          console.error('Error updating installment count:', installmentError);
          // No lanzar error ya que la tarea principal se realizó
        }
      }

      return updatedTask[0] as FinancialTask;
    }

    return data as FinancialTask;
  } catch (error) {
    console.error('Error in markTaskAsPaid:', error);
    throw error;
  }
}

export async function markTaskAsPending(id: string) {
  try {
    // 1. Obtener la tarea para ver si es una cuota
    const { data: task, error: taskError } = await supabase
      .from('financial_tasks')
      .select('fixed_expense_id, is_installment, installment_number, status')
      .eq('id', id)
      .single();

    if (taskError) {
      console.error('Error fetching task details:', taskError);
      throw new Error('No se pudo obtener información de la tarea');
    }

    // Si ya está pendiente, no hacer nada
    if (task.status === 'pending') {
      return task as FinancialTask;
    }

    // 2. Actualizar la tarea como pendiente
    const { data, error } = await supabase
      .from('financial_tasks')
      .update({
        status: 'pending',
        payment_date: null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error marking task as pending:', error);
      throw new Error('No se pudo marcar la tarea como pendiente');
    }

    // 3. Si es una cuota, actualizar el contador de cuotas pagadas del gasto fijo
    if (task.fixed_expense_id && task.is_installment && task.installment_number) {
      // Primero obtener el progreso actual de cuotas
      const { data: fixedExpense, error: fixedExpenseError } = await supabase
        .from('fixed_expenses')
        .select('paid_installments')
        .eq('id', task.fixed_expense_id)
        .single();

      if (fixedExpenseError) {
        console.error('Error fetching fixed expense:', fixedExpenseError);
        // Continuar ya que la tarea principal se realizó
      } else if (fixedExpense && fixedExpense.paid_installments > 0) {
        // Decrementar el contador de cuotas pagadas
        try {
          const { error: updateError } = await supabase
            .from('fixed_expenses')
            .update({
              paid_installments: fixedExpense.paid_installments - 1
            })
            .eq('id', task.fixed_expense_id);

          if (updateError) {
            console.error('Error updating installment count:', updateError);
            // No lanzar error ya que la tarea principal se realizó
          }
        } catch (installmentError) {
          console.error('Error updating installment count:', installmentError);
          // No lanzar error ya que la tarea principal se realizó
        }
      }
    }

    return data[0] as FinancialTask;
  } catch (error) {
    console.error('Error in markTaskAsPending:', error);
    throw error;
  }
}

export async function getUpcomingTasks(userId: string, daysAhead: number = 7) {
  try {
    const today = new Date();
    const endDate = addDays(today, daysAhead);
    
    // Formatear fechas para consulta
    const startDateStr = format(today, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Obtener tareas para el período solicitado
    const { data: tasks, error: tasksError } = await supabase
      .from('financial_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('due_date', startDateStr)
      .lte('due_date', endDateStr)
      .order('due_date', { ascending: true });
      
    if (tasksError) {
      console.error('Error fetching upcoming tasks:', tasksError);
      throw new Error('No se pudieron cargar las tareas próximas');
    }
    
    if (!tasks || tasks.length === 0) {
      return [];
    }
    
    // Obtener los gastos fijos asociados
    const fixedExpenseIds = tasks
      .map(task => task.fixed_expense_id)
      .filter(id => id !== null) as string[];
      
    if (fixedExpenseIds.length === 0) {
      return tasks;
    }
    
    // Obtener información de gastos fijos
    const { data: fixedExpenses, error: fixedExpensesError } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        category:category_id (
          id, name, color, icon, is_system
        )
      `)
      .in('id', fixedExpenseIds);
      
    if (fixedExpensesError) {
      console.error('Error fetching fixed expenses for upcoming tasks:', fixedExpensesError);
      // Devolver tareas sin info de gastos fijos
      return tasks;
    }
    
    // Crear mapa de gastos fijos para acceso rápido
    const fixedExpenseMap = new Map();
    fixedExpenses.forEach(expense => {
      fixedExpenseMap.set(expense.id, expense);
    });
    
    // Enriquecer las tareas con info de gastos fijos
    const enrichedTasks = tasks.map(task => {
      if (task.fixed_expense_id && fixedExpenseMap.has(task.fixed_expense_id)) {
        return {
          ...task,
          fixed_expense: fixedExpenseMap.get(task.fixed_expense_id)
        };
      }
      return task;
    });
    
    return enrichedTasks;
  } catch (error) {
    console.error('Error in getUpcomingTasks:', error);
    return [];
  }
}

export async function generateTasksFromFixedExpenses(userId: string, month: string) {
  try {
    // Usar la RPC para generar tareas
    const { data, error } = await supabase
      .rpc('generate_tasks_from_fixed_expenses', {
        p_user_id: userId,
        p_month: month
      });

    if (error) {
      console.error('Error generating tasks from fixed expenses:', error);
      throw new Error('No se pudieron generar las tareas desde los gastos fijos');
    }

    return data || [];
  } catch (error) {
    console.error('Error in generateTasksFromFixedExpenses:', error);
    throw error;
  }
}

export type FinancialTaskWithCategory = FinancialTask & {
  category: {
    name: string;
    color: string;
    icon: string | null;
    is_system?: boolean;
  };
}; 