"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { PlusCircle, Trash2, DollarSign, RefreshCcw, TrendingUp, Link as LinkIcon } from 'lucide-react';
import { getCurrentUser } from '@/services/auth';
import { 
  getInvestments, 
  createInvestment, 
  deleteInvestment, 
  getLatestExchangeRates,
  getTotalInvestmentValue,
  Investment,
  InvestmentSummary
} from '@/services/investments';
import {
  getInvestmentBudgetLinks,
  createInvestmentBudgetLink,
  updateInvestmentBudgetLink,
  deleteInvestmentBudgetLink,
  getRemainingInvestmentAmount,
  InvestmentBudgetLink,
  RemainingInvestmentData
} from '@/services/investment-budget';
import { getAllCategories } from '@/services/categories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InversionesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [inversiones, setInversiones] = useState<Investment[]>([]);
  const [tiposCambio, setTiposCambio] = useState<any>(null);
  const [totales, setTotales] = useState<InvestmentSummary>({
    totalARS: 0,
    totalUSD: 0,
    totalInARS: 0,
    rates: {
      oficial_rate: 0,
      blue_rate: 0,
      mep_rate: 0,
      date: ''
    }
  });
  
  // Estado para la vinculación con presupuesto
  const [presupuestoLinks, setPresupuestoLinks] = useState<InvestmentBudgetLink[]>([]);
  const [remainingData, setRemainingData] = useState<RemainingInvestmentData | null>(null);
  const [showBudgetLinkForm, setShowBudgetLinkForm] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  
  // Estados para el formulario de inversiones
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [nombreActivo, setNombreActivo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [tipoCambio, setTipoCambio] = useState('');
  const [tipoActivo, setTipoActivo] = useState<'CEDEAR' | 'Acción' | 'Bono' | 'Otro'>('CEDEAR');

  const opcionesTipoActivo: SelectOption[] = [
    { value: 'CEDEAR', label: 'CEDEAR' },
    { value: 'Acción', label: 'Acción' },
    { value: 'Bono', label: 'Bono' },
    { value: 'Otro', label: 'Otro' }
  ];

  const opcionesMoneda: SelectOption[] = [
    { value: 'ARS', label: 'Pesos (ARS)' },
    { value: 'USD', label: 'Dólares (USD)' }
  ];

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          
          // Cargar categorías
          const { data: categoriasData } = await getAllCategories(user.id);
          setCategorias(categoriasData);
          
          // Cargar tipos de cambio
          const rates = await getLatestExchangeRates();
          setTiposCambio(rates);
          
          // Cargar inversiones y vinculaciones con presupuesto
          await recargarInversiones(user.id);
          await cargarVinculacionesPresupuesto(user.id);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);

  const recargarInversiones = async (id: string) => {
    try {
      // Cargar inversiones
      const inversionesData = await getInvestments(id);
      setInversiones(inversionesData);
      
      // Calcular totales
      const totalesData = await getTotalInvestmentValue(id);
      setTotales(totalesData);
    } catch (error) {
      console.error('Error recargando inversiones:', error);
    }
  };

  const cargarVinculacionesPresupuesto = async (id: string) => {
    try {
      // Cargar vinculaciones activas
      const links = await getInvestmentBudgetLinks(id);
      setPresupuestoLinks(links);
      
      // Cargar datos de monto restante a invertir
      const remainingInfo = await getRemainingInvestmentAmount(id, currentMonth);
      setRemainingData(remainingInfo);
    } catch (error) {
      console.error('Error cargando vinculaciones con presupuesto:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!userId) {
      setFormError('No se pudo identificar al usuario');
      return;
    }

    if (!nombreActivo || !cantidad || !precio || !fecha || !tipoActivo) {
      setFormError('Por favor completa todos los campos requeridos');
      return;
    }

    setFormLoading(true);
    
    try {
      const nuevaInversion = await createInvestment({
        user_id: userId,
        asset_name: nombreActivo,
        quantity: parseFloat(cantidad),
        purchase_price: parseFloat(precio),
        purchase_date: fecha,
        currency: moneda,
        exchange_rate: tipoCambio ? parseFloat(tipoCambio) : null,
        asset_type: tipoActivo
      });
      
      // Recargar inversiones
      await recargarInversiones(userId);
      
      // Limpiar formulario
      setNombreActivo('');
      setCantidad('');
      setPrecio('');
      setFecha(format(new Date(), 'yyyy-MM-dd'));
      setMoneda('ARS');
      setTipoCambio('');
      setTipoActivo('CEDEAR');
      
    } catch (error) {
      console.error('Error creando inversión:', error);
      setFormError('Error al crear la inversión');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar esta inversión?')) {
      try {
        await deleteInvestment(id);
        await recargarInversiones(userId);
      } catch (error) {
        console.error('Error eliminando inversión:', error);
      }
    }
  };

  const handleBudgetLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !selectedCategoryId || !monthlyAmount) {
      setFormError('Por favor selecciona una categoría y un monto mensual');
      return;
    }

    setFormLoading(true);
    
    try {
      await createInvestmentBudgetLink(
        userId, 
        selectedCategoryId, 
        parseFloat(monthlyAmount)
      );
      
      // Recargar vinculaciones
      await cargarVinculacionesPresupuesto(userId);
      
      // Recargar totales para actualizar el contador
      const totalesData = await getTotalInvestmentValue(userId);
      setTotales(totalesData);
      
      // Limpiar formulario y ocultarlo
      setSelectedCategoryId('');
      setMonthlyAmount('');
      setShowBudgetLinkForm(false);
    } catch (error) {
      console.error('Error creando vinculación con presupuesto:', error);
      setFormError('Error al crear la vinculación');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBudgetLink = async (id: string) => {
    if (!userId) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar esta vinculación con presupuesto?')) {
      try {
        await deleteInvestmentBudgetLink(id);
        await cargarVinculacionesPresupuesto(userId);
        
        // Recargar totales para actualizar el contador
        const totalesData = await getTotalInvestmentValue(userId);
        setTotales(totalesData);
      } catch (error) {
        console.error('Error eliminando vinculación con presupuesto:', error);
      }
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

  // Calcular valor actual (simulado, en una app real se obtendría de una API)
  const calcularValorActual = (inversion: Investment) => {
    // Simulamos un valor actual con una variación aleatoria entre -10% y +20%
    const variacion = 1 + (Math.random() * 0.3 - 0.1);
    return inversion.quantity * inversion.purchase_price * variacion;
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inversiones</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total en ARS</p>
                    <h3 className="text-2xl font-bold mt-1">${formatearMonto(totales.totalInARS)}</h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900">
                    <DollarSign size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En Pesos (ARS)</p>
                    <h3 className="text-2xl font-bold mt-1">${formatearMonto(totales.totalARS)}</h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full dark:bg-green-900">
                    <DollarSign size={24} className="text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En Dólares (USD)</p>
                    <h3 className="text-2xl font-bold mt-1">US$ {formatearMonto(totales.totalUSD)}</h3>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full dark:bg-purple-900">
                    <DollarSign size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contador de Monto Restante a Invertir */}
          <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Monto Restante a Invertir</p>
                  <h3 className="text-2xl font-bold mt-1 text-indigo-800 dark:text-indigo-200">
                    ${formatearMonto(totales.remainingToInvest || 0)}
                  </h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:hover:bg-indigo-800"
                  onClick={() => setShowBudgetLinkForm(!showBudgetLinkForm)}
                >
                  <LinkIcon size={18} className="mr-2" />
                  {showBudgetLinkForm ? 'Cancelar' : 'Vincular a presupuesto'}
                </Button>
              </div>

              {showBudgetLinkForm && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Vincular categoría de presupuesto</h4>
                  <form onSubmit={handleBudgetLinkSubmit} className="space-y-4">
                    <div>
                      <Select
                        label="Categoría"
                        value={selectedCategoryId}
                        onChange={setSelectedCategoryId}
                        options={categorias.map((cat) => ({
                          value: cat.id,
                          label: cat.name
                        }))}
                        placeholder="Selecciona una categoría"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        label="Monto mensual a invertir"
                        value={monthlyAmount}
                        onChange={(e) => setMonthlyAmount(e.target.value)}
                        placeholder="Ingresa el monto mensual"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={formLoading}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {formLoading ? 'Guardando...' : 'Guardar vinculación'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {remainingData && remainingData.links.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Categorías vinculadas:</p>
                  <div className="space-y-2">
                    {remainingData.links.map((link) => (
                      <div 
                        key={link.id} 
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: link.category_color || '#6366F1' }}
                          ></div>
                          <span>{link.category_name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm mr-4">
                            ${formatearMonto(link.remaining_amount)} restante de ${formatearMonto(link.monthly_amount)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            onClick={() => handleDeleteBudgetLink(link.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {tiposCambio && (
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Tipos de Cambio</span>
                  <span className="text-sm text-gray-500">
                    Actualizado: {formatearFecha(tiposCambio.date)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Dólar Oficial</p>
                    <p className="text-xl font-bold">$ {formatearMonto(tiposCambio.oficial_rate)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Dólar Blue</p>
                    <p className="text-xl font-bold">$ {formatearMonto(tiposCambio.blue_rate)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Dólar MEP</p>
                    <p className="text-xl font-bold">$ {formatearMonto(tiposCambio.mep_rate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Mis Inversiones</CardTitle>
                </CardHeader>
                <CardContent>
                  {inversiones.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      No tienes inversiones registradas. ¡Agrega una!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inversiones.map((inversion) => {
                        const valorActual = calcularValorActual(inversion);
                        const valorOriginal = inversion.quantity * inversion.purchase_price;
                        const rendimiento = ((valorActual / valorOriginal) - 1) * 100;
                        const esGanancia = rendimiento >= 0;
                        
                        return (
                          <div key={inversion.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <span className="font-medium text-lg">{inversion.asset_name}</span>
                                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                                    {inversion.asset_type}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {inversion.quantity} unidades x {inversion.currency === 'ARS' ? '$' : 'US$'} {formatearMonto(inversion.purchase_price)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Comprado el {formatearFecha(inversion.purchase_date)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <span 
                                  className={`text-lg font-bold ${esGanancia ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {esGanancia ? '+' : ''}{rendimiento.toFixed(2)}%
                                </span>
                                <span className="text-sm text-gray-500">
                                  {inversion.currency === 'ARS' ? '$' : 'US$'} {formatearMonto(valorOriginal)}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-2"
                                  onClick={() => handleDelete(inversion.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Registrar Nueva Inversión</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                      <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                        {formError}
                      </div>
                    )}
                    
                    <div>
                      <Input
                        label="Nombre del activo"
                        value={nombreActivo}
                        onChange={(e) => setNombreActivo(e.target.value)}
                        placeholder="Ej: Acción de Apple, Bono Global 2037"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="number"
                          label="Cantidad"
                          value={cantidad}
                          onChange={(e) => setCantidad(e.target.value)}
                          placeholder="Cantidad de unidades"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          label="Precio por unidad"
                          value={precio}
                          onChange={(e) => setPrecio(e.target.value)}
                          placeholder="Precio pagado por unidad"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Select
                          label="Moneda"
                          value={moneda}
                          onChange={(value) => setMoneda(value as 'ARS' | 'USD')}
                          options={opcionesMoneda}
                        />
                      </div>
                      <div>
                        <Select
                          label="Tipo de activo"
                          value={tipoActivo}
                          onChange={(value) => setTipoActivo(value as 'CEDEAR' | 'Acción' | 'Bono' | 'Otro')}
                          options={opcionesTipoActivo}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="date"
                          label="Fecha de compra"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                        />
                      </div>
                      {moneda === 'USD' && (
                        <div>
                          <Input
                            type="number"
                            label="Tipo de cambio aplicado (opcional)"
                            value={tipoCambio}
                            onChange={(e) => setTipoCambio(e.target.value)}
                            placeholder="Tipo de cambio usado"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 text-right">
                      <Button type="submit" disabled={formLoading}>
                        {formLoading ? 'Guardando...' : 'Registrar Inversión'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 