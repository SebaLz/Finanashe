import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { FixedExpenseWithCategory } from './fixed-expenses';
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
  comments?: string | null;
  created_at?: string;
};

export type FinancialTaskWithDetails = FinancialTask & {
  fixed_expense?: FixedExpenseWithCategory;
};

export type FinancialTaskInput = Omit<FinancialTask, 'id' | 'created_at'> & {
  comments?: string | null;
};

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
  const { data, error } = await supabase
    .from('financial_tasks')
    .insert({
      ...task,
      id: uuidv4(),
      comments: task.comments || null,
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error('Error creating financial task:', error);
    throw new Error('No se pudo crear la tarea financiera');
  }

  return data[0] as FinancialTask;
}

export async function updateFinancialTask(id: string, task: Partial<FinancialTaskInput>) {
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
}

export async function deleteFinancialTask(id: string) {
  const { error } = await supabase
    .from('financial_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting financial task:', error);
    throw new Error('No se pudo eliminar la tarea financiera');
  }

  return true;
}

export async function markTaskAsPaid(id: string, paymentDate: Date = new Date()) {
  const formattedPaymentDate = format(paymentDate, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('financial_tasks')
    .update({
      status: 'paid',
      payment_date: formattedPaymentDate
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error marking task as paid:', error);
    throw new Error('No se pudo marcar la tarea como pagada');
  }

  return data[0] as FinancialTask;
}

export async function markTaskAsPending(id: string) {
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

  return data[0] as FinancialTask;
}

export async function getUpcomingTasks(userId: string, daysAhead: number = 7) {
  try {
    const today = new Date();
    const endDate = addDays(today, daysAhead);
    
    // Obtener tareas financieras pendientes
    const { data: tasks, error: tasksError } = await supabase
      .from('financial_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date');

    if (tasksError) {
      console.error('Error fetching upcoming tasks:', tasksError);
      throw new Error('No se pudieron cargar las próximas tareas');
    }

    // Filtrar tareas que vencen dentro del rango especificado
    const filteredTasks = tasks ? tasks.filter(task => {
      const dueDate = new Date(task.due_date);
      return dueDate <= endDate && dueDate >= today;
    }) : [];

    if (filteredTasks.length === 0) {
      return [];
    }

    // Obtener todos los gastos fijos asociados a estas tareas
    const fixedExpenseIds = filteredTasks
      .map(task => task.fixed_expense_id)
      .filter(id => id !== null) as string[];

    let fixedExpensesMap = new Map();
    
    if (fixedExpenseIds.length > 0) {
      // Obtener los gastos fijos
      const { data: fixedExpenses, error: fixedExpensesError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .in('id', fixedExpenseIds);

      if (fixedExpensesError) {
        console.error('Error fetching fixed expenses for upcoming tasks:', fixedExpensesError);
      } else if (fixedExpenses && fixedExpenses.length > 0) {
        // Obtener las categorías para estos gastos fijos
        const categoryIds = [...new Set(fixedExpenses.map(fe => fe.category_id))];
        
        const { data: categories, error: categoriesError } = await supabase
          .from('all_categories')
          .select('id, name, color, icon, is_system')
          .in('id', categoryIds);

        if (categoriesError) {
          console.error('Error fetching categories for fixed expenses:', categoriesError);
        } else {
          // Crear un mapa de categorías
          const categoryMap = new Map();
          if (categories) {
            categories.forEach(category => {
              categoryMap.set(category.id, category);
            });
          }

          // Añadir las categorías a los gastos fijos y crear el mapa
          fixedExpenses.forEach(expense => {
            fixedExpensesMap.set(expense.id, {
              ...expense,
              category: categoryMap.get(expense.category_id) || null
            });
          });
        }
      }
    }

    // Asignar los gastos fijos a las tareas
    const tasksWithDetails = filteredTasks.map(task => {
      return {
        ...task,
        fixed_expense: task.fixed_expense_id ? fixedExpensesMap.get(task.fixed_expense_id) : null
      };
    });

    return tasksWithDetails as FinancialTaskWithDetails[];
  } catch (error) {
    console.error('Error in getUpcomingTasks:', error);
    return [];
  }
}

export async function generateTasksFromFixedExpenses(userId: string, month: string) {
  try {
    // Primero, obtenemos todos los gastos fijos activos
    const { data: fixedExpenses, error } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        category:all_categories(name, color, icon, is_system)
      `)
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      console.error('Error fetching fixed expenses for task generation:', error);
      throw new Error('No se pudieron cargar los gastos fijos');
    }

    // Parsear el mes (formato YYYY-MM)
    const [year, monthNum] = month.split('-');
    const firstDayOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const lastDayOfMonth = new Date(parseInt(year), parseInt(monthNum), 0);
    
    // Array para almacenar las tareas creadas
    const createdTasks: FinancialTask[] = [];

    // Para cada gasto fijo, generamos su tarea correspondiente
    for (const expense of fixedExpenses) {
      // Dependiendo de la frecuencia, calculamos las fechas de vencimiento
      let dueDates: Date[] = [];

      if (expense.frequency === 'monthly') {
        // Para frecuencia mensual, usamos el día específico del mes
        const day = Math.min(expense.due_date, lastDayOfMonth.getDate());
        const dueDate = new Date(parseInt(year), parseInt(monthNum) - 1, day);
        dueDates.push(dueDate);
      } else if (expense.frequency === 'weekly') {
        // Para frecuencia semanal, encontramos todos los días que coinciden
        // con el día de la semana especificado
        let currentDate = new Date(firstDayOfMonth);
        while (currentDate <= lastDayOfMonth) {
          if (getDay(currentDate) === expense.due_date % 7) { // 0 = domingo, 1 = lunes, etc.
            dueDates.push(new Date(currentDate));
          }
          currentDate = addDays(currentDate, 1);
        }
      } else if (expense.frequency === 'biweekly') {
        // Para frecuencia quincenal, usamos el día 1 y 15 del mes (o el último día si el mes tiene menos de 15 días)
        dueDates.push(new Date(parseInt(year), parseInt(monthNum) - 1, 1));
        if (lastDayOfMonth.getDate() >= 15) {
          dueDates.push(new Date(parseInt(year), parseInt(monthNum) - 1, 15));
        }
      }

      // Crear una tarea para cada fecha de vencimiento calculada
      for (const dueDate of dueDates) {
        // Verificar si ya existe una tarea para este gasto fijo en esta fecha
        const { data: existingTasks, error: checkError } = await supabase
          .from('financial_tasks')
          .select('id')
          .eq('user_id', userId)
          .eq('fixed_expense_id', expense.id)
          .eq('due_date', format(dueDate, 'yyyy-MM-dd'));

        if (checkError) {
          console.error('Error checking existing tasks:', checkError);
          continue; // Continuamos con el siguiente si hay error
        }

        // Si no existe una tarea, la creamos
        if (!existingTasks || existingTasks.length === 0) {
          const formattedDueDate = format(dueDate, 'yyyy-MM-dd');
          
          const newTask: FinancialTaskInput = {
            user_id: userId,
            fixed_expense_id: expense.id,
            title: expense.name,
            amount: expense.amount,
            due_date: formattedDueDate,
            status: 'pending',
            payment_date: null,
            comments: null
          };

          try {
            const createdTask = await createFinancialTask(newTask);
            createdTasks.push(createdTask);
          } catch (createError) {
            console.error('Error creating task from fixed expense:', createError);
          }
        }
      }
    }

    return createdTasks;
  } catch (error) {
    console.error('Error generating tasks from fixed expenses:', error);
    throw new Error('No se pudieron generar las tareas desde los gastos fijos');
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