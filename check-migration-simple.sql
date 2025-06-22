-- =====================================================
-- SCRIPT DE VERIFICACIÓN SIMPLE (SIN COLUMNAS NUEVAS)
-- Ejecutar en Supabase Studio para ver el estado actual
-- =====================================================

-- 1. Verificar columnas actuales en categories
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar constraint CHECK actual
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%categories%type%';

-- 3. Verificar cuántas categorías existen actualmente
SELECT COUNT(*) as total_categorias FROM public.categories;

-- 4. Verificar categorías actuales (solo campos básicos)
SELECT id, name, color, icon 
FROM public.categories 
ORDER BY created_at;

-- 5. Verificar estructura de category_visibility
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'category_visibility' 
  AND table_schema = 'public'; 