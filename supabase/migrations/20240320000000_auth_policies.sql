-- Habilitar RLS en la tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para permitir que los usuarios vean su propio perfil
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Política para permitir que los usuarios creen su propio perfil
CREATE POLICY "Users can create their own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política para permitir que los usuarios actualicen su propio perfil
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Política para permitir que los usuarios eliminen su propio perfil
CREATE POLICY "Users can delete their own profile"
ON users FOR DELETE
USING (auth.uid() = id); 