-- Migrar usuarios existentes de auth.users a public.users
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    created_at,
    updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

-- Actualizar los campos phone y whatsapp si existen en los metadatos
UPDATE public.users u
SET 
    phone = a.raw_user_meta_data->>'phone',
    whatsapp = a.raw_user_meta_data->>'whatsapp'
FROM auth.users a
WHERE u.id = a.id
AND (
    a.raw_user_meta_data->>'phone' IS NOT NULL 
    OR a.raw_user_meta_data->>'whatsapp' IS NOT NULL
); 