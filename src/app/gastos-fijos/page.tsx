"use client";

import { Layout } from '@/components/layout/layout';
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
import { getCategories } from '@/services/categories';
import { CheckCircle2, XCircle, Edit2, Trash2, PlusCircle, LoaderCircle, AlertCircle, PieChart, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { getBudgetSummary, BudgetWithFixedExpenses } from '@/services/budgets';
import { format } from 'date-fns';

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

export default function GastosFijosPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // Estado para datos
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<FixedExpenseWithCategory | null>(null);
  const [budgetsByCategory, setBudgetsByCategory] = useState<Record<string, BudgetWithFixedExpenses | null>>({});
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithFixedExpenses | null>(null);
  
  // Estado para formulario
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category_id: '',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    due_date: '1',
    description: '',
    installments: ''
  });

  // Cargar datos cuando cambia el usuario
  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cargar categorías
      const categoriesData = await getCategories(user.id);
      setCategories(categoriesData);
      
      // Cargar gastos fijos
      const expensesData = await getFixedExpenses(user.id);
      setFixedExpenses(expensesData);

      // Cargar presupuestos del mes actual
      const currentMonth = format(new Date(), 'yyyy-MM');
      const budgetSummary = await getBudgetSummary(user.id, currentMonth);
      
      // Crear mapa de presupuestos por categoría
      const budgetsMap: Record<string, BudgetWithFixedExpenses | null> = {};
      budgetSummary.forEach(budget => {
        budgetsMap[budget.category_id] = budget;
      });
      
      setBudgetsByCategory(budgetsMap);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('No se pudieron cargar los gastos fijos');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      amount: '',
      category_id: '',
      frequency: 'monthly',
      due_date: '1',
      description: '',
      installments: ''
    });
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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | string, nameOverride?: string) {
    // Si e es un string, es un evento personalizado del componente Select
    if (typeof e === 'string') {
      setFormData(prev => ({
        ...prev,
        [nameOverride!]: e
      }));
    } else {
      // Es un evento estándar de React
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
    } catch (err) {
      console.error('Error al cambiar estado del gasto fijo:', err);
      setError('No se pudo cambiar el estado del gasto fijo');
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
        installments: formData.installments ? parseInt(formData.installments) : null
      });
      
      // Recargar datos y cerrar modal
      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error al crear gasto fijo:', err);
      setError('No se pudo crear el gasto fijo');
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
        installments: formData.installments ? parseInt(formData.installments) : null
      });
      
      // Recargar datos y cerrar modal
      await loadData();
      setShowEditModal(false);
    } catch (err) {
      console.error('Error al editar gasto fijo:', err);
      setError('No se pudo editar el gasto fijo');
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
    } catch (err) {
      console.error('Error al eliminar gasto fijo:', err);
      setError('No se pudo eliminar el gasto fijo');
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

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gastos Fijos Recurrentes</h1>
          <Button 
            variant="primary" 
            className="flex items-center gap-2"
            onClick={handleOpenAddModal}
          >
            <PlusCircle size={18} />
            Agregar Gasto Fijo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todos los gastos fijos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <LoaderCircle className="animate-spin mr-2" size={20} />
                <span>Cargando gastos fijos...</span>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-8">
                <AlertCircle className="text-red-500 mr-2" size={20} />
                <span className="text-red-500">{error}</span>
              </div>
            ) : fixedExpenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay gastos fijos configurados.</p>
                <Button 
                  variant="ghost" 
                  className="mt-4"
                  onClick={handleOpenAddModal}
                >
                  Agregar un gasto fijo
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {fixedExpenses.map((expense) => (
                  <div key={expense.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{expense.name}</h3>
                          <Badge 
                            variant={expense.active ? 'success' : 'secondary'}
                            className="text-xs"
                          >
                            {expense.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {budgetsByCategory[expense.category_id] && (
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer"
                              onClick={() => handleOpenBudgetModal(expense)}
                            >
                              <PieChart size={12} className="mr-1" />
                              Presupuesto
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
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
                              <span>{expense.installments} cuotas</span>
                            </>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {expense.description}
                          </p>
                        )}
                        <div>
                          <span className="font-medium text-lg">${expense.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(expense.id, expense.active)}
                          title={expense.active ? 'Desactivar' : 'Activar'}
                        >
                          {expense.active ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(expense)}
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(expense)}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
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

      {/* Modal para agregar gasto fijo */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Agregar Gasto Fijo"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ej. Alquiler, Netflix, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Agrega detalles adicionales sobre el gasto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto</label>
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <Select
              name="category_id"
              value={formData.category_id}
              onChange={(value) => handleInputChange(value, 'category_id')}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              placeholder="Selecciona una categoría"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Frecuencia</label>
            <Select
              name="frequency"
              value={formData.frequency}
              onChange={(value) => handleInputChange(value, 'frequency')}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'biweekly', label: 'Quincenal' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Día de vencimiento</label>
            <Input
              type="number"
              name="due_date"
              value={formData.due_date}
              onChange={handleInputChange}
              placeholder="1-31"
              min="1"
              max="31"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Número de cuotas (opcional)</label>
            <Input
              type="number"
              name="installments"
              value={formData.installments}
              onChange={handleInputChange}
              placeholder="Dejar vacío si no aplica"
              min="1"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAddExpense}
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin mr-2" size={16} />
                  Guardando...
                </>
              ) : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para editar gasto fijo */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Gasto Fijo"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ej. Alquiler, Netflix, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Agrega detalles adicionales sobre el gasto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto</label>
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <Select
              name="category_id"
              value={formData.category_id}
              onChange={(value) => handleInputChange(value, 'category_id')}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              placeholder="Selecciona una categoría"
            />
          </div>
          {formData.category_id && budgetsByCategory[formData.category_id] && (
            <div className="mt-2 p-2 bg-muted/30 rounded-md">
              <p className="text-xs text-muted-foreground flex items-center">
                <PieChart size={12} className="mr-1 text-primary" />
                Presupuesto mensual para esta categoría: 
                <span className="font-medium ml-1">
                  ${budgetsByCategory[formData.category_id]?.amount.toLocaleString() || 0}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cambiar la categoría afectará al cálculo del presupuesto disponible
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 text-xs"
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
          <div>
            <label className="block text-sm font-medium mb-1">Frecuencia</label>
            <Select
              name="frequency"
              value={formData.frequency}
              onChange={(value) => handleInputChange(value, 'frequency')}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'biweekly', label: 'Quincenal' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Día de vencimiento</label>
            <Input
              type="number"
              name="due_date"
              value={formData.due_date}
              onChange={handleInputChange}
              placeholder="1-31"
              min="1"
              max="31"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Número de cuotas (opcional)</label>
            <Input
              type="number"
              name="installments"
              value={formData.installments}
              onChange={handleInputChange}
              placeholder="Dejar vacío si no aplica"
              min="1"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleEditExpense}
              disabled={saving}
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
      </Modal>

      {/* Modal para confirmar eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Gasto Fijo"
      >
        <div className="space-y-4">
          <p>
            ¿Estás seguro de que deseas eliminar el gasto fijo <strong>{selectedExpense?.name}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer y también eliminará todas las tareas financieras asociadas.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExpense}
              disabled={saving}
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
      </Modal>

      {/* Modal para visualizar presupuesto asociado */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title="Presupuesto Asociado"
      >
        <div className="space-y-4">
          {selectedExpense && (
            <>
              <div>
                <h3 className="font-medium">Gasto Fijo: {selectedExpense.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Categoría: <span style={{ color: selectedExpense.category.color }}>{selectedExpense.category.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Monto mensual: <span className="font-medium">${selectedExpense.amount.toLocaleString()}</span>
                </p>
              </div>
              
              <div className="border-t pt-4">
                {selectedBudget ? (
                  <>
                    <h3 className="font-medium">Presupuesto mensual para {selectedExpense.category.name}</h3>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total asignado:</span>
                        <span className="font-medium">${selectedBudget.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total gastos fijos:</span>
                        <span className="font-medium text-amber-600">${selectedBudget.fixed_expenses_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Disponible para otros gastos:</span>
                        <span className="font-medium">${selectedBudget.available_amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-4">
                      <div 
                        className="h-full bg-primary"
                        style={{ 
                          width: `${Math.min(100, (selectedBudget.fixed_expenses_amount / selectedBudget.amount) * 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {((selectedBudget.fixed_expenses_amount / selectedBudget.amount) * 100).toFixed(0)}% del presupuesto es usado por gastos fijos
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      No hay presupuesto configurado para esta categoría en el mes actual.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowBudgetModal(false)}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={navigateToPresupuesto}
              className="flex items-center"
            >
              <PieChart size={16} className="mr-2" />
              Ver presupuesto completo
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
} 