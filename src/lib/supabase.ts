import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Función para obtener la sesión actual
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error al obtener la sesión:', error);
    return null;
  }
  return data.session;
};

// Función para obtener el usuario actual
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error al obtener el usuario:', error);
    return null;
  }
  return user;
};

// Función para iniciar sesión con email y contraseña
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
  
  return data;
};

// Función para iniciar sesión con Google
export const signInWithGoogle = async (redirectTo?: string) => {
  const redirectURL = redirectTo 
    ? `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    : `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectURL,
    }
  });
  
  if (error) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  }
  
  return data;
};

// Función para registrar un nuevo usuario
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.error('Error al registrar usuario:', error);
    throw error;
  }
  
  return data;
};

// Función para cerrar sesión
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
  
  return true;
};

// Función para solicitar restablecimiento de contraseña
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) {
    console.error('Error al enviar correo de restablecimiento:', error);
    throw error;
  }
  
  return data;
};

// Función para actualizar contraseña
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) {
    console.error('Error al actualizar contraseña:', error);
    throw error;
  }
  
  return data;
};

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
          is_budgetable: boolean;
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
          is_budgetable?: boolean;
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
          is_budgetable?: boolean;
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
      rate_limit_logs: {
        Row: {
          id: string;
          user_id: string;
          ip_address: string;
          endpoint: string;
          limit_type: string;
          current_count: number;
          limit_threshold: number;
          plan_type: string;
          blocked: boolean;
          reason: string | null;
          user_agent: string | null;
          request_metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ip_address: string;
          endpoint?: string;
          limit_type: string;
          current_count: number;
          limit_threshold: number;
          plan_type: string;
          blocked?: boolean;
          reason?: string | null;
          user_agent?: string | null;
          request_metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ip_address?: string;
          endpoint?: string;
          limit_type?: string;
          current_count?: number;
          limit_threshold?: number;
          plan_type?: string;
          blocked?: boolean;
          reason?: string | null;
          user_agent?: string | null;
          request_metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
      rate_limit_config: {
        Row: {
          id: string;
          plan_type: string;
          daily_limit: number;
          hourly_limit: number | null;
          minute_limit: number | null;
          burst_limit: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_type: string;
          daily_limit: number;
          hourly_limit?: number | null;
          minute_limit?: number | null;
          burst_limit?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_type?: string;
          daily_limit?: number;
          hourly_limit?: number | null;
          minute_limit?: number | null;
          burst_limit?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: string;
          is_active: boolean;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type: string;
          is_active?: boolean;
          starts_at: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: string;
          is_active?: boolean;
          starts_at?: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}; 