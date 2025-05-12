"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Target, Calendar, DollarSign, PieChart, Wallet, BarChart4, CreditCard, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase';
import { 
  getGoals, 
  createGoal, 
  contributeToGoal, 
  getGoalContributions,
  setGoalBudgetLink,
  generateTasksFromGoals,
  Goal, 
  GoalContribution 
} from '@/services/goals';
import { 
  getCategories, 
  getCategoriesByType, 
  createCustomCategory 
} from '@/services/categories';
import { getBudgetSummary, BudgetWithFixedExpenses } from '@/services/budgets';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

export default function ObjetivosPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [objetivos, setObjetivos] = useState<Goal[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [budgetsByCategory, setBudgetsByCategory] = useState<Record<string, BudgetWithFixedExpenses | null>>({});
  
  // Estados para modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showBudgetLinkModal, setShowBudgetLinkModal] = useState(false);
  const [showContributionsHistoryModal, setShowContributionsHistoryModal] = useState(false);
  
  // Estados para el formulario de nuevo objetivo
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    category_id: ''
  });
  
  // Estados para el formulario de contribución
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDescription, setContributionDescription] = useState('');
  const [contributing, setContributing] = useState(false);
  
  // Estados para vinculación con presupuesto
  const [budgetFormData, setBudgetFormData] = useState({
    is_budget_contribution: false,
    budget_monthly_amount: ''
  });
  
  // Estado para historial de contribuciones
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        
        // Cargar objetivos
        const objetivosData = await getGoals(user.id);
        setObjetivos(objetivosData);
        
        // Cargar categorías específicas para objetivos (tipo 'goal' y 'saving')
        let goalCategories = await getCategoriesByType(user.id, 'goal');
        let savingCategories = await getCategoriesByType(user.id, 'saving');
        
        console.log('Categorías goal encontradas:', goalCategories.length);
        console.log('Categorías saving encontradas:', savingCategories.length);
        
        // Si no hay categorías de objetivo, crear algunas por defecto
        if (goalCategories.length === 0) {
          console.log('Creando categorías de objetivo por defecto...');
          try {
            await createCustomCategory(user.id, {
              name: 'Viajes',
              color: '#8B5CF6',
              icon: 'plane',
              type: 'goal'
            });
            
            await createCustomCategory(user.id, {
              name: 'Compras importantes',
              color: '#EC4899',
              icon: 'shopping-bag',
              type: 'goal'
            });
            
            // Recargar categorías
            goalCategories = await getCategoriesByType(user.id, 'goal');
          } catch (err) {
            console.error('Error creando categorías de objetivo:', err);
          }
        }
        
        // Si no hay categorías de ahorro, crear algunas por defecto
        if (savingCategories.length === 0) {
          console.log('Creando categorías de ahorro por defecto...');
          try {
            await createCustomCategory(user.id, {
              name: 'Fondo de emergencia',
              color: '#10B981',
              icon: 'shield',
              type: 'saving'
            });
            
            await createCustomCategory(user.id, {
              name: 'Ahorro general',
              color: '#3B82F6',
              icon: 'piggy-bank',
              type: 'saving'
            });
            
            // Recargar categorías
            savingCategories = await getCategoriesByType(user.id, 'saving');
          } catch (err) {
            console.error('Error creando categorías de ahorro:', err);
          }
        }
        
        // Combinar ambos tipos de categorías
        const allCategories = [...goalCategories, ...savingCategories];
        
        // Cargar presupuestos para ver qué categorías tienen presupuesto (solo para información)
        const budgetData = await getBudgetSummary(user.id, format(new Date(), 'yyyy-MM'));
        const budgetMap: Record<string, BudgetWithFixedExpenses | null> = {};
        
        // Verificar si budgetData es un array y procesarlo
        if (Array.isArray(budgetData)) {
          budgetData.forEach((budget) => {
            budgetMap[budget.category_id] = budget;
          });
        }
        
        // Guardar información de presupuesto pero mostrar todas las categorías
        setBudgetsByCategory(budgetMap);
        setCategorias(allCategories);

        // Para debugging
        console.log('Categorías cargadas:', allCategories.length);
        if (allCategories.length === 0) {
          console.log('¡No se encontraron categorías! Verifica la función getCategoriesByType');
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      console.error('Detalles del error:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      target_amount: '',
      current_amount: '',
      target_date: '',
      category_id: ''
    });
    setFormError('');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, field?: string) {
    if (typeof e === 'string' && field) {
      // Para Select component
      setFormData({
        ...formData,
        [field]: e
      });
    } else if (typeof e !== 'string') {
      // Para Input o Textarea
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value
      });
    }
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    
    if (!userId) {
      setFormError('No se pudo identificar al usuario');
      return;
    }

    if (!formData.name || !formData.target_amount) {
      setFormError('El nombre y el monto objetivo son obligatorios');
      return;
    }

    setFormLoading(true);
    
    try {
      await createGoal({
        user_id: userId,
        name: formData.name,
        description: formData.description || null,
        target_amount: parseFloat(formData.target_amount),
        current_amount: formData.current_amount ? parseFloat(formData.current_amount) : 0,
        target_date: formData.target_date || null,
        category_id: formData.category_id || null
      });
      
      // Recargar objetivos
      await loadData();
      
      // Limpiar formulario y cerrar modal
      resetForm();
      setShowAddModal(false);
      
    } catch (error) {
      console.error('Error creando objetivo:', error);
      setFormError('Error al crear el objetivo');
    } finally {
      setFormLoading(false);
    }
  }

  function handleOpenContributeModal(goal: Goal) {
    setSelectedGoal(goal);
    setContributionAmount('');
    setContributionDescription('');
    setShowContributeModal(true);
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    
    if (!selectedGoal) {
      setFormError('Objetivo no seleccionado');
      return;
    }

    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      setFormError('Ingresa un monto válido');
      return;
    }

    setContributing(true);
    
    try {
      await contributeToGoal(
        selectedGoal.id, 
        parseFloat(contributionAmount),
        contributionDescription || undefined
      );
      
      // Recargar objetivos
      await loadData();
      
      // Limpiar formulario y cerrar modal
      setContributionAmount('');
      setContributionDescription('');
      setSelectedGoal(null);
      setShowContributeModal(false);
      
    } catch (error) {
      console.error('Error contribuyendo al objetivo:', error);
      setFormError('Error al contribuir al objetivo');
    } finally {
      setContributing(false);
    }
  }

  function handleOpenBudgetLinkModal(goal: Goal) {
    setSelectedGoal(goal);
    setBudgetFormData({
      is_budget_contribution: goal.is_budget_contribution || false,
      budget_monthly_amount: goal.budget_monthly_amount ? goal.budget_monthly_amount.toString() : ''
    });
    setShowBudgetLinkModal(true);
  }

  async function handleSaveBudgetLink(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    
    if (!selectedGoal) {
      setFormError('Objetivo no seleccionado');
      return;
    }

    if (budgetFormData.is_budget_contribution && 
        (!budgetFormData.budget_monthly_amount || 
         parseFloat(budgetFormData.budget_monthly_amount) <= 0)) {
      setFormError('Ingresa un monto mensual válido');
      return;
    }

    setFormLoading(true);
    
    try {
      await setGoalBudgetLink(
        selectedGoal.id,
        budgetFormData.is_budget_contribution,
        budgetFormData.is_budget_contribution ? parseFloat(budgetFormData.budget_monthly_amount) : null
      );
      
      // Recargar objetivos
      await loadData();
      
      // Cerrar modal
      setShowBudgetLinkModal(false);
      
    } catch (error) {
      console.error('Error configurando vinculación con presupuesto:', error);
      setFormError('Error al configurar la vinculación con el presupuesto');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleOpenContributionsHistory(goal: Goal) {
    setSelectedGoal(goal);
    setLoadingContributions(true);
    
    try {
      const data = await getGoalContributions(goal.id);
      setContributions(data);
      setShowContributionsHistoryModal(true);
    } catch (error) {
      console.error('Error cargando historial de contribuciones:', error);
    } finally {
      setLoadingContributions(false);
    }
  }

  // Formatear montos para mostrar
  function formatMoney(amount: number) {
    return amount.toLocaleString('es-AR');
  }

  // Formatear fecha para mostrar
  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Sin fecha límite';
    
    try {
      return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return dateStr;
    }
  }

  // Obtener el color de la categoría
  function getCategoryColor(categoryId: string | null | undefined) {
    if (!categoryId) return '#9CA3AF'; // Color gris por defecto
    const category = categorias.find(cat => cat.id === categoryId);
    return category ? category.color : '#9CA3AF';
  }

  // Obtener el nombre de la categoría
  function getCategoryName(categoryId: string | null | undefined) {
    if (!categoryId) return 'Sin categoría';
    const category = categorias.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

  // Función para generar tareas mensuales a partir de objetivos
  async function handleGenerateMonthlyTasks() {
    if (!userId) return;
    
    setGeneratingTasks(true);
    
    try {
      // Obtener el mes actual en formato YYYY-MM
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Generar tareas para el mes actual
      await generateTasksFromGoals(userId, month);
      
      // Mostrar mensaje de éxito (puedes implementar un toast o alerta)
      alert('Tareas generadas correctamente');
    } catch (error) {
      console.error('Error generando tareas:', error);
      alert('Error al generar tareas');
    } finally {
      setGeneratingTasks(false);
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Objetivos de Ahorro</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleGenerateMonthlyTasks}
            disabled={generatingTasks}
          >
            <CreditCard size={16} className="mr-1" /> 
            {generatingTasks ? 'Procesando...' : 'Generar Tareas Mensuales'}
          </Button>
          <Button 
            variant="primary" 
            className="flex items-center gap-2"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <PlusCircle size={16} className="mr-1" /> Nuevo Objetivo
          </Button>
        </div>
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
                      const categoryColor = getCategoryColor(objetivo.category_id);
                      return (
                        <div key={objetivo.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center">
                              <Target size={18} className="mr-2" style={{ color: categoryColor }} />
                              <div>
                                <span className="font-medium">{objetivo.name}</span>
                                {objetivo.is_budget_contribution && (
                                  <Badge className="ml-2 text-xs" variant="outline">
                                    <PieChart size={12} className="mr-1" /> 
                                    Auto: ${formatMoney(objetivo.budget_monthly_amount || 0)}/mes
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium">${formatMoney(objetivo.current_amount)} / ${formatMoney(objetivo.target_amount)}</span>
                          </div>
                          {objetivo.description && (
                            <p className="text-sm text-gray-500 mb-2">{objetivo.description}</p>
                          )}
                          <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700 mt-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ width: `${progreso}%`, backgroundColor: categoryColor }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{progreso}% completado</span>
                            <span>{formatDate(objetivo.target_date)}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => handleOpenContributeModal(objetivo)}
                            >
                              <Wallet size={12} className="mr-1" /> Contribuir
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => handleOpenBudgetLinkModal(objetivo)}
                            >
                              <PieChart size={12} className="mr-1" /> Presupuesto
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => handleOpenContributionsHistory(objetivo)}
                            >
                              <BarChart4 size={12} className="mr-1" /> Historial
                            </Button>
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
                <CardTitle>Información y Consejos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-medium text-lg mb-2 flex items-center">
                      <PieChart className="mr-2 text-blue-600" size={20} />
                      Vincula objetivos con tu presupuesto
                    </h3>
                    <p className="text-sm mb-3">
                      Puedes vincular tus objetivos de ahorro con tu presupuesto mensual para crear contribuciones automáticas. 
                      Esto generará tareas financieras mensuales recordándote apartar el dinero.
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-md text-sm border">
                      <p className="mb-2">Cómo funciona:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Crea un objetivo de ahorro</li>
                        <li>Vincúlalo con tu presupuesto definiendo un monto mensual</li>
                        <li>Cada mes se creará una tarea financiera</li>
                        <li>Al completar la tarea, se contribuirá automáticamente a tu objetivo</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-medium text-lg mb-2 flex items-center">
                      <Target className="mr-2 text-green-600" size={20} />
                      Objetivos inteligentes
                    </h3>
                    <p className="text-sm mb-2">
                      Para lograr tus metas financieras, te recomendamos:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Establecer objetivos específicos y con plazos claros</li>
                      <li>Dividir objetivos grandes en pequeñas metas</li>
                      <li>Revisar y ajustar tus objetivos periódicamente</li>
                      <li>Celebrar los hitos alcanzados</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal para agregar nuevo objetivo */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Crear nuevo objetivo"
        className="max-w-xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {formError}
          </div>
        )}

        <form onSubmit={handleAddGoal}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block font-medium mb-1">Nombre</label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Viaje a Brasil"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block font-medium mb-1">Descripción (opcional)</label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe tu objetivo"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target_amount" className="block font-medium mb-1">Monto objetivo</label>
                <Input
                  id="target_amount"
                  name="target_amount"
                  type="number"
                  value={formData.target_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="current_amount" className="block font-medium mb-1">Monto inicial (opcional)</label>
                <Input
                  id="current_amount"
                  name="current_amount"
                  type="number"
                  value={formData.current_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target_date" className="block font-medium mb-1">Fecha objetivo (opcional)</label>
                <Input
                  id="target_date"
                  name="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="relative z-10">
                <label htmlFor="category_id" className="block font-medium mb-1">Categoría (opcional)</label>
                <Select
                  id="category_id"
                  options={categorias.map(cat => ({
                    value: cat.id,
                    label: cat.name
                  }))}
                  value={formData.category_id}
                  onChange={(value) => handleInputChange(value, 'category_id')}
                  placeholder="Selecciona una categoría"
                  className="z-20"
                />
                <div className="mt-1 text-sm text-gray-500">
                  Categorías que puedes utilizar para objetivos de ahorro
                </div>
                {formData.category_id && budgetsByCategory[formData.category_id] && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded">
                    <p className="text-xs flex items-center text-blue-700 dark:text-blue-300">
                      <PieChart size={12} className="mr-1 text-blue-600" />
                      Esta categoría está asociada a tu presupuesto mensual
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : 'Crear objetivo'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal para contribuir al objetivo */}
      <Modal
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        title={selectedGoal ? `Contribuir a: ${selectedGoal.name}` : 'Contribuir al objetivo'}
        className="max-w-xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {formError}
          </div>
        )}
        
        {selectedGoal && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progreso actual:</span>
              <span className="text-sm">${formatMoney(selectedGoal.current_amount)} / ${formatMoney(selectedGoal.target_amount)}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div 
                className="h-2 bg-blue-600 rounded-full" 
                style={{ width: `${Math.round((selectedGoal.current_amount / selectedGoal.target_amount) * 100)}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-right">
              Faltan ${formatMoney(selectedGoal.target_amount - selectedGoal.current_amount)}
            </div>
          </div>
        )}
        
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monto a contribuir</label>
            <Input
              type="number"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <Textarea
              value={contributionDescription}
              onChange={(e) => setContributionDescription(e.target.value)}
              placeholder="Ej. Ahorro de este mes"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowContributeModal(false)}
              disabled={contributing}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={contributing}
            >
              {contributing ? 'Procesando...' : 'Contribuir'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal para vincular con presupuesto */}
      <Modal
        isOpen={showBudgetLinkModal}
        onClose={() => setShowBudgetLinkModal(false)}
        title={selectedGoal ? `Vincular con presupuesto: ${selectedGoal.name}` : 'Vincular con presupuesto'}
        className="max-w-xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {formError}
          </div>
        )}
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <p className="text-sm">
            La vinculación con el presupuesto creará tareas financieras mensuales para contribuir a este objetivo
            automáticamente. Cada vez que completes la tarea, el monto se sumará al objetivo.
          </p>
        </div>
        
        {selectedGoal && selectedGoal.category_id && budgetsByCategory[selectedGoal.category_id] && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900 rounded">
            <div className="flex items-start">
              <PieChart size={16} className="mr-2 mt-0.5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Categoría asociada al presupuesto
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  La categoría "{getCategoryName(selectedGoal.category_id)}" tiene un presupuesto mensual asignado de ${formatMoney(budgetsByCategory[selectedGoal.category_id]?.amount || 0)}.
                </p>
              </div>
            </div>
          </div>
        )}
        {selectedGoal && selectedGoal.category_id && !budgetsByCategory[selectedGoal.category_id] && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900 rounded">
            <div className="flex items-start">
              <PieChart size={16} className="mr-2 mt-0.5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Categoría sin presupuesto asignado
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  La categoría "{getCategoryName(selectedGoal.category_id)}" no está asociada a tu presupuesto. Considera asignarle un presupuesto para mejor seguimiento.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSaveBudgetLink} className="space-y-4">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="is_budget_contribution"
              checked={budgetFormData.is_budget_contribution}
              onChange={(e) => setBudgetFormData({
                ...budgetFormData,
                is_budget_contribution: e.target.checked
              })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_budget_contribution" className="ml-2">
              Vincular con mi presupuesto mensual
            </label>
          </div>
          
          {budgetFormData.is_budget_contribution && (
            <div>
              <label className="block text-sm font-medium mb-1">Monto mensual a contribuir</label>
              <Input
                type="number"
                value={budgetFormData.budget_monthly_amount}
                onChange={(e) => setBudgetFormData({
                  ...budgetFormData,
                  budget_monthly_amount: e.target.value
                })}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
              {selectedGoal && (
                <div className="mt-2 text-xs text-gray-500">
                  {budgetFormData.budget_monthly_amount && parseFloat(budgetFormData.budget_monthly_amount) > 0 ? (
                    <div>
                      Alcanzarás tu objetivo en aproximadamente {
                        Math.ceil((selectedGoal.target_amount - selectedGoal.current_amount) / parseFloat(budgetFormData.budget_monthly_amount))
                      } meses
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBudgetLinkModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={formLoading}
            >
              {formLoading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal para historial de contribuciones */}
      <Modal
        isOpen={showContributionsHistoryModal}
        onClose={() => setShowContributionsHistoryModal(false)}
        title={selectedGoal ? `Historial de contribuciones: ${selectedGoal.name}` : 'Historial de contribuciones'}
      >
        {loadingContributions ? (
          <div className="flex justify-center py-10">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {contributions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No hay contribuciones registradas para este objetivo.
              </div>
            ) : (
              <div className="space-y-4">
                {contributions.map((contribution) => (
                  <div key={contribution.id} className="p-3 border rounded flex justify-between">
                    <div>
                      <div className="font-medium">${formatMoney(contribution.amount)}</div>
                      <div className="text-sm text-gray-500">
                        {contribution.description || 'Sin descripción'}
                      </div>
                      {contribution.from_financial_task && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          <CreditCard size={12} className="mr-1" />
                          Tarea financiera
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">${formatMoney(contribution.amount)}</span>
                      <span className="text-sm text-gray-500">{formatDate(contribution.contribution_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}