# FinanzApp

Aplicación de gestión de finanzas personales construida con Next.js y Supabase.

## Configuración del proyecto

1. Clona el repositorio
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   - Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
   SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
   ```

   > **IMPORTANTE**: Nunca compartas tu `SUPABASE_SERVICE_ROLE_KEY`, esta clave debe mantenerse privada y solo se usa en el servidor.

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del proyecto

- `/src/app`: Páginas y rutas de la aplicación
- `/src/components`: Componentes reutilizables
- `/src/services`: Servicios para interactuar con la API de Supabase
- `/src/lib`: Utilidades y configuración
- `/src/types`: Definiciones de tipos TypeScript

## Funcionalidades

- Gestión de transacciones (ingresos y gastos)
- Presupuestos mensuales
- Gestión de metas financieras
- Seguimiento de inversiones
- Informes y estadísticas

## Configuración del Service Role Key

Para obtener tu `SUPABASE_SERVICE_ROLE_KEY`:

1. Ve al panel de control de Supabase
2. Haz clic en el icono de configuración (⚙️) en la barra lateral
3. Selecciona "API"
4. En la sección "Project API keys", copia el valor de "service_role key"
5. Añádelo a tu archivo `.env.local`

Esta clave se utiliza para operaciones administrativas como la creación de transacciones sin pasar por las políticas RLS.

## Estructura de Base de Datos

La aplicación utiliza Supabase como base de datos. Para configurar la base de datos, sigue estos pasos:

1. Crea una cuenta en [Supabase](https://supabase.com/) si aún no tienes una.
2. Crea un nuevo proyecto.
3. En el Editor SQL de Supabase, ejecuta el archivo `schema.sql` disponible en este repositorio.

### Tablas Principales

- **categories**: Almacena las categorías para ingresos y gastos
- **transactions**: Registro de transacciones (ingresos y gastos)
- **fixed_expenses**: Gastos fijos recurrentes, con soporte para cuotas
- **budgets**: Presupuestos por categoría
- **financial_tasks**: Tareas financieras derivadas de gastos fijos, con soporte para cuotas
- **budget_method_configuration**: Configuración del método de presupuesto
- **budget_goal_links**: Vinculación entre presupuestos y objetivos financieros, permitiendo contribuciones automáticas

### Funciones SQL

- **get_safe_categories**: Obtiene categorías con manejo seguro de valores nulos o inexistentes
- **create_transaction**: Crea una transacción y devuelve el objeto completo con datos de categoría
- **calculate_monthly_budget_total**: Calcula el total del presupuesto mensual según la configuración
- **get_budget_transactions**: Obtiene transacciones incluidas en un presupuesto mensual
- **update_fixed_expense_installments**: Actualiza el progreso de cuotas de un gasto fijo
- **generate_tasks_from_fixed_expenses**: Genera tareas financieras a partir de gastos fijos
- **mark_task_as_paid**: Marca una tarea como pagada y actualiza cuotas si es necesario
- **process_budget_goal_contributions**: Procesa las contribuciones automáticas a objetivos desde los presupuestos

### Restaurar la Base de Datos

Si necesitas recrear la base de datos desde cero:

1. Accede al Editor SQL de Supabase
2. Ejecuta el archivo `schema.sql`
3. Reinicia la aplicación para que se reconecte con la nueva estructura

### Gastos Fijos con Cuotas

Los gastos fijos ahora pueden configurarse con un número total de cuotas y llevar un seguimiento de las cuotas pagadas:

- `total_installments`: Número total de cuotas (NULL si no es en cuotas)
- `paid_installments`: Número de cuotas ya pagadas

Cuando una tarea financiera asociada a un gasto fijo en cuotas se marca como pagada, automáticamente se incrementa el contador de cuotas pagadas.

### Tareas Financieras

Las tareas financieras ahora incluyen un campo de descripción en lugar de comentarios separados, y tienen soporte para cuotas:

- `description`: Descripción simple de la tarea
- `is_installment`: Indica si la tarea corresponde a una cuota
- `installment_number`: Número de cuota (si aplica)

### Vinculación de Presupuestos y Objetivos

La aplicación permite vincular objetivos financieros con categorías de presupuesto, facilitando contribuciones automáticas:

- Los gastos fijos se descuentan automáticamente del presupuesto disponible en sus categorías
- Las contribuciones a objetivos se pueden vincular a categorías específicas del presupuesto
- El presupuesto disponible muestra claramente las deducciones por gastos fijos y contribuciones a objetivos
- La funcionalidad `process_budget_goal_contributions` procesa contribuciones automáticas mensuales

Para configurar esta funcionalidad:

1. Crea objetivos financieros en la sección de Objetivos
2. En la sección de Presupuesto, vincula objetivos a categorías específicas
3. Define el monto de contribución mensual para cada objetivo
4. Las deducciones se aplicarán automáticamente al presupuesto disponible

## Configuración del Entorno

Para configurar el entorno de desarrollo:

1. Clona este repositorio
2. Instala las dependencias con `npm install`
3. Crea un archivo `.env.local` con las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-de-supabase
```

4. Ejecuta `npm run dev` para iniciar el servidor de desarrollo

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
