import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
};

export type GoalInput = Omit<Goal, 'id' | 'created_at'>;

export async function getGoals(userId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  if (error) {
    console.error('Error fetching goals:', error);
    throw new Error('No se pudieron cargar los objetivos');
  }

  return data;
}

export async function createGoal(goal: GoalInput) {
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
}

export async function updateGoal(id: string, goal: Partial<GoalInput>) {
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
}

export async function deleteGoal(id: string) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting goal:', error);
    throw new Error('No se pudo eliminar el objetivo');
  }

  return true;
}

export async function contributeToGoal(id: string, amount: number) {
  // Primero obtenemos el objetivo actual
  const { data: goalData, error: goalError } = await supabase
    .from('goals')
    .select('current_amount, target_amount')
    .eq('id', id)
    .single();

  if (goalError) {
    console.error('Error fetching goal:', goalError);
    throw new Error('No se pudo obtener el objetivo');
  }

  const newAmount = goalData.current_amount + amount;
  
  // Aseguramos que no se pase del objetivo
  const finalAmount = Math.min(newAmount, goalData.target_amount);

  const { data, error } = await supabase
    .from('goals')
    .update({ current_amount: finalAmount })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error contributing to goal:', error);
    throw new Error('No se pudo realizar el aporte al objetivo');
  }

  return data[0];
} 