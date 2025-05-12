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
  PieChart,
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

export default function Home() {
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
      } catch (error) {
        console.error('Error cargando usuario:', error);
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
        .slice(0, 5); // Tomar solo las 5 principales
      
      console.log('Categorías procesadas:', arrayGastosPorCategoria);
      
      setCategoryExpenses(arrayGastosPorCategoria);
      } catch (error) {
      console.error('Error cargando gastos por categoría:', error);
      } finally {
      setLoadingCategoryExpenses(false);
      }
    };
    
  // Cargar presupuesto restante
  const cargarPresupuestoRestante = async (userId: string) => {
    setLoadingBudget(true);
    try {
      const mesActual = format(new Date(), 'yyyy-MM');
      
      // Obtener presupuestos
      const resumenPresupuesto = await getBudgetSummary(userId, mesActual);
      
      // Calcular presupuesto total
      const presupuestoTotal = resumenPresupuesto.reduce((sum, item) => {
        return sum + (item.amount || 0);
      }, 0);
      
      // Calcular gastos totales actuales
      const totalGastado = gastos;
      
      // Calcular presupuesto restante
      const restante = Math.max(0, presupuestoTotal - totalGastado);
      
      // Calcular días restantes en el mes
      const diasRestantes = calcularDiasRestantes();
      
      // Calcular presupuesto diario recomendado
      const presupuestoDiario = diasRestantes > 0 ? restante / diasRestantes : 0;
      
      setTotalBudget(presupuestoTotal);
      setBudgetRemaining(restante);
      setDaysRemaining(diasRestantes);
      setDailyBudget(presupuestoDiario);
    } catch (error) {
      console.error('Error cargando presupuesto restante:', error);
    } finally {
      setLoadingBudget(false);
    }
  };

  // Formatear montos para mostrar
  const formatearMonto = (monto: number) => {
    return monto.toLocaleString('es-AR');
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    try {
      return format(new Date(fechaStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return fechaStr;
    }
  };

  // Filtrar para mostrar solo las transacciones más recientes
  const transaccionesRecientes = transacciones
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
    
  // Componente de esqueleto de texto con efecto de brillo
  const TextSkeleton = ({ width = 'w-24', color = 'blue' }: { width?: string, color?: string }) => {
    let gradientClasses = "bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 dark:from-blue-900/20 dark:via-blue-800/30 dark:to-blue-900/20";
    
    if (color === 'green') {
      gradientClasses = "bg-gradient-to-r from-green-100 via-green-200 to-green-100 dark:from-green-900/20 dark:via-green-800/30 dark:to-green-900/20";
    } else if (color === 'amber') {
      gradientClasses = "bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-amber-900/20 dark:via-amber-800/30 dark:to-amber-900/20";
    } else if (color === 'red') {
      gradientClasses = "bg-gradient-to-r from-red-100 via-red-200 to-red-100 dark:from-red-900/20 dark:via-red-800/30 dark:to-red-900/20";
    } else if (color === 'purple') {
      gradientClasses = "bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 dark:from-purple-900/20 dark:via-purple-800/30 dark:to-purple-900/20";
    }
    
    return (
      <div className={`relative overflow-hidden h-5 rounded-md ${width}`}>
        <div className={`absolute inset-0 ${gradientClasses} animate-pulse`}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
      </div>
    );
  };
  
  // Componente de esqueleto de número con efecto de brillo
  const NumberSkeleton = ({ color = 'blue' }: { color?: string }) => {
    let gradientClasses = "bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 dark:from-blue-900/20 dark:via-blue-800/30 dark:to-blue-900/20";
    
    if (color === 'green') {
      gradientClasses = "bg-gradient-to-r from-green-100 via-green-200 to-green-100 dark:from-green-900/20 dark:via-green-800/30 dark:to-green-900/20";
    } else if (color === 'red') {
      gradientClasses = "bg-gradient-to-r from-red-100 via-red-200 to-red-100 dark:from-red-900/20 dark:via-red-800/30 dark:to-red-900/20";
    } else if (color === 'purple') {
      gradientClasses = "bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 dark:from-purple-900/20 dark:via-purple-800/30 dark:to-purple-900/20";
    }
    
    return (
      <div className="relative overflow-hidden h-8 rounded-md w-32">
        <div className={`absolute inset-0 ${gradientClasses} animate-pulse`}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
      </div>
    );
  };
  
  // Animación de brillo para esqueletos
  useEffect(() => {
    // Añadir la animación al CSS global
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .card-animation {
        animation: fadeIn 0.5s ease forwards;
      }
      
      .card-animation-delay-1 {
        animation-delay: 0.1s;
      }
      
      .card-animation-delay-2 {
        animation-delay: 0.2s;
      }
      
      .card-animation-delay-3 {
        animation-delay: 0.3s;
      }
      
      .card-animation-delay-4 {
        animation-delay: 0.4s;
      }
      
      .hover-card {
        transition: all 0.2s ease;
      }
      
      .hover-card:hover {
        transform: translateY(-3px);
      }
      
      .transition-all-slow {
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Cargando FinanzApp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">¡Bienvenido a FinanzApp!</h1>
            <Link href="/transacciones">
          <Button className="flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md transition-all duration-300 hover:shadow-lg">
                <PlusCircle className="mr-2" size={18} />
                Nueva Transacción
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card Balance */}
        <Card className={`border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 hover-card ${showData ? 'card-animation card-animation-delay-1' : 'opacity-0'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance</p>
                {loadingTransactions ? (
                  <div className="mt-1"><NumberSkeleton color="blue" /></div>
                ) : (
                  <h3 className="text-2xl font-bold mt-1 transition-all-slow">${formatearMonto(balance)}</h3>
                )}
                  </div>
              <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900/50 shadow-inner">
                    <Wallet size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                {loadingTransactions ? (
                  <div className="flex items-center">
                    <Loader2 size={12} className="mr-1 animate-spin text-blue-500" />
                    <span className="text-blue-500 dark:text-blue-400">Actualizando...</span>
                  </div>
                ) : (
                  <>
                    <Clock size={12} className="mr-1" />
                    Actualizado hoy
                  </>
                )}
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Card Ingresos */}
        <Card className={`border border-green-200 dark:border-green-800/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover-card ${showData ? 'card-animation card-animation-delay-2' : 'opacity-0'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos (Total)</p>
                {loadingTransactions ? (
                  <div className="mt-1"><NumberSkeleton color="green" /></div>
                ) : (
                  <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-500 transition-all-slow">+${formatearMonto(ingresos)}</h3>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-full dark:bg-green-900/50 shadow-inner">
                <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-100 dark:border-green-800/30">
              <div className="text-xs text-green-600/70 dark:text-green-400/70 flex items-center">
                {loadingTransactions ? (
                  <div className="flex items-center">
                    <Loader2 size={12} className="mr-1 animate-spin text-green-500" />
                    <span className="text-green-500 dark:text-green-400">Calculando...</span>
                  </div>
                ) : (
                  <>
                    <Clock size={12} className="mr-1" />
                    Acumulado total
                  </>
                )}
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Card Gastos */}
        <Card className={`border border-red-200 dark:border-red-800/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 hover-card ${showData ? 'card-animation card-animation-delay-3' : 'opacity-0'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos (Total)</p>
                {loadingTransactions ? (
                  <div className="mt-1"><NumberSkeleton color="red" /></div>
                ) : (
                  <h3 className="text-2xl font-bold mt-1 text-red-600 dark:text-red-500 transition-all-slow">-${formatearMonto(gastos)}</h3>
                )}
              </div>
              <div className="p-3 bg-red-100 rounded-full dark:bg-red-900/50 shadow-inner">
                <TrendingDown size={24} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-800/30">
              <div className="text-xs text-red-600/70 dark:text-red-400/70 flex items-center">
                {loadingTransactions ? (
                  <div className="flex items-center">
                    <Loader2 size={12} className="mr-1 animate-spin text-red-500" />
                    <span className="text-red-500 dark:text-red-400">Calculando...</span>
                  </div>
                ) : (
                  <>
                    <Clock size={12} className="mr-1" />
                    Acumulado total
                  </>
                )}
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Card Inversiones */}
        <Card className={`border border-purple-200 dark:border-purple-800/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 hover-card ${showData ? 'card-animation card-animation-delay-4' : 'opacity-0'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inversiones</p>
                {loadingInvestments ? (
                  <div className="mt-1"><NumberSkeleton color="purple" /></div>
                ) : (
                  <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-500 transition-all-slow">${formatearMonto(inversiones)}</h3>
                )}
              </div>
              <Link href="/inversiones" className="p-3 bg-purple-100 rounded-full dark:bg-purple-900/50 shadow-inner hover:bg-purple-200 dark:hover:bg-purple-800/70 transition-colors">
                <DollarSign size={24} className="text-purple-600 dark:text-purple-400" />
              </Link>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-800/30">
              <div className="text-xs text-purple-600/70 dark:text-purple-400/70 flex items-center">
                {loadingInvestments ? (
                  <div className="flex items-center">
                    <Loader2 size={12} className="mr-1 animate-spin text-purple-500" />
                    <span className="text-purple-500 dark:text-purple-400">Actualizando...</span>
                  </div>
                ) : (
                  <>
                    <Clock size={12} className="mr-1" />
                    Valor actual
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de gastos por categoría */}
        <Card className={`border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover-card ${showData ? 'card-animation card-animation-delay-1' : 'opacity-0'}`}>
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-b border-indigo-100 dark:border-indigo-800/30">
            <CardTitle className="flex justify-between items-center">
              <span className="flex items-center">
                <PieChart size={18} className="mr-2 text-indigo-600 dark:text-indigo-400" />
                Principales Gastos por Categoría
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loadingCategoryExpenses ? (
              <div className="flex justify-center items-center h-48">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                  <p className="text-sm text-gray-500">Cargando gastos por categoría...</p>
                </div>
              </div>
            ) : categoryExpenses.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 mb-3">
                  {/* Gráfico circular simple */}
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="#f3f4f6" className="dark:fill-gray-800" />
                    
                    {/* Renderizar cada segmento del gráfico */}
                    {categoryExpenses.map((category, index) => {
                      // Calcular porcentaje del total
                      const totalExpenses = categoryExpenses.reduce((acc, cat) => acc + cat.amount, 0);
                      const percentage = (category.amount / totalExpenses) * 100;
                      
                      // Calcular ángulo para cada segmento
                      const previousSegments = categoryExpenses
                        .slice(0, index)
                        .reduce((acc, cat) => acc + (cat.amount / totalExpenses) * 360, 0);
                      
                      const angle = (percentage / 100) * 360;
                      const startAngle = previousSegments;
                      const endAngle = startAngle + angle;
                      
                      // Convertir ángulo a coordenadas
                      const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                      const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                      const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
                      const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
                      
                      // Flag para determinar si el arco es mayor a 180 grados
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      
                      // SVG path para el segmento
                      const path = `
                        M 50 50
                        L ${startX} ${startY}
                        A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}
                        Z
                      `;
                      
                      return (
                        <path 
                          key={index} 
                          d={path} 
                          fill={category.color}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      );
                    })}
                    
                    {/* Círculo central */}
                    <circle cx="50" cy="50" r="20" fill="white" className="dark:fill-gray-900" />
                  </svg>
                </div>
                
                {/* Leyenda de categorías */}
                <div className="w-full space-y-2 mt-2">
                  {categoryExpenses.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: category.color }} 
                        />
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {category.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ${formatearMonto(category.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No hay datos de gastos para mostrar</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Registra tus transacciones para ver estadísticas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Presupuesto restante */}
        <Card className={`border border-green-200 dark:border-green-800/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover-card ${showData ? 'card-animation card-animation-delay-2' : 'opacity-0'}`}>
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-100 dark:border-green-800/30">
            <CardTitle className="flex justify-between items-center">
              <span className="flex items-center">
                <CircleDollarSign size={18} className="mr-2 text-green-600 dark:text-green-400" />
                Presupuesto Mensual Restante
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loadingBudget ? (
              <div className="flex justify-center items-center h-48">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-2" />
                  <p className="text-sm text-gray-500">Calculando presupuesto restante...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Indicador de presupuesto restante */}
                <div className="text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Disponible para gastar
                  </h3>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-500 mb-2">
                    ${formatearMonto(budgetRemaining)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    de ${formatearMonto(totalBudget)} presupuestados
                  </p>
                </div>
                
                {/* Barra de progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Presupuesto consumido</span>
                    <span className="font-medium">
                      {totalBudget > 0 
                        ? `${Math.round(((totalBudget - budgetRemaining) / totalBudget) * 100)}%` 
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 shadow-inner overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        budgetRemaining < totalBudget * 0.2 
                          ? 'bg-red-500 dark:bg-red-600' 
                          : budgetRemaining < totalBudget * 0.5 
                            ? 'bg-amber-500 dark:bg-amber-600' 
                            : 'bg-green-500 dark:bg-green-600'
                      }`} 
                      style={{ 
                        width: totalBudget > 0 
                          ? `${Math.min(((totalBudget - budgetRemaining) / totalBudget) * 100, 100)}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Información adicional */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Días restantes
                    </div>
                    <div className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
                      <Calendar className="h-4 w-4 inline mr-1 text-green-600 dark:text-green-400" />
                      {daysRemaining}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Sugerido diario
                    </div>
                    <div className="text-xl font-semibold text-green-700 dark:text-green-400">
                      ${formatearMonto(Math.round(dailyBudget))}
                    </div>
                  </div>
                </div>
              </div>
            )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjeta Transacciones */}
        <Card className={`border border-blue-100 dark:border-blue-900/20 shadow-lg overflow-hidden ${showData ? 'card-animation card-animation-delay-1' : 'opacity-0'}`}>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800/30">
                <CardTitle className="flex justify-between items-center">
              <span className="flex items-center">
                <CreditCard size={18} className="mr-2 text-blue-600 dark:text-blue-400" />
                Transacciones Recientes
              </span>
                  <Link href="/transacciones">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-600 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:border-blue-400"
                >
                  Ver todas
                </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
          <CardContent className="p-0">
            {loadingTransactions ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 relative overflow-hidden">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 dark:from-blue-900/20 dark:via-blue-800/30 dark:to-blue-900/20 relative overflow-hidden mr-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                      </div>
                      <div className="space-y-2">
                        <TextSkeleton width="w-40" color="blue" />
                        <TextSkeleton width="w-24" color="blue" />
                      </div>
                    </div>
                    <TextSkeleton width="w-20" color="blue" />
                  </div>
                ))}
              </div>
            ) : transaccionesRecientes.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {transaccionesRecientes.map((transaccion) => (
                  <div key={transaccion.id} className="flex items-center justify-between p-4 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer transform transition-transform hover:translate-x-1">
                        <div className="flex items-center">
                      <div className={`p-2 ${transaccion.type === 'income' 
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'} 
                        rounded-full mr-4 shadow-inner`}>
                        {transaccion.type === 'income' 
                          ? <TrendingUp size={16} /> 
                          : <TrendingDown size={16} />}
                          </div>
                          <div>
                            <p className="font-medium">{transaccion.description || 'Sin descripción'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <Calendar size={12} className="mr-1.5" />
                          {formatearFecha(transaccion.date)}
                        </p>
                          </div>
                        </div>
                    <p className={`font-medium ${
                      transaccion.type === 'income' 
                        ? 'text-green-600 dark:text-green-500' 
                        : 'text-red-600 dark:text-red-500'}`
                    }>
                          {transaccion.type === 'income' ? '+' : '-'}${formatearMonto(transaccion.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
              <div className="text-center py-8 text-gray-500">
                    No hay transacciones para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

        {/* Tarjeta Objetivos */}
        <Card className={`border border-amber-100 dark:border-amber-900/20 shadow-lg overflow-hidden ${showData ? 'card-animation card-animation-delay-2' : 'opacity-0'}`}>
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-100 dark:border-amber-800/30">
                <CardTitle className="flex justify-between items-center">
              <span className="flex items-center">
                <Target size={18} className="mr-2 text-amber-600 dark:text-amber-400" />
                Objetivos de Ahorro
              </span>
                  <Link href="/objetivos">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-600 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-900/20 dark:hover:border-amber-400"
                >
                  Ver todos
                </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
          <CardContent className="p-4">
            {loadingGoals ? (
              <div className="space-y-6">
                {[1, 2].map((item) => (
                  <div key={item} className="p-3 rounded-lg border border-amber-100 dark:border-amber-800/30 relative overflow-hidden">
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-amber-900/20 dark:via-amber-800/30 dark:to-amber-900/20 relative overflow-hidden mr-2">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                        <TextSkeleton width="w-32" color="amber" />
                      </div>
                      <TextSkeleton width="w-28" color="amber" />
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-amber-900/20 dark:via-amber-800/30 dark:to-amber-900/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <TextSkeleton width="w-16" color="amber" />
                      <TextSkeleton width="w-24" color="amber" />
                    </div>
                  </div>
                ))}
              </div>
            ) : objetivos.length > 0 ? (
                  <div className="space-y-6">
                    {objetivos.map((objetivo) => {
                      const progreso = Math.round((objetivo.current_amount / objetivo.target_amount) * 100);
                      return (
                    <div key={objetivo.id} className="p-3 rounded-lg border border-amber-100 dark:border-amber-800/30 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all duration-300 hover:shadow-md cursor-pointer">
                      <div className="flex justify-between mb-2">
                            <div className="flex items-center">
                          <div className="p-1.5 bg-amber-100 rounded-full mr-2 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                            <Target size={14} />
                          </div>
                              <span className="font-medium">{objetivo.name}</span>
                            </div>
                            <span className="text-sm font-medium">${formatearMonto(objetivo.current_amount)} / ${formatearMonto(objetivo.target_amount)}</span>
                          </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 shadow-inner overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-1000 ${
                            progreso < 1 ? 'w-[3px] bg-red-500 dark:bg-red-600' : // Siempre mostrar al menos una línea pequeña
                            progreso < 30 ? `w-[${Math.max(progreso, 3)}%] bg-red-500 dark:bg-red-600` :
                            progreso < 70 ? `w-[${progreso}%] bg-amber-500 dark:bg-amber-600` :
                            `w-[${progreso}%] bg-green-500 dark:bg-green-600`
                          }`} 
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2 text-xs">
                        <span className={`${
                          progreso < 30 ? 'text-red-600 dark:text-red-400' :
                          progreso < 70 ? 'text-amber-600 dark:text-amber-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {progreso}% completado
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Meta: ${formatearMonto(objetivo.target_amount)}
                        </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
              <div className="text-center py-8 text-gray-500 bg-amber-50/30 dark:bg-amber-900/10 rounded-lg">
                <Target size={36} className="mx-auto mb-2 text-amber-300 dark:text-amber-700" />
                <p>No hay objetivos para mostrar</p>
                <Link href="/objetivos">
                  <Button className="mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md transition-all duration-300">
                    Crear objetivo
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
