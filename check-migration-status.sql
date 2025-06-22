-- =====================================================
-- SCRIPT DE VERIFICACIÓN DEL ESTADO DE LA MIGRACIÓN
-- Ejecutar en Supabase Studio para ver qué se aplicó
-- =====================================================

-- 1. Verificar qué columnas nuevas existen
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categories' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar constraint CHECK actual
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%categories%type%';

-- 3. Verificar cuántas categorías se crearon
SELECT COUNT(*) as total_categorias FROM public.categories;

-- 4. Verificar categorías con emoji (las nuevas)
SELECT name, emoji, type, sort_order 
FROM public.categories 
WHERE emoji IS NOT NULL 
ORDER BY sort_order;

-- 5. Verificar IDs específicos que pueden haber fallado
SELECT id, name, type 
FROM public.categories 
WHERE id IN (
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000051'
);

-- 6. Verificar nuevas columnas en category_visibility
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'category_visibility' 
  AND table_schema = 'public'
  AND column_name LIKE 'visible_in_%'; 