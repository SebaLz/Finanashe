-- Agregar campo whatsapp a la tabla users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Actualizar el campo whatsapp con los datos de los metadatos de auth.users
UPDATE public.users u
SET whatsapp = a.raw_user_meta_data->>'whatsapp'
FROM auth.users a
WHERE u.id = a.id
AND a.raw_user_meta_data->>'whatsapp' IS NOT NULL; 