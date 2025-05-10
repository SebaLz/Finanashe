"use client";

import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Edit2, Save, Check, AlertCircle, Loader2, Plus, Trash2, ArrowRight, Filter, Settings, ToggleLeft, ToggleRight, Receipt, Power, PowerOff, X } from 'lucide-react';
import { getBudgetSummary, createBudget, updateBudget, deleteBudget, BudgetWithCategory, BudgetWithFixedExpenses, getDetailedBudget, updateBudgetFixedExpenseSetting } from '@/services/budgets';
import { getCategories, createCategory, deleteCategory, updateCategory, setCategoryVisibility, createCustomCategory } from '@/services/categories';
import { useUser } from '@/hooks/useUser';
import { Select, SelectOption } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { checkTransactionsTable, getTransactions } from '@/services/transactions';
import { getFixedExpensesByCategory, FixedExpenseWithCategory } from '@/services/fixed-expenses';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  is_default?: boolean;
  is_visible?: boolean;
};

export default function PresupuestoPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [showAvanzado, setShowAvanzado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tableStatus, setTableStatus] = useState<{ exists: boolean; error?: any } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [showFixedExpensesModal, setShowFixedExpensesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithFixedExpenses | null>(null);
  const [loadingFixedExpenses, setLoadingFixedExpenses] = useState(false);
  const [fixedExpensesDetail, setFixedExpensesDetail] = useState<{
    included: FixedExpenseWithCategory[];
    excluded: FixedExpenseWithCategory[];
  }>({ included: [], excluded: [] });
  
  // Fecha actual para filtrar presupuestos
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // Estado para datos de presupuesto
  const [presupuestoTotal, setPresupuestoTotal] = useState(0);
  const [presupuestos, setPresupuestos] = useState<BudgetWithFixedExpenses[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Estado para formulario de categoría
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3B82F6'
  });

  // Estado para guardar los valores originales
  const [originalValues, setOriginalValues] = useState<{
    presupuestoTotal: number;
    presupuestos: BudgetWithFixedExpenses[];
  } | null>(null);

  // Cargar datos cuando cambia el usuario o el mes seleccionado
  useEffect(() => {
    loadData();
  }, [user, selectedMonth]);

  // Verificar estado de tabla transactions
  useEffect(() => {
    async function checkTables() {
      if (!user) return;
      
      try {
        const status = await checkTransactionsTable();
        setTableStatus(status);
        
        if (!status.exists) {
          console.error('La tabla transactions no existe o hay problemas de permisos:', status.error);
          setError('Error de configuración: La tabla transactions no existe o no tienes permisos para acceder a ella.');
        }
      } catch (err) {
        console.error('Error verificando tablas:', err);
      }
    }
    
    checkTables();
  }, [user]);

  const [totalPercentage, setTotalPercentage] = useState(0);

  // Calcular porcentaje total cuando cambian los presupuestos
  useEffect(() => {
    const total = presupuestos.reduce((sum, p) => sum + (p.percentage || 0), 0);
    setTotalPercentage(Math.round(total * 100) / 100);
  }, [presupuestos]);

  // Sincronizar con el sueldo mensual
  useEffect(() => {
    const sincronizarConSueldo = async () => {
      if (!user) return;
      
      try {
        // Obtener transacciones del mes actual
        const transaccionesData = await getTransactions(user.id, selectedMonth);
        
        // Encontrar el sueldo (transacción de tipo ingreso con categoría "Sueldo")
        const sueldo = transaccionesData.find(t => 
          t.type === 'income' && 
          t.categories?.name.toLowerCase() === 'sueldo'
        );
        
        if (sueldo && !editMode) {
          setPresupuestoTotal(sueldo.amount);
          
          // Actualizar montos basados en porcentajes
          const actualizados = presupuestos.map(p => ({
            ...p,
            amount: Math.round((p.percentage / 100) * sueldo.amount)
          }));
          
          setPresupuestos(actualizados);
        }
      } catch (error) {
        console.error('Error sincronizando con sueldo:', error);
      }
    };
    
    sincronizarConSueldo();
  }, [user, selectedMonth, editMode]);

  async function loadData() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cargar categorías
      const categoriesData = await getCategories(user.id);
      
      // Filtrar solo categorías visibles para mostrar en la interfaz y presupuestos
      const visibleCategories = categoriesData.filter(cat => cat.is_visible !== false);
      setCategories(categoriesData); // Para la sección de opciones avanzadas mostramos todas
      
      // Cargar presupuestos con gastos reales (solo de categorías visibles)
      const budgetSummary = await getBudgetSummary(user.id, selectedMonth);
      
      // Filtrar presupuestos para mostrar solo los que corresponden a categorías visibles
      const visibleBudgetSummary = budgetSummary.filter(budget => {
        const category = categoriesData.find(cat => cat.id === budget.category_id);
        return category && category.is_visible !== false;
      });
      
      setPresupuestos(visibleBudgetSummary);
      
      // Calcular presupuesto total
      const total = visibleBudgetSummary.reduce((sum, item) => sum + item.amount, 0);
      setPresupuestoTotal(total || 0);
    } catch (err) {
      console.error('Error al cargar datos de presupuesto:', err);
      setError('No se pudieron cargar los datos de presupuesto');
    } finally {
      setLoading(false);
    }
  }

  const handleChangePresupuestoTotal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = parseFloat(e.target.value);
    setPresupuestoTotal(valor);
    
    // Actualizar montos en base a porcentajes
    const actualizados = presupuestos.map(p => ({
      ...p,
      amount: Math.round((p.percentage / 100) * valor)
    }));
    
    setPresupuestos(actualizados);
  };

  const handleChangePorcentaje = (id: string, valor: number) => {
    const nuevosPorcentajes = presupuestos.map(p => 
      p.id === id ? { ...p, percentage: valor, amount: Math.round((valor / 100) * presupuestoTotal) } : p
    );
    setPresupuestos(nuevosPorcentajes);
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Validar que los porcentajes sumen 100%
      const totalPercentage = presupuestos.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: "Error en los porcentajes",
          description: `Los porcentajes deben sumar 100%. Actualmente suman ${totalPercentage}%`,
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Validar que los montos sean positivos
      if (presupuestoTotal <= 0) {
        toast({
          title: "Error en el presupuesto total",
          description: "El presupuesto total debe ser mayor a 0",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Guardar cada presupuesto actualizado
      for (const presupuesto of presupuestos) {
        if (!presupuesto.id || !presupuesto.category_id) {
          toast({
            title: "Error en los datos",
            description: "Hay datos de presupuesto inválidos",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }

        await updateBudget(presupuesto.id, {
          category_id: presupuesto.category_id,
          amount: presupuesto.amount,
          percentage: presupuesto.percentage,
          month: selectedMonth
        });
      }
      
      // Recargar datos actualizados
      await loadData();
      
      // Mostrar mensaje de éxito
      toast({
        title: "Presupuesto actualizado",
        description: "Los cambios se han guardado correctamente",
      });
      
      // Salir del modo edición
      setEditMode(false);
    } catch (err) {
      console.error('Error al guardar presupuestos:', err);
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : 'No se pudieron guardar los cambios',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para crear presupuestos iniciales
  const handleCreateInitialBudgets = async () => {
    if (!user || categories.length === 0) return;
    
    setCreating(true);
    setError(null);
    
    try {
      // Verificar que el presupuesto total sea mayor que cero
      if (presupuestoTotal <= 0) {
        setPresupuestoTotal(100000); // Establecer un valor por defecto si es cero
      }
      
      // Filtrar solo categorías visibles para el presupuesto
      const visibleCategories = categories.filter(cat => cat.is_visible !== false);
      
      if (visibleCategories.length === 0) {
        throw new Error('No hay categorías activas para crear presupuestos. Activa al menos una categoría.');
      }
      
      console.log('Creando presupuestos iniciales para:', {
        userId: user.id,
        month: selectedMonth,
        categoriesCount: visibleCategories.length,
        presupuestoTotal
      });
      
      // Distribuir el presupuesto total entre categorías visibles
      const categoriesCount = visibleCategories.length;
      const defaultPercentage = Math.floor(100 / categoriesCount);
      let remainingPercentage = 100 - (defaultPercentage * categoriesCount);
      
      // Crear un presupuesto para cada categoría visible
      for (const category of visibleCategories) {
        try {
          // Ajustar el último porcentaje para que sume exactamente 100%
          const percentage = remainingPercentage > 0 
            ? defaultPercentage + 1 
            : defaultPercentage;
          
          // Calcular monto basado en porcentaje
          const amount = Math.round((percentage / 100) * presupuestoTotal);
          
          console.log('Creando presupuesto para categoría:', {
            categoryId: category.id,
            categoryName: category.name,
            percentage,
            amount
          });
          
          // Crear presupuesto
          await createBudget({
            user_id: user.id,
            category_id: category.id,
            amount: amount,
            percentage: percentage,
            month: selectedMonth
          });
          
          // Actualizar porcentaje restante
          if (remainingPercentage > 0) {
            remainingPercentage--;
          }
        } catch (categoryError) {
          console.error(`Error al crear presupuesto para categoría ${category.name}:`, categoryError);
          // Continuamos con la siguiente categoría
        }
      }
      
      // Recargar datos actualizados
      await loadData();
      
      // Salir del modo edición
      setEditMode(false);
    } catch (err) {
      console.error('Error al crear presupuestos:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudieron crear los presupuestos. Por favor, intenta nuevamente.');
      }
    } finally {
      setCreating(false);
    }
  };

  // Funciones para gestionar categorías
  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({
        name: category.name,
        color: category.color
      });
    } else {
      setSelectedCategory(null);
      setCategoryForm({
        name: '',
        color: '#3B82F6'
      });
    }
    setShowCategoryModal(true);
  };

  const handleOpenDeleteCategoryModal = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteCategoryModal(true);
  };

  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCategory = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      if (!categoryForm.name || !categoryForm.color) {
        throw new Error('El nombre y color son obligatorios');
      }
      
      if (selectedCategory) {
        // Actualizar categoría existente
        await updateCategory(selectedCategory.id, {
          name: categoryForm.name,
          color: categoryForm.color
        });
      } else {
        // Crear nueva categoría
        await createCustomCategory(user.id, {
          name: categoryForm.name,
          color: categoryForm.color,
          icon: 'tag' // Icono por defecto
        });
      }
      
      // Recargar datos y cerrar modal
      await loadData();
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Error al guardar categoría:', err);
      setError('No se pudo guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory || !user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Verificar si es una categoría predeterminada
      if (selectedCategory.is_default) {
        // En lugar de eliminar, ocultar la categoría
        await setCategoryVisibility(user.id, selectedCategory.id, false);
        setShowDeleteCategoryModal(false);
        
        // Mostrar mensaje de éxito
        toast({
          title: "Categoría ocultada",
          description: "La categoría ha sido ocultada de tu lista. Puedes restaurarla más tarde desde la sección de administración."
        });
      } else {
        // Si es una categoría personalizada, intentar eliminarla
        await deleteCategory(selectedCategory.id, user.id);
      }
      
      // Recargar datos y cerrar modal
      await loadData();
      setShowDeleteCategoryModal(false);
    } catch (err) {
      console.error('Error al procesar categoría:', err);
      
      if (selectedCategory.is_default) {
        setError('No se pudo ocultar la categoría.');
      } else {
        setError('No se pudo eliminar la categoría. Asegúrate de que no tenga presupuestos o transacciones asociadas.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFixedExpensesModal = async (budget: BudgetWithFixedExpenses) => {
    if (!user) return;
    
    setSelectedBudget(budget);
    setLoadingFixedExpenses(true);
    setFixedExpensesDetail({ included: [], excluded: [] });
    setShowFixedExpensesModal(true);
    
    try {
      // Cargar presupuesto detallado con gastos fijos incluidos/excluidos
      const detailedBudget = await getDetailedBudget(user.id, budget.id);
      
      setFixedExpensesDetail({
        included: detailedBudget.fixed_expenses || [],
        excluded: detailedBudget.excluded_fixed_expenses || []
      });
    } catch (err) {
      console.error('Error al cargar detalle de gastos fijos:', err);
      setError('No se pudieron cargar los gastos fijos');
    } finally {
      setLoadingFixedExpenses(false);
    }
  };

  const handleToggleFixedExpense = async (expense: FixedExpenseWithCategory, isCurrentlyIncluded: boolean) => {
    if (!user || !selectedBudget) return;
    
    try {
      // Actualizar configuración en la base de datos
      await updateBudgetFixedExpenseSetting(
        user.id,
        selectedBudget.id,
        expense.id,
        !isCurrentlyIncluded // Invertir el estado actual
      );
      
      // Actualizar estado local
      if (isCurrentlyIncluded) {
        // Mover de incluidos a excluidos
        setFixedExpensesDetail({
          included: fixedExpensesDetail.included.filter(e => e.id !== expense.id),
          excluded: [...fixedExpensesDetail.excluded, expense]
        });
      } else {
        // Mover de excluidos a incluidos
        setFixedExpensesDetail({
          included: [...fixedExpensesDetail.included, expense],
          excluded: fixedExpensesDetail.excluded.filter(e => e.id !== expense.id)
        });
      }
    } catch (err) {
      console.error('Error al actualizar configuración de gasto fijo:', err);
      setError('No se pudo actualizar la configuración');
    }
  };

  // Función para manejar visibilidad de categorías
  const handleToggleVisibility = async (category: Category) => {
    if (!user) return;
    
    // Store previous state for rollback in case of error
    const previousCategories = categories;
    const previousPresupuestos = presupuestos;
    
    try {
      // Optimistically update UI
      const newIsVisible = !category.is_visible;
      
      // Update categories state
      setCategories(prevCategories => 
        prevCategories.map((cat: Category) => 
          cat.id === category.id 
            ? { ...cat, is_visible: newIsVisible }
            : cat
        )
      );
      
      // Update presupuestos state
      if (newIsVisible) {
        // If showing category, create a new budget entry with default values
        const newBudget: BudgetWithFixedExpenses = {
          id: `temp-${category.id}`, // Temporary ID until saved
          user_id: user.id,
          category_id: category.id,
          amount: 0,
          percentage: 0,
          month: selectedMonth,
          category: {
            ...category,
            is_visible: newIsVisible
          },
          fixed_expenses_amount: 0,
          available_amount: 0
        };
        setPresupuestos(prev => [...prev, newBudget]);
      } else {
        // If hiding category, remove its budget
        setPresupuestos(prev => prev.filter(p => p.category_id !== category.id));
      }
      
      // Update total budget
      const newPresupuestos = newIsVisible 
        ? [...presupuestos, { 
            id: `temp-${category.id}`, 
            amount: 0, 
            percentage: 0,
            fixed_expenses_amount: 0,
            available_amount: 0
          } as BudgetWithFixedExpenses]
        : presupuestos.filter(p => p.category_id !== category.id);
      const newTotal = newPresupuestos.reduce((sum, item) => sum + (item.amount || 0), 0);
      setPresupuestoTotal(newTotal);
      
      // Make API call to update category visibility
      await setCategoryVisibility(user.id, category.id, newIsVisible);
      
      // If showing category, fetch its actual budget
      if (newIsVisible) {
        const budgetSummary = await getBudgetSummary(user.id, selectedMonth);
        const categoryBudget = budgetSummary.find(b => b.category_id === category.id);
        
        if (categoryBudget) {
          setPresupuestos(prev => 
            prev.map(p => p.id === `temp-${category.id}` ? categoryBudget : p)
          );
        }
      }
      
      toast({
        title: newIsVisible ? "Categoría mostrada" : "Categoría ocultada",
        description: `La categoría ${category.name} ha sido ${newIsVisible ? 'mostrada' : 'ocultada'} correctamente`,
      });
    } catch (err) {
      console.error('Error al actualizar visibilidad de categoría:', err);
      
      // Rollback state on error
      setCategories(previousCategories);
      setPresupuestos(previousPresupuestos);
      const previousTotal = previousPresupuestos.reduce((sum, item) => sum + (item.amount || 0), 0);
      setPresupuestoTotal(previousTotal);
      
      toast({
        title: "Error",
        description: "No se pudo actualizar la visibilidad de la categoría",
        variant: "destructive"
      });
    }
  };

  // Generar opciones para selector de meses
  const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: es }).charAt(0).toUpperCase() + 
             format(date, 'MMMM yyyy', { locale: es }).slice(1)
    };
  });

  const handleCancelEdit = () => {
    if (originalValues) {
      setPresupuestoTotal(originalValues.presupuestoTotal);
      setPresupuestos(originalValues.presupuestos);
    }
    setEditMode(false);
  };

  const handleStartEdit = () => {
    setOriginalValues({
      presupuestoTotal,
      presupuestos: [...presupuestos]
    });
    setEditMode(true);
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Presupuesto Mensual</h1>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              options={monthOptions}
              className="w-full sm:w-[180px] mb-0"
            />
            
            {presupuestos.length > 0 && (
              <Button
                variant={editMode ? "secondary" : "default"}
                className="w-full sm:w-auto"
                onClick={() => {
                  if (editMode) {
                    handleSaveChanges();
                  } else {
                    setEditMode(true);
                    setOriginalValues({
                      presupuestoTotal,
                      presupuestos: [...presupuestos]
                    });
                  }
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editMode ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                ) : (
                  <>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar Presupuesto
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 bg-card rounded-lg shadow-sm">
            <Loader2 className="animate-spin mr-2" size={24} />
            <span>Cargando presupuesto...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start shadow-sm">
            <AlertCircle className="mr-2 mt-0.5" size={18} />
            <span>{error}</span>
          </div>
        ) : presupuestos.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No hay presupuesto configurado para este mes</h3>
                <p className="text-muted-foreground mb-6">
                  Configura tu presupuesto mensual para hacer un seguimiento de tus gastos.
                </p>
                <div className="flex justify-center gap-4">
                  <Button 
                    variant="primary"
                    onClick={handleCreateInitialBudgets}
                    disabled={creating || categories.length === 0}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={18} />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2" size={18} />
                        Crear Presupuesto Inicial
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenCategoryModal()}
                    disabled={creating}
                  >
                    Agregar Categoría
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Total Budget Card */}
            <Card className="shadow-sm mb-6">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">Presupuesto Total</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Distribuye tu presupuesto mensual entre las categorías
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {editMode && (
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAvanzado(!showAvanzado)}
                      className="text-xs w-full sm:w-auto justify-center"
                    >
                      {showAvanzado ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/gastos-fijos')}
                      className="text-xs w-full sm:w-auto justify-center flex items-center gap-1 bg-white dark:bg-gray-800"
                    >
                      Gestionar Gastos Fijos
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="text-3xl font-bold mr-2">$</span>
                    {editMode ? (
                      <Input
                        type="number"
                        value={presupuestoTotal}
                        onChange={handleChangePresupuestoTotal}
                        className="text-3xl font-bold border-0 p-0 h-auto focus-visible:ring-0"
                        min="0"
                        step="1000"
                      />
                    ) : (
                      <span className="text-3xl font-bold">{presupuestoTotal.toLocaleString()}</span>
                    )}
                  </div>
                  
                  {editMode && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>Distribución del presupuesto</span>
                        <span className={`font-medium ${
                          totalPercentage === 100 ? 'text-green-600' :
                          totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {totalPercentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            totalPercentage === 100 ? 'bg-green-600' :
                            totalPercentage > 100 ? 'bg-red-600' : 'bg-yellow-600'
                          }`}
                          style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categories Section */}
            {showAvanzado && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Categorías</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Gestiona las categorías para tu presupuesto
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCategoryModal()}
                    >
                      <Plus size={16} className="mr-1" />
                      Agregar Categoría
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map(category => (
                      <div 
                        key={category.id} 
                        className={`flex flex-col p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                          category.is_visible === false ? 'opacity-60 bg-gray-50 dark:bg-gray-900/20' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 flex items-center justify-center"
                              onClick={() => handleOpenCategoryModal(category)}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 w-7 p-0 flex items-center justify-center ${
                                category.is_visible === false ? 'text-green-600' : 'text-amber-600'
                              }`}
                              onClick={() => handleToggleVisibility(category)}
                              title={category.is_visible === false ? "Activar categoría" : "Desactivar categoría"}
                            >
                              {category.is_visible === false ? <PowerOff size={14} /> : <Power size={14} />}
                            </Button>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-foreground">{category.name}</span>
                        <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-flex ${
                          category.is_visible !== false 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400"
                        }`}>
                          {category.is_visible !== false ? "Activa" : "Inactiva"}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {presupuestos.map((presupuesto) => {
                const categoria = categories.find(c => c.id === presupuesto.category_id);
                // Calcular el total gastado (gastos variables + fijos)
                const totalGastado = (presupuesto.spent ?? 0) + (presupuesto.fixed_expenses_amount ?? 0);
                const porcentajeGastado = (totalGastado / (presupuesto.amount ?? 1)) * 100;
                
                return (
                  <Card key={presupuesto.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: categoria?.color || '#3B82F6' }} 
                            />
                            {categoria?.name || 'Sin categoría'}
                          </CardTitle>
                          {editMode && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={presupuesto.percentage}
                                onChange={(e) => handleChangePorcentaje(presupuesto.id, parseFloat(e.target.value))}
                                className="w-20 h-8 text-sm"
                                min="0"
                                max="100"
                                step="1"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-sm text-muted-foreground">Asignado</span>
                            <p className="font-medium text-lg">${(presupuesto.amount ?? 0).toLocaleString()}</p>
                          </div>
                          
                          {presupuesto.fixed_expenses_amount > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-muted-foreground">Gastos fijos</span>
                                <Badge variant="outline" className="text-xs">
                                  Recurrentes
                                </Badge>
                              </div>
                              <p className="font-medium text-lg text-amber-600">
                                -${(presupuesto.fixed_expenses_amount ?? 0).toLocaleString()}
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-1.5">
                            <span className="text-sm text-muted-foreground">Disponible</span>
                            <p className="font-medium text-lg">${(presupuesto.available_amount ?? 0).toLocaleString()}</p>
                          </div>
                          
                          <div className="space-y-1.5 flex flex-col justify-center">
                            <span className="text-sm text-muted-foreground">Gastado</span>
                            <p className="font-medium text-lg text-right text-red-600 flex items-center h-full">
                              ${totalGastado.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className={`font-medium ${
                              porcentajeGastado > 100 ? 'text-red-600' :
                              porcentajeGastado >= 80 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                              {Math.round(porcentajeGastado)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                porcentajeGastado > 100 ? 'bg-red-600' :
                                porcentajeGastado >= 80 ? 'bg-amber-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}