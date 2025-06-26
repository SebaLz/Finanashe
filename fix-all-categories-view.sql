DROP VIEW IF EXISTS public.all_categories;

CREATE VIEW public.all_categories AS
SELECT 
  id, 
  user_id, 
  name, 
  color, 
  icon, 
  emoji, 
  type, 
  parent_category_id,
  sort_order, 
  description, 
  is_default, 
  is_system, 
  is_budgetable, 
  context, 
  created_at
FROM public.categories; 