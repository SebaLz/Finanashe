-- Verificar que los emojis se muestran correctamente
SELECT 
  name, 
  emoji, 
  color,
  type,
  CASE 
    WHEN emoji IS NOT NULL THEN CONCAT(emoji, ' ', name)
    ELSE name
  END as display_name
FROM public.categories 
WHERE is_system = true 
ORDER BY sort_order 
LIMIT 10; 