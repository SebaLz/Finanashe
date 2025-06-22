-- =====================================================
-- Script para agregar campos de perfil mejorado
-- Ejecutar en Supabase Studio > SQL Editor
-- =====================================================

-- 1. Agregar campos adicionales para el perfil mejorado
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'AR',
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'ARS',
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "daily_summary": true,
  "budget_alerts": true,
  "goal_reminders": true,
  "transaction_alerts": false
}'::jsonb;

-- 2. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);
CREATE INDEX IF NOT EXISTS idx_users_currency ON public.users(preferred_currency);

-- 3. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;
CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_updated_at();

-- 5. Verificar que los campos se agregaron correctamente
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position; 