-- Migración: Mejora del Schema de Categorías
-- Fecha: 2024-12-28
-- Propósito: Añadir campos para mejor organización y compatibilidad con categorías modernas

-- Añadir nuevos campos a la tabla categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer', 'investment', 'saving', 'goal'));
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_budgetable BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS context VARCHAR(20) DEFAULT 'personal' CHECK (context IN ('personal', 'business'));
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS emoji TEXT; -- Para iconos emoji como en Gasti

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
WHERE id = '00000000-0000-0000-0000-000000000001'; -- Objetivo Sin Categoría

UPDATE public.categories 
SET type = 'investment' 
WHERE id = '00000000-0000-0000-0000-000000000002'; -- Inversiones

-- Actualizar categorías predeterminadas del presupuesto
UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 10
WHERE id = '00000000-0000-0000-0000-000000000010'; -- Alimentos

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 20
WHERE id = '00000000-0000-0000-0000-000000000011'; -- Vivienda

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 30
WHERE id = '00000000-0000-0000-0000-000000000012'; -- Transporte

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 40
WHERE id = '00000000-0000-0000-0000-000000000013'; -- Servicios

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 50
WHERE id = '00000000-0000-0000-0000-000000000014'; -- Salud

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 60
WHERE id = '00000000-0000-0000-0000-000000000015'; -- Educación

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 70
WHERE id = '00000000-0000-0000-0000-000000000016'; -- Ocio

UPDATE public.categories 
SET type = 'saving', is_budgetable = true, sort_order = 80
WHERE id = '00000000-0000-0000-0000-000000000017'; -- Ahorro

UPDATE public.categories 
SET type = 'expense', is_budgetable = true, sort_order = 90
WHERE id = '00000000-0000-0000-0000-000000000018'; -- Gastos varios

-- Mejorar la tabla category_visibility con los nuevos campos solicitados
ALTER TABLE public.category_visibility ADD COLUMN IF NOT EXISTS visible_in_transactions BOOLEAN DEFAULT true;
ALTER TABLE public.category_visibility ADD COLUMN IF NOT EXISTS visible_in_budgets BOOLEAN DEFAULT true;
ALTER TABLE public.category_visibility ADD COLUMN IF NOT EXISTS visible_in_reports BOOLEAN DEFAULT true;

-- Migrar datos existentes de visibilidad
UPDATE public.category_visibility 
SET visible_in_transactions = is_visible,
    visible_in_budgets = is_visible,
    visible_in_reports = is_visible
WHERE visible_in_transactions IS NULL;

-- Función para obtener categorías por tipo (mejorada para el nuevo schema)
CREATE OR REPLACE FUNCTION public.get_categories_by_type_enhanced(
    p_user_id UUID,
    p_type VARCHAR(20) DEFAULT NULL,
    p_context VARCHAR(20) DEFAULT 'personal'
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH user_categories AS (
        SELECT 
            c.id,
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
            COALESCE(cv.is_visible, TRUE) AS is_visible,
            COALESCE(cv.visible_in_transactions, TRUE) AS visible_in_transactions,
            COALESCE(cv.visible_in_budgets, TRUE) AS visible_in_budgets,
            COALESCE(cv.visible_in_reports, TRUE) AS visible_in_reports
        FROM 
            public.categories c
        LEFT JOIN 
            public.category_visibility cv ON c.id = cv.category_id AND cv.user_id = p_user_id
        WHERE 
            (c.user_id = p_user_id OR c.user_id IS NULL)
            AND (p_type IS NULL OR c.type = p_type)
            AND c.context = p_context
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'name', name,
                'color', color,
                'icon', icon,
                'emoji', emoji,
                'type', type,
                'parent_category_id', parent_category_id,
                'sort_order', sort_order,
                'description', description,
                'is_default', is_default,
                'is_system', is_system,
                'is_budgetable', is_budgetable,
                'context', context,
                'is_visible', is_visible,
                'visible_in_transactions', visible_in_transactions,
                'visible_in_budgets', visible_in_budgets,
                'visible_in_reports', visible_in_reports
            ) ORDER BY sort_order, name
        )
    INTO 
        v_result
    FROM 
        user_categories
    WHERE 
        is_visible = TRUE;
    
    -- Si no hay categorías, devolver array vacío
    IF v_result IS NULL THEN
        v_result := '[]'::jsonb;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para la nueva función
GRANT EXECUTE ON FUNCTION public.get_categories_by_type_enhanced(UUID, VARCHAR, VARCHAR) TO authenticated;

-- Actualizar la vista all_categories para incluir los nuevos campos
CREATE OR REPLACE VIEW public.all_categories AS
WITH default_category AS (
  SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as id,
    NULL::uuid as user_id,
    'Sin categoría' as name,
    '#9E9E9E' as color,
    'help-circle' as icon,
    '❓' as emoji,
    'expense'::varchar(20) as type,
    NULL::uuid as parent_category_id,
    0 as sort_order,
    'Categoría por defecto para elementos sin clasificar' as description,
    true as is_default,
    true as is_system,
    true as is_budgetable,
    'personal'::varchar(20) as context,
    now() as created_at
)
SELECT 
  id, user_id, name, color, icon, emoji, type, parent_category_id,
  sort_order, description, is_default, is_system, is_budgetable, context, created_at
FROM public.categories
UNION ALL 
SELECT 
  id, user_id, name, color, icon, emoji, type, parent_category_id,
  sort_order, description, is_default, is_system, is_budgetable, context, created_at
FROM default_category
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE is_default = true AND type = 'expense'
);

-- Comentarios para documentar los cambios
COMMENT ON COLUMN public.categories.type IS 'Tipo de categoría: income, expense, transfer, investment, saving, goal';
COMMENT ON COLUMN public.categories.parent_category_id IS 'Referencia a categoría padre para crear jerarquías (subcategorías)';
COMMENT ON COLUMN public.categories.sort_order IS 'Orden de visualización personalizable por el usuario';
COMMENT ON COLUMN public.categories.description IS 'Descripción opcional de la categoría';
COMMENT ON COLUMN public.categories.is_budgetable IS 'Indica si la categoría debe aparecer en la configuración de presupuestos';
COMMENT ON COLUMN public.categories.context IS 'Contexto de uso: personal o business';
COMMENT ON COLUMN public.categories.emoji IS 'Emoji para mostrar como icono (estilo Gasti)';

COMMENT ON FUNCTION public.get_categories_by_type_enhanced(UUID, VARCHAR, VARCHAR) IS 'Función mejorada para obtener categorías filtradas por tipo y contexto, con información completa de visibilidad'; 