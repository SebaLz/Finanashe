"use client";

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, LineChart, Wallet, Target, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/services/auth';
import { getTransactions } from '@/services/transactions';
import { getGoals } from '@/services/goals';
import { getTotalInvestmentValue } from '@/services/investments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [inversiones, setInversiones] = useState(0);
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          
          // Cargar transacciones
          const transaccionesData = await getTransactions(user.id);
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
          
          // Cargar objetivos
          const objetivosData = await getGoals(user.id);
          setObjetivos(objetivosData);
          
          // Cargar inversiones
          try {
            const inversionesData = await getTotalInvestmentValue(user.id);
            setInversiones(inversionesData.totalInARS);
          } catch (error) {
            console.error('Error cargando inversiones:', error);
            setInversiones(0);
          }
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [router]);

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

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">¡Bienvenido a FinanzApp!</h1>
              <Link href="/transacciones">
                <Button className="flex items-center">
                  <PlusCircle className="mr-2" size={18} />
                  Nueva Transacción
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance</p>
                      <h3 className="text-2xl font-bold mt-1">${formatearMonto(balance)}</h3>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900">
                      <Wallet size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ingresos (Total)</p>
                      <h3 className="text-2xl font-bold mt-1 text-green-600">+${formatearMonto(ingresos)}</h3>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full dark:bg-green-900">
                      <LineChart size={24} className="text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos (Total)</p>
                      <h3 className="text-2xl font-bold mt-1 text-red-600">-${formatearMonto(gastos)}</h3>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full dark:bg-red-900">
                      <LineChart size={24} className="text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inversiones</p>
                      <h3 className="text-2xl font-bold mt-1">${formatearMonto(inversiones)}</h3>
                    </div>
                    <Link href="/inversiones" className="p-3 bg-purple-100 rounded-full dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                      <DollarSign size={24} className="text-purple-600 dark:text-purple-400" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Transacciones Recientes</span>
                    <Link href="/transacciones">
                      <Button variant="outline" size="sm">Ver todas</Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transaccionesRecientes.length > 0 ? (
                    <div className="space-y-4">
                      {transaccionesRecientes.map((transaccion) => (
                        <div key={transaccion.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition">
                          <div className="flex items-center">
                            <div className={`p-2 ${transaccion.type === 'income' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'} rounded-full mr-3`}>
                              <DollarSign size={16} className={transaccion.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
                            </div>
                            <div>
                              <p className="font-medium">{transaccion.description || 'Sin descripción'}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{formatearFecha(transaccion.date)}</p>
                            </div>
                          </div>
                          <p className={transaccion.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {transaccion.type === 'income' ? '+' : '-'}${formatearMonto(transaccion.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No hay transacciones para mostrar
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Objetivos de Ahorro</span>
                    <Link href="/objetivos">
                      <Button variant="outline" size="sm">Ver todos</Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {objetivos.length > 0 ? (
                    <div className="space-y-6">
                      {objetivos.map((objetivo) => {
                        const progreso = Math.round((objetivo.current_amount / objetivo.target_amount) * 100);
                        return (
                          <div key={objetivo.id}>
                            <div className="flex justify-between mb-1">
                              <div className="flex items-center">
                                <Target size={16} className="mr-2 text-blue-600" />
                                <span className="font-medium">{objetivo.name}</span>
                              </div>
                              <span className="text-sm font-medium">${formatearMonto(objetivo.current_amount)} / ${formatearMonto(objetivo.target_amount)}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                              <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${progreso}%` }}></div>
                            </div>
                            <p className="text-right text-xs mt-1 text-gray-500">{progreso}% completado</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No hay objetivos para mostrar
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
