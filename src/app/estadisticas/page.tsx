"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectOption } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Download, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { getTransactions, getTransactionsByCategory, getMonthlyTotals } from '@/services/transactions';
import { getCategories } from '@/services/categories';
import { format, subMonths, startOfMonth, endOfMonth, subQuarters, subYears } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function EstadisticasPage() {
  const { user } = useUser();
  const [periodo, setPeriodo] = useState<string>('mes');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para almacenar datos reales
  const [monthlyData, setMonthlyData] = useState<{income: number, expense: number}[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<{name: string, amount: number, color: string}[]>([]);
  const [resumenData, setResumenData] = useState({
    ingresoTotal: 0,
    gastoTotal: 0,
    ahorro: 0,
    porcentajeAhorro: 0,
    mayorGasto: { categoria: '', monto: 0 },
    tendencia: '',
  });
  
  const periodos: SelectOption[] = [
    { value: 'mes', label: 'Este Mes' },
    { value: 'trimestre', label: 'Último Trimestre' },
    { value: 'semestre', label: 'Último Semestre' },
    { value: 'anual', label: 'Anual' },
  ];

  // Función para cargar los datos según el período seleccionado
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Determinar fechas según el período seleccionado
        const today = new Date();
        let startDate: Date;
        let endDate = today;
        let monthsToShow = 1;
        
        switch (periodo) {
          case 'mes':
            startDate = startOfMonth(today);
            monthsToShow = 1;
            break;
          case 'trimestre':
            startDate = subMonths(today, 3);
            monthsToShow = 3;
            break;
          case 'semestre':
            startDate = subMonths(today, 6);
            monthsToShow = 6;
            break;
          case 'anual':
          default:
            startDate = subMonths(today, 12);
            monthsToShow = 12;
            break;
        }
        
        // Formatear fechas para la consulta
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        
        // Obtener transacciones por categoría
        const categoryTransactions = await getTransactionsByCategory(user.id, startDateStr, endDateStr);
        
        // Agrupar gastos por categoría
        const categories = await getCategories(user.id);
        const categoriesMap = new Map(categories.map(cat => [cat.id, cat]));
        
        const expensesByCategory: Record<string, {amount: number, color: string}> = {};
        
        categoryTransactions.forEach(tx => {
          if (tx.type === 'expense' && tx.categories) {
            const catName = tx.categories.name;
            if (!expensesByCategory[catName]) {
              expensesByCategory[catName] = { amount: 0, color: tx.categories.color || '#3B82F6' };
            }
            expensesByCategory[catName].amount += tx.amount;
          }
        });
        
        // Convertir a array para los gráficos
        const categoryExpensesArray = Object.entries(expensesByCategory).map(([name, data]) => ({
          name,
          amount: data.amount,
          color: data.color
        })).sort((a, b) => b.amount - a.amount);
        
        setCategoryExpenses(categoryExpensesArray);
        
        // Obtener datos mensuales para el gráfico de línea
        const currentYear = today.getFullYear();
        const monthlyTotals = await getMonthlyTotals(user.id, currentYear);
        setMonthlyData(monthlyTotals);
        
        // Calcular resumen
        let ingresoTotal = 0;
        let gastoTotal = 0;
        
        categoryTransactions.forEach(tx => {
          if (tx.type === 'income') {
            ingresoTotal += tx.amount;
          } else {
            gastoTotal += tx.amount;
          }
        });
        
        const ahorro = ingresoTotal - gastoTotal;
        const porcentajeAhorro = ingresoTotal > 0 ? Math.round((ahorro / ingresoTotal) * 100) : 0;
        
        // Determinar mayor gasto
        const mayorGasto = categoryExpensesArray.length > 0 ? 
          { categoria: categoryExpensesArray[0].name, monto: categoryExpensesArray[0].amount } : 
          { categoria: 'Sin datos', monto: 0 };
        
        // Determinar tendencia
        const previousMonth = monthlyTotals[today.getMonth() - 1 >= 0 ? today.getMonth() - 1 : 11];
        const currentMonth = monthlyTotals[today.getMonth()];
        
        let tendencia = 'estable';
        if (previousMonth && currentMonth) {
          const prevSavings = previousMonth.income - previousMonth.expense;
          const currentSavings = currentMonth.income - currentMonth.expense;
          
          if (currentSavings > prevSavings) {
            tendencia = 'positiva';
          } else if (currentSavings < prevSavings) {
            tendencia = 'negativa';
          }
        }
        
        setResumenData({
          ingresoTotal,
          gastoTotal,
          ahorro,
          porcentajeAhorro,
          mayorGasto,
          tendencia
        });
        
      } catch (err: any) {
        console.error('Error cargando datos de estadísticas:', err);
        setError(err.message || 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, periodo]);

  // Preparar datos para gráficos
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Datos para gráfica de línea (Ingresos vs. Gastos por Mes)
  const lineChartData = {
    labels: monthNames,
    datasets: [
      {
        label: 'Ingresos',
        data: monthlyData.map(m => m.income),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Gastos',
        data: monthlyData.map(m => m.expense),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => `$${value.toLocaleString()}`
        }
      }
    },
  };

  // Datos para gráfica de barras (Gastos por Categoría)
  const barChartData = {
    labels: categoryExpenses.map(c => c.name),
    datasets: [
      {
        label: 'Gasto',
        data: categoryExpenses.map(c => c.amount),
        backgroundColor: categoryExpenses.map(c => c.color),
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => `$${value.toLocaleString()}`
        }
      }
    },
  };

  // Datos para gráfica de torta (Distribución de Gastos)
  const pieChartData = {
    labels: categoryExpenses.map(c => c.name),
    datasets: [
      {
        data: categoryExpenses.map(c => c.amount),
        backgroundColor: categoryExpenses.map(c => c.color),
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'right' as const },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Estadísticas Financieras</h1>
        <div className="flex items-center space-x-2">
          <Select
            options={periodos}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando estadísticas...</span>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm mt-2">Asegúrate de tener transacciones registradas para poder visualizar estadísticas.</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos Totales</p>
                  <h3 className="text-2xl font-bold text-green-600">+${resumenData.ingresoTotal.toLocaleString()}</h3>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos Totales</p>
                  <h3 className="text-2xl font-bold text-red-600">-${resumenData.gastoTotal.toLocaleString()}</h3>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ahorro</p>
                  <h3 className={`text-2xl font-bold ${resumenData.ahorro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${resumenData.ahorro.toLocaleString()} ({resumenData.porcentajeAhorro}%)
                  </h3>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mayor Gasto</p>
                  <h3 className="text-2xl font-bold">{resumenData.mayorGasto.categoria}</h3>
                  <p className="text-red-600">-${resumenData.mayorGasto.monto.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs. Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={barChartData} options={barChartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Pie data={pieChartData} options={pieChartOptions} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Tendencia</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      resumenData.tendencia === 'positiva' ? 'bg-green-500' :
                      resumenData.tendencia === 'negativa' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <p className="font-medium">
                      Tendencia: {
                        resumenData.tendencia === 'positiva' ? 'Positiva' :
                        resumenData.tendencia === 'negativa' ? 'Negativa' : 'Estable'
                      }
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {resumenData.tendencia === 'positiva' ? 
                      'Tu situación financiera está mejorando. Sigues ahorrando más que el mes anterior.' :
                      resumenData.tendencia === 'negativa' ?
                      'Tu situación financiera está empeorando. Estás ahorrando menos que el mes anterior.' :
                      'Tu situación financiera se mantiene estable.'
                    }
                  </p>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Recomendaciones</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-400">
                      {resumenData.porcentajeAhorro < 20 && (
                        <li>Intenta aumentar tu porcentaje de ahorro al menos al 20%.</li>
                      )}
                      {resumenData.mayorGasto.monto > (resumenData.ingresoTotal * 0.4) && (
                        <li>Tu mayor gasto representa más del 40% de tus ingresos. Considera reducirlo.</li>
                      )}
                      {resumenData.tendencia === 'negativa' && (
                        <li>Revisa tus gastos recientes para identificar áreas donde puedas reducir.</li>
                      )}
                      <li>Diversifica tus fuentes de ingresos para mayor estabilidad financiera.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 