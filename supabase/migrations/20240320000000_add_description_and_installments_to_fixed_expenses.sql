-- Agregar campos description y installments a la tabla fixed_expenses
ALTER TABLE fixed_expenses
ADD COLUMN description TEXT,
ADD COLUMN installments INTEGER;

-- Actualizar la política RLS para incluir los nuevos campos
DROP POLICY IF EXISTS "Users can view their own fixed expenses" ON fixed_expenses;
CREATE POLICY "Users can view their own fixed expenses" 
ON fixed_expenses FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own fixed expenses" ON fixed_expenses;
CREATE POLICY "Users can insert their own fixed expenses" 
ON fixed_expenses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own fixed expenses" ON fixed_expenses;
CREATE POLICY "Users can update their own fixed expenses" 
ON fixed_expenses FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own fixed expenses" ON fixed_expenses;
CREATE POLICY "Users can delete their own fixed expenses" 
ON fixed_expenses FOR DELETE 
USING (auth.uid() = user_id); 