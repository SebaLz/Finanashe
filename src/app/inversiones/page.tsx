"use client";

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { PlusCircle, Trash2, DollarSign, RefreshCcw } from 'lucide-react';
import { getCurrentUser } from '@/services/auth';
import { 
  getInvestments, 
  createInvestment, 
  deleteInvestment, 
  getLatestExchangeRates,
  getTotalInvestmentValue,
  Investment 
} from '@/services/investments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InversionesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [inversiones, setInversiones] = useState<Investment[]>([]);
  const [tiposCambio, setTiposCambio] = useState<any>(null);
  const [totales, setTotales] = useState({
    totalARS: 0,
    totalUSD: 0,
    totalInARS: 0
  });
  
  // Estados para el formulario
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
          
          // Cargar tipos de cambio
          const rates = await getLatestExchangeRates();
          setTiposCambio(rates);
          
          // Cargar inversiones
          await recargarInversiones(user.id);
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
      setTotales({
        totalARS: totalesData.totalARS,
        totalUSD: totalesData.totalUSD,
        totalInARS: totalesData.totalInARS
      });
    } catch (error) {
      console.error('Error recargando inversiones:', error);
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
    <Layout>
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
                      <p className="text-xl font-bold">$ {formatearMonto(tiposCambio.mep_rate || 0)}</p>
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
                                <div className="flex items-center">
                                  <div className="text-right mr-4">
                                    <p className="font-medium">
                                      {inversion.currency === 'ARS' ? '$' : 'US$'} {formatearMonto(valorActual)}
                                    </p>
                                    <p className={`text-sm ${esGanancia ? 'text-green-600' : 'text-red-600'}`}>
                                      {esGanancia ? '+' : ''}{rendimiento.toFixed(2)}%
                                    </p>
                                  </div>
                                  <button 
                                    onClick={() => handleDelete(inversion.id)}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                  >
                                    <Trash2 size={18} className="text-gray-500" />
                                  </button>
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
                    <CardTitle>Nueva Inversión</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formError && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {formError}
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input
                        label="Nombre del activo"
                        placeholder="Ej: AAPL, MELI, AL30, etc."
                        value={nombreActivo}
                        onChange={(e) => setNombreActivo(e.target.value)}
                        required
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Cantidad"
                          type="number"
                          step="0.001"
                          placeholder="0.00"
                          value={cantidad}
                          onChange={(e) => setCantidad(e.target.value)}
                          required
                        />
                        
                        <Input
                          label="Precio de compra"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={precio}
                          onChange={(e) => setPrecio(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                          label="Tipo de activo"
                          options={opcionesTipoActivo}
                          value={tipoActivo}
                          onChange={(value) => setTipoActivo(value as any)}
                          required
                        />
                        
                        <Select
                          label="Moneda"
                          options={opcionesMoneda}
                          value={moneda}
                          onChange={(value) => setMoneda(value as any)}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Fecha de compra"
                          type="date"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          required
                        />
                        
                        {moneda === 'USD' && (
                          <Input
                            label="Tipo de cambio (opcional)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={tipoCambio}
                            onChange={(e) => setTipoCambio(e.target.value)}
                            helpText="Tipo de cambio ARS/USD al momento de la compra"
                          />
                        )}
                      </div>
                      
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
                              Agregar Inversión
                            </>
                          )}
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
    </Layout>
  );
} 