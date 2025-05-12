"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Edit2, Save, Check, AlertCircle, Loader2, Plus, Trash2, ArrowRight, Filter, Settings, ToggleLeft, ToggleRight, Receipt, Power, PowerOff, X, Target, Pencil, XCircle } from 'lucide-react';
import { getBudgetSummary, createBudget, updateBudget, deleteBudget, BudgetWithCategory, BudgetWithFixedExpenses, getDetailedBudget, updateBudgetFixedExpenseSetting } from '@/services/budgets';
import { getCategories, createCategory, deleteCategory, updateCategory, setCategoryVisibility, createCustomCategory, getBudgetCategories, setCategoryBudgetVisibility, getCategoriesByType, Category, setMultipleCategoriesAsBudgetType } from '@/services/categories';
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
import { BudgetMethodConfig } from '@/components/budget/BudgetMethodConfig';
import { getMonthlyBudgetTotal } from '@/services/budget-method';
import { supabase } from '@/lib/supabase';
import { BudgetSummary } from '@/components/budget/BudgetSummary';
import { BudgetEditForm } from '@/components/budget/BudgetEditForm';
import { MethodConfigModal } from '@/components/budget/MethodConfigModal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { getGoalsForBudget, BudgetGoalLinkWithDetails, processAutomaticContributions } from '@/services/budget-goals';
import { ManageBudgetLinks } from './components/ManageBudgetLinks';

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
  const [showAddToBudgetModal, setShowAddToBudgetModal] = useState(false);
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
  const [presupuestos, setPresupuestos] = useState<BudgetWithFixedExpenses[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasExistingBudgets, setHasExistingBudgets] = useState(false);

  // Estado para formulario de categoría
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3B82F6'
  });

  // Estado para guardar los valores originales
  const [originalValues, setOriginalValues] = useState<{
    presupuestos: BudgetWithFixedExpenses[];
  } | null>(null);

  // Estado para el total del presupuesto calculado
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);

  // Añadir este estado
  const [showMethodConfigModal, setShowMethodConfigModal] = useState(false);

  // Añadir el estado para los objetivos vinculados
  const [showGoalLinksModal, setShowGoalLinksModal] = useState(false);
  const [loadingGoalLinks, setLoadingGoalLinks] = useState(false);
  const [goalLinksDetail, setGoalLinksDetail] = useState<BudgetGoalLinkWithDetails[]>([]);

  // Cargar datos cuando cambia el usuario o el mes seleccionado
  useEffect(() => {
    loadData();
  }, [user, selectedMonth]);

  // Verificar estado de tabla transactions
  useEffect(() => {
    async function checkTables() {
      try {
        // Verificar si existe la tabla transactions
        const { count: transactionsCount, error: transactionsError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });
          
        if (transactionsError) {
          // Registrar el error pero no mostrarlo como bloqueante para el usuario
          console.error('La tabla transactions no existe o hay problemas de permisos:', transactionsError.message);
          
          // En lugar de bloquear, mostrar un mensaje en la consola
          console.info('La función de presupuestos requiere la tabla transactions. Por favor, ejecuta el script de configuración de la base de datos.');
        } else {
          console.log('Tabla transactions OK, registros encontrados:', transactionsCount);
        }
        
        // Verificar si existe la tabla budget_method_configuration
        const { count: budgetConfigCount, error: budgetConfigError } = await supabase
          .from('budget_method_configuration')
          .select('*', { count: 'exact', head: true });
          
        if (budgetConfigError) {
          console.error('Error verificando budget_method_configuration:', budgetConfigError.message);
        } else {
          console.log('Tabla budget_method_configuration OK, registros encontrados:', budgetConfigCount);
        }
        
        // No bloquear la interfaz aunque haya errores, continuar con funcionalidad limitada
        return true;
      } catch (err) {
        console.error('Error verificando tablas:', err);
        // Seguimos permitiendo el funcionamiento con funcionalidad limitada
        return true;
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

  // Cargar el total calculado cuando cambie el usuario o el mes
  // useEffect(() => {
  //   loadCalculatedTotal();
  // }, [user, selectedMonth]);

  const loadCalculatedTotal = async () => {
    if (!user) return;
    
    try {
      const total = await getMonthlyBudgetTotal(user.id, selectedMonth);
      setCalculatedTotal(total);

      // Si hay presupuestos, actualizar sus montos basados en el nuevo total calculado
      if (presupuestos.length > 0 && !editMode) {
        // Actualizar montos manteniendo el resto de propiedades intactas
        const actualizados = presupuestos.map(p => ({
          ...p,
          amount: Math.round(((p.percentage || 0) / 100) * total)
        }));
        
        setPresupuestos(actualizados);
        
        // Guardar los cambios en la base de datos automáticamente
        for (const presupuesto of actualizados) {
          if (presupuesto.id && presupuesto.category_id) {
            await updateBudget(presupuesto.id, {
              category_id: presupuesto.category_id,
              amount: presupuesto.amount,
              percentage: presupuesto.percentage,
              month: selectedMonth
            });
          }
        }
        
        // Obtener la nueva lista de presupuestos pero sin llamar a loadData() para evitar un ciclo
        const budgetData = await getBudgetSummary(user.id, selectedMonth);
        
        if (Array.isArray(budgetData) && budgetData.length > 0) {
          // Obtener las categorías para asegurar datos completos
          const categoriesData = await getCategories(user.id);
          
          // Crear un mapa de categorías para acceso rápido por ID
          const categoryMap = new Map();
          categoriesData.forEach(category => {
            categoryMap.set(category.id, category);
          });
          
          // Enriquecer los presupuestos con datos completos de categorías
          let budgetSummary = budgetData.map(budget => {
            // Si el presupuesto ya tiene una categoría completa, usarla
            if (budget.category && budget.category.name && budget.category.color) {
              return budget;
            }
            
            // Si no tiene categoría o está incompleta, buscarla en el mapa de categorías
            const categoryFromMap = categoryMap.get(budget.category_id);
            if (categoryFromMap) {
              return {
                ...budget,
                category: {
                  id: categoryFromMap.id,
                  name: categoryFromMap.name,
                  color: categoryFromMap.color,
                  icon: categoryFromMap.icon,
                  is_system: categoryFromMap.is_system
                }
              };
            }
            
            // Si no se encuentra la categoría, usar valores por defecto
            return {
              ...budget,
              category: {
                id: budget.category_id || 'unknown',
                name: 'Categoría desconocida',
                color: '#808080',
                icon: null,
                is_system: false
              }
            };
          });
          
          // Ordenar por nombre de categoría
          budgetSummary = budgetSummary.sort((a, b) => 
            (a.category?.name || '').localeCompare(b.category?.name || '')
          );
          
          setPresupuestos(budgetSummary);
        }
      }
    } catch (error) {
      console.error('Error loading calculated total:', error);
    }
  };

  // Función para cargar los datos
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cargar el total calculado directamente
      const total = await getMonthlyBudgetTotal(user.id, selectedMonth);
      setCalculatedTotal(total);
      
      // Ahora cargaremos las categorías de tres maneras diferentes:
      
      // 1. Para la creación automática, solo usamos las de tipo 'budget'
      const budgetOnlyCategories = await getBudgetCategories(user.id);
      console.log(`Categorías de tipo 'budget' para creación automática: ${budgetOnlyCategories.length}`);
      
      // 2. Para mostrar en la interfaz y permitir agregar manualmente, necesitamos todas 
      // las categorías relevantes (expense, saving, budget)
      const { data: allRelevantCategories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .in('type', ['expense', 'saving', 'budget']);
      
      if (catError) {
        console.error('Error al cargar categorías para presupuesto:', catError);
        toast({
          title: "Error",
          description: "No se pudieron cargar todas las categorías",
          variant: "destructive"
        });
      } else {
        console.log(`Categorías para selección manual: ${allRelevantCategories?.length || 0}`);
        // Establecer las categorías en el estado (para la interfaz)
        setCategories(allRelevantCategories || []);
      }
      
      // Crear un mapa de todas las categorías para acceso rápido por ID
      const categoryMap = new Map();
      if (allRelevantCategories) {
        allRelevantCategories.forEach(category => {
          categoryMap.set(category.id, category);
        });
      }
      
      try {
        // Cargar presupuestos
        const budgetData = await getBudgetSummary(user.id, selectedMonth);
        
        // Asegurar que budgetSummary sea un array
        let budgetSummary = Array.isArray(budgetData) ? budgetData : [];
        
        // Enriquecer los presupuestos con datos completos de categorías
        budgetSummary = budgetSummary.map(budget => {
          // Si el presupuesto ya tiene una categoría completa, usarla
          if (budget.category && budget.category.name && budget.category.color) {
            return budget;
          }
          
          // Si no tiene categoría o está incompleta, buscarla en el mapa de categorías
          const categoryFromMap = categoryMap.get(budget.category_id);
          if (categoryFromMap) {
            return {
              ...budget,
              category: {
                id: categoryFromMap.id,
                name: categoryFromMap.name,
                color: categoryFromMap.color,
                icon: categoryFromMap.icon,
                is_system: categoryFromMap.is_system
              }
            };
          }
          
          // Si no se encuentra la categoría, usar valores por defecto
          return {
            ...budget,
            category: {
              id: budget.category_id || 'unknown',
              name: 'Categoría desconocida',
              color: '#808080',
              icon: null,
              is_system: false
            }
          };
        });
        
        if (budgetSummary.length > 0) {
          // Solo ordenar si hay datos
          budgetSummary = budgetSummary.sort((a, b) => 
            (a.category?.name || '').localeCompare(b.category?.name || '')
          );
        }
        
        setPresupuestos(budgetSummary);
        
        // Verificar si hay presupuestos para este mes
        setHasExistingBudgets(budgetSummary.length > 0);
      } catch (budgetError) {
        console.error('Error al cargar presupuestos:', budgetError);
        // Evitar bloquear toda la interfaz si falla esta parte
        toast({
          title: "Advertencia",
          description: "Algunos datos del presupuesto podrían no estar disponibles",
          variant: "warning"
        });
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudieron cargar los datos. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePorcentaje = (id: string, valor: number) => {
    const nuevosPorcentajes = presupuestos.map(p => 
      p.id === id ? { ...p, percentage: valor, amount: Math.round((valor / 100) * calculatedTotal) } : p
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
      if (calculatedTotal <= 0) {
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
        if (!presupuesto.category_id) {
          toast({
            title: "Error en los datos",
            description: "Hay datos de presupuesto inválidos",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }

        // Preparar datos comunes para crear o actualizar
        const budgetData = {
          user_id: user.id,
          category_id: presupuesto.category_id,
          amount: presupuesto.amount,
          percentage: presupuesto.percentage,
          month: selectedMonth
        };

        // Verificar si es un ID temporal (comienza con "temp-")
        if (presupuesto.id && presupuesto.id.toString().startsWith('temp-')) {
          // Crear nuevo presupuesto si el ID es temporal
          await createBudget(budgetData);
        } else if (presupuesto.id) {
          // Actualizar presupuesto existente
          await updateBudget(presupuesto.id, budgetData);
        } else {
          // Si no hay ID, crear uno nuevo
          await createBudget(budgetData);
        }
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
    if (!user) return;
    
    setCreating(true);
    setError(null);
    
    try {
      // Verificar que el presupuesto total sea mayor que cero
      if (calculatedTotal <= 0) {
        toast({
          title: "Error en el presupuesto total",
          description: "Configura un método de presupuesto válido para continuar",
          variant: "destructive"
        });
        setCreating(false);
        return;
      }
      
      // SOLUCIÓN DIRECTA: Consulta explícita a la base de datos
      // Ignoramos completamente las funciones de servicio y hacemos una consulta directa
      console.log("======== CONSULTA DIRECTA POR CATEGORÍAS BUDGET ========");
      const { data: strictlyBudgetCategories, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'budget')
        .or(`user_id.eq.${user.id},user_id.is.null`);
      
      if (categoryError) {
        console.error("Error en consulta directa:", categoryError);
        toast({
          title: "Error al obtener categorías",
          description: "No se pudieron obtener las categorías de tipo 'budget'",
          variant: "destructive"
        });
        setCreating(false);
        return;
      }
      
      console.log(`Consulta directa encontró ${strictlyBudgetCategories?.length || 0} categorías de tipo budget:`);
      strictlyBudgetCategories?.forEach(cat => 
        console.log(`- ${cat.name} (${cat.type}), ID: ${cat.id}`)
      );
      
      // Si no hay categorías disponibles, mostrar un error
      if (!strictlyBudgetCategories || strictlyBudgetCategories.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron categorías de tipo 'budget' para crear presupuestos automáticos",
          variant: "destructive"
        });
        setCreating(false);
        return;
      }
      
      // Verificar antes de continuar
      const allAreBudgetType = strictlyBudgetCategories.every(cat => cat.type === 'budget');
      if (!allAreBudgetType) {
        console.error("ERROR CRÍTICO: Se obtuvieron categorías que no son de tipo 'budget'");
        toast({
          title: "Error interno",
          description: "Hay un problema con las categorías. Contacta al administrador.",
          variant: "destructive"
        });
        setCreating(false);
        return;
      }
      
      // Usar categorías estrictamente de tipo budget
      const categoriesToUse = strictlyBudgetCategories;
      
      console.log('Creando presupuestos iniciales para:', {
        userId: user.id,
        month: selectedMonth,
        categoriesCount: categoriesToUse.length,
        calculatedTotal
      });
      
      // Distribuir el presupuesto total entre categorías seleccionadas
      const categoriesCount = categoriesToUse.length;
      const defaultPercentage = Math.floor(100 / categoriesCount);
      let remainingPercentage = 100 - (defaultPercentage * categoriesCount);
      
      // Crear un presupuesto para cada categoría seleccionada
      for (const category of categoriesToUse) {
        try {
          // Ajustar el último porcentaje para que sume exactamente 100%
          const percentage = remainingPercentage > 0 
            ? defaultPercentage + 1 
            : defaultPercentage;
          
          // Calcular monto basado en porcentaje
          const amount = Math.round((percentage / 100) * calculatedTotal);
          
          console.log('Creando presupuesto para categoría:', {
            categoryId: category.id,
            categoryName: category.name,
            categoryType: category.type,
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
      
      // Mostrar mensaje de éxito
      toast({
        title: "Presupuestos creados",
        description: `Se han creado ${categoriesToUse.length} presupuestos automáticamente.`,
      });
    } catch (error) {
      console.error('Error al crear presupuestos iniciales:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'No se pudieron crear los presupuestos',
        variant: "destructive"
      });
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
        // Actualizar categoría existente - solo nombre y color
        await updateCategory(selectedCategory.id, {
          name: categoryForm.name,
          color: categoryForm.color
        });
        
        // Si no es de tipo budget, mostrar mensaje informativo
        if (selectedCategory.type !== 'budget') {
          toast({
            title: "Nota",
            description: "Esta categoría no es de tipo 'budget' por lo que no aparecerá en la creación automática de presupuestos",
            variant: "default"
          });
        }
      } else {
        // Crear nueva categoría - siempre de tipo budget
        await createCustomCategory(user.id, {
          name: categoryForm.name,
          color: categoryForm.color,
          icon: 'tag', // Icono por defecto
          type: 'budget' // Siempre crear como budget desde la página de presupuesto
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

  // Función para manejar la apertura del modal de configuración de gastos fijos
  const handleOpenFixedExpensesModal = async (budget: BudgetWithFixedExpenses) => {
    if (!user) return;
    
    setSelectedBudget(budget);
    setShowFixedExpensesModal(true);
  };

  // Función para abrir el modal de vínculos con objetivos
  const handleOpenGoalLinksModal = async (budget: BudgetWithFixedExpenses) => {
    if (!user) return;
    
    setLoadingGoalLinks(true);
    setSelectedBudget(budget);
    
    try {
      // Cargar los objetivos vinculados a este presupuesto
      const links = await getGoalsForBudget(budget.id);
      setGoalLinksDetail(links);
    } catch (error) {
      console.error('Error cargando vínculos con objetivos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los vínculos con objetivos.'
      });
    } finally {
      setLoadingGoalLinks(false);
      setShowGoalLinksModal(true);
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
            name: category.name,
            color: category.color,
            icon: category.icon,
            is_system: category.is_system
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
      setCalculatedTotal(newTotal);
      
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
      setCalculatedTotal(previousTotal);
      
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
      setPresupuestos(originalValues.presupuestos);
      setEditMode(false);
    }
  };

  const handleStartEdit = () => {
    setOriginalValues({
      presupuestos: [...presupuestos]
    });
    setEditMode(true);
  };

  // Función para agregar una categoría al presupuesto
  const handleAddCategoryToBudget = (category: Category) => {
    // Verificar si la categoría ya está en el presupuesto
    if (presupuestos.some(p => p.category_id === category.id)) {
      toast({
        title: "Categoría ya existe",
        description: `La categoría "${category.name}" ya está en el presupuesto`,
        variant: "destructive"
      });
      return;
    }

    // Crear un nuevo presupuesto con valores predeterminados
    const newBudget: BudgetWithFixedExpenses = {
      id: `temp-${Date.now()}`, // ID temporal hasta guardar
      user_id: user?.id || '',
      category_id: category.id,
      amount: 0, // Valor predeterminado
      percentage: 0, // Valor predeterminado
      month: selectedMonth,
      category: {
        name: category.name,
        color: category.color,
        icon: category.icon,
        is_system: category.is_system
      },
      fixed_expenses_amount: 0,
      available_amount: 0
    };

    // Actualizar el estado de presupuestos
    const updatedBudgets = [...presupuestos, newBudget];

    // Redistribuir porcentajes para que sumen 100%
    const totalItems = updatedBudgets.length;
    const equalPercentage = Math.floor(100 / totalItems * 100) / 100; // Redondeado a 2 decimales
    
    // Calcular cuánto falta para sumar exactamente 100%
    const totalWithoutAdjustment = equalPercentage * totalItems;
    const remainder = 100 - totalWithoutAdjustment;
    
    // Distribuir el porcentaje restante en el primer elemento
    const redistributedBudgets = updatedBudgets.map((budget, index) => ({
      ...budget,
      percentage: index === 0 
        ? equalPercentage + remainder 
        : equalPercentage,
      amount: index === 0 
        ? Math.round(((equalPercentage + remainder) / 100) * calculatedTotal) 
        : Math.round((equalPercentage / 100) * calculatedTotal)
    }));

    setPresupuestos(redistributedBudgets);
    setShowAddToBudgetModal(false);
    
    toast({
      title: "Categoría agregada",
      description: `Se ha agregado la categoría "${category.name}" al presupuesto`
    });
  };

  // Función para eliminar una categoría del presupuesto durante la edición
  const handleRemoveCategoryFromBudget = async (categoryId: string) => {
    // Verificar que estamos en modo edición
    if (!editMode || !user) return;

    try {
      // Obtener el nombre de la categoría para el mensaje
      const categoryToRemove = presupuestos.find(p => p.category_id === categoryId);
      const categoryName = categoryToRemove?.category?.name || "Categoría";
      
      // Si es un ID temporal, simplemente eliminamos del estado
      const isTemporary = categoryToRemove?.id?.toString().startsWith('temp-');
      
      // Si no es temporal, eliminar de la base de datos
      if (!isTemporary && categoryToRemove?.id) {
        // Primero, intentar eliminar el presupuesto
        await deleteBudget(categoryToRemove.id);
        
        // Luego, marcar la categoría como no visible en presupuesto
        // Usamos la función específica para gestionar la visibilidad en presupuesto
        await setCategoryBudgetVisibility(user.id, categoryId, false);
      }
      
      // Eliminar la categoría del estado de presupuestos
      const updatedBudgets = presupuestos.filter(p => p.category_id !== categoryId);
      
      // Redistribuir porcentajes si quedan categorías
      if (updatedBudgets.length > 0) {
        const totalItems = updatedBudgets.length;
        const equalPercentage = Math.floor(100 / totalItems * 100) / 100;
        
        // Calcular cuánto falta para sumar exactamente 100%
        const totalWithoutAdjustment = equalPercentage * totalItems;
        const remainder = 100 - totalWithoutAdjustment;
        
        // Distribuir el porcentaje
        const redistributedBudgets = updatedBudgets.map((budget, index) => ({
          ...budget,
          percentage: index === 0 
            ? equalPercentage + remainder 
            : equalPercentage,
          amount: index === 0 
            ? Math.round(((equalPercentage + remainder) / 100) * calculatedTotal) 
            : Math.round((equalPercentage / 100) * calculatedTotal)
        }));

        setPresupuestos(redistributedBudgets);
      } else {
        setPresupuestos([]);
      }
      
      // Actualizar la lista de categorías disponibles después de eliminar
      const availableCategoriesData = await getBudgetCategories(user.id);
      setCategories(availableCategoriesData);
      
      toast({
        title: "Categoría eliminada",
        description: `Se ha eliminado "${categoryName}" del presupuesto`,
        variant: "success"
      });
    } catch (err) {
      console.error('Error al eliminar categoría del presupuesto:', err);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría del presupuesto",
        variant: "destructive"
      });
    }
  };

  // Función para convertir categorías existentes a tipo 'budget'
  const handleConvertCategoriesToBudget = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Obtener todas las categorías (sin filtrar por tipo)
      const { data: allCategories, error: categoriesError } = await supabase
        .from('all_categories')
        .select('*')
        .or(`user_id.eq.${user.id},is_system.eq.true`);
      
      if (categoriesError) {
        throw new Error('No se pudieron obtener las categorías');
      }
      
      // Filtrar categorías que queremos convertir (tipos expense y saving, pero no budget)
      const convertibleCategories = allCategories.filter(
        cat => (cat.type === 'expense' || cat.type === 'saving') && cat.type !== 'budget'
      );
      
      if (convertibleCategories.length === 0) {
        toast({
          title: "Información",
          description: "No hay categorías para convertir al tipo 'budget'",
        });
        setSaving(false);
        return;
      }
      
      // Mostrar toast de progreso
      toast({
        title: "Convirtiendo categorías",
        description: `Preparando ${convertibleCategories.length} categorías para presupuestos...`,
      });
      
      // Convertir las categorías
      const { results, errors } = await setMultipleCategoriesAsBudgetType(
        user.id,
        convertibleCategories.map(cat => cat.id)
      );
      
      // Recargar datos
      await loadData();
      
      // Mostrar resultado
      if (errors.length > 0) {
        toast({
          title: `Conversión parcial (${results.length}/${convertibleCategories.length})`,
          description: "Algunas categorías no pudieron ser convertidas",
          variant: "warning"
        });
      } else {
        toast({
          title: "Categorías convertidas",
          description: `Se han preparado ${results.length} categorías para presupuestos`,
        });
      }
    } catch (err) {
      console.error('Error al convertir categorías:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'No se pudieron convertir las categorías',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para procesar contribuciones automáticas a objetivos
  const handleProcessGoalContributions = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const processedCount = await processAutomaticContributions(user.id, selectedMonth);
      
      toast({
        title: "Contribuciones procesadas",
        description: `Se procesaron ${processedCount} contribuciones automáticas a objetivos.`,
        variant: processedCount > 0 ? "default" : "destructive"
      });
      
      // Recargar datos para mostrar los cambios
      loadData();
    } catch (error) {
      console.error('Error procesando contribuciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron procesar las contribuciones automáticas a objetivos.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
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
          
          {presupuestos.length > 0 ? (
            <Button
              variant={editMode ? "outline" : "default" as any}
              className="w-full sm:w-auto"
              onClick={() => {
                if (editMode) {
                  handleSaveChanges();
                } else {
                  handleStartEdit();
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
          ) : null}
        </div>
      </div>

      {/* Reemplazar el componente BudgetMethodConfig con un botón que abra el modal */}
      <div className="mb-6 flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={() => setShowMethodConfigModal(true)}
          className="flex items-center space-x-2"
        >
          <Settings size={16} className="mr-2" />
          Configurar método de presupuesto
        </Button>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total presupuesto mensual: <span className="font-medium">{formatCurrency(calculatedTotal)}</span>
        </div>
      </div>
      
      {/* Modal de configuración del método de presupuesto */}
      <MethodConfigModal 
        isOpen={showMethodConfigModal} 
        onClose={() => setShowMethodConfigModal(false)} 
        userId={user?.id || ''}
        onUpdate={loadCalculatedTotal}
      />

      {/* Mensaje de error general */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md dark:bg-red-900/30 dark:border-red-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comprobar si hay presupuestos existentes */}
      {!hasExistingBudgets && !editMode && !loading ? (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b">
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-blue-600" />
              Configuración inicial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-6">
              <h3 className="text-lg font-medium mb-3">
                No tienes presupuestos configurados para este mes
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
                Para comenzar, puedes crear un presupuesto inicial con porcentajes predeterminados 
                o configurar manualmente los montos por categoría.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
                <Button 
                  onClick={handleCreateInitialBudgets}
                  disabled={loading || creating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Presupuesto Automático
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleStartEdit}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Configurar Manualmente
                </Button>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-500 mb-3">¿Problemas con las categorías en el presupuesto?</p>
                <Button 
                  variant="outline" 
                  onClick={handleConvertCategoriesToBudget}
                  disabled={saving}
                  size="sm"
                  className="text-blue-600 border-blue-200"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-3 w-3" />
                      Preparar categorías para presupuesto
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Mostrar spinner de carga si estamos cargando datos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton 
            variant="rectangular"
            className="md:col-span-2 h-60"
            color="blue"
          />
          
          {[1, 2, 3, 4].map((i) => (
            <Skeleton 
              key={i}
              variant="rectangular"
              className="h-40"
              color={["blue", "green", "amber", "purple"][i % 4] as "blue" | "green" | "amber" | "purple"}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Mostrar formulario de edición o resumen de presupuesto */}
          {editMode ? (
            <BudgetEditForm
              budgets={presupuestos}
              onChange={setPresupuestos}
              onAddNew={() => setShowAddToBudgetModal(true)}
              onCancel={handleCancelEdit}
              loading={loading}
              saving={saving}
              onSave={handleSaveChanges}
              calculatedTotal={calculatedTotal}
              availableCategories={categories
                .filter(cat => !presupuestos.some(p => p.category_id === cat.id))
                .map(cat => ({
                  id: cat.id,
                  name: cat.name,
                  color: cat.color
                }))
              }
              onRemoveCategory={handleRemoveCategoryFromBudget}
            />
          ) : (
            <BudgetSummary
              budgets={presupuestos}
              loading={loading}
              month={selectedMonth}
              calculatedTotal={calculatedTotal}
              editMode={editMode}
              onEdit={handleStartEdit}
              onViewFixedExpenses={handleOpenFixedExpensesModal}
              onViewGoalLinks={handleOpenGoalLinksModal}
              onProcessGoalContributions={handleProcessGoalContributions}
            />
          )}
        </>
      )}

      {/* Mantener los modales existentes */}
      {/* Modal de agregar/editar categoría */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={selectedCategory ? "Editar Categoría" : "Nueva Categoría"}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="categoryName" className="text-sm font-medium">Nombre</label>
            <Input
              id="categoryName"
              type="text"
              value={categoryForm.name}
              onChange={handleCategoryFormChange}
              name="name"
              placeholder="Nombre de la categoría"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="categoryColor" className="text-sm font-medium">Color</label>
            <Input
              id="categoryColor"
              type="color"
              value={categoryForm.color}
              onChange={handleCategoryFormChange}
              name="color"
            />
          </div>
          <div className="text-xs text-green-600 mt-1">
            ✓ Esta categoría aparecerá en la creación automática de presupuestos
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCategoryModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCategory}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de eliminar categoría */}
      <Modal
        isOpen={showDeleteCategoryModal}
        onClose={() => setShowDeleteCategoryModal(false)}
        title="Eliminar Categoría"
      >
        {selectedCategory && (
          <div className="space-y-4">
            <p>
              ¿Estás seguro que deseas eliminar la categoría <strong>{selectedCategory.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Todos los presupuestos asociados a esta categoría serán eliminados.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteCategoryModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={handleDeleteCategory}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para administrar gastos fijos y objetivos vinculados */}
      {selectedBudget && (
        <ManageBudgetLinks
          open={showFixedExpensesModal}
          onClose={() => {
            setShowFixedExpensesModal(false);
            loadData(); // Recargar los datos para ver los cambios
          }}
          selectedBudget={selectedBudget}
          userId={user?.id || ''}
          onUpdate={loadData}
        />
      )}

      {/* Modal para añadir categoría al presupuesto */}
      <Modal
        isOpen={showAddToBudgetModal}
        onClose={() => setShowAddToBudgetModal(false)}
        title="Añadir categoría al presupuesto"
        className="max-w-lg border-0 shadow-md overflow-hidden dark:bg-gray-900 dark:border-gray-800"
      >
        <div className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
            <div className="flex items-center text-base mb-1">
              <Plus className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">Selecciona una categoría para tu presupuesto</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Estas categorías se usarán para distribuir tu presupuesto mensual
            </p>
          </div>
          
          {/* Lista de categorías disponibles */}
          <div className="max-h-[350px] overflow-y-auto p-4 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-2">
              {categories
                .filter(cat => 
                  cat.is_visible !== false && 
                  !presupuestos.some(p => p.category_id === cat.id) &&
                  (cat.type === 'expense' || cat.type === 'saving' || cat.type === 'budget')
                )
                .map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleAddCategoryToBudget(category)}
                    className="w-full flex items-center p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left"
                  >
                    <div 
                      className="w-6 h-6 rounded-full mr-3 flex-shrink-0 shadow-sm dark:shadow-md"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{category.name}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ({category.type === 'budget' ? 'Presupuesto' : 
                           category.type === 'expense' ? 'Gasto' : 
                           category.type === 'saving' ? 'Ahorro' : 
                           category.type})
                      </span>
                    </div>
                    <div className="flex-shrink-0 ml-2 text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Plus size={18} />
                    </div>
                  </button>
                ))}
                
              {categories.filter(cat => 
                cat.is_visible !== false && 
                !presupuestos.some(p => p.category_id === cat.id) &&
                (cat.type === 'expense' || cat.type === 'saving' || cat.type === 'budget')
              ).length === 0 && (
                <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-3 shadow-inner dark:shadow-lg">
                    <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Todas las categorías disponibles ya están en tu presupuesto.
                  </p>
                  <Button 
                    onClick={() => {
                      setShowAddToBudgetModal(false);
                      setShowCategoryModal(true);
                    }}
                    variant="outline" 
                    className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear nueva categoría
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800/30">
            <Button 
              variant="outline" 
              onClick={() => setShowAddToBudgetModal(false)}
              className="h-10 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => setShowAddToBudgetModal(false)}
              className="h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Listo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para ver objetivos vinculados a este presupuesto */}
      <Modal
        isOpen={showGoalLinksModal}
        onClose={() => setShowGoalLinksModal(false)}
        title={`Objetivos Vinculados: ${selectedBudget?.category.name || ''}`}
      >
        {loadingGoalLinks ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Cargando objetivos vinculados...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm">
              <p>Los objetivos vinculados reciben contribuciones automáticas desde tu presupuesto.</p>
              <p className="mt-1">Cada mes se descontará el monto establecido para contribuir a estos objetivos:</p>
            </div>
            
            {goalLinksDetail.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {goalLinksDetail.map(link => (
                  <div key={link.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{link.goal.name}</h4>
                      <Badge variant={link.auto_contribute ? "success" : "outline"}>
                        {link.auto_contribute ? "Auto" : "Manual"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Contribución mensual:</p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(link.monthly_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progreso:</p>
                        <p className="font-medium">
                          {Math.round((link.goal.current_amount / link.goal.target_amount) * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{ width: `${Math.min(100, Math.round((link.goal.current_amount / link.goal.target_amount) * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/objetivos?id=${link.goal_id}`)}
                      >
                        Ver objetivo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p>No hay objetivos vinculados a esta categoría de presupuesto.</p>
                <Button 
                  variant="outline"
                  className="mt-3"
                  onClick={() => router.push('/objetivos?action=link')}
                >
                  Vincular objetivos
                </Button>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowGoalLinksModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}