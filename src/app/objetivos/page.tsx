"use client";

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Target } from 'lucide-react';
import { getCurrentUser } from '@/services/auth';
import { getGoals, createGoal, contributeToGoal, Goal } from '@/services/goals';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ObjetivosPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [objetivos, setObjetivos] = useState<Goal[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Estados para el formulario de nuevo objetivo
  const [nombre, setNombre] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [montoInicial, setMontoInicial] = useState('');
  const [fechaObjetivo, setFechaObjetivo] = useState('');
  
  // Estados para el formulario de contribución
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState<string | null>(null);
  const [montoContribucion, setMontoContribucion] = useState('');
  const [contribuyendo, setContribuyendo] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          
          // Cargar objetivos
          const objetivosData = await getGoals(user.id);
          setObjetivos(objetivosData);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!userId) {
      setFormError('No se pudo identificar al usuario');
      return;
    }

    setFormLoading(true);
    
    try {
      const nuevoObjetivo = await createGoal({
        user_id: userId,
        name: nombre,
        target_amount: parseFloat(montoObjetivo),
        current_amount: montoInicial ? parseFloat(montoInicial) : 0,
        target_date: fechaObjetivo || null
      });
      
      // Recargar objetivos
      const objetivosActualizados = await getGoals(userId);
      setObjetivos(objetivosActualizados);
      
      // Limpiar formulario
      setNombre('');
      setMontoObjetivo('');
      setMontoInicial('');
      setFechaObjetivo('');
      
    } catch (error) {
      console.error('Error creando objetivo:', error);
      setFormError('Error al crear el objetivo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleContribuir = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!objetivoSeleccionado) {
      setFormError('Selecciona un objetivo');
      return;
    }

    setContribuyendo(true);
    
    try {
      await contributeToGoal(objetivoSeleccionado, parseFloat(montoContribucion));
      
      // Recargar objetivos
      if (userId) {
        const objetivosActualizados = await getGoals(userId);
        setObjetivos(objetivosActualizados);
      }
      
      // Limpiar formulario
      setObjetivoSeleccionado(null);
      setMontoContribucion('');
      
    } catch (error) {
      console.error('Error contribuyendo al objetivo:', error);
      setFormError('Error al contribuir al objetivo');
    } finally {
      setContribuyendo(false);
    }
  };

  // Formatear montos para mostrar
  const formatearMonto = (monto: number) => {
    return monto.toLocaleString('es-AR');
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return 'Sin fecha límite';
    
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
          <h1 className="text-2xl font-bold">Objetivos de Ahorro</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Mis Objetivos</CardTitle>
                </CardHeader>
                <CardContent>
                  {objetivos.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      No tienes objetivos de ahorro. ¡Crea uno!
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {objetivos.map((objetivo) => {
                        const progreso = Math.round((objetivo.current_amount / objetivo.target_amount) * 100);
                        return (
                          <div key={objetivo.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex justify-between mb-1">
                              <div className="flex items-center">
                                <Target size={18} className="mr-2 text-blue-600" />
                                <span className="font-medium">{objetivo.name}</span>
                              </div>
                              <span className="text-sm font-medium">${formatearMonto(objetivo.current_amount)} / ${formatearMonto(objetivo.target_amount)}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700 mt-2">
                              <div 
                                className="h-2 bg-blue-600 rounded-full" 
                                style={{ width: `${progreso}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                              <span>{progreso}% completado</span>
                              <span>{formatearFecha(objetivo.target_date)}</span>
                            </div>
                            <div className="mt-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs"
                                onClick={() => {
                                  setObjetivoSeleccionado(objetivo.id);
                                  setMontoContribucion('');
                                }}
                              >
                                Contribuir
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {objetivoSeleccionado && (
                    <div className="mt-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                      <h3 className="font-medium mb-3">Contribuir al objetivo</h3>
                      <form onSubmit={handleContribuir} className="space-y-4">
                        <Input
                          label="Monto a contribuir"
                          type="number"
                          placeholder="0.00"
                          value={montoContribucion}
                          onChange={(e) => setMontoContribucion(e.target.value)}
                          required
                        />
                        <div className="flex space-x-2">
                          <Button
                            type="submit"
                            disabled={contribuyendo}
                          >
                            {contribuyendo ? 'Procesando...' : 'Contribuir'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setObjetivoSeleccionado(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Nuevo Objetivo</CardTitle>
                </CardHeader>
                <CardContent>
                  {formError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {formError}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      label="Nombre del objetivo"
                      placeholder="Ej: Viaje a Brasil, Fondo de emergencia, etc."
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                    
                    <Input
                      label="Monto objetivo"
                      type="number"
                      placeholder="0.00"
                      value={montoObjetivo}
                      onChange={(e) => setMontoObjetivo(e.target.value)}
                      required
                    />
                    
                    <Input
                      label="Monto inicial (opcional)"
                      type="number"
                      placeholder="0.00"
                      value={montoInicial}
                      onChange={(e) => setMontoInicial(e.target.value)}
                    />
                    
                    <Input
                      label="Fecha objetivo (opcional)"
                      type="date"
                      value={fechaObjetivo}
                      onChange={(e) => setFechaObjetivo(e.target.value)}
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
                            Crear Objetivo
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
      </div>
    </Layout>
  );
} 