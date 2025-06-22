-- Agregar campos adicionales para el perfil mejorado
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

-- Índice para mejorar consultas por país
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);

-- Índice para mejorar consultas por moneda preferida
CREATE INDEX IF NOT EXISTS idx_users_currency ON public.users(preferred_currency);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;
CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_updated_at(); 