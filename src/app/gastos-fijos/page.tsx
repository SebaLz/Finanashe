"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { 
  getFixedExpenses, 
  createFixedExpense, 
  updateFixedExpense,
  deleteFixedExpense,
  toggleFixedExpenseStatus,
  FixedExpenseWithCategory 
} from '@/services/fixed-expenses';
import { getCategories, getCategoriesByType } from '@/services/categories';
import { getBudgetCategories } from '@/services/categories';
import { CheckCircle2, XCircle, Edit2, Trash2, PlusCircle, LoaderCircle, AlertCircle, PieChart, ArrowRight, Plus, Receipt, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { getBudgetSummary, BudgetWithFixedExpenses } from '@/services/budgets';
import { format } from 'date-fns';
import { ensureValidFixedExpenseCategories, ensureValidCategories } from '@/utils/category-helpers';
import { Dialog, DialogContent, DialogFooter, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PageContainer } from '@/components/layout/page-container';

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  emoji?: string | null;
};

// Definir el tipo ButtonVariant
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive' | 'default';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

// Agregar la propiedad onClick en BadgeProps
interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline' | 'success';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export default function GastosFijosPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Estado para datos
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<FixedExpenseWithCategory | null>(null);
  const [budgetsByCategory, setBudgetsByCategory] = useState<Record<string, BudgetWithFixedExpenses | null>>({});
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithFixedExpenses | null>(null);
  
  // Datos iniciales para el formulario
  const initialFormData = {
    name: '',
    amount: '',
    category_id: '',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    due_date: '1',
    description: '',
    installments: ''
  };
  
  // Estado para formulario
  const [formData, setFormData] = useState(initialFormData);

  // Cargar datos cuando cambia el usuario
  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cargar gastos fijos
      const expensesResponse = await getFixedExpenses(user.id);
      const expenses = expensesResponse?.data || [];
      
      // Obtener categorías de tipo gasto y ahorro
      const expenseCategories = await getCategoriesByType(user.id, 'expense');
      const savingCategories = await getCategoriesByType(user.id, 'saving');
      
      // Combinar ambos tipos de categorías
      const allBudgetCategories = [...expenseCategories, ...savingCategories];
      
      // Cargar presupuestos para ver qué categorías tienen presupuesto
      const budgetData = await getBudgetSummary(user.id, format(new Date(), 'yyyy-MM'));
      const budgetMap: Record<string, BudgetWithFixedExpenses | null> = {};
      
      // Verificar si budgetData es un array y procesarlo
      if (Array.isArray(budgetData)) {
        budgetData.forEach((budget) => {
          budgetMap[budget.category_id] = budget;
        });
      }
      
      // Filtrar categorías para mostrar solo las que están activas en el presupuesto
      const activeCategories = allBudgetCategories.filter(category => 
        // Incluir la categoría si tiene un presupuesto asignado actualmente
        budgetMap[category.id] !== undefined
      );
      
      setBudgetsByCategory(budgetMap);
      setFixedExpenses(expenses);
      
      // Si hay categorías activas, usar esas; si no, mostrar todas las categorías de gasto y ahorro
      setCategories(activeCategories.length > 0 ? activeCategories : allBudgetCategories);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData(initialFormData);
  }

  function handleOpenAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function handleOpenEditModal(expense: FixedExpenseWithCategory) {
    setSelectedExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      category_id: expense.category_id,
      frequency: expense.frequency,
      due_date: expense.due_date.toString(),
      description: expense.description || '',
      installments: expense.installments?.toString() || ''
    });
    setShowEditModal(true);
  }

  function handleOpenDeleteModal(expense: FixedExpenseWithCategory) {
    setSelectedExpense(expense);
    setShowDeleteModal(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | string | number, nameOverride?: string) {
    if (typeof e === 'string' || typeof e === 'number') {
      setFormData(prev => ({
        ...prev,
        [nameOverride!]: e
      }));
    } else {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  }

  async function handleToggleStatus(id: string, active: boolean) {
    if (!user) return;
    
    try {
      await toggleFixedExpenseStatus(id, !active);
      // Recargar datos
      loadData();
      toast({
        title: "Estado actualizado",
        description: `El gasto fijo ha sido ${active ? 'desactivado' : 'activado'} correctamente.`,
        variant: "success"
      });
    } catch (err) {
      console.error('Error al cambiar estado del gasto fijo:', err);
      setError('No se pudo cambiar el estado del gasto fijo');
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del gasto fijo.",
        variant: "destructive"
      });
    }
  }

  async function handleAddExpense() {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Validar datos
      if (!formData.name || !formData.amount || !formData.category_id) {
        throw new Error('Todos los campos son obligatorios');
      }
      
      // Crear gasto fijo
      await createFixedExpense({
        user_id: user.id,
        name: formData.name,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        frequency: formData.frequency,
        due_date: parseInt(formData.due_date),
        active: true,
        description: formData.description || null,
        total_installments: formData.installments ? parseInt(formData.installments) : null
      });
      
      // Recargar datos y cerrar modal
      await loadData();
      setDialogOpen(false);
      resetForm();
      
      // Mostrar mensaje de éxito
      toast({
        title: "Gasto fijo creado",
        description: `El gasto fijo "${formData.name}" ha sido creado correctamente.`,
        variant: "success"
      });
    } catch (err) {
      console.error('Error al crear gasto fijo:', err);
      setError('No se pudo crear el gasto fijo');
      toast({
        title: "Error",
        description: "No se pudo crear el gasto fijo. Verifica los datos ingresados.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleEditExpense() {
    if (!user || !selectedExpense) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Validar datos
      if (!formData.name || !formData.amount || !formData.category_id) {
        throw new Error('Todos los campos son obligatorios');
      }
      
      // Actualizar gasto fijo
      await updateFixedExpense(selectedExpense.id, {
        user_id: user.id,
        name: formData.name,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        frequency: formData.frequency,
        due_date: parseInt(formData.due_date),
        active: selectedExpense.active,
        description: formData.description || null,
        total_installments: formData.installments ? parseInt(formData.installments) : null
      });
      
      // Recargar datos y cerrar modal
      await loadData();
      setShowEditModal(false);
      
      // Mostrar mensaje de éxito
      toast({
        title: "Gasto fijo actualizado",
        description: `El gasto fijo ha sido actualizado correctamente.`,
        variant: "success"
      });
    } catch (err) {
      console.error('Error al editar gasto fijo:', err);
      setError('No se pudo editar el gasto fijo');
      toast({
        title: "Error",
        description: "No se pudo editar el gasto fijo. Verifica los datos ingresados.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense() {
    if (!selectedExpense) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Eliminar gasto fijo
      await deleteFixedExpense(selectedExpense.id);
      
      // Recargar datos y cerrar modal
      await loadData();
      setShowDeleteModal(false);
      
      // Mostrar mensaje de éxito
      toast({
        title: "Gasto fijo eliminado",
        description: `El gasto fijo "${selectedExpense.name}" ha sido eliminado.`,
        variant: "success"
      });
    } catch (err) {
      console.error('Error al eliminar gasto fijo:', err);
      setError('No se pudo eliminar el gasto fijo');
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto fijo.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  function getFrequencyLabel(frequency: string) {
    switch (frequency) {
      case 'monthly':
        return 'Mensual';
      case 'weekly':
        return 'Semanal';
      case 'biweekly':
        return 'Quincenal';
      default:
        return frequency;
    }
  }

  function getDueDateLabel(expense: FixedExpenseWithCategory) {
    if (expense.frequency === 'monthly') {
      return `Día ${expense.due_date} de cada mes`;
    } else if (expense.frequency === 'weekly') {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[expense.due_date % 7];
    } else if (expense.frequency === 'biweekly') {
      return 'Días 1 y 15 de cada mes';
    }
    return `Día ${expense.due_date}`;
  }

  function handleOpenBudgetModal(expense: FixedExpenseWithCategory) {
    const budget = budgetsByCategory[expense.category_id] || null;
    setSelectedExpense(expense);
    setSelectedBudget(budget);
    setShowBudgetModal(true);
  }

  function navigateToPresupuesto() {
    router.push('/presupuesto');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAddExpense();
  }

  return (
    <PageContainer>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gastos Fijos Recurrentes</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                className="flex items-center gap-2 rounded-full px-4 shadow-md"
                onClick={() => {
                  setFormData(initialFormData);
                  setDialogOpen(true);
                }}
              >
                <Plus size={16} className="mr-1" /> Agregar gasto fijo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-lg border-0 shadow-lg">
              <DialogTitle className="sr-only">Agregar nuevo gasto fijo</DialogTitle>
              <div className="p-0">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                  <div className="flex items-center text-lg mb-1">
                    <Plus className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">Añadir nuevo gasto fijo</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Los gastos fijos te ayudan a planificar y controlar pagos recurrentes.
                  </p>
                </div>
              
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Formulario */}
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre del gasto fijo</Label>
                      <Input 
                        id="name"
                        name="name"
                        placeholder="Ej. Netflix, Alquiler, etc." 
                        value={formData.name}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Monto mensual</Label>
                      <Input 
                        id="amount"
                        name="amount"
                        type="number" 
                        placeholder="0.00" 
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="category_id">Categoría</Label>
                      <Select 
                        name="category_id"
                        value={formData.category_id}
                        onChange={(value) => setFormData({...formData, category_id: value})}
                        options={categories.map(cat => ({ 
                          value: cat.id, 
                          label: cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name
                        }))}
                        className="z-[100] !mb-0"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="frequency">Frecuencia</Label>
                      <Select 
                        name="frequency"
                        value={formData.frequency}
                        onChange={(value) => setFormData({...formData, frequency: value as 'monthly' | 'weekly' | 'biweekly'})}
                        options={[
                          { value: 'monthly', label: 'Mensual' },
                          { value: 'biweekly', label: 'Quincenal' },
                          { value: 'weekly', label: 'Semanal' }
                        ]}
                        className="z-[90] !mb-0"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Día de vencimiento</Label>
                      <Select 
                        name="due_date"
                        value={formData.due_date.toString()}
                        onChange={(value) => setFormData({...formData, due_date: value})}
                        options={Array.from({ length: 31 }, (_, i) => ({ 
                          value: (i + 1).toString(), 
                          label: (i + 1).toString()
                        }))}
                        className="z-[80] !mb-0"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="installments">Número de cuotas (opcional)</Label>
                      <Input 
                        id="installments"
                        name="installments"
                        type="number" 
                        placeholder="Dejar en blanco si no es en cuotas" 
                        value={formData.installments}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descripción (opcional)</Label>
                      <Textarea 
                        id="description"
                        name="description"
                        placeholder="Agrega detalles adicionales..." 
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                  </div>

                  <DialogFooter className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || saving} 
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <>
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : 'Guardar'}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="mt-6">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4">
            <CardTitle className="text-lg">Listado de gastos fijos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <LoaderCircle className="animate-spin mr-2 h-6 w-6 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">Cargando gastos fijos...</span>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-16">
                <AlertCircle className="text-red-500 mr-2 h-6 w-6" />
                <span className="text-red-500">{error}</span>
              </div>
            ) : fixedExpenses.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                  <Receipt className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay gastos fijos configurados
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                  Añade tus gastos recurrentes para un mejor control de tus finanzas y presupuesto mensual.
                </p>
                <Button 
                  onClick={handleOpenAddModal}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Agregar un gasto fijo
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {fixedExpenses.map((expense) => (
                  <div key={expense.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{expense.name}</h3>
                          <Badge 
                            className={`text-xs ${expense.active 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}`
                            }
                          >
                            {expense.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {budgetsByCategory[expense.category_id] && (
                            <div
                              className="text-xs cursor-pointer bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full inline-flex items-center"
                              onClick={() => handleOpenBudgetModal(expense)}
                            >
                              <PieChart size={12} className="mr-1" />
                              Presupuesto
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{getFrequencyLabel(expense.frequency)}</span>
                          <span>•</span>
                          <span>{getDueDateLabel(expense)}</span>
                          <span>•</span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full" 
                            style={{ 
                              backgroundColor: `${expense.category.color}20`,
                              color: expense.category.color
                            }}
                          >
                            {expense.category.name}
                          </span>
                          {expense.installments && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <Receipt className="mr-1 h-3 w-3" />
                                {expense.installments} cuotas
                              </span>
                            </>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
                            {expense.description}
                          </p>
                        )}
                        <div className="mt-2">
                          <span className="font-medium text-lg text-gray-900 dark:text-white">${expense.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-start justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(expense.id, expense.active)}
                          title={expense.active ? 'Desactivar' : 'Activar'}
                          className="h-9 w-9 p-0 border-gray-200 dark:border-gray-700"
                        >
                          {expense.active ? <Power size={16} /> : <PowerOff size={16} />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(expense)}
                          title="Editar"
                          className="h-9 w-9 p-0 border-gray-200 dark:border-gray-700"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(expense)}
                          title="Eliminar"
                          className="h-9 w-9 p-0 border-gray-200 dark:border-gray-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para editar gasto fijo - Mantener la funcionalidad y solo actualizar el diseño */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Gasto Fijo"
        className="max-w-lg border-0 shadow-md overflow-hidden dark:bg-gray-900 dark:border-gray-800"
      >
        <div className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
            <div className="flex items-center text-base mb-1">
              <Edit2 className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">Modificar detalles del gasto fijo</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Actualiza la información de tu gasto fijo recurrente
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nombre</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej. Alquiler, Netflix, etc."
                className="h-10 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Descripción (opcional)</label>
              <Textarea
                name="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange(e.target.value, 'description')}
                placeholder="Detalles adicionales..."
                className="min-h-[80px] bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Monto</label>
              <Input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-10 bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Categoría</label>
              <Select
                name="category_id"
                value={formData.category_id}
                onChange={(value) => handleInputChange(value, 'category_id')}
                                      options={categories.map(cat => ({ value: cat.id, label: (cat as any).emoji ? `${(cat as any).emoji} ${cat.name}` : cat.name }))}
                placeholder="Selecciona una categoría"
                className="h-10 bg-white dark:bg-gray-900"
              />
            </div>
            {formData.category_id && budgetsByCategory[formData.category_id] && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
                <p className="text-xs text-gray-700 dark:text-gray-300 flex items-center">
                  <PieChart size={12} className="mr-1 text-blue-600" />
                  Presupuesto mensual para esta categoría: 
                  <span className="font-medium ml-1">
                    ${budgetsByCategory[formData.category_id]?.amount.toLocaleString() || 0}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cambiar la categoría afectará al cálculo del presupuesto disponible
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                  onClick={() => {
                    setShowEditModal(false);
                    if (selectedExpense) {
                      handleOpenBudgetModal({
                        ...selectedExpense,
                        category_id: formData.category_id,
                        category: categories.find(c => c.id === formData.category_id)?.name 
                          ? {
                              name: categories.find(c => c.id === formData.category_id)?.name || '',
                              color: categories.find(c => c.id === formData.category_id)?.color || '#000000',
                              icon: categories.find(c => c.id === formData.category_id)?.icon || null
                            }
                          : selectedExpense.category
                      });
                    }
                  }}
                >
                  Ver detalles del presupuesto
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Frecuencia</label>
                <Select
                  name="frequency"
                  value={formData.frequency}
                  onChange={(value) => handleInputChange(value, 'frequency')}
                  options={[
                    { value: 'monthly', label: 'Mensual' },
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'biweekly', label: 'Quincenal' }
                  ]}
                  className="h-10 bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Día de vencimiento</label>
                <Input
                  type="number"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  placeholder="1-31"
                  min="1"
                  max="31"
                  className="h-10 bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Número de cuotas (opcional)</label>
              <Input
                type="number"
                name="installments"
                value={formData.installments}
                onChange={handleInputChange}
                placeholder="Dejar vacío si no aplica"
                min="1"
                className="h-10 bg-white dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                Define si este gasto se divide en un número específico de pagos
              </p>
            </div>
            {error && (
              <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-100 dark:border-red-900">{error}</div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="border-gray-200 dark:border-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditExpense}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin mr-2" size={16} />
                    Guardando...
                  </>
                ) : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal para confirmar eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Gasto Fijo"
        className="max-w-md border-0 shadow-md overflow-hidden dark:bg-gray-900 dark:border-gray-800"
      >
        <div className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50">
            <div className="flex items-center text-base mb-1">
              <AlertCircle className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">Confirmar eliminación</span>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                <Trash2 size={24} />
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  ¿Estás seguro de que deseas eliminar el gasto fijo <span className="font-medium">{selectedExpense?.name}</span>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Esta acción no se puede deshacer y también eliminará todas las tareas financieras asociadas.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
                className="border-gray-200 dark:border-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteExpense}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin mr-2" size={16} />
                    Eliminando...
                  </>
                ) : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal para visualizar presupuesto asociado */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title="Presupuesto Asociado"
        className="max-w-md border-0 shadow-md overflow-hidden dark:bg-gray-900 dark:border-gray-800"
      >
        <div className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50">
            <div className="flex items-center text-base mb-1">
              <PieChart className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">Información de presupuesto</span>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {selectedExpense && (
              <>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Receipt size={16} /> 
                    Gasto Fijo: {selectedExpense.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Categoría: <span style={{ color: selectedExpense.category.color }}>{selectedExpense.category.name}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Monto mensual: <span className="font-medium">${selectedExpense.amount.toLocaleString()}</span>
                  </p>
                </div>
                
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  {selectedBudget ? (
                    <>
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <PieChart size={16} className="text-purple-600" /> 
                        Presupuesto para {selectedExpense.category.name}
                      </h3>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total asignado:</span>
                          <span className="font-medium text-gray-900 dark:text-white">${selectedBudget.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total gastos fijos:</span>
                          <span className="font-medium text-amber-600 dark:text-amber-500">${selectedBudget.fixed_expenses_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Disponible para otros gastos:</span>
                          <span className="font-medium text-green-600 dark:text-green-500">${selectedBudget.available_amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mt-4">
                        <div 
                          className="h-full bg-purple-600 dark:bg-purple-500"
                          style={{ 
                            width: `${Math.min(100, (selectedBudget.fixed_expenses_amount / selectedBudget.amount) * 100)}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        {((selectedBudget.fixed_expenses_amount / selectedBudget.amount) * 100).toFixed(0)}% del presupuesto es usado por gastos fijos
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        No hay presupuesto configurado para esta categoría en el mes actual.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Puedes configurar un presupuesto para esta categoría en la sección de Presupuesto.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="outline"
                onClick={() => setShowBudgetModal(false)}
                className="border-gray-200 dark:border-gray-700"
              >
                Cerrar
              </Button>
              <Button
                onClick={navigateToPresupuesto}
                className="bg-purple-600 hover:bg-purple-700 flex items-center"
              >
                <PieChart size={16} className="mr-2" />
                Ver presupuesto completo
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
} 