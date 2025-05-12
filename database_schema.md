# Esquema de Base de Datos de FinanzApp

Este documento describe el esquema completo de la base de datos de FinanzApp, incluyendo sus tablas, relaciones y funciones principales.

## Tablas Principales

### Categorías

```
categories
```

Esta tabla almacena las categorías que los usuarios pueden asignar a sus transacciones, gastos fijos, presupuestos y objetivos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la categoría |
| user_id | UUID | ID del usuario propietario (NULL para categorías del sistema) |
| name | TEXT | Nombre de la categoría |
| color | TEXT | Color en formato hexadecimal para representar visualmente la categoría |
| icon | TEXT | Nombre del icono de la categoría |
| is_default | BOOLEAN | Indica si es una categoría predeterminada |
| is_system | BOOLEAN | Indica si es una categoría del sistema |
| created_at | TIMESTAMPTZ | Fecha de creación |

La aplicación maneja dos tipos de categorías:
1. **Categorías del sistema**: Predefinidas y disponibles para todos los usuarios
2. **Categorías personalizadas**: Creadas por los usuarios para su uso exclusivo

Existe una vista `all_categories` que combina ambos tipos de categorías y asegura que siempre haya una categoría predeterminada disponible.

Para mejorar la experiencia del usuario, la aplicación utiliza categorías específicas para cada sección:

- **Categoría general** (ID: `00000000-0000-0000-0000-000000000000`): Para elementos sin categoría específica
- **Categoría para objetivos** (ID: `00000000-0000-0000-0000-000000000001`): Para objetivos sin una categoría asignada
- **Categoría para inversiones** (ID: `00000000-0000-0000-0000-000000000002`): Para inversiones sin una categoría específica

Las vistas y funciones adicionales aseguran que cada sección muestre solo las categorías relevantes:

- `transaction_categories`: Categorías para la sección de transacciones
- `investment_categories`: Categorías específicas para inversiones
- `goal_categories`: Categorías para objetivos de ahorro
- `get_transaction_categories()`: Función SQL que devuelve categorías filtradas para transacciones

### Transacciones

```
transactions
```

Almacena las transacciones financieras de los usuarios (ingresos y gastos).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la transacción |
| user_id | UUID | ID del usuario propietario |
| type | TEXT | Tipo de transacción ('income' o 'expense') |
| amount | DECIMAL | Monto de la transacción |
| category_id | UUID | Referencia a la categoría |
| date | DATE | Fecha de la transacción |
| description | TEXT | Descripción opcional |
| is_budgetable | BOOLEAN | Indica si la transacción debe incluirse en cálculos de presupuesto |
| created_at | TIMESTAMPTZ | Fecha de creación en el sistema |

### Gastos Fijos

```
fixed_expenses
```

Almacena los gastos recurrentes que el usuario debe pagar con regularidad.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único del gasto fijo |
| user_id | UUID | ID del usuario propietario |
| name | TEXT | Nombre del gasto fijo |
| amount | DECIMAL | Monto del gasto |
| category_id | UUID | Referencia a la categoría |
| frequency | TEXT | Frecuencia ('monthly', 'weekly', 'biweekly') |
| due_date | INTEGER | Día de vencimiento |
| active | BOOLEAN | Indica si el gasto está activo |
| description | TEXT | Descripción opcional |
| total_installments | INTEGER | Número total de cuotas (NULL si no es en cuotas) |
| paid_installments | INTEGER | Número de cuotas pagadas |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Tareas Financieras

```
financial_tasks
```

Almacena las tareas financieras que el usuario debe realizar, incluyendo pagos de gastos fijos y contribuciones a objetivos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la tarea |
| user_id | UUID | ID del usuario propietario |
| fixed_expense_id | UUID | Referencia al gasto fijo (si aplica) |
| title | TEXT | Título de la tarea |
| amount | DECIMAL | Monto a pagar |
| due_date | DATE | Fecha de vencimiento |
| completed | BOOLEAN | Indica si la tarea está completada |
| completed_date | TIMESTAMPTZ | Fecha de completado |
| description | TEXT | Descripción de la tarea |
| is_installment | BOOLEAN | Indica si es una cuota |
| installment_number | INTEGER | Número de cuota (si aplica) |
| type | TEXT | Tipo de tarea ('expense', 'goal_contribution') |
| reference_id | TEXT | ID de referencia (para objetivos) |
| category_id | UUID | Referencia a la categoría |
| priority | TEXT | Prioridad ('low', 'medium', 'high') |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Presupuestos

```
budgets
```

Almacena los presupuestos mensuales asignados a cada categoría.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único del presupuesto |
| user_id | UUID | ID del usuario propietario |
| category_id | UUID | Referencia a la categoría |
| amount | DECIMAL | Monto asignado |
| percentage | DECIMAL | Porcentaje del presupuesto total |
| month | TEXT | Mes en formato YYYY-MM |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Configuración del Método de Presupuesto

```
budget_method_configuration
```

Almacena la configuración del método que utiliza el usuario para definir su presupuesto total.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | ID del usuario propietario |
| budget_type | TEXT | Tipo de presupuesto ('salary', 'all_income', 'manual', 'salary_plus_selected') |
| salary_amount | DECIMAL | Monto del salario (si aplica) |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

### Inclusión de Ingresos en Presupuesto

```
budget_income_inclusions
```

Permite a los usuarios seleccionar qué ingresos específicos incluir en su presupuesto mensual.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | ID del usuario propietario |
| transaction_id | UUID | Referencia a la transacción |
| month | TEXT | Mes en formato YYYY-MM |
| is_included | BOOLEAN | Indica si está incluido |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Totales Mensuales de Presupuesto

```
budget_monthly_totals
```

Almacena los totales calculados de presupuesto para cada mes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| user_id | UUID | ID del usuario propietario |
| month | TEXT | Mes en formato YYYY-MM |
| total_amount | DECIMAL | Monto total del presupuesto |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

### Objetivos de Ahorro

```
goals
```

Almacena los objetivos financieros del usuario, como ahorrar para un viaje o comprar un auto.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único del objetivo |
| user_id | UUID | ID del usuario propietario |
| name | TEXT | Nombre del objetivo |
| description | TEXT | Descripción del objetivo |
| target_amount | DECIMAL | Monto objetivo a alcanzar |
| current_amount | DECIMAL | Monto actual ahorrado |
| target_date | DATE | Fecha objetivo para completarlo |
| category_id | UUID | Referencia a la categoría |
| is_budget_contribution | BOOLEAN | Indica si tiene contribución automática |
| budget_monthly_amount | DECIMAL | Monto mensual a contribuir |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

### Contribuciones a Objetivos

```
goal_contributions
```

Registra el historial de contribuciones realizadas a cada objetivo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la contribución |
| goal_id | UUID | Referencia al objetivo |
| user_id | UUID | ID del usuario propietario |
| amount | DECIMAL | Monto de la contribución |
| contribution_date | TIMESTAMPTZ | Fecha de la contribución |
| description | TEXT | Descripción opcional |
| from_financial_task | BOOLEAN | Indica si viene de una tarea financiera |
| financial_task_id | UUID | Referencia a la tarea financiera (si aplica) |

### Inversiones

```
investments
```

Almacena las inversiones realizadas por los usuarios en diferentes instrumentos financieros.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la inversión |
| user_id | UUID | ID del usuario propietario |
| asset_name | TEXT | Nombre del activo |
| quantity | DECIMAL | Cantidad de unidades |
| purchase_price | DECIMAL | Precio de compra por unidad |
| purchase_date | DATE | Fecha de compra |
| currency | TEXT | Moneda ('ARS' o 'USD') |
| exchange_rate | DECIMAL | Tipo de cambio aplicado (para moneda extranjera) |
| asset_type | TEXT | Tipo de activo ('CEDEAR', 'Acción', 'Bono', 'Otro') |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Tipos de Cambio

```
exchange_rates
```

Almacena los tipos de cambio diarios para diferentes cotizaciones del dólar.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| date | DATE | Fecha de la cotización |
| oficial_rate | DECIMAL | Cotización del dólar oficial |
| blue_rate | DECIMAL | Cotización del dólar blue |
| mep_rate | DECIMAL | Cotización del dólar MEP |
| created_at | TIMESTAMPTZ | Fecha de creación |

### Vinculación de Inversiones con Presupuestos

```
investment_budget_links
```

Establece la vinculación entre categorías de presupuesto y monto mensual a invertir.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la vinculación |
| user_id | UUID | ID del usuario propietario |
| category_id | UUID | Referencia a la categoría de presupuesto |
| monthly_amount | DECIMAL | Monto mensual a invertir |
| is_active | BOOLEAN | Indica si la vinculación está activa |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

### Contribuciones a Inversiones

```
investment_contributions
```

Registra el historial de contribuciones realizadas a inversiones vinculadas con presupuestos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único de la contribución |
| user_id | UUID | ID del usuario propietario |
| link_id | UUID | Referencia a la vinculación de presupuesto |
| investment_id | UUID | Referencia a la inversión (si aplica) |
| amount | DECIMAL | Monto de la contribución |
| contribution_date | TIMESTAMPTZ | Fecha de la contribución |
| description | TEXT | Descripción opcional |
| created_at | TIMESTAMPTZ | Fecha de creación |

## Funciones Principales

### Gestión de Categorías

- `get_safe_categories`: Obtiene categorías de forma segura, incluyendo una categoría por defecto si no existe.
- `get_goal_category`: Obtiene una categoría adecuada para objetivos, asegurando siempre un valor.

### Gestión de Transacciones

- `create_transaction`: Crea una nueva transacción y devuelve detalles completos incluyendo la categoría.

### Gestión de Presupuestos

- `calculate_monthly_budget_total`: Calcula el presupuesto total mensual según el método configurado. Considera únicamente transacciones de tipo 'income' con el campo is_budgetable establecido como true. Soporta cuatro métodos de cálculo:
  - 'salary': Utiliza el monto del salario definido en la configuración
  - 'all_income': Suma todos los ingresos del mes marcados como presupuestables
  - 'salary_plus_selected': Combina el salario con ingresos adicionales seleccionados específicamente para el presupuesto
  - 'manual': Permite establecer manualmente el presupuesto total
- `get_budget_summary`: Obtiene un resumen completo de los presupuestos del mes, incluyendo montos asignados, gastos realizados y porcentajes de progreso. Implementa verificación de existencia de tablas y garantiza siempre devolver un array JSON.
- `get_budget_transactions`: Obtiene transacciones relevantes para el presupuesto del mes con manejo optimizado de categorías. Incluye verificación de tablas y manejo robusto de tipos JSON.
- `get_budget_categories`: Proporciona categorías específicas recomendadas para presupuestos mensuales, como Alimentos, Vivienda, Transporte, etc. Este conjunto de categorías ayuda a crear presupuestos iniciales más relevantes para los usuarios.

### Gestión de Gastos Fijos

- `update_fixed_expense_installments`: Actualiza el progreso de cuotas de un gasto fijo.
- `generate_tasks_from_fixed_expenses`: Genera tareas financieras a partir de gastos fijos.

### Gestión de Tareas Financieras

- `mark_task_as_paid`: Marca una tarea como pagada y actualiza cuotas si es necesario.

### Gestión de Objetivos

- `contribute_to_goal`: Registra una contribución a un objetivo y actualiza su progreso.
- `generate_tasks_from_goals`: Genera tareas financieras mensuales para contribuir a objetivos.
- `complete_goal_task`: Completa una tarea de contribución y actualiza el objetivo automáticamente.

### Gestión de Inversiones

- `get_latest_exchange_rates`: Obtiene las cotizaciones más recientes de los tipos de cambio.
- `get_total_investment_value`: Calcula el valor total de las inversiones de un usuario.

### Gestión de Inversiones con Presupuestos

- `get_remaining_investment_amount`: Calcula el monto restante a invertir según las vinculaciones activas del usuario.
- `add_investment_contribution`: Registra una contribución a una inversión vinculada con el presupuesto.

## Relaciones entre Tablas

### Categorías
- Las categorías están relacionadas con transacciones, gastos fijos, presupuestos y objetivos, permitiendo organizar todas las finanzas por categoría.

### Gastos Fijos y Tareas Financieras
- Cada gasto fijo puede generar tareas financieras, que representan los pagos a realizar.
- El sistema maneja automáticamente el seguimiento de cuotas.

### Presupuestos y Transacciones
- Las transacciones se contabilizan contra los presupuestos de sus respectivas categorías.
- El sistema permite varios métodos para calcular el presupuesto total (salario, todos los ingresos, selección manual).

### Objetivos y Tareas Financieras
- Los objetivos pueden configurarse para generar tareas mensuales automáticas.
- Cuando se completa una tarea financiera vinculada a un objetivo, automáticamente se registra una contribución al objetivo.

### Inversiones y Presupuestos
- Las categorías de presupuesto pueden vincularse con montos mensuales para inversiones.
- El sistema lleva un registro de las contribuciones realizadas para inversiones, permitiendo visualizar el monto restante a invertir del mes.

## Seguridad de Datos

Todas las tablas utilizan políticas de Row Level Security (RLS) para garantizar que:
1. Los usuarios solo pueden ver y modificar sus propios datos.
2. No es posible acceder a datos de otros usuarios, incluso con acceso a la API.

## Robustez y Manejo de Errores

El esquema implementa varias estrategias para garantizar la robustez del sistema:

1. **Verificación de existencia de tablas**: Las funciones principales como `get_budget_summary` y `get_budget_transactions` verifican la existencia de las tablas antes de intentar acceder a ellas, evitando errores cuando la base de datos está en construcción o migración.

2. **Valores por defecto seguros**: Todas las funciones que devuelven datos JSON utilizan `COALESCE` para garantizar que siempre se devuelva un array vacío (`[]`) en lugar de NULL cuando no hay datos, evitando errores en el frontend.

3. **Manejo de categorías**: Se implementan mecanismos como `get_safe_categories` para garantizar que siempre se proporcione información de categoría, incluso si la categoría original ha sido eliminada.

## Mantenimiento y Auditoría

- La mayoría de las tablas incluyen campos `created_at` y algunos también `updated_at`.
- El campo `updated_at` se actualiza automáticamente mediante triggers cuando se modifica un registro.
- Las operaciones importantes se registran en tablas de historial, como `goal_contributions`.

La aplicación maneja diferentes tipos de categorías especializadas:
1. **Categorías del sistema**: Predefinidas y disponibles para todos los usuarios
2. **Categorías personalizadas**: Creadas por los usuarios para su uso exclusivo
3. **Categorías para presupuestos**: Conjunto específico de categorías recomendadas para presupuestos mensuales

Categorías predefinidas especiales:
- **Categoría general** (ID: `00000000-0000-0000-0000-000000000000`): Para elementos sin categoría específica
- **Categoría para objetivos** (ID: `00000000-0000-0000-0000-000000000001`): Para objetivos sin una categoría asignada
- **Categoría para inversiones** (ID: `00000000-0000-0000-0000-000000000002`): Para inversiones sin una categoría específica
- **Categorías para presupuestos** (IDs del `00000000-0000-0000-0000-000000000010` al `00000000-0000-0000-0000-000000000018`): Conjunto de 9 categorías esenciales para presupuestos mensuales (Alimentos, Vivienda, Transporte, etc.)

Existe una vista `all_categories` que combina todos los tipos de categorías y asegura que siempre haya categorías predeterminadas disponibles. También se proporciona una vista `budget_categories` específica para presupuestos. 