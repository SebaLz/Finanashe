import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category_id?: string | null;
  is_budget_contribution?: boolean;
  budget_monthly_amount?: number | null;
  created_at: string;
  updated_at?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  };
};

export type GoalContribution = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  contribution_date: string;
  description?: string | null;
  from_financial_task?: boolean;
  financial_task_id?: string | null;
};

export type GoalInput = Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'category'>;

export async function getGoals(userId: string) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        category:category_id (
          id, name, color, icon
        )
      `)
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      console.error('Error fetching goals:', error);
      throw new Error('No se pudieron cargar los objetivos');
    }

    // Para cada objetivo sin categoría, establecer una categoría por defecto
    const processedData = data.map(goal => {
      if (!goal.category) {
        return {
          ...goal,
          category: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Objetivo Sin Categoría',
            color: '#7E3FF2',
            icon: 'target'
          }
        };
      }
      return goal;
    });

    return processedData;
  } catch (error) {
    console.error('Error in getGoals:', error);
    throw error;
  }
}

export async function getGoalById(id: string) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        category:category_id (
          id, name, color, icon
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching goal by ID:', error);
      throw new Error('No se pudo cargar el objetivo');
    }

    // Si el objetivo no tiene categoría, establecer una por defecto
    if (!data.category) {
      data.category = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Objetivo Sin Categoría',
        color: '#7E3FF2',
        icon: 'target'
      };
    }

    return data as Goal;
  } catch (error) {
    console.error('Error in getGoalById:', error);
    throw error;
  }
}

export async function createGoal(goal: GoalInput) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        ...goal,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Error creating goal:', error);
      throw new Error('No se pudo crear el objetivo');
    }

    return data[0];
  } catch (error) {
    console.error('Error in createGoal:', error);
    throw error;
  }
}

export async function updateGoal(id: string, goal: Partial<GoalInput>) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update(goal)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating goal:', error);
      throw new Error('No se pudo actualizar el objetivo');
    }

    return data[0];
  } catch (error) {
    console.error('Error in updateGoal:', error);
    throw error;
  }
}

export async function deleteGoal(id: string) {
  try {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting goal:', error);
      throw new Error('No se pudo eliminar el objetivo');
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGoal:', error);
    throw error;
  }
}

export async function contributeToGoal(
  id: string, 
  amount: number, 
  description?: string | undefined
) {
  try {
    // Usamos la función RPC que hemos creado en la base de datos
    const { data, error } = await supabase
      .rpc('contribute_to_goal', {
        p_goal_id: id,
        p_amount: amount,
        p_description: description || undefined
      });

    if (error) {
      console.error('Error contributing to goal:', error);
      throw new Error('No se pudo realizar el aporte al objetivo');
    }

    return data;
  } catch (error) {
    console.error('Error in contributeToGoal:', error);
    throw error;
  }
}

export async function getGoalContributions(goalId: string) {
  try {
    const { data, error } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('contribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching goal contributions:', error);
      throw new Error('No se pudieron cargar las contribuciones');
    }

    return data as GoalContribution[];
  } catch (error) {
    console.error('Error in getGoalContributions:', error);
    throw error;
  }
}

export async function getBudgetLinkedGoals(userId: string) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        category:category_id (
          id, name, color, icon
        )
      `)
      .eq('user_id', userId)
      .eq('is_budget_contribution', true)
      .order('created_at');

    if (error) {
      console.error('Error fetching budget linked goals:', error);
      throw new Error('No se pudieron cargar los objetivos vinculados a presupuestos');
    }

    // Para cada objetivo sin categoría, establecer una categoría por defecto
    const processedData = data.map(goal => {
      if (!goal.category) {
        return {
          ...goal,
          category: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Objetivo Sin Categoría',
            color: '#7E3FF2',
            icon: 'target'
          }
        };
      }
      return goal;
    });

    return processedData as Goal[];
  } catch (error) {
    console.error('Error in getBudgetLinkedGoals:', error);
    throw error;
  }
}

export async function setGoalBudgetLink(
  id: string,
  is_budget_contribution: boolean,
  budget_monthly_amount?: number | null
) {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update({
        is_budget_contribution,
        budget_monthly_amount: is_budget_contribution ? budget_monthly_amount : null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating goal budget link:', error);
      throw new Error('No se pudo actualizar la vinculación con el presupuesto');
    }

    return data[0];
  } catch (error) {
    console.error('Error in setGoalBudgetLink:', error);
    throw error;
  }
}

export async function generateTasksFromGoals(userId: string, month: string) {
  try {
    const { data, error } = await supabase
      .rpc('generate_tasks_from_goals', {
        p_user_id: userId,
        p_month: month
      });

    if (error) {
      console.error('Error generating tasks from goals:', error);
      throw new Error('No se pudieron generar las tareas desde los objetivos');
    }

    return data;
  } catch (error) {
    console.error('Error in generateTasksFromGoals:', error);
    throw error;
  }
}

export async function completeGoalTask(taskId: string, complete: boolean = true) {
  try {
    const { data, error } = await supabase
      .rpc('complete_goal_task', {
        p_task_id: taskId,
        p_complete: complete
      });

    if (error) {
      console.error('Error completing goal task:', error);
      throw new Error('No se pudo completar la tarea del objetivo');
    }

    return data;
  } catch (error) {
    console.error('Error in completeGoalTask:', error);
    throw error;
  }
} 