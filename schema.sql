-- Esquema de Base de Datos Optimizado para FinanzApp

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Categorías
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888888',
  icon TEXT NOT NULL DEFAULT 'help-circle',
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vista para acceso a categorías con valores predeterminados
CREATE OR REPLACE VIEW public.all_categories AS
WITH default_category AS (
  SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as id,
    NULL::uuid as user_id,
    'Sin categoría' as name,
    '#9E9E9E' as color,
    'help-circle' as icon,
    true as is_default,
    true as is_system,
    now() as created_at
)
SELECT * FROM public.categories
UNION ALL 
SELECT * FROM default_category
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE is_default = true
);

-- Tabla de Visibilidad de Categorías
CREATE TABLE public.category_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Tabla de Transacciones
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  date DATE NOT NULL,
  description TEXT,
  is_budgetable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Gastos Fijos (con soporte para cuotas)
CREATE TABLE public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'biweekly')),
  due_date INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  description TEXT,
  total_installments INTEGER, -- Número total de cuotas (NULL si no es en cuotas)
  paid_installments INTEGER DEFAULT 0, -- Número de cuotas ya pagadas
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Presupuestos
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID NOT NULL REFERENCES public.categories(id),
  amount DECIMAL(12, 2) NOT NULL,
  percentage DECIMAL(5, 2),
  month TEXT NOT NULL, -- Formato YYYY-MM
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id, month)
);

-- Tabla para el Método de Presupuesto
-- Nota: La opción 'manual' fue eliminada el 2023-07-28 para simplificar el sistema
-- Los usuarios que usaban esta opción son migrados automáticamente a 'all_income'
CREATE TABLE public.budget_method_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('salary', 'all_income', 'salary_plus_selected')),
  salary_amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para la Inclusión de Ingresos en Presupuesto
CREATE TABLE public.budget_income_inclusions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Formato YYYY-MM
  is_included BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, transaction_id, month)
);

-- Tabla para el Total Mensual de Presupuesto
CREATE TABLE public.budget_monthly_totals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  month TEXT NOT NULL, -- Formato YYYY-MM
  total_amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Tabla para vincular presupuestos con objetivos financieros
CREATE TABLE IF NOT EXISTS budget_goal_links (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  auto_contribute BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_budget_goal_link UNIQUE (user_id, budget_id, goal_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_budget_goal_links_user_id ON budget_goal_links(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_goal_links_budget_id ON budget_goal_links(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_goal_links_goal_id ON budget_goal_links(goal_id);

-- Permisos para la tabla budget_goal_links
ALTER TABLE budget_goal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_goal_links_user_policy ON budget_goal_links
  USING (auth.uid() = user_id);

-- Función para procesar contribuciones automáticas desde presupuestos a objetivos
CREATE OR REPLACE FUNCTION process_budget_goal_contributions(
  p_user_id UUID,
  p_month TEXT
) RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_contribution_id UUID;
  v_goal_id UUID;
  v_amount DECIMAL(12,2);
  v_budget_category TEXT;
  v_contribution_date DATE;
BEGIN
  -- Fecha para la contribución (primer día del mes)
  v_contribution_date := (p_month || '-01')::DATE;
  
  -- Procesar cada vínculo con auto_contribute=true
  FOR v_goal_id, v_amount, v_budget_category IN 
    SELECT 
      bgl.goal_id,
      bgl.monthly_amount,
      c.name
    FROM 
      budget_goal_links bgl
      JOIN budgets b ON bgl.budget_id = b.id
      JOIN categories c ON b.category_id = c.id
    WHERE 
      bgl.user_id = p_user_id
      AND b.month = p_month
      AND bgl.auto_contribute = TRUE
  LOOP
    -- Crear una contribución para este objetivo
    v_contribution_id := gen_random_uuid();
    
    INSERT INTO goal_contributions (
      id,
      user_id,
      goal_id,
      amount,
      date,
      description,
      source
    ) VALUES (
      v_contribution_id,
      p_user_id,
      v_goal_id,
      v_amount,
      v_contribution_date,
      'Contribución automática del presupuesto ' || v_budget_category,
      'budget'
    );
    
    -- Actualizar el monto actual del objetivo
    UPDATE goals
    SET current_amount = current_amount + v_amount
    WHERE id = v_goal_id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.process_budget_goal_contributions(UUID, TEXT) TO authenticated;

-- Tabla de Tareas Financieras (con soporte para objetivos y más completa)
CREATE TABLE public.financial_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fixed_expense_id UUID REFERENCES public.fixed_expenses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_date TIMESTAMPTZ,
  description TEXT,
  is_installment BOOLEAN DEFAULT false,
  installment_number INTEGER,
  type TEXT CHECK (type IN ('expense', 'goal_contribution')),
  reference_id TEXT,
  category_id UUID REFERENCES public.categories(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Función para obtener categorías con seguridad
DROP FUNCTION IF EXISTS public.get_safe_categories;
CREATE OR REPLACE FUNCTION public.get_safe_categories(cat_ids UUID[]) 
RETURNS JSONB AS $$
DECLARE
  result_data JSONB;
BEGIN
  WITH category_info AS (
    SELECT 
      c.id,
      c.name,
      c.color,
      c.icon,
      c.is_default,
      c.is_system
    FROM public.all_categories c
    WHERE c.id = ANY(cat_ids)
    
    UNION ALL
    
    -- Para cada ID que no se encontró, incluir la categoría por defecto con ese ID
    SELECT
      missing_id AS id,
      'Sin categoría' AS name,
      '#9E9E9E' AS color,
      'help-circle' AS icon,
      true AS is_default,
      true AS is_system
    FROM unnest(cat_ids) AS missing_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.all_categories c WHERE c.id = missing_id
    )
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'color', color,
      'icon', icon,
      'is_default', is_default,
      'is_system', is_system
    )
  ) INTO result_data
  FROM category_info;
  
  RETURN COALESCE(result_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Función para crear transacciones
DROP FUNCTION IF EXISTS public.create_transaction;
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount DECIMAL,
  p_category_id UUID,
  p_date DATE,
  p_description TEXT,
  p_is_budgetable BOOLEAN DEFAULT true
) RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_result JSON;
  v_category JSONB;
BEGIN
  -- Verificar datos
  IF p_user_id IS NULL OR p_type IS NULL OR p_amount IS NULL OR p_category_id IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'Campos obligatorios no pueden ser nulos';
  END IF;
  
  -- Insertar transacción
  INSERT INTO public.transactions (
    id,
    user_id,
    type,
    amount,
    category_id,
    date,
    description,
    is_budgetable
  ) VALUES (
    uuid_generate_v4(),
    p_user_id,
    p_type,
    p_amount,
    p_category_id,
    p_date,
    p_description,
    p_is_budgetable
  ) RETURNING id INTO v_transaction_id;
  
  -- Obtener datos de categoría
  SELECT public.get_safe_categories(ARRAY[p_category_id]) INTO v_category;
  
  -- Construir resultado
  SELECT json_build_object(
    'id', t.id,
    'user_id', t.user_id,
    'type', t.type,
    'amount', t.amount,
    'category_id', t.category_id,
    'date', t.date,
    'description', t.description,
    'is_budgetable', t.is_budgetable,
    'created_at', t.created_at,
    'category', v_category->0
  ) INTO v_result
  FROM public.transactions t 
  WHERE t.id = v_transaction_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular el total del presupuesto mensual
-- Nota: El caso 'manual' fue eliminado el 2023-07-28, cualquier configuración existente
-- que use este tipo será migrada automáticamente a 'all_income'
DROP FUNCTION IF EXISTS public.calculate_monthly_budget_total;
CREATE OR REPLACE FUNCTION public.calculate_monthly_budget_total(
  p_user_id UUID,
  p_month TEXT
) RETURNS JSON AS $$
DECLARE
  v_budget_type TEXT;
  v_salary_amount DECIMAL;
  v_total DECIMAL := 0;
  v_result_id UUID;
  v_result JSON;
BEGIN
  -- Verificar el ID de usuario
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el ID de usuario. Por favor, inicie sesión nuevamente.';
  END IF;

  -- Obtener configuración de método de presupuesto
  SELECT 
    budget_type, 
    COALESCE(salary_amount, 0)
  INTO 
    v_budget_type, 
    v_salary_amount
  FROM public.budget_method_configuration
  WHERE user_id = p_user_id;
  
  -- Si no hay configuración, usar valores por defecto
  IF v_budget_type IS NULL THEN
    v_budget_type := 'all_income';
    v_salary_amount := 0;
  END IF;
  
  -- Si por alguna razón todavía existe 'manual', convertirlo a 'all_income'
  IF v_budget_type = 'manual' THEN
    v_budget_type := 'all_income';
  END IF;
  
  -- Calcular el total según el método
  CASE v_budget_type
    WHEN 'salary' THEN
      v_total := v_salary_amount;
    
    WHEN 'all_income' THEN
      -- Verificar que existe la tabla transactions
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total
        FROM public.transactions
        WHERE 
          user_id = p_user_id AND 
          type = 'income' AND
          date >= (p_month || '-01')::DATE AND
          date < (
            CASE 
              WHEN SUBSTRING(p_month, 6, 2) = '12' THEN
                (SUBSTRING(p_month, 1, 4)::INTEGER + 1) || '-01-01'
              ELSE
                SUBSTRING(p_month, 1, 4) || '-' || 
                LPAD((SUBSTRING(p_month, 6, 2)::INTEGER + 1)::TEXT, 2, '0') || '-01'
            END
          )::DATE;
      ELSE
        v_total := 0;
      END IF;
    
    WHEN 'salary_plus_selected' THEN
      -- Ya no sumar el salario, solo las transacciones seleccionadas con is_budgetable=true
      v_total := 0;
      
      -- Verificar que existen las tablas necesarias
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        -- Sumar solo transacciones marcadas como is_budgetable = true
        SELECT COALESCE(SUM(t.amount), 0)
        INTO v_total
        FROM public.transactions t
        WHERE 
          t.user_id = p_user_id AND
          t.type = 'income' AND
          t.is_budgetable = true AND
          t.date >= (p_month || '-01')::DATE AND
          t.date < (
            CASE 
              WHEN SUBSTRING(p_month, 6, 2) = '12' THEN
                (SUBSTRING(p_month, 1, 4)::INTEGER + 1) || '-01-01'
              ELSE
                SUBSTRING(p_month, 1, 4) || '-' || 
                LPAD((SUBSTRING(p_month, 6, 2)::INTEGER + 1)::TEXT, 2, '0') || '-01'
            END
          )::DATE;
      END IF;
  END CASE;
  
  -- Guardar/Actualizar el total calculado
  -- Verificar que existe la tabla budget_monthly_totals
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budget_monthly_totals') THEN
    INSERT INTO public.budget_monthly_totals (
      id,
      user_id,
      month,
      total_amount,
      created_at,
      updated_at
    ) VALUES (
      uuid_generate_v4(),
      p_user_id,
      p_month,
      v_total,
      now(),
      now()
    )
    ON CONFLICT (user_id, month)
    DO UPDATE SET
      total_amount = v_total,
      updated_at = now()
    RETURNING id INTO v_result_id;
    
    -- Construir resultado
    SELECT json_build_object(
      'id', bmt.id,
      'user_id', bmt.user_id,
      'month', bmt.month,
      'total_amount', bmt.total_amount,
      'created_at', bmt.created_at,
      'updated_at', bmt.updated_at
    ) INTO v_result
    FROM public.budget_monthly_totals bmt
    WHERE bmt.id = v_result_id;
  ELSE
    -- Crear un resultado básico si la tabla no existe
    v_result := json_build_object(
      'user_id', p_user_id,
      'month', p_month,
      'total_amount', v_total
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.calculate_monthly_budget_total(UUID, TEXT) TO authenticated;

-- Función para obtener resumen de presupuestos
DROP FUNCTION IF EXISTS public.get_budget_summary;
CREATE OR REPLACE FUNCTION public.get_budget_summary(
  p_user_id UUID,
  p_month TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verificar que existe la tabla transactions
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
    WITH budget_data AS (
      SELECT 
        b.id,
        b.user_id,
        b.category_id,
        b.amount,
        b.percentage,
        b.month,
        b.created_at,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        0 AS spent_amount
      FROM 
        public.budgets b
        JOIN public.categories c ON b.category_id = c.id
      WHERE 
        b.user_id = p_user_id AND 
        b.month = p_month
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', bd.id,
        'user_id', bd.user_id,
        'category_id', bd.category_id,
        'amount', bd.amount,
        'percentage', bd.percentage,
        'month', bd.month,
        'created_at', bd.created_at,
        'category_name', bd.category_name,
        'category_color', bd.category_color,
        'category_icon', bd.category_icon,
        'spent_amount', bd.spent_amount,
        'remaining_amount', bd.amount - bd.spent_amount,
        'progress_percentage', 0
      )
    ) INTO v_result
    FROM budget_data bd;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
  END IF;

  WITH budget_data AS (
    SELECT 
      b.id,
      b.user_id,
      b.category_id,
      b.amount,
      b.percentage,
      b.month,
      b.created_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      COALESCE(
        (SELECT SUM(t.amount) 
         FROM public.transactions t 
         WHERE t.user_id = b.user_id 
           AND t.category_id = b.category_id
           AND t.type = 'expense'
           AND t.date >= (b.month || '-01')::DATE
           AND t.date < (
             CASE 
               WHEN SUBSTRING(b.month, 6, 2) = '12' THEN
                 (SUBSTRING(b.month, 1, 4)::INTEGER + 1) || '-01-01'
               ELSE
                 SUBSTRING(b.month, 1, 4) || '-' || 
                 LPAD((SUBSTRING(b.month, 6, 2)::INTEGER + 1)::TEXT, 2, '0') || '-01'
             END
           )::DATE
        ), 0
      ) AS spent_amount
    FROM 
      public.budgets b
      JOIN public.categories c ON b.category_id = c.id
      -- Agregar LEFT JOIN con category_visibility para filtrar categorías ocultas
      LEFT JOIN public.category_visibility cv 
        ON c.id = cv.category_id 
        AND cv.user_id = p_user_id
    WHERE 
      b.user_id = p_user_id AND 
      b.month = p_month AND
      -- Solo incluir categorías sin configuración de visibilidad o con is_visible = true
      (cv.id IS NULL OR cv.is_visible = true)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bd.id,
      'user_id', bd.user_id,
      'category_id', bd.category_id,
      'amount', bd.amount,
      'percentage', bd.percentage,
      'month', bd.month,
      'created_at', bd.created_at,
      'category_name', bd.category_name,
      'category_color', bd.category_color,
      'category_icon', bd.category_icon,
      'spent_amount', bd.spent_amount,
      'remaining_amount', bd.amount - bd.spent_amount,
      'progress_percentage', 
        CASE 
          WHEN bd.amount = 0 THEN 0
          ELSE LEAST(100, (bd.spent_amount / bd.amount * 100))
        END
    )
  ) INTO v_result
  FROM budget_data bd;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.get_budget_summary(UUID, TEXT) TO authenticated;

-- Función para obtener transacciones de presupuesto
DROP FUNCTION IF EXISTS public.get_budget_transactions;
CREATE OR REPLACE FUNCTION public.get_budget_transactions(
  p_user_id UUID,
  p_month TEXT,
  p_is_included BOOLEAN DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verificar que existe la tabla transactions
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH month_transactions AS (
    SELECT 
      t.id,
      t.user_id,
      t.type,
      t.amount,
      t.category_id,
      t.date,
      t.description,
      t.is_budgetable,
      t.created_at,
      COALESCE(bii.is_included, false) AS is_included
    FROM public.transactions t
    LEFT JOIN public.budget_income_inclusions bii ON 
      t.id = bii.transaction_id AND 
      bii.month = p_month AND
      bii.user_id = p_user_id
    WHERE 
      t.user_id = p_user_id AND
      t.type = 'income' AND
      t.date >= (p_month || '-01')::DATE AND
      t.date < (
        CASE 
          WHEN SUBSTRING(p_month, 6, 2) = '12' THEN
            (SUBSTRING(p_month, 1, 4)::INTEGER + 1) || '-01-01'
          ELSE
            SUBSTRING(p_month, 1, 4) || '-' || 
            LPAD((SUBSTRING(p_month, 6, 2)::INTEGER + 1)::TEXT, 2, '0') || '-01'
        END
      )::DATE
  ), 
  filtered_transactions AS (
    SELECT *
    FROM month_transactions
    WHERE 
      p_is_included IS NULL OR
      is_included = p_is_included
  ),
  category_data AS (
    SELECT 
      t.id AS transaction_id,
      COALESCE(
        (SELECT public.get_safe_categories(ARRAY[t.category_id]))->0,
        jsonb_build_object(
          'id', t.category_id,
          'name', 'Sin categoría',
          'color', '#9E9E9E',
          'icon', 'help-circle',
          'is_default', true,
          'is_system', true
        )
      ) AS category_data
    FROM filtered_transactions t
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'user_id', t.user_id,
        'type', t.type,
        'amount', t.amount,
        'category_id', t.category_id,
        'date', t.date,
        'description', t.description,
        'is_budgetable', t.is_budgetable,
        'created_at', t.created_at,
        'is_included', t.is_included,
        'category', cd.category_data
      )
    )
  INTO v_result
  FROM 
    filtered_transactions t
    JOIN category_data cd ON t.id = cd.transaction_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.get_budget_transactions(UUID, TEXT, BOOLEAN) TO authenticated;

-- Función para actualizar el progreso de cuotas de un gasto fijo
DROP FUNCTION IF EXISTS public.update_fixed_expense_installments;
CREATE OR REPLACE FUNCTION public.update_fixed_expense_installments(
  p_fixed_expense_id UUID,
  p_paid_installments INTEGER
) RETURNS JSON AS $$
DECLARE
  v_total_installments INTEGER;
  v_result JSON;
BEGIN
  -- Obtener el número total de cuotas
  SELECT total_installments INTO v_total_installments
  FROM public.fixed_expenses
  WHERE id = p_fixed_expense_id;
  
  -- Validar que el número de cuotas pagadas no sea mayor que el total
  IF v_total_installments IS NOT NULL AND p_paid_installments > v_total_installments THEN
    RAISE EXCEPTION 'El número de cuotas pagadas no puede ser mayor que el total de cuotas';
  END IF;
  
  -- Actualizar el gasto fijo
  UPDATE public.fixed_expenses
  SET 
    paid_installments = p_paid_installments,
    -- Marcar como inactivo si se pagaron todas las cuotas
    active = CASE 
      WHEN v_total_installments IS NOT NULL AND p_paid_installments >= v_total_installments THEN false
      ELSE active
    END
  WHERE id = p_fixed_expense_id
  RETURNING row_to_json(fixed_expenses.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para crear tareas financieras a partir de gastos fijos
DROP FUNCTION IF EXISTS public.generate_tasks_from_fixed_expenses;
CREATE OR REPLACE FUNCTION public.generate_tasks_from_fixed_expenses(
  p_user_id UUID,
  p_month TEXT
) RETURNS JSONB AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSONB;
BEGIN
  -- Convertir mes a fechas de inicio y fin
  v_start_date := (p_month || '-01')::DATE;
  v_end_date := (
    CASE 
      WHEN SUBSTRING(p_month, 6, 2) = '12' THEN
        (SUBSTRING(p_month, 1, 4)::INTEGER + 1) || '-01-01'
      ELSE
        SUBSTRING(p_month, 1, 4) || '-' || 
        LPAD((SUBSTRING(p_month, 6, 2)::INTEGER + 1)::TEXT, 2, '0') || '-01'
    END
  )::DATE;
  
  -- Insertar tareas para los gastos fijos activos con vencimiento en este mes
  WITH inserted_tasks AS (
    INSERT INTO public.financial_tasks (
      id,
      user_id,
      fixed_expense_id,
      title,
      amount,
      due_date,
      status,
      description,
      is_installment,
      installment_number,
      created_at
    )
    SELECT 
      uuid_generate_v4(),
      fe.user_id,
      fe.id,
      fe.name,
      fe.amount,
      (v_start_date + (fe.due_date - 1))::DATE,
      'pending',
      fe.description,
      fe.total_installments IS NOT NULL,
      CASE 
        WHEN fe.total_installments IS NOT NULL THEN fe.paid_installments + 1
        ELSE NULL
      END,
      now()
    FROM public.fixed_expenses fe
    WHERE 
      fe.user_id = p_user_id AND
      fe.active = true AND
      -- No insertar si la tarea ya existe para este mes y gasto fijo
      NOT EXISTS (
        SELECT 1 
        FROM public.financial_tasks ft 
        WHERE 
          ft.fixed_expense_id = fe.id AND
          ft.due_date >= v_start_date AND
          ft.due_date < v_end_date
      ) AND
      -- Para gastos en cuotas, verificar que no se hayan pagado todas
      (fe.total_installments IS NULL OR fe.paid_installments < fe.total_installments)
    RETURNING *
  )
  SELECT jsonb_agg(row_to_json(t.*)) INTO v_result
  FROM inserted_tasks t;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Función para marcar una tarea como pagada y actualizar cuotas si es necesario
DROP FUNCTION IF EXISTS public.mark_task_as_paid;
CREATE OR REPLACE FUNCTION public.mark_task_as_paid(
  p_task_id UUID,
  p_payment_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
  v_fixed_expense_id UUID;
  v_is_installment BOOLEAN;
  v_installment_number INTEGER;
  v_result JSON;
BEGIN
  -- Actualizar la tarea
  UPDATE public.financial_tasks
  SET 
    completed = TRUE,
    completed_date = p_payment_date
  WHERE id = p_task_id
  RETURNING fixed_expense_id, is_installment, installment_number INTO v_fixed_expense_id, v_is_installment, v_installment_number;
  
  -- Si es una cuota, actualizar el contador de cuotas pagadas del gasto fijo
  IF v_fixed_expense_id IS NOT NULL AND v_is_installment = true AND v_installment_number IS NOT NULL THEN
    PERFORM public.update_fixed_expense_installments(v_fixed_expense_id, v_installment_number);
  END IF;
  
  -- Obtener la tarea actualizada
  SELECT row_to_json(ft.*) INTO v_result
  FROM public.financial_tasks ft
  WHERE ft.id = p_task_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Políticas de Seguridad de Nivel de Fila (RLS)

-- Política para categorías
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar sus propias categorías"
ON public.categories
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Política para visibilidad de categorías
ALTER TABLE public.category_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar su configuración de visibilidad"
ON public.category_visibility
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para transacciones
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar sus propias transacciones"
ON public.transactions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para gastos fijos
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar sus propios gastos fijos"
ON public.fixed_expenses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para presupuestos
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar sus propios presupuestos"
ON public.budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para inclusión de transacciones en presupuesto
ALTER TABLE public.budget_income_inclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar su inclusión de transacciones"
ON public.budget_income_inclusions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para tareas financieras
ALTER TABLE public.financial_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar sus propias tareas financieras"
ON public.financial_tasks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para configuración de método de presupuesto
ALTER TABLE public.budget_method_configuration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar su configuración de método de presupuesto"
ON public.budget_method_configuration
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para totales mensuales de presupuesto
ALTER TABLE public.budget_monthly_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver y modificar sus totales de presupuesto"
ON public.budget_monthly_totals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permisos para funciones
GRANT EXECUTE ON FUNCTION public.get_safe_categories(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transaction(UUID, TEXT, DECIMAL, UUID, DATE, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_monthly_budget_total(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_budget_transactions(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_fixed_expense_installments(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_tasks_from_fixed_expenses(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_task_as_paid(UUID, DATE) TO authenticated;

-- Tablas y funciones para la funcionalidad de objetivos

-- Creación de la tabla de objetivos con soporte para categorías
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    target_date DATE,
    category_id UUID REFERENCES public.categories(id),
    is_budget_contribution BOOLEAN DEFAULT FALSE,
    budget_monthly_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Creamos un índice para mejorar las búsquedas por usuario
CREATE INDEX goals_user_id_idx ON public.goals (user_id);

-- Creamos un índice para buscar por categoría
CREATE INDEX goals_category_id_idx ON public.goals (category_id);

-- Añadimos la política RLS para proteger los datos
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Política: los usuarios solo pueden ver sus propios objetivos
CREATE POLICY "Usuarios pueden ver sus propios objetivos"
    ON public.goals FOR SELECT
    USING (auth.uid() = user_id);

-- Política: los usuarios solo pueden insertar sus propios objetivos
CREATE POLICY "Usuarios pueden crear sus propios objetivos"
    ON public.goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: los usuarios solo pueden actualizar sus propios objetivos
CREATE POLICY "Usuarios pueden actualizar sus propios objetivos"
    ON public.goals FOR UPDATE
    USING (auth.uid() = user_id);

-- Política: los usuarios solo pueden eliminar sus propios objetivos
CREATE POLICY "Usuarios pueden eliminar sus propios objetivos"
    ON public.goals FOR DELETE
    USING (auth.uid() = user_id);

-- Creamos trigger para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabla para guardar las contribuciones a los objetivos (historial)
CREATE TABLE public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    contribution_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    description TEXT,
    from_financial_task BOOLEAN DEFAULT FALSE,
    financial_task_id UUID
);

-- Crear índices para el historial de contribuciones
CREATE INDEX goal_contributions_goal_id_idx ON public.goal_contributions (goal_id);
CREATE INDEX goal_contributions_user_id_idx ON public.goal_contributions (user_id);

-- Añadimos la política RLS para proteger los datos
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- Política: los usuarios solo pueden ver sus propias contribuciones
CREATE POLICY "Usuarios pueden ver sus propias contribuciones"
    ON public.goal_contributions FOR SELECT
    USING (auth.uid() = user_id);

-- Política: los usuarios solo pueden insertar sus propias contribuciones
CREATE POLICY "Usuarios pueden crear sus propias contribuciones"
    ON public.goal_contributions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Funciones para contribuir a un objetivo
CREATE OR REPLACE FUNCTION public.contribute_to_goal(
    p_goal_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT NULL,
    p_from_financial_task BOOLEAN DEFAULT FALSE,
    p_financial_task_id UUID DEFAULT NULL
)
RETURNS public.goals AS $$
DECLARE
    v_goal public.goals;
    v_new_amount DECIMAL;
BEGIN
    -- Primero obtenemos el objetivo actual
    SELECT * INTO v_goal FROM public.goals WHERE id = p_goal_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Objetivo no encontrado o no pertenece al usuario';
    END IF;
    
    -- Calculamos el nuevo monto
    v_new_amount := v_goal.current_amount + p_amount;
    
    -- Aseguramos que no se pase del objetivo
    v_new_amount := LEAST(v_new_amount, v_goal.target_amount);
    
    -- Registramos la contribución en el historial
    INSERT INTO public.goal_contributions (
        goal_id, 
        user_id, 
        amount, 
        description,
        from_financial_task,
        financial_task_id
    ) VALUES (
        p_goal_id, 
        auth.uid(), 
        p_amount, 
        p_description,
        p_from_financial_task,
        p_financial_task_id
    );
    
    -- Actualizamos el objetivo
    UPDATE public.goals 
    SET current_amount = v_new_amount
    WHERE id = p_goal_id AND user_id = auth.uid()
    RETURNING * INTO v_goal;
    
    RETURN v_goal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar tareas financieras a partir de objetivos
CREATE OR REPLACE FUNCTION public.generate_tasks_from_goals(
    p_user_id UUID,
    p_month VARCHAR
)
RETURNS SETOF public.financial_tasks AS $$
DECLARE
    v_goal RECORD;
    v_date DATE;
    v_due_date DATE;
    v_task_exists BOOLEAN;
    v_new_task_id UUID;
    v_category_name TEXT;
BEGIN
    -- Convertir el mes (YYYY-MM) a una fecha
    v_date := (p_month || '-01')::DATE;
    
    -- Procesar cada objetivo con contribución mensual
    FOR v_goal IN 
        SELECT g.*, c.name as category_name
        FROM public.goals g
        LEFT JOIN public.categories c ON g.category_id = c.id
        WHERE g.user_id = p_user_id 
        AND g.is_budget_contribution = TRUE 
        AND g.budget_monthly_amount > 0
        AND g.current_amount < g.target_amount
    LOOP
        -- Establecer fecha de vencimiento para el día 25 del mes
        v_due_date := (v_date + INTERVAL '24 days')::DATE;
        
        -- Verificar si ya existe una tarea para este objetivo en este mes
        SELECT EXISTS (
            SELECT 1 
            FROM public.financial_tasks 
            WHERE user_id = p_user_id 
            AND EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM v_date)
            AND EXTRACT(YEAR FROM due_date) = EXTRACT(YEAR FROM v_date)
            AND reference_id = v_goal.id::TEXT
            AND type = 'goal_contribution'
        ) INTO v_task_exists;
        
        -- Si no existe, crear la tarea
        IF NOT v_task_exists THEN
            -- Obtener el nombre de la categoría si existe
            v_category_name := COALESCE(v_goal.category_name, 'Sin categoría');
            
            -- Insertar la nueva tarea
            INSERT INTO public.financial_tasks (
                user_id,
                title,
                description,
                amount,
                due_date,
                priority,
                completed,
                type,
                reference_id,
                category_id
            ) VALUES (
                p_user_id,
                'Aporte a objetivo: ' || v_goal.name,
                'Contribución mensual para el objetivo "' || v_goal.name || '" (' || v_category_name || ')',
                v_goal.budget_monthly_amount,
                v_due_date,
                'medium',
                FALSE,
                'goal_contribution',
                v_goal.category_id
            )
            RETURNING id INTO v_new_task_id;
            
            RETURN QUERY 
                SELECT * FROM public.financial_tasks 
                WHERE id = v_new_task_id;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para completar una tarea financiera y contribuir al objetivo automáticamente
CREATE OR REPLACE FUNCTION public.complete_goal_task(
    p_task_id UUID,
    p_complete BOOLEAN DEFAULT TRUE
)
RETURNS public.financial_tasks AS $$
DECLARE
    v_task public.financial_tasks;
    v_goal_id UUID;
    v_amount DECIMAL;
    v_already_completed BOOLEAN;
BEGIN
    -- Obtener la tarea
    SELECT * INTO v_task 
    FROM public.financial_tasks 
    WHERE id = p_task_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tarea no encontrada o no pertenece al usuario';
    END IF;
    
    -- Verificar que sea una tarea de contribución a objetivo
    IF v_task.type != 'goal_contribution' THEN
        RAISE EXCEPTION 'Esta tarea no es una contribución a un objetivo';
    END IF;
    
    -- Guardar el estado actual de la tarea
    v_already_completed := v_task.completed;
    
    -- Si se está marcando como completada y no estaba completada antes
    IF p_complete AND NOT v_already_completed THEN
        -- Obtener el ID del objetivo y el monto
        v_goal_id := v_task.reference_id::UUID;
        v_amount := v_task.amount;
        
        -- Contribuir al objetivo
        PERFORM public.contribute_to_goal(
            v_goal_id, 
            v_amount, 
            'Contribución automática desde tarea financiera', 
            TRUE,
            p_task_id
        );
    END IF;
    
    -- Actualizar el estado de la tarea
    UPDATE public.financial_tasks
    SET completed = p_complete,
        completed_date = CASE WHEN p_complete THEN now() ELSE NULL END
    WHERE id = p_task_id
    RETURNING * INTO v_task;
    
    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permisos para las funciones de objetivos
GRANT EXECUTE ON FUNCTION public.contribute_to_goal(UUID, DECIMAL, TEXT, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_tasks_from_goals(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_goal_task(UUID, BOOLEAN) TO authenticated;

-- Asegurarnos de tener una categoría predeterminada para objetivos sin categoría específica
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Objetivo Sin Categoría',
    '#7E3FF2',
    'target',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Función para obtener una categoría adecuada cuando se muestra un objetivo
CREATE OR REPLACE FUNCTION public.get_goal_category(p_category_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Intentar obtener la categoría
    SELECT 
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'color', c.color,
            'icon', c.icon,
            'is_default', c.is_default,
            'is_system', c.is_system
        ) INTO v_result
    FROM 
        public.categories c
    WHERE 
        c.id = p_category_id;
    
    -- Si no encontramos la categoría, devolver la categoría por defecto
    IF v_result IS NULL THEN
        SELECT 
            jsonb_build_object(
                'id', '00000000-0000-0000-0000-000000000001'::uuid,
                'name', 'Objetivo Sin Categoría',
                'color', '#7E3FF2',
                'icon', 'target',
                'is_default', true,
                'is_system', true
            ) INTO v_result;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.get_goal_category(UUID) TO authenticated;

-- Insertar categoría predeterminada para Inversiones
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'Inversiones',
    '#6366F1',
    'trending-up',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Crear función para obtener categorías específicas para transacciones
CREATE OR REPLACE FUNCTION public.get_transaction_categories(p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH user_categories AS (
        SELECT 
            c.id,
            c.name,
            c.color,
            c.icon,
            c.is_default,
            c.is_system,
            COALESCE(cv.is_visible, TRUE) AS is_visible
        FROM 
            public.categories c
        LEFT JOIN 
            public.category_visibility cv ON c.id = cv.category_id AND cv.user_id = p_user_id
        WHERE 
            (c.user_id = p_user_id OR c.user_id IS NULL)
            -- Excluir categorías específicas
            AND c.id != '00000000-0000-0000-0000-000000000001'  -- Objetivo Sin Categoría
            AND c.id != '00000000-0000-0000-0000-000000000002'  -- Inversiones
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'name', name,
                'color', color,
                'icon', icon,
                'is_default', is_default,
                'is_system', is_system,
                'is_visible', is_visible
            )
        )
    INTO 
        v_result
    FROM 
        user_categories
    WHERE 
        is_visible = TRUE
    ORDER BY 
        name;
    
    -- Si no hay categorías, asegurar que exista al menos la categoría por defecto
    IF v_result IS NULL OR jsonb_array_length(v_result) = 0 THEN
        v_result := jsonb_build_array(
            jsonb_build_object(
                'id', '00000000-0000-0000-0000-000000000000',
                'name', 'Sin categoría',
                'color', '#9E9E9E',
                'icon', 'help-circle',
                'is_default', TRUE,
                'is_system', TRUE,
                'is_visible', TRUE
            )
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.get_transaction_categories(UUID) TO authenticated;

-- Crear vistas específicas para diferentes secciones de la aplicación
CREATE OR REPLACE VIEW public.transaction_categories AS
SELECT *
FROM public.categories
WHERE id != '00000000-0000-0000-0000-000000000001'  -- Objetivo Sin Categoría
  AND id != '00000000-0000-0000-0000-000000000002'; -- Inversiones

CREATE OR REPLACE VIEW public.investment_categories AS
SELECT *
FROM public.categories
WHERE id = '00000000-0000-0000-0000-000000000002'   -- Inversiones
   OR user_id IS NOT NULL;                          -- Categorías personalizadas

CREATE OR REPLACE VIEW public.goal_categories AS
SELECT *
FROM public.categories
WHERE id = '00000000-0000-0000-0000-000000000001'   -- Objetivo Sin Categoría
   OR id != '00000000-0000-0000-0000-000000000002'  -- Excluir Inversiones
   OR user_id IS NOT NULL;                          -- Categorías personalizadas

-- Categorías esenciales para presupuestos mensuales
-- Estas categorías son las recomendadas para un presupuesto básico mensual

-- Categoría: Alimentos
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000010'::uuid,
    NULL,
    'Alimentos',
    '#4CAF50',
    'shopping-cart',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Vivienda
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000011'::uuid,
    NULL,
    'Vivienda',
    '#2196F3',
    'home',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Transporte
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000012'::uuid,
    NULL,
    'Transporte',
    '#FF9800',
    'car',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Servicios
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000013'::uuid,
    NULL,
    'Servicios',
    '#9C27B0',
    'zap',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Salud
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000014'::uuid,
    NULL,
    'Salud',
    '#F44336',
    'heart',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Educación
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000015'::uuid,
    NULL,
    'Educación',
    '#673AB7',
    'book',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Ocio
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000016'::uuid,
    NULL,
    'Ocio',
    '#E91E63',
    'music',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Ahorro
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000017'::uuid,
    NULL,
    'Ahorro',
    '#00BCD4',
    'piggy-bank',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Categoría: Gastos varios
INSERT INTO public.categories (
    id,
    user_id,
    name,
    color,
    icon,
    is_default,
    is_system
)
VALUES (
    '00000000-0000-0000-0000-000000000018'::uuid,
    NULL,
    'Gastos varios',
    '#607D8B',
    'package',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Actualizar o crear vista para categorías de presupuesto
CREATE OR REPLACE VIEW public.budget_categories AS
SELECT *
FROM public.categories
WHERE id IN (
    '00000000-0000-0000-0000-000000000010', -- Alimentos
    '00000000-0000-0000-0000-000000000011', -- Vivienda
    '00000000-0000-0000-0000-000000000012', -- Transporte
    '00000000-0000-0000-0000-000000000013', -- Servicios
    '00000000-0000-0000-0000-000000000014', -- Salud
    '00000000-0000-0000-0000-000000000015', -- Educación
    '00000000-0000-0000-0000-000000000016', -- Ocio
    '00000000-0000-0000-0000-000000000017', -- Ahorro
    '00000000-0000-0000-0000-000000000018'  -- Gastos varios
) OR (
    user_id IS NOT NULL AND
    id != '00000000-0000-0000-0000-000000000001' AND -- Excluir Objetivo Sin Categoría
    id != '00000000-0000-0000-0000-000000000002'     -- Excluir Inversiones
);

-- Otorgar permisos para la vista
GRANT SELECT ON public.budget_categories TO authenticated;

-- Función para obtener categorías específicas para presupuestos
DROP FUNCTION IF EXISTS public.get_budget_categories;
CREATE OR REPLACE FUNCTION public.get_budget_categories(p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH user_categories AS (
        SELECT 
            c.id,
            c.name,
            c.color,
            c.icon,
            c.is_default,
            c.is_system,
            COALESCE(cv.is_visible, TRUE) AS is_visible
        FROM 
            public.categories c
        LEFT JOIN 
            public.category_visibility cv ON c.id = cv.category_id AND cv.user_id = p_user_id
        WHERE 
            (c.user_id = p_user_id OR c.user_id IS NULL) AND
            c.id IN (
                '00000000-0000-0000-0000-000000000010', -- Alimentos
                '00000000-0000-0000-0000-000000000011', -- Vivienda
                '00000000-0000-0000-0000-000000000012', -- Transporte
                '00000000-0000-0000-0000-000000000013', -- Servicios
                '00000000-0000-0000-0000-000000000014', -- Salud
                '00000000-0000-0000-0000-000000000015', -- Educación
                '00000000-0000-0000-0000-000000000016', -- Ocio
                '00000000-0000-0000-0000-000000000017', -- Ahorro
                '00000000-0000-0000-0000-000000000018'  -- Gastos varios
            )
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'name', name,
                'color', color,
                'icon', icon,
                'is_default', is_default,
                'is_system', is_system,
                'is_visible', is_visible
            )
        )
    INTO 
        v_result
    FROM 
        user_categories
    WHERE 
        is_visible = TRUE
    ORDER BY 
        name;
    
    -- Si no hay categorías, asegurar que exista al menos la categoría por defecto
    IF v_result IS NULL OR jsonb_array_length(v_result) = 0 THEN
        v_result := jsonb_build_array(
            jsonb_build_object(
                'id', '00000000-0000-0000-0000-000000000010',
                'name', 'Alimentos',
                'color', '#4CAF50',
                'icon', 'shopping-cart',
                'is_default', TRUE,
                'is_system', TRUE,
                'is_visible', TRUE
            ),
            jsonb_build_object(
                'id', '00000000-0000-0000-0000-000000000018',
                'name', 'Gastos varios',
                'color', '#607D8B',
                'icon', 'package',
                'is_default', TRUE,
                'is_system', TRUE,
                'is_visible', TRUE
            )
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION public.get_budget_categories(UUID) TO authenticated; 