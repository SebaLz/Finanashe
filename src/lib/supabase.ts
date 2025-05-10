import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          whatsapp: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'income' | 'expense';
          amount: number;
          category_id: string;
          date: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'income' | 'expense';
          amount: number;
          category_id: string;
          date: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'income' | 'expense';
          amount?: number;
          category_id?: string;
          date?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          color: string;
          icon: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          color: string;
          icon?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          color?: string;
          icon?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          percentage: number | null;
          month: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          percentage?: number | null;
          month: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          percentage?: number | null;
          month?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          created_at?: string;
        };
      };
      investments: {
        Row: {
          id: string;
          user_id: string;
          asset_name: string;
          quantity: number;
          purchase_price: number;
          purchase_date: string;
          currency: 'ARS' | 'USD';
          exchange_rate: number | null;
          asset_type: 'CEDEAR' | 'Acción' | 'Bono' | 'Otro';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_name: string;
          quantity: number;
          purchase_price: number;
          purchase_date: string;
          currency: 'ARS' | 'USD';
          exchange_rate?: number | null;
          asset_type: 'CEDEAR' | 'Acción' | 'Bono' | 'Otro';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_name?: string;
          quantity?: number;
          purchase_price?: number;
          purchase_date?: string;
          currency?: 'ARS' | 'USD';
          exchange_rate?: number | null;
          asset_type?: 'CEDEAR' | 'Acción' | 'Bono' | 'Otro';
          created_at?: string;
        };
      };
      exchange_rates: {
        Row: {
          id: string;
          date: string;
          oficial_rate: number;
          blue_rate: number;
          mep_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          oficial_rate: number;
          blue_rate: number;
          mep_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          oficial_rate?: number;
          blue_rate?: number;
          mep_rate?: number | null;
          created_at?: string;
        };
      };
    };
  };
}; 