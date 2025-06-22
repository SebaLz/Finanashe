-- =====================================================
-- SCRIPT CORREGIDO DE MIGRACIÓN PARA CATEGORÍAS MODERNAS
-- Aplicar en Supabase Studio SQL Editor
-- Fecha: 2024-12-28
-- =====================================================

BEGIN;

-- ============================================
-- PARTE 1: CORREGIR CONSTRAINT Y SCHEMA
-- ============================================

-- Primero, eliminar el constraint CHECK existente si existe
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;

-- Añadir nuevos campos a la tabla categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_budgetable BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS context VARCHAR(20) DEFAULT 'personal';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS emoji TEXT;

-- Crear el constraint CHECK con todos los valores permitidos
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check 
CHECK (type IN ('income', 'expense', 'transfer', 'investment', 'saving', 'goal'));

-- Crear el constraint CHECK para context
ALTER TABLE public.categories ADD CONSTRAINT categories_context_check 
CHECK (context IN ('personal', 'business'));

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_user_id_type ON public.categories(user_id, type);

-- Actualizar categorías existentes con el tipo 'expense' por defecto
UPDATE public.categories 
SET type = 'expense' 
WHERE type IS NULL AND user_id IS NOT NULL;

-- Actualizar categorías del sistema con tipos específicos
UPDATE public.categories 
SET type = 'goal' 
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.categories 
SET type = 'investment' 
WHERE id = '00000000-0000-0000-0000-000000000002';

-- Actualizar categorías predeterminadas del presupuesto
UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 10
WHERE id = '00000000-0000-0000-0000-000000000010';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 20
WHERE id = '00000000-0000-0000-0000-000000000011';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 30
WHERE id = '00000000-0000-0000-0000-000000000012';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 40
WHERE id = '00000000-0000-0000-0000-000000000013';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 50
WHERE id = '00000000-0000-0000-0000-000000000014';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 60
WHERE id = '00000000-0000-0000-0000-000000000015';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 70
WHERE id = '00000000-0000-0000-0000-000000000016';

UPDATE public.categories 
SET type = 'saving', is_budgetable = true, sort_order = 80
WHERE id = '00000000-0000-0000-0000-000000000017';

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 90
WHERE id = '00000000-0000-0000-0000-000000000018';

-- Mejorar la tabla category_visibility
ALTER TABLE public.category_visibility ADD COLUMN IF NOT EXISTS visible_in_transactions BOOLEAN DEFAULT true;
ALTER TABLE public.category_visibility ADD COLUMN IF NOT EXISTS visible_in_budgets BOOLEAN DEFAULT true;
ALTER TABLE public.category_visibility ADD COLUMN IF NOT EXISTS visible_in_reports BOOLEAN DEFAULT true;

-- Migrar datos existentes de visibilidad
UPDATE public.category_visibility 
SET visible_in_transactions = is_visible,
    visible_in_budgets = is_visible,
    visible_in_reports = is_visible
WHERE visible_in_transactions IS NULL;

-- ================================================
-- PARTE 2: CATEGORÍAS MODERNAS
-- ================================================

-- 1. Actualizar categorías existentes con emojis
UPDATE public.categories SET emoji = '🛒', description = 'Supermercado, comestibles y alimentación general' WHERE id = '00000000-0000-0000-0000-000000000010';
UPDATE public.categories SET emoji = '🏠', description = 'Alquiler, hipoteca, servicios del hogar' WHERE id = '00000000-0000-0000-0000-000000000011';
UPDATE public.categories SET emoji = '🚗', description = 'Combustible, transporte público, mantenimiento' WHERE id = '00000000-0000-0000-0000-000000000012';
UPDATE public.categories SET emoji = '⚡', description = 'Electricidad, gas, agua, internet, telefonía' WHERE id = '00000000-0000-0000-0000-000000000013';
UPDATE public.categories SET emoji = '❤️', description = 'Medicina, farmacia, seguros médicos' WHERE id = '00000000-0000-0000-0000-000000000014';
UPDATE public.categories SET emoji = '📚', description = 'Cursos, libros, material educativo' WHERE id = '00000000-0000-0000-0000-000000000015';
UPDATE public.categories SET emoji = '🎵', description = 'Entretenimiento, salidas, hobbies' WHERE id = '00000000-0000-0000-0000-000000000016';
UPDATE public.categories SET emoji = '🐷', description = 'Ahorros, inversiones a corto plazo' WHERE id = '00000000-0000-0000-0000-000000000017';
UPDATE public.categories SET emoji = '📦', description = 'Gastos varios y misceláneos' WHERE id = '00000000-0000-0000-0000-000000000018';

-- 2. Categorías de GASTOS adicionales

-- ALIMENTACIÓN
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000020', NULL, 'Restaurantes', '#FF6B35', 'utensils', '🍽️', 'expense', 15, 'Comidas en restaurantes y bares', true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000021', NULL, 'Delivery', '#FF8E53', 'truck', '🛵', 'expense', 16, 'Pedidos a domicilio y apps de comida', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- TRANSPORTE
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000022', NULL, 'Combustible', '#FFA726', 'fuel', '⛽', 'expense', 31, 'Combustible para vehículos', true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000023', NULL, 'Estacionamiento', '#FFB74D', 'car', '🅿️', 'expense', 32, 'Estacionamientos y peajes', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- PERSONAL Y CUIDADO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000024', NULL, 'Ropa', '#8E24AA', 'shirt', '👕', 'expense', 100, 'Ropa, calzado y accesorios', true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000025', NULL, 'Peluquería', '#AB47BC', 'scissors', '💇', 'expense', 101, 'Peluquería, barbería y cuidado personal', true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000026', NULL, 'Farmacia', '#E91E63', 'pill', '💊', 'expense', 52, 'Medicamentos y productos de farmacia', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- ENTRETENIMIENTO Y OCIO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000027', NULL, 'Subscripciones', '#673AB7', 'play-circle', '📺', 'expense', 71, 'Netflix, Spotify, servicios de streaming', true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000028', NULL, 'Deportes', '#2196F3', 'activity', '⚽', 'expense', 72, 'Gimnasio, deportes, actividades físicas', true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000029', NULL, 'Hobbies', '#009688', 'palette', '🎨', 'expense', 73, 'Aficiones, pasatiempos, manualidades', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- TECNOLOGÍA
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000030', NULL, 'Tecnología', '#607D8B', 'smartphone', '📱', 'expense', 110, 'Electrónicos, gadgets, accesorios tech', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- MASCOTAS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000031', NULL, 'Mascotas', '#795548', 'heart', '🐕', 'expense', 120, 'Comida, veterinario, accesorios para mascotas', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- SEGUROS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000032', NULL, 'Seguros', '#455A64', 'shield', '🛡️', 'expense', 130, 'Seguros de auto, hogar, vida, etc.', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- IMPUESTOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000033', NULL, 'Impuestos', '#37474F', 'file-text', '🧾', 'expense', 140, 'Impuestos, tasas y contribuciones', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- MANTENIMIENTO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000034', NULL, 'Mantenimiento', '#FF5722', 'wrench', '🔧', 'expense', 35, 'Reparaciones del hogar, auto, etc.', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- REGALOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000035', NULL, 'Regalos', '#E8579C', 'gift', '🎁', 'expense', 150, 'Regalos para familiares y amigos', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- DONACIONES
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000036', NULL, 'Donaciones', '#4CAF50', 'heart-handshake', '💝', 'expense', 160, 'Donaciones benéficas y ayudas sociales', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- TARJETAS DE CRÉDITO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000037', NULL, 'Tarjetas', '#1976D2', 'credit-card', '💳', 'expense', 170, 'Pagos de tarjetas de crédito', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- PRÉSTAMOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000038', NULL, 'Préstamos', '#3F51B5', 'banknote', '🏦', 'expense', 180, 'Pagos de préstamos personales o hipotecarios', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Categorías de INGRESOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000040', NULL, 'Salario', '#4CAF50', 'briefcase', '💰', 'income', 200, 'Salario principal del trabajo', true, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000041', NULL, 'Freelance', '#66BB6A', 'user', '💼', 'income', 210, 'Ingresos por trabajos independientes', true, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000042', NULL, 'Bonos', '#81C784', 'star', '🎁', 'income', 220, 'Bonificaciones y premios laborales', true, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000043', NULL, 'Ventas', '#A5D6A7', 'trending-up', '🏪', 'income', 230, 'Ingresos por ventas de productos o servicios', true, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000044', NULL, 'Reembolsos', '#C8E6C9', 'refresh-cw', '🔄', 'income', 240, 'Devoluciones y reembolsos', true, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000045', NULL, 'Inversiones', '#E8F5E8', 'trending-up', '📈', 'income', 250, 'Ganancias de inversiones y dividendos', true, true, false)
ON CONFLICT (id) DO NOTHING;

-- 4. Categorías ESPECIALES (ahora con 'transfer' permitido)
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000050', NULL, 'Transferencias', '#9E9E9E', 'arrows-right-left', '↔️', 'transfer', 300, 'Transferencias entre cuentas', true, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000051', NULL, 'Reconciliación de cuenta', '#757575', 'check-square', '⚖️', 'transfer', 310, 'Ajustes contables y reconciliaciones', true, true, false)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- PARTE 3: FUNCIONES Y VISTAS MEJORADAS
-- ================================================

-- Función mejorada para obtener categorías por tipo
CREATE OR REPLACE FUNCTION public.get_categories_by_type_enhanced(
    p_user_id UUID DEFAULT NULL,
    p_type VARCHAR(20) DEFAULT NULL,
    p_context VARCHAR(20) DEFAULT 'personal',
    p_include_system BOOLEAN DEFAULT true
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    color VARCHAR,
    icon VARCHAR,
    emoji TEXT,
    type VARCHAR,
    sort_order INTEGER,
    description TEXT,
    is_default BOOLEAN,
    is_system BOOLEAN,
    is_budgetable BOOLEAN,
    context VARCHAR,
    parent_category_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        c.emoji,
        c.type,
        c.sort_order,
        c.description,
        c.is_default,
        c.is_system,
        c.is_budgetable,
        c.context,
        c.parent_category_id
    FROM public.categories c
    LEFT JOIN public.category_visibility cv ON c.id = cv.category_id AND cv.user_id = p_user_id
    WHERE 
        (p_user_id IS NULL OR c.user_id = p_user_id OR (c.is_system = true AND p_include_system = true))
        AND (p_type IS NULL OR c.type = p_type)
        AND (c.context = p_context OR c.context IS NULL)
        AND (cv.is_visible IS NULL OR cv.is_visible = true)
    ORDER BY c.sort_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener categorías por sección específica
CREATE OR REPLACE FUNCTION public.get_categories_for_section(
    p_user_id UUID,
    p_section VARCHAR(20) -- 'transactions', 'budgets', 'reports'
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    color VARCHAR,
    icon VARCHAR,
    emoji TEXT,
    type VARCHAR,
    sort_order INTEGER,
    description TEXT,
    is_visible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        c.emoji,
        c.type,
        c.sort_order,
        c.description,
        CASE 
            WHEN p_section = 'transactions' THEN COALESCE(cv.visible_in_transactions, true)
            WHEN p_section = 'budgets' THEN COALESCE(cv.visible_in_budgets, true)
            WHEN p_section = 'reports' THEN COALESCE(cv.visible_in_reports, true)
            ELSE true
        END as is_visible
    FROM public.categories c
    LEFT JOIN public.category_visibility cv ON c.id = cv.category_id AND cv.user_id = p_user_id
    WHERE 
        (c.user_id = p_user_id OR c.is_system = true)
        AND (
            (p_section = 'transactions' AND COALESCE(cv.visible_in_transactions, true) = true) OR
            (p_section = 'budgets' AND COALESCE(cv.visible_in_budgets, true) = true AND c.is_budgetable = true) OR
            (p_section = 'reports' AND COALESCE(cv.visible_in_reports, true) = true)
        )
    ORDER BY c.sort_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar la vista all_categories para incluir los nuevos campos
DROP VIEW IF EXISTS public.all_categories;
CREATE VIEW public.all_categories AS
SELECT 
    c.id,
    c.user_id,
    c.name,
    c.color,
    c.icon,
    c.emoji,
    c.type,
    c.parent_category_id,
    c.sort_order,
    c.description,
    c.is_default,
    c.is_system,
    c.is_budgetable,
    c.context,
    c.created_at,
    COALESCE(cv.is_visible, true) as is_visible,
    COALESCE(cv.visible_in_transactions, true) as visible_in_transactions,
    COALESCE(cv.visible_in_budgets, true) as visible_in_budgets,
    COALESCE(cv.visible_in_reports, true) as visible_in_reports
FROM public.categories c
LEFT JOIN public.category_visibility cv ON c.id = cv.category_id;

-- Política RLS para las funciones nuevas
ALTER FUNCTION public.get_categories_by_type_enhanced(UUID, VARCHAR, VARCHAR, BOOLEAN) OWNER TO postgres;
ALTER FUNCTION public.get_categories_for_section(UUID, VARCHAR) OWNER TO postgres;

COMMIT; 