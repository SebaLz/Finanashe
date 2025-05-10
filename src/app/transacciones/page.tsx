"use client";

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { PlusCircle, Search, ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';
import { createTransaction, getTransactions, Transaction } from '@/services/transactions';
import { getCategories, Category } from '@/services/categories';
import { getCurrentUser } from '@/services/auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CategoryManager } from '@/components/ui/category-manager';
import { ExportData } from '@/components/ui/export-data';

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

  // Añadir estado para las pestañas
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    const inicializar = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          
          // Cargar categorías
          const categoriasData = await getCategories(user.id);
          const opcionesCategorias = categoriasData.map((cat: Category) => ({
            value: cat.id,
            label: cat.name
          }));
          setCategorias(opcionesCategorias);
          
          // Cargar transacciones
          const transaccionesData = await getTransactions(user.id);
          setTransacciones(transaccionesData);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, []);

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
        description: concepto
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
      
    } catch (error) {
      console.error('Error creando transacción:', error);
      setFormError('Error al crear la transacción');
    } finally {
      setFormLoading(false);
    }
  };

  // Filtrar transacciones
  const transaccionesFiltradas = transacciones
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

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    try {
      return format(new Date(fechaStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return fechaStr;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <div className="flex space-x-2">
            <Button 
              variant={activeTab === 'transactions' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('transactions')}
            >
              Transacciones
            </Button>
            <Button 
              variant={activeTab === 'categories' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('categories')}
            >
              Categorías
            </Button>
            <Button 
              variant={activeTab === 'export' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('export')}
            >
              Exportar
            </Button>
          </div>
        </div>

        {activeTab === 'transactions' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative flex-1 max-w-md w-full">
                    <div className="absolute left-0 top-0 pl-3 flex items-center pointer-events-none" style={{ height: '75%' }}>
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input 
                      placeholder="Buscar transacciones..." 
                      className="pl-10 w-full h-12"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Filter size={20} className="text-gray-500" />
                    <select 
                      className="p-2 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 w-full sm:w-auto"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    >
                      <option value="todos">Todos</option>
                      <option value="ingresos">Ingresos</option>
                      <option value="gastos">Gastos</option>
                    </select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : transaccionesFiltradas.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No hay transacciones para mostrar
                  </div>
                ) : (
                  <div className="rounded-md border dark:border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                            <th className="px-4 py-3 font-medium">Tipo</th>
                            <th className="px-4 py-3 font-medium">Concepto</th>
                            <th className="px-4 py-3 font-medium">Categoría</th>
                            <th className="px-4 py-3 font-medium">Fecha</th>
                            <th className="px-4 py-3 font-medium text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {transaccionesFiltradas.map((transaccion) => (
                            <tr 
                              key={transaccion.id} 
                              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <td className="px-4 py-3">
                                {transaccion.type === 'income' ? (
                                  <ArrowUpCircle className="text-green-500" size={20} />
                                ) : (
                                  <ArrowDownCircle className="text-red-500" size={20} />
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">{transaccion.description || 'Sin descripción'}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{transaccion.categories?.name}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatearFecha(transaccion.date)}</td>
                              <td className={`px-4 py-3 text-right font-medium ${
                                transaccion.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaccion.type === 'income' ? '+' : '-'}${transaccion.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nueva Transacción</CardTitle>
              </CardHeader>
              <CardContent>
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name="tipo" 
                            value="income" 
                            className="text-blue-600" 
                            checked={tipo === 'income'}
                            onChange={() => setTipo('income')}
                          />
                          <span>Ingreso</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name="tipo" 
                            value="expense" 
                            className="text-blue-600" 
                            checked={tipo === 'expense'}
                            onChange={() => setTipo('expense')}
                          />
                          <span>Gasto</span>
                        </label>
                      </div>
                    </div>

                    <Input 
                      label="Monto" 
                      type="number" 
                      placeholder="0.00"
                      id="monto"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      required
                    />
                  </div>

                  <Input 
                    label="Concepto/Descripción" 
                    placeholder="Ej: Supermercado, Sueldo, etc."
                    id="concepto"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    required
                  />

                  <Select
                    label="Categoría"
                    options={categorias}
                    id="categoria"
                    value={categoriaId}
                    onChange={(value) => setCategoriaId(value)}
                    required
                  />

                  <Input 
                    label="Fecha" 
                    type="date" 
                    id="fecha"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      className="flex items-center"
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="mr-2" size={18} />
                          Guardar Transacción
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'categories' && (
          <CategoryManager />
        )}

        {activeTab === 'export' && (
          <ExportData />
        )}
      </div>
    </Layout>
  );
} 