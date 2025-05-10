import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type Investment = {
  id: string;
  user_id: string;
  asset_name: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  currency: 'ARS' | 'USD';
  exchange_rate: number | null;
  asset_type: 'CEDEAR' | 'Acción' | 'Bono' | 'Otro';
  created_at?: string;
};

export type InvestmentInput = Omit<Investment, 'id' | 'created_at'>;

export async function getInvestments(userId: string) {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false });

  if (error) {
    console.error('Error fetching investments:', error);
    throw new Error('No se pudieron cargar las inversiones');
  }

  return data;
}

export async function createInvestment(investment: InvestmentInput) {
  const { data, error } = await supabase
    .from('investments')
    .insert({
      ...investment,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error('Error creating investment:', error);
    throw new Error('No se pudo crear la inversión');
  }

  return data[0];
}

export async function updateInvestment(id: string, investment: Partial<InvestmentInput>) {
  const { data, error } = await supabase
    .from('investments')
    .update(investment)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating investment:', error);
    throw new Error('No se pudo actualizar la inversión');
  }

  return data[0];
}

export async function deleteInvestment(id: string) {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting investment:', error);
    throw new Error('No se pudo eliminar la inversión');
  }

  return true;
}

export async function getLatestExchangeRates() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching exchange rates:', error);
    throw new Error('No se pudieron cargar los tipos de cambio');
  }

  return data[0] || {
    oficial_rate: 900,
    blue_rate: 1100,
    mep_rate: 1050,
    date: new Date().toISOString().split('T')[0]
  };
}

export async function getTotalInvestmentValue(userId: string) {
  const investments = await getInvestments(userId);
  const rates = await getLatestExchangeRates();
  
  let totalARS = 0;
  let totalUSD = 0;
  
  investments.forEach((investment: Investment) => {
    const value = investment.quantity * investment.purchase_price;
    
    if (investment.currency === 'ARS') {
      totalARS += value;
    } else {
      totalUSD += value;
    }
  });
  
  // Convertir USD a ARS usando el tipo de cambio blue
  const totalInARS = totalARS + (totalUSD * rates.blue_rate);
  
  return {
    totalARS,
    totalUSD,
    totalInARS,
    rates
  };
} 