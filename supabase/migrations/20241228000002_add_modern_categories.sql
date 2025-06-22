-- Migración: Categorías Modernas Inspiradas en Gasti
-- Fecha: 2024-12-28
-- Propósito: Añadir categorías modernas con emojis y mejor organización

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

-- 2. Categorías de GASTOS adicionales (inspiradas en Gasti)

-- ALIMENTACIÓN
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000020', NULL, 'Restaurantes', '#FF6B35', 'utensils', '🍽️', 'expense', 15, 'Comidas en restaurantes y bares', true, true, true);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000021', NULL, 'Delivery', '#FF8E53', 'truck', '🛵', 'expense', 16, 'Pedidos a domicilio y apps de comida', true, true, true);

-- TRANSPORTE
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000022', NULL, 'Combustible', '#FFA726', 'fuel', '⛽', 'expense', 31, 'Combustible para vehículos', true, true, true);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000023', NULL, 'Estacionamiento', '#FFB74D', 'car', '🅿️', 'expense', 32, 'Estacionamientos y peajes', true, true, true);

-- PERSONAL Y CUIDADO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000024', NULL, 'Ropa', '#8E24AA', 'shirt', '👕', 'expense', 100, 'Ropa, calzado y accesorios', true, true, true);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000025', NULL, 'Peluquería', '#AB47BC', 'scissors', '💇', 'expense', 101, 'Peluquería, barbería y cuidado personal', true, true, true);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000026', NULL, 'Farmacia', '#E91E63', 'pill', '💊', 'expense', 52, 'Medicamentos y productos de farmacia', true, true, true);

-- ENTRETENIMIENTO Y OCIO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000027', NULL, 'Subscripciones', '#673AB7', 'play-circle', '📺', 'expense', 71, 'Netflix, Spotify, servicios de streaming', true, true, true);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000028', NULL, 'Deportes', '#2196F3', 'activity', '⚽', 'expense', 72, 'Gimnasio, deportes, actividades físicas', true, true, true);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000029', NULL, 'Hobbies', '#009688', 'palette', '🎨', 'expense', 73, 'Aficiones, pasatiempos, manualidades', true, true, true);

-- TECNOLOGÍA
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000030', NULL, 'Tecnología', '#607D8B', 'smartphone', '📱', 'expense', 110, 'Electrónicos, gadgets, accesorios tech', true, true, true);

-- MASCOTAS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000031', NULL, 'Mascotas', '#795548', 'heart', '🐕', 'expense', 120, 'Comida, veterinario, accesorios para mascotas', true, true, true);

-- SEGUROS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000032', NULL, 'Seguros', '#455A64', 'shield', '🛡️', 'expense', 130, 'Seguros de auto, hogar, vida, etc.', true, true, true);

-- IMPUESTOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000033', NULL, 'Impuestos', '#37474F', 'file-text', '🧾', 'expense', 140, 'Impuestos, tasas y contribuciones', true, true, true);

-- MANTENIMIENTO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000034', NULL, 'Mantenimiento', '#FF5722', 'wrench', '🔧', 'expense', 35, 'Reparaciones del hogar, auto, etc.', true, true, true);

-- REGALOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000035', NULL, 'Regalos', '#E8579C', 'gift', '🎁', 'expense', 150, 'Regalos para familiares y amigos', true, true, true);

-- DONACIONES
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000036', NULL, 'Donaciones', '#4CAF50', 'heart-handshake', '💝', 'expense', 160, 'Donaciones benéficas y ayudas sociales', true, true, true);

-- TARJETAS DE CRÉDITO
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000037', NULL, 'Tarjetas', '#1976D2', 'credit-card', '💳', 'expense', 170, 'Pagos de tarjetas de crédito', true, true, true);

-- PRÉSTAMOS
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000038', NULL, 'Préstamos', '#3F51B5', 'banknote', '🏦', 'expense', 180, 'Pagos de préstamos personales o hipotecarios', true, true, true);

-- 3. Categorías de INGRESOS

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000040', NULL, 'Salario', '#4CAF50', 'briefcase', '💰', 'income', 200, 'Salario principal del trabajo', true, true, false);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000041', NULL, 'Freelance', '#8BC34A', 'laptop', '💼', 'income', 210, 'Trabajos independientes y freelancing', true, true, false);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000042', NULL, 'Bonos', '#CDDC39', 'gift', '🎁', 'income', 220, 'Bonificaciones y premios laborales', true, true, false);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000043', NULL, 'Ventas', '#FFC107', 'shopping-bag', '🏪', 'income', 230, 'Ingresos por ventas de productos o servicios', true, true, false);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000044', NULL, 'Reembolsos', '#FF9800', 'arrow-left-circle', '🔄', 'income', 240, 'Devoluciones y reembolsos', true, true, false);

INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000045', NULL, 'Inversiones', '#FF5722', 'trending-up', '📈', 'income', 250, 'Ganancias de inversiones y dividendos', true, true, false);

-- 4. Categorías ESPECIALES

-- Transferencias
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000050', NULL, 'Transferencias', '#9C27B0', 'arrow-right-left', '↔️', 'transfer', 300, 'Transferencias entre cuentas propias', true, true, false);

-- Reconciliación de cuentas
INSERT INTO public.categories (id, user_id, name, color, icon, emoji, type, sort_order, description, is_default, is_system, is_budgetable) VALUES 
('00000000-0000-0000-0000-000000000051', NULL, 'Reconciliación de cuenta', '#607D8B', 'refresh-cw', '⚖️', 'transfer', 310, 'Ajustes contables y reconciliaciones', true, true, false);

-- 5. Actualizar emojis de categorías especiales existentes
UPDATE public.categories SET emoji = '❓' WHERE id = '00000000-0000-0000-0000-000000000000';
UPDATE public.categories SET emoji = '🎯' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.categories SET emoji = '📊' WHERE id = '00000000-0000-0000-0000-000000000002';

-- 6. Crear una función para obtener categorías por sección con la nueva estructura
CREATE OR REPLACE FUNCTION public.get_categories_for_section(
    p_user_id UUID,
    p_section VARCHAR(20) -- 'transactions', 'budgets', 'goals', 'investments'
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_types VARCHAR(20)[];
BEGIN
    -- Definir qué tipos de categorías mostrar según la sección
    CASE p_section
        WHEN 'transactions' THEN v_types := ARRAY['income', 'expense'];
        WHEN 'budgets' THEN v_types := ARRAY['expense', 'saving'];
        WHEN 'goals' THEN v_types := ARRAY['goal', 'saving'];
        WHEN 'investments' THEN v_types := ARRAY['investment'];
        ELSE v_types := ARRAY['expense']; -- Por defecto
    END CASE;

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
            CASE p_section
                WHEN 'transactions' THEN COALESCE(cv.visible_in_transactions, TRUE)
                WHEN 'budgets' THEN COALESCE(cv.visible_in_budgets, TRUE)
                WHEN 'reports' THEN COALESCE(cv.visible_in_reports, TRUE)
                ELSE TRUE
            END AS section_visible
        FROM 
            public.categories c
        LEFT JOIN 
            public.category_visibility cv ON c.id = cv.category_id AND cv.user_id = p_user_id
        WHERE 
            (c.user_id = p_user_id OR c.user_id IS NULL)
            AND c.type = ANY(v_types)
            AND (p_section != 'budgets' OR c.is_budgetable = true)
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
                'is_visible', is_visible
            ) ORDER BY sort_order, name
        )
    INTO 
        v_result
    FROM 
        user_categories
    WHERE 
        is_visible = TRUE AND section_visible = TRUE;
    
    -- Si no hay categorías, devolver array vacío
    IF v_result IS NULL THEN
        v_result := '[]'::jsonb;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.get_categories_for_section(UUID, VARCHAR) TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.get_categories_for_section(UUID, VARCHAR) IS 'Obtiene categorías filtradas por sección de la aplicación (transactions, budgets, goals, investments)'; 