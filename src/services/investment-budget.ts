import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type InvestmentBudgetLink = {
  id: string;
  user_id: string;
  category_id: string;
  monthly_amount: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos virtuales
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
};

export type InvestmentContribution = {
  id: string;
  user_id: string;
  link_id: string;
  investment_id?: string | null;
  amount: number;
  contribution_date: string;
  description?: string | null;
  created_at?: string;
};

export type RemainingInvestmentData = {
  total_remaining: number;
  links: Array<{
    id: string;
    category_id: string;
    category_name: string;
    category_color: string;
    category_icon: string;
    monthly_amount: number;
    total_contributed: number;
    remaining_amount: number;
  }>;
};

// Obtener todas las vinculaciones de presupuesto para inversiones del usuario
export async function getInvestmentBudgetLinks(userId: string) {
  try {
    const { data, error } = await supabase
      .from('investment_budget_links')
      .select(`
        *,
        category:category_id (
          id, name, color, icon
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      console.error('Error fetching investment budget links:', error);
      throw new Error('No se pudieron cargar las vinculaciones de presupuesto para inversiones');
    }

    return data as InvestmentBudgetLink[];
  } catch (error) {
    console.error('Error in getInvestmentBudgetLinks:', error);
    throw error;
  }
}

// Crear una nueva vinculación de presupuesto para inversiones
export async function createInvestmentBudgetLink(
  userId: string, 
  categoryId: string, 
  monthlyAmount: number
) {
  try {
    const { data, error } = await supabase
      .from('investment_budget_links')
      .insert({
        id: uuidv4(),
        user_id: userId,
        category_id: categoryId,
        monthly_amount: monthlyAmount,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating investment budget link:', error);
      throw new Error('No se pudo crear la vinculación de presupuesto para inversiones');
    }

    return data[0] as InvestmentBudgetLink;
  } catch (error) {
    console.error('Error in createInvestmentBudgetLink:', error);
    throw error;
  }
}

// Actualizar una vinculación de presupuesto para inversiones
export async function updateInvestmentBudgetLink(
  id: string, 
  monthlyAmount: number, 
  isActive: boolean = true
) {
  try {
    const { data, error } = await supabase
      .from('investment_budget_links')
      .update({
        monthly_amount: monthlyAmount,
        is_active: isActive
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating investment budget link:', error);
      throw new Error('No se pudo actualizar la vinculación de presupuesto para inversiones');
    }

    return data[0] as InvestmentBudgetLink;
  } catch (error) {
    console.error('Error in updateInvestmentBudgetLink:', error);
    throw error;
  }
}

// Eliminar una vinculación de presupuesto para inversiones
export async function deleteInvestmentBudgetLink(id: string) {
  try {
    const { error } = await supabase
      .from('investment_budget_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting investment budget link:', error);
      throw new Error('No se pudo eliminar la vinculación de presupuesto para inversiones');
    }

    return true;
  } catch (error) {
    console.error('Error in deleteInvestmentBudgetLink:', error);
    throw error;
  }
}

// Obtener el monto restante a invertir para el mes actual
export async function getRemainingInvestmentAmount(userId: string, month: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_remaining_investment_amount', {
        p_user_id: userId,
        p_month: month
      });

    if (error) {
      console.error('Error getting remaining investment amount:', error);
      throw new Error('No se pudo obtener el monto restante a invertir');
    }

    return data as RemainingInvestmentData;
  } catch (error) {
    console.error('Error in getRemainingInvestmentAmount:', error);
    throw error;
  }
}

// Registrar una contribución a una inversión
export async function addInvestmentContribution(
  linkId: string,
  amount: number,
  investmentId?: string,
  description?: string
) {
  try {
    const { data, error } = await supabase
      .rpc('add_investment_contribution', {
        p_link_id: linkId,
        p_amount: amount,
        p_investment_id: investmentId || null,
        p_description: description || null
      });

    if (error) {
      console.error('Error adding investment contribution:', error);
      throw new Error('No se pudo registrar la contribución a la inversión');
    }

    return data as InvestmentContribution;
  } catch (error) {
    console.error('Error in addInvestmentContribution:', error);
    throw error;
  }
}

// Obtener historial de contribuciones para una vinculación
export async function getInvestmentContributions(linkId: string) {
  try {
    const { data, error } = await supabase
      .from('investment_contributions')
      .select('*')
      .eq('link_id', linkId)
      .order('contribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching investment contributions:', error);
      throw new Error('No se pudieron cargar las contribuciones a la inversión');
    }

    return data as InvestmentContribution[];
  } catch (error) {
    console.error('Error in getInvestmentContributions:', error);
    throw error;
  }
} 