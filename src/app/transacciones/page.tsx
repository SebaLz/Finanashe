"use client";

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { PlusCircle, Search, ArrowDownCircle, ArrowUpCircle, Filter, RefreshCw, ChevronDown, ArrowLeft, ArrowRight, Check, ToggleLeft, ToggleRight, BadgeDollarSign, BadgePercent, BarChart4 } from 'lucide-react';
import { getTransactions, Transaction, createTransaction, updateTransaction } from '@/services/transactions';
import { getCategories, getCategoriesByType, Category } from '@/services/categories';
import { getCurrentUser } from '@/services/auth';
import { format, parse, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CategoryManager } from '@/components/ui/category-manager';
import { ExportData } from '@/components/ui/export-data';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton, TableRowsSkeleton } from '@/components/ui/skeleton';

// Crear un evento personalizado para actualización de categorías
const CATEGORIES_UPDATED_EVENT = 'categoriesUpdated';

// Función para emitir evento de actualización de categorías
export const emitCategoriesUpdated = () => {
  const event = new CustomEvent(CATEGORIES_UPDATED_EVENT);
  window.dispatchEvent(event);
};

// Componente de fila de transacción optimizado con memo para evitar rerenderizados innecesarios
const TransactionRow = memo(({ 
  transaction, 
  formatearFecha,
  onToggleBudgetable 
}: { 
  transaction: any; 
  formatearFecha: (date: string) => string;
  onToggleBudgetable: (id: string, value: boolean) => Promise<void>;
}) => {
  // Estado local para actualización optimista
  const [isChecked, setIsChecked] = useState(transaction.is_budgetable);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    // Actualización optimista de UI
    setIsChecked(checked);
    setIsUpdating(true);
    
    try {
      // Actualizar en el servidor
      await onToggleBudgetable(transaction.id, checked);
    } catch (error) {
      // Revertir en caso de error
      setIsChecked(!checked);
      console.error('Error al actualizar:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-4">
        {transaction.type === 'income' ? (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-50 dark:bg-green-900/20">
            <ArrowUpCircle className="text-green-500" size={18} />
          </div>
        ) : (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20">
            <ArrowDownCircle className="text-red-500" size={18} />
          </div>
        )}
      </td>
      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
        <div className="max-w-[150px] sm:max-w-xs truncate">
          {transaction.description || 'Sin descripción'}
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {transaction.categories?.name || 'Sin categoría'}
        </span>
      </td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">{formatearFecha(transaction.date)}</td>
      <td className={`px-4 py-4 text-right font-medium whitespace-nowrap ${
        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
      </td>
      <td className="px-4 py-4 text-center">
        {transaction.type === 'income' && (
          <div className="relative flex items-center justify-center">
            <Checkbox 
              id={`budget-${transaction.id}`}
              checked={isChecked}
              onCheckedChange={(checked) => handleToggle(!!checked)}
              disabled={isUpdating}
              className={`min-w-[20px] min-h-[20px] ${isChecked ? 'border-green-500 bg-green-500' : ''}`}
            />
            {isUpdating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
});

// Componente optimizado para la tabla de transacciones
const TransactionsTable = memo(({ 
  transactions, 
  formatearFecha, 
  onToggleBudgetable 
}: { 
  transactions: any[];
  formatearFecha: (date: string) => string;
  onToggleBudgetable: (id: string, value: boolean) => Promise<void>;
}) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        No hay transacciones para mostrar
      </div>
    );
  }

  return (
    <div className="rounded-md border dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
              <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Concepto</th>
              <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Categoría</th>
              <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Fecha</th>
              <th className="px-4 py-4 font-medium text-right text-gray-500 dark:text-gray-400">Monto</th>
              <th className="px-4 py-4 font-medium text-center text-gray-500 dark:text-gray-400">Presupuesto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((transaction) => (
              <TransactionRow 
                key={transaction.id} 
                transaction={transaction} 
                formatearFecha={formatearFecha}
                onToggleBudgetable={onToggleBudgetable}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default function TransaccionesPage() {
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<SelectOption[]>([]);
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Estados para el formulario de nueva transacción
  const [tipo, setTipo] = useState<'income' | 'expense'>('expense');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Añadir estado para mostrar notificaciones temporales
  const [notifications, setNotifications] = useState<{
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
    id: number;
  }[]>([]);
  
  // Estado para indicar si se están recargando las categorías
  const [refreshingCategories, setRefreshingCategories] = useState(false);
  
  // Usar useRef para mantener un contador persistente entre renderizados
  const notificationIdRef = useRef(0);

  // Función para mostrar notificaciones
  const toast = ({ 
    title, 
    description, 
    variant = 'default' 
  }: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }) => {
    const id = notificationIdRef.current;
    notificationIdRef.current += 1;
    
    setNotifications(prev => [...prev, { title, description, variant, id }]);
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Añadir estado para las pestañas
  const [activeTab, setActiveTab] = useState('transactions');
  // Guardar la pestaña anterior para detectar cambios
  const previousTabRef = useRef(activeTab);

  // Agregar estado para la opción de incluir en presupuesto
  const [isBudgetable, setIsBudgetable] = useState(false);

  // Cargar datos cuando cambia el usuario
  useEffect(() => {
    const cargarDatos = async () => {
      if (!userId) return;
      
      try {
        setRefreshingCategories(true);
        
        // Cargar categorías según el tipo de transacción seleccionado
        const categoriasData = await getCategoriesByType(userId, tipo);
        
        // Convertir a SelectOption
        const opcionesCategorias = categoriasData.map((cat: Category) => ({
          value: cat.id,
          label: cat.name,
          extra: { color: cat.color, icon: cat.icon }
        }));

        setCategorias(opcionesCategorias);
      } catch (err) {
        console.error('Error cargando categorías:', err);
      } finally {
        setRefreshingCategories(false);
      }
    };
    
    cargarDatos();
  }, [userId, tipo]);

  // Cargar transacciones y categorías
  useEffect(() => {
    const obtenerDatos = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          
          // Cargar transacciones
          const transaccionesData = await getTransactions(user.id);
          setTransacciones(transaccionesData);
          
          // Cargar categorías iniciales según tipo seleccionado
          const categoriasData = await getCategoriesByType(user.id, tipo);
          const opcionesCategorias = categoriasData.map((cat: Category) => ({
            value: cat.id,
            label: cat.name,
            extra: { color: cat.color, icon: cat.icon }
          }));
          setCategorias(opcionesCategorias);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    obtenerDatos();
  }, [tipo]);

  // Detectar cambios de pestaña para recargar datos
  useEffect(() => {
    // Si cambiamos de la pestaña de categorías a la de transacciones, recargar categorías
    if (previousTabRef.current === 'categories' && activeTab === 'transactions' && userId) {
      cargarCategorias(userId);
    }
    previousTabRef.current = activeTab;
  }, [activeTab, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!categoriaId) {
      setFormError('Selecciona una categoría');
      return;
    }

    if (!userId) {
      setFormError('No se pudo identificar al usuario');
      return;
    }

    setFormLoading(true);
    
    try {
      const nuevaTransaccion = await createTransaction({
        user_id: userId,
        type: tipo,
        amount: parseFloat(monto),
        category_id: categoriaId,
        date: fecha,
        description: concepto,
        is_budgetable: isBudgetable
      });
      
      // Recargar transacciones
      const transaccionesActualizadas = await getTransactions(userId);
      setTransacciones(transaccionesActualizadas);
      
      // Limpiar formulario
      setTipo('expense');
      setConcepto('');
      setMonto('');
      setCategoriaId('');
      setFecha(format(new Date(), 'yyyy-MM-dd'));
      setIsBudgetable(false);
      
    } catch (error) {
      console.error('Error creando transacción:', error);
      setFormError('Error al crear la transacción');
    } finally {
      setFormLoading(false);
    }
  };

  // Convertir la función a useCallback para evitar recreaciones innecesarias
  const formatearFecha = useCallback((fechaStr: string) => {
    try {
      return format(new Date(fechaStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return fechaStr;
    }
  }, []);

  // Convertir handleToggleBudgetable a useCallback para evitar recreaciones
  const handleToggleBudgetable = useCallback(async (transactionId: string, isBudgetable: boolean) => {
    if (!userId) return;
    
    try {
      await updateTransaction(transactionId, { is_budgetable: isBudgetable });
      
      // Actualización selectiva sin recargar todas las transacciones
      setTransacciones(prevTransactions => 
        prevTransactions.map(t => 
          t.id === transactionId ? {...t, is_budgetable: isBudgetable} : t
        )
      );
      
      // Mostrar notificación
      toast({
        title: "Actualizado",
        description: isBudgetable 
          ? "Transacción incluida en el presupuesto" 
          : "Transacción excluida del presupuesto",
        variant: "default",
      });
    } catch (error) {
      console.error('Error actualizando is_budgetable:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de presupuesto",
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  // Memoizar el resultado del filtrado para evitar recálculos innecesarios
  const transaccionesFiltradas = useCallback(() => {
    return transacciones
      .filter(t => 
        (filtro === 'todos' || 
        (filtro === 'ingresos' && t.type === 'income') || 
        (filtro === 'gastos' && t.type === 'expense'))
      )
      .filter(t => 
        busqueda === '' || 
        t.description?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.categories?.name.toLowerCase().includes(busqueda.toLowerCase())
      );
  }, [transacciones, filtro, busqueda]);

  // Función para recargar categorías
  const handleRefreshCategories = async () => {
    if (!userId) return;
    
    try {
      setRefreshingCategories(true);
      
      // Cargar categorías según el tipo seleccionado
      const categoriasData = await getCategoriesByType(userId, tipo);
      
      // Convertir a SelectOption
      const opcionesCategorias = categoriasData.map((cat: Category) => ({
        value: cat.id,
        label: cat.name,
        extra: { color: cat.color, icon: cat.icon }
      }));

      setCategorias(opcionesCategorias);
      
      // Limpiar selección si la categoría ya no existe
      const categoriaExistente = opcionesCategorias.some((c: SelectOption) => c.value === categoriaId);
      if (!categoriaExistente) {
        setCategoriaId('');
      }

      toast({
        title: "Categorías actualizadas",
        description: "La lista de categorías ha sido actualizada",
        variant: "default",
      });
    } catch (err) {
      console.error('Error recargando categorías:', err);
    } finally {
      setRefreshingCategories(false);
    }
  };

  // Función para manejar cambios de meses
  const handleSwitchToDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM');
    setFecha(formattedDate);
    
    // Cargar transacciones para el nuevo mes
    if (userId) {
      const fechaInicio = format(startOfMonth(date), 'yyyy-MM-dd');
      const fechaFin = format(endOfMonth(date), 'yyyy-MM-dd');
      
      // Recargar datos del nuevo mes
      const obtenerTransaccionesFiltradas = async () => {
        try {
          setLoading(true);
          const transaccionesData = await getTransactionsRange(userId, fechaInicio, fechaFin);
          setTransacciones(transaccionesData);
        } catch (error) {
          console.error('Error cargando transacciones para el rango:', error);
        } finally {
          setLoading(false);
        }
      };
      
      obtenerTransaccionesFiltradas();
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* Notificaciones */}
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95 transform transition-all duration-300 animate-fade-in ${
              notification.variant === 'destructive' 
                ? 'bg-red-600 text-white' 
                : 'bg-green-600 text-white'
            }`}
            style={{animationDuration: '0.3s'}}
          >
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            <p className="text-xs opacity-90 mt-1">{notification.description}</p>
          </div>
        ))}
      </div>

      {/* Encabezado y Pestañas */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transacciones</h1>
          <div className="flex space-x-3 overflow-x-auto pb-1 w-full sm:w-auto">
            <Button 
              variant={activeTab === 'transactions' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('transactions')}
              className={`rounded-full px-5 py-3 ${activeTab === 'transactions' ? 'shadow-md' : 'border-2 shadow-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'}`}
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12H3M3 12L9 6M3 12L9 18" />
              </svg>
              Transacciones
            </Button>
            <Button 
              variant={activeTab === 'categories' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('categories')}
              className={`rounded-full px-5 py-3 ${activeTab === 'categories' ? 'shadow-md' : 'border-2 shadow-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'}`}
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M9 12h6" />
                <path d="M9 3v18M15 3v18" />
              </svg>
              Personalizar categorías
            </Button>
            <Button 
              variant={activeTab === 'export' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('export')}
              className={`rounded-full px-5 py-3 ${activeTab === 'export' ? 'shadow-md' : 'border-2 shadow-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'}`}
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="transition-all duration-300 ease-in-out">
        {activeTab === 'transactions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sección de filtros y lista de transacciones */}
            <div className="lg:col-span-2 space-y-5">
              <Card className="overflow-hidden border-0 shadow-md">
                <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4 border-b">
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative flex-1 max-w-md w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center h-10">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                    
                  <Input 
                        placeholder="Buscar transacciones..." 
                        className="pl-10 w-full h-10 bg-white dark:bg-gray-900"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-1">
                        <button 
                          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                            filtro === 'todos' 
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => setFiltro('todos')}
                        >
                          Todos
                        </button>
                        <button 
                          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                            filtro === 'ingresos' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => setFiltro('ingresos')}
                        >
                          Ingresos
                        </button>
                        <button 
                          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                            filtro === 'gastos' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => setFiltro('gastos')}
                        >
                          Gastos
                        </button>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-1">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex justify-between items-center">
                          <Skeleton variant="text" width="w-40" />
                          <Skeleton variant="text" width="w-24" />
                        </div>
                      </div>
                      <TableRowsSkeleton 
                        rows={6}
                        columns={5}
                        showAvatar={true}
                        avatarSize="w-8 h-8"
                      />
                    </div>
                  ) : transaccionesFiltradas().length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Concepto</th>
                            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Categoría</th>
                            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                            <th className="px-4 py-4 font-medium text-right text-gray-500 dark:text-gray-400">Monto</th>
                            <th className="px-4 py-4 font-medium text-center text-gray-500 dark:text-gray-400">Presupuesto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transaccionesFiltradas().map((transaction) => (
                            <TransactionRow 
                              key={transaction.id} 
                              transaction={transaction} 
                              formatearFecha={formatearFecha}
                              onToggleBudgetable={handleToggleBudgetable}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay transacciones</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        No se encontraron transacciones con los filtros actuales. Prueba con otros criterios o crea una nueva transacción.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Formulario de nueva transacción */}
            <div className="lg:col-span-1">
              <Card className="sticky top-5 border-0 shadow-md h-full">
                <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4 border-b">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <PlusCircle className="mr-2 h-5 w-5 text-blue-600" />
                    Nueva Transacción
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">Tipo de transacción</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`flex items-center justify-center px-3 py-4 rounded-lg border ${
                            tipo === 'income'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => {
                            setTipo('income');
                            handleRefreshCategories(); // Recargar categorías al cambiar tipo
                          }}
                        >
                          <ArrowUpCircle className={`h-5 w-5 mr-2 ${tipo === 'income' ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className="font-medium text-sm">Ingreso</span>
                        </button>
                        <button
                          type="button"
                          className={`flex items-center justify-center px-3 py-4 rounded-lg border ${
                            tipo === 'expense'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => {
                            setTipo('expense');
                            handleRefreshCategories(); // Recargar categorías al cambiar tipo
                          }}
                        >
                          <ArrowDownCircle className={`h-5 w-5 mr-2 ${tipo === 'expense' ? 'text-red-500' : 'text-gray-400'}`} />
                          <span className="font-medium text-sm">Gasto</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Input 
                        label="Monto" 
                        type="number" 
                        placeholder="0.00"
                        id="monto"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        required
                        className="bg-white dark:bg-gray-900 h-12"
                      />

                      <Input 
                        label="Concepto/Descripción" 
                        placeholder="Ej: Supermercado, Sueldo, etc."
                        id="concepto"
                        value={concepto}
                        onChange={(e) => setConcepto(e.target.value)}
                        required
                        className="bg-white dark:bg-gray-900 h-12"
                      />

                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">
                          Categoría <span className="text-red-500">*</span>
                        </label>
                        <div className="relative select-dropdown-container" style={{ minHeight: "60px" }}>
                          <Select
                            label=""
                            options={categorias}
                            id="categoria"
                            value={categoriaId}
                            onChange={(value) => setCategoriaId(value)}
                            required
                            className="bg-white dark:bg-gray-900"
                            endAdornment={
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRefreshCategories();
                                }}
                                disabled={refreshingCategories}
                                className="ml-2 w-8 h-8 p-0 min-w-0"
                              >
                                <RefreshCw 
                                  size={16} 
                                  className={`text-gray-500 ${refreshingCategories ? 'animate-spin' : ''}`} 
                                />
                              </Button>
                            }
                          />
                        </div>
                      </div>

                      <Input 
                        label="Fecha" 
                        type="date" 
                        id="fecha"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        required
                        className="bg-white dark:bg-gray-900 h-12"
                      />

                      {tipo === 'income' && (
                        <div className="flex items-center space-x-2 pt-1">
                          <Checkbox
                            id="isBudgetable"
                            checked={isBudgetable}
                            onCheckedChange={(checked) => setIsBudgetable(checked as boolean)}
                          />
                          <label
                            htmlFor="isBudgetable"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Incluir en el presupuesto mensual
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        className={`w-full flex items-center justify-center h-14 text-base ${
                          tipo === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        disabled={formLoading}
                      >
                        {formLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="mr-2" size={20} />
                            {tipo === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4 border-b">
              <CardTitle className="text-lg font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M9 12h6" />
                  <path d="M9 3v18M15 3v18" />
                </svg>
                Personalizar categorías
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <CategoryManager 
                onCategoriesChanged={() => emitCategoriesUpdated()}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'export' && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4 border-b">
              <CardTitle className="text-lg font-semibold">Exportar Datos</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ExportData />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 