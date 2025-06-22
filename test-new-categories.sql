-- =====================================================
-- SCRIPT DE PRUEBA PARA VERIFICAR CATEGORÍAS MODERNAS
-- Ejecutar en Supabase Studio para probar todo funciona
-- =====================================================

-- 1. Verificar total de categorías
SELECT COUNT(*) as total_categorias FROM public.categories;

-- 2. Verificar categorías con emojis
SELECT name, emoji, type, sort_order 
FROM public.categories 
WHERE emoji IS NOT NULL 
ORDER BY sort_order 
LIMIT 10;

-- 3. Probar función nueva get_categories_by_type_enhanced
SELECT * FROM public.get_categories_by_type_enhanced(
    null, -- user_id (null para system)
    'expense', -- type
    'personal', -- context
    true -- include_system
) LIMIT 5;

-- 4. Probar función get_categories_for_section
-- Nota: Usa un UUID real de tu tabla profiles
SELECT * FROM public.get_categories_for_section(
    '00000000-0000-0000-0000-000000000001', -- Cambia por un user_id real
    'transactions'
) LIMIT 5;

-- 5. Verificar vista all_categories
SELECT id, name, emoji, type, is_budgetable 
FROM public.all_categories 
WHERE emoji IS NOT NULL 
LIMIT 5; 