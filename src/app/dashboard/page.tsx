"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  DollarSign, 
  CreditCard, 
  Clock, 
  Calendar, 
  Loader2,
  PieChart as PieChartIcon,
  CircleDollarSign,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/services/auth';
import { getTransactions, getTransactionsByCategory } from '@/services/transactions';
import { getGoals } from '@/services/goals';
import { getTotalInvestmentValue } from '@/services/investments';
import { format, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCategories } from '@/services/categories';
import { getBudgetSummary } from '@/services/budgets';

export default function Dashboard() {
  // Estado para transiciones
  const [showData, setShowData] = useState(false);
  
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingInvestments, setLoadingInvestments] = useState(true);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [inversiones, setInversiones] = useState(0);
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const router = useRouter();

  // Añadir estados para los nuevos componentes
  const [categoryExpenses, setCategoryExpenses] = useState<{name: string, amount: number, color: string}[]>([]);
  const [loadingCategoryExpenses, setLoadingCategoryExpenses] = useState(true);
  const [budgetRemaining, setBudgetRemaining] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [dailyBudget, setDailyBudget] = useState(0);
  const [loadingBudget, setLoadingBudget] = useState(true);

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          // Cargar datos en paralelo
          cargarTransacciones(user.id);
          cargarObjetivos(user.id);
          cargarInversiones(user.id);
          cargarGastosPorCategoria(user.id);
          cargarPresupuestoRestante(user.id);
        }
        // NOTA: El middleware ya maneja la redirección, no necesitamos verificar aquí
      } catch (error) {
        console.error('Error cargando usuario:', error);
        // El middleware ya maneja los casos de error de autenticación
      } finally {
        setLoadingUser(false);
        
        // Activar animación de entrada
        setTimeout(() => {
          setShowData(true);
        }, 100);
      }
    };
    
    cargarUsuario();
  }, [router]);

  const cargarTransacciones = async (userId: string) => {
    setLoadingTransactions(true);
    try {
      // Cargar transacciones
      const transaccionesData = await getTransactions(userId);
      setTransacciones(transaccionesData);
      
      // Calcular totales
      let totalIngresos = 0;
      let totalGastos = 0;
      
      transaccionesData.forEach((transaccion: any) => {
        if (transaccion.type === 'income') {
          totalIngresos += transaccion.amount;
        } else {
          totalGastos += transaccion.amount;
        }
      });
      
      setIngresos(totalIngresos);
      setGastos(totalGastos);
      setBalance(totalIngresos - totalGastos);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const cargarObjetivos = async (userId: string) => {
    setLoadingGoals(true);
    try {
      const objetivosData = await getGoals(userId);
      setObjetivos(objetivosData);
    } catch (error) {
      console.error('Error cargando objetivos:', error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const cargarInversiones = async (userId: string) => {
    setLoadingInvestments(true);
    try {
      const inversionesData = await getTotalInvestmentValue(userId);
      setInversiones(inversionesData.totalInARS);
    } catch (error) {
      console.error('Error cargando inversiones:', error);
      setInversiones(0);
    } finally {
      setLoadingInvestments(false);
    }
  };

  // Función para calcular días restantes del mes
  const calcularDiasRestantes = () => {
    const hoy = new Date();
    const ultimoDiaMes = endOfMonth(hoy);
    const diasRestantes = Math.ceil((ultimoDiaMes.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diasRestantes;
  };

  // Cargar gastos por categoría
  const cargarGastosPorCategoria = async (userId: string) => {
    setLoadingCategoryExpenses(true);
    try {
      // Ampliar el rango de fechas - usar los últimos 3 meses en lugar de solo el mes actual
      const hoy = new Date();
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(hoy.getMonth() - 3);
      
      // Formatear fechas para la consulta
      const fechaInicio = format(tresMesesAtras, 'yyyy-MM-dd');
      const fechaFin = format(hoy, 'yyyy-MM-dd');
      
      console.log(`Consultando transacciones por categoría desde ${fechaInicio} hasta ${fechaFin}`);
      
      // Obtener transacciones por categoría
      const transaccionesPorCategoria = await getTransactionsByCategory(userId, fechaInicio, fechaFin);
      
      console.log('Datos obtenidos:', transaccionesPorCategoria);
      
      // Agrupar gastos por categoría
      const gastosPorCategoria: Record<string, {amount: number, color: string}> = {};
      
      // Procesar los datos según su estructura real
      transaccionesPorCategoria.forEach(item => {
        // Verificar que tengamos una categoría y transacciones
        if (item.category && item.transactions && item.transactions.length > 0) {
          const nombreCategoria = item.category.name || 'Sin categoría';
          const colorCategoria = item.category.color || '#94a3b8'; // Color gris por defecto
          
          // Sumar el total de esta categoría
          const totalCategoria = item.total || 
            item.transactions.reduce((sum, tx) => 
              sum + (tx.type === 'expense' ? tx.amount : 0), 0);
          
          if (totalCategoria > 0) {
            console.log(`Categoría: ${nombreCategoria}, Total: ${totalCategoria}, Color: ${colorCategoria}`);
            
            gastosPorCategoria[nombreCategoria] = { 
              amount: totalCategoria, 
              color: colorCategoria 
            };
          }
        }
      });
      
      // Convertir a array y ordenar por monto
      const arrayGastosPorCategoria = Object.entries(gastosPorCategoria)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          color: data.color
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6); // Mostrar solo las 6 categorías con más gastos
      
      console.log('Array final:', arrayGastosPorCategoria);
      setCategoryExpenses(arrayGastosPorCategoria);
      
    } catch (error) {
      console.error('Error cargando gastos por categoría:', error);
      setCategoryExpenses([]);
    } finally {
      setLoadingCategoryExpenses(false);
    }
  };

  // Cargar presupuesto restante
  const cargarPresupuestoRestante = async (userId: string) => {
    setLoadingBudget(true);
    try {
      // Obtener el mes actual en formato YYYY-MM
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      const budgetData = await getBudgetSummary(userId, currentMonth);
      
      if (budgetData && Array.isArray(budgetData) && budgetData.length > 0) {
        // Calcular totales del array de presupuestos
        const totalBudget = budgetData.reduce((sum, budget) => sum + (budget.amount || 0), 0);
        const totalSpent = budgetData.reduce((sum, budget) => sum + (budget.spent || 0), 0);
        const remaining = totalBudget - totalSpent;
        
        setTotalBudget(totalBudget);
        setBudgetRemaining(remaining);
        
        // Calcular días restantes y presupuesto diario
        const diasRestantes = calcularDiasRestantes();
        setDaysRemaining(diasRestantes);
        
        const presupuestoDiario = diasRestantes > 0 && remaining > 0 ? remaining / diasRestantes : 0;
        setDailyBudget(presupuestoDiario);
      } else {
        // Si no hay presupuestos configurados
        setTotalBudget(0);
        setBudgetRemaining(0);
        setDaysRemaining(calcularDiasRestantes());
        setDailyBudget(0);
      }
      
    } catch (error) {
      console.error('Error cargando presupuesto:', error);
      setTotalBudget(0);
      setBudgetRemaining(0);
      setDaysRemaining(0);
      setDailyBudget(0);
    } finally {
      setLoadingBudget(false);
    }
  };

  const formatearMonto = (monto: number) => {
    // Validar que el monto sea un número válido
    if (typeof monto !== 'number' || isNaN(monto)) {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(0);
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = new Date(fechaStr);
      return format(fecha, "dd 'de' MMMM", { locale: es });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return fechaStr;
    }
  };

  // Componente Skeleton personalizado para texto
  const TextSkeleton = ({ width = 'w-24', color = 'blue' }: { width?: string, color?: string }) => {
    const colorClasses = {
      blue: 'bg-blue-200 animate-pulse',
      red: 'bg-red-200 animate-pulse',
      green: 'bg-green-200 animate-pulse',
      purple: 'bg-purple-200 animate-pulse',
      gray: 'bg-gray-200 animate-pulse'
    };
    
    return (
      <div className={`h-6 ${width} ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray} rounded`}></div>
    );
  };

  // Componente Skeleton para números grandes
  const NumberSkeleton = ({ color = 'blue' }: { color?: string }) => {
    const colorClasses = {
      blue: 'bg-blue-200 animate-pulse',
      red: 'bg-red-200 animate-pulse',
      green: 'bg-green-200 animate-pulse',
      purple: 'bg-purple-200 animate-pulse',
      gray: 'bg-gray-200 animate-pulse'
    };
    
    return (
      <div className={`h-8 w-32 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray} rounded`}></div>
    );
  };

  const PieChart = ({ data }: { data: {name: string, amount: number, color: string}[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">No hay datos para mostrar</p>
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    
    let currentAngle = 0;
    const radius = 60;
    const centerX = 70;
    const centerY = 70;

    return (
      <div className="flex flex-col items-center">
        <svg width="140" height="140" className="mb-4">
          {data.map((item, index) => {
            const percentage = (item.amount / total) * 100;
            const angle = (percentage / 100) * 360;
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            currentAngle += angle;

            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
        </svg>
        
        <div className="space-y-2 w-full">
          {data.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-white dark:text-white truncate">{item.name}</span>
              </div>
              <span className="font-medium text-white dark:text-white">
                {formatearMonto(item.amount)}
              </span>
            </div>
          ))}
          {data.length > 4 && (
            <div className="text-xs text-gray-300 dark:text-gray-300 text-center pt-2">
              +{data.length - 4} categorías más
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con animación */}
      <div className={`transform transition-all duration-1000 ${showData ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white dark:text-white">Dashboard</h1>
            <p className="text-gray-300 dark:text-gray-300 mt-1">
              Bienvenido de vuelta. Aquí tienes un resumen de tus finanzas.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/transacciones">
              <Button className="flex items-center gap-2">
                <PlusCircle size={16} />
                Nueva Transacción
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cards principales con animaciones */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transform transition-all duration-1000 delay-200 ${showData ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 hover:shadow-xl hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Balance Total
            </CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Wallet className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {loadingTransactions ? (
                <NumberSkeleton color="blue" />
              ) : (
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatearMonto(balance)}
                </div>
              )}
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Actualizado hoy
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 hover:shadow-xl hover:shadow-green-100/50 dark:hover:shadow-green-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Ingresos
            </CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {loadingTransactions ? (
                <NumberSkeleton color="green" />
              ) : (
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatearMonto(ingresos)}
                </div>
              )}
              <p className="text-xs text-green-600 dark:text-green-400">
                Acumulado total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700 hover:shadow-xl hover:shadow-red-100/50 dark:hover:shadow-red-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Gastos
            </CardTitle>
            <div className="p-2 bg-red-500 rounded-lg">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {loadingTransactions ? (
                <NumberSkeleton color="red" />
              ) : (
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {formatearMonto(gastos)}
                </div>
              )}
              <p className="text-xs text-red-600 dark:text-red-400">
                Acumulado total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 hover:shadow-xl hover:shadow-purple-100/50 dark:hover:shadow-purple-900/20 transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Inversiones
            </CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <CircleDollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {loadingInvestments ? (
                <NumberSkeleton color="purple" />
              ) : (
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatearMonto(inversiones)}
                </div>
              )}
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Valor actual
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de análisis y gráficos */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transform transition-all duration-1000 delay-400 ${showData ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        
        {/* Gastos por Categoría */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-700 hover:shadow-xl hover:shadow-orange-100/50 dark:hover:shadow-orange-900/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <div className="p-1.5 bg-orange-500 rounded-lg">
                <PieChartIcon className="h-4 w-4 text-white" />
              </div>
              Gastos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCategoryExpenses ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                      <TextSkeleton width="w-20" />
                    </div>
                    <TextSkeleton width="w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <PieChart data={categoryExpenses} />
            )}
          </CardContent>
        </Card>

        {/* Presupuesto Restante */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-700 hover:shadow-xl hover:shadow-cyan-100/50 dark:hover:shadow-cyan-900/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
              <div className="p-1.5 bg-cyan-500 rounded-lg">
                <Target className="h-4 w-4 text-white" />
              </div>
              Presupuesto del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBudget ? (
              <div className="space-y-4">
                <NumberSkeleton color="blue" />
                <div className="space-y-2">
                  <TextSkeleton width="w-32" />
                  <div className="w-full h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <TextSkeleton width="w-28" />
                  <TextSkeleton width="w-24" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatearMonto(budgetRemaining)}
                  </div>
                  <p className="text-sm text-gray-300 dark:text-gray-300">restante este mes</p>
                </div>
                
                {totalBudget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white dark:text-white">
                      <span>Progreso</span>
                      <span>{Math.round(((totalBudget - budgetRemaining) / totalBudget) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(((totalBudget - budgetRemaining) / totalBudget) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white dark:text-white">
                      {daysRemaining}
                    </div>
                    <p className="text-xs text-gray-300 dark:text-gray-300">días restantes</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-400 dark:text-green-400">
                      {formatearMonto(dailyBudget)}
                    </div>
                    <p className="text-xs text-gray-300 dark:text-gray-300">por día</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-700 hover:shadow-xl hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <div className="p-1.5 bg-emerald-500 rounded-lg">
                <Target className="h-4 w-4 text-white" />
              </div>
              Objetivos Financieros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <TextSkeleton width="w-24" />
                      <TextSkeleton width="w-16" />
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : objetivos.length > 0 ? (
              <div className="space-y-4">
                {objetivos.slice(0, 3).map((objetivo, index) => {
                  const progreso = (objetivo.current_amount / objetivo.target_amount) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white dark:text-white truncate">{objetivo.name}</span>
                        <span className="text-xs text-gray-300 dark:text-gray-300">
                          {Math.round(progreso)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progreso, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-300 dark:text-gray-300">
                        <span>{formatearMonto(objetivo.current_amount)}</span>
                        <span>{formatearMonto(objetivo.target_amount)}</span>
                      </div>
                    </div>
                  );
                })}
                {objetivos.length > 3 && (
                  <Link href="/objetivos" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver todos ({objetivos.length})
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-white dark:text-white mb-2">Sin objetivos</h3>
                <p className="text-sm text-gray-300 dark:text-gray-300 mb-4">
                  Define tus metas financieras para trackear tu progreso
                </p>
                <Link href="/objetivos">
                  <Button size="sm">
                    Crear objetivo
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transacciones recientes */}
      <div className={`transform transition-all duration-1000 delay-600 ${showData ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-slate-900/20 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <div className="p-1.5 bg-gray-700 rounded-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                Transacciones Recientes
              </CardTitle>
              <Link href="/transacciones">
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="space-y-2">
                        <TextSkeleton width="w-32" />
                        <TextSkeleton width="w-24" />
                      </div>
                    </div>
                    <TextSkeleton width="w-20" />
                  </div>
                ))}
              </div>
            ) : transacciones.length > 0 ? (
              <div className="space-y-4">
                {transacciones.slice(0, 5).map((transaccion, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaccion.type === 'income' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaccion.type === 'income' ? (
                          <TrendingUp size={20} />
                        ) : (
                          <TrendingDown size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white dark:text-white">
                          {transaccion.description || 'Sin descripción'}
                        </div>
                        <div className="text-sm text-gray-300 dark:text-gray-300">
                          {formatearFecha(transaccion.date)}
                        </div>
                      </div>
                    </div>
                    <div className={`text-right ${
                      transaccion.type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      <div className="font-bold">
                        {transaccion.type === 'income' ? '+' : '-'}{formatearMonto(transaccion.amount)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-400">
                        {transaccion.category?.name || 'Sin categoría'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-white dark:text-white mb-2">No hay transacciones</h3>
                <p className="text-gray-300 dark:text-gray-300 mb-4">
                  Comienza registrando tu primera transacción
                </p>
                <Link href="/transacciones">
                  <Button>
                    <PlusCircle size={16} className="mr-2" />
                    Agregar transacción
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 