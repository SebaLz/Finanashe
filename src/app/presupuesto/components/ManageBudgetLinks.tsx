import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/components/ui/use-toast';
import { 
  getBudgetGoalLinks, 
  createBudgetGoalLink, 
  updateBudgetGoalLink, 
  deleteBudgetGoalLink, 
  BudgetGoalLinkWithDetails 
} from '@/services/budget-goals';
import { 
  getBudgetFixedExpenseSettings, 
  updateBudgetFixedExpenseSetting, 
  BudgetSettings 
} from '@/services/budgets';
import { getFixedExpensesByCategory, FixedExpenseWithCategory } from '@/services/fixed-expenses';
import { getGoals } from '@/services/goals';
import { getDetailedBudget, BudgetWithFixedExpenses } from '@/services/budgets';
import { 
  ArrowRight, 
  Target, 
  Calendar, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

// Tipo para el presupuesto con todos los detalles
export type BudgetWithFullDetails = BudgetWithFixedExpenses & {
  goalLinks?: BudgetGoalLinkWithDetails[];
};

// Props para el componente
type ManageBudgetLinksProps = {
  open: boolean;
  onClose: () => void;
  selectedBudget: BudgetWithFixedExpenses | null;
  userId: string;
  onUpdate: () => void; // Callback para actualizar la vista principal
};

export function ManageBudgetLinks({ 
  open, 
  onClose, 
  selectedBudget, 
  userId, 
  onUpdate 
}: ManageBudgetLinksProps) {
  const { toast } = useToast();
  
  // Estado para los datos
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('fixed-expenses');
  
  // Estado para gastos fijos
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseWithCategory[]>([]);
  const [fixedExpenseSettings, setFixedExpenseSettings] = useState<Record<string, boolean>>({});
  
  // Estado para objetivos
  const [goals, setGoals] = useState<any[]>([]);
  const [goalLinks, setGoalLinks] = useState<BudgetGoalLinkWithDetails[]>([]);
  
  // Estado para nuevo vínculo con objetivo
  const [newGoalLink, setNewGoalLink] = useState({
    goalId: '',
    amount: 0,
    autoContribute: true
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (open && selectedBudget) {
      loadData();
    }
  }, [open, selectedBudget]);

  // Función para cargar todos los datos
  const loadData = async () => {
    if (!selectedBudget || !userId) return;
    
    setLoading(true);
    try {
      // 1. Cargar gastos fijos de la categoría
      const expenses = await getFixedExpensesByCategory(userId, selectedBudget.category_id);
      setFixedExpenses(expenses);
      
      // 2. Cargar configuraciones existentes (incluido/excluido)
      const settings = await getBudgetFixedExpenseSettings(userId, selectedBudget.id);
      const settingsMap: Record<string, boolean> = {};
      
      // Configuración por defecto: incluido=true
      expenses.forEach(expense => {
        settingsMap[expense.id] = true;
      });
      
      // Aplicar configuraciones guardadas
      settings.forEach(setting => {
        settingsMap[setting.fixed_expense_id] = setting.is_included;
      });
      
      setFixedExpenseSettings(settingsMap);
      
      // 3. Cargar objetivos del usuario
      const userGoals = await getGoals(userId);
      setGoals(userGoals);
      
      // 4. Cargar vínculos existentes con objetivos
      const links = await getBudgetGoalLinks(userId);
      const budgetLinks = links.filter(link => link.budget_id === selectedBudget.id);
      setGoalLinks(budgetLinks);
    } catch (error) {
      console.error('Error cargando datos para vínculos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los datos. Intenta de nuevo más tarde.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar la inclusión de un gasto fijo
  const toggleFixedExpenseInclusion = async (expenseId: string, included: boolean) => {
    if (!selectedBudget) return;
    
    setSaving(true);
    try {
      // Actualizar en BD
      await updateBudgetFixedExpenseSetting(
        userId,
        selectedBudget.id,
        expenseId,
        included
      );
      
      // Actualizar estado local
      setFixedExpenseSettings(prev => ({
        ...prev,
        [expenseId]: included
      }));
      
      toast({
        title: 'Configuración guardada',
        description: included ? 'El gasto fijo se incluirá en el presupuesto.' : 'El gasto fijo no se incluirá en el presupuesto.'
      });
      
      // Notificar cambio
      onUpdate();
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración. Intenta de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para crear un nuevo vínculo con objetivo
  const createGoalLink = async () => {
    if (!selectedBudget || !newGoalLink.goalId || newGoalLink.amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Datos incompletos',
        description: 'Selecciona un objetivo y especifica un monto válido.'
      });
      return;
    }
    
    setSaving(true);
    try {
      const createdLink = await createBudgetGoalLink({
        user_id: userId,
        budget_id: selectedBudget.id,
        goal_id: newGoalLink.goalId,
        monthly_amount: newGoalLink.amount,
        auto_contribute: newGoalLink.autoContribute
      });
      
      // Recargar datos para obtener los detalles completos
      await loadData();
      
      // Resetear formulario
      setNewGoalLink({
        goalId: '',
        amount: 0,
        autoContribute: true
      });
      
      toast({
        title: 'Vínculo creado',
        description: 'Se ha vinculado el objetivo al presupuesto.'
      });
      
      // Notificar cambio
      onUpdate();
    } catch (error) {
      console.error('Error al crear vínculo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el vínculo. Intenta de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para eliminar un vínculo
  const deleteLink = async (linkId: string) => {
    if (!confirm('¿Estás seguro de eliminar este vínculo?')) return;
    
    setSaving(true);
    try {
      await deleteBudgetGoalLink(linkId);
      
      // Actualizar estado local
      setGoalLinks(prev => prev.filter(link => link.id !== linkId));
      
      toast({
        title: 'Vínculo eliminado',
        description: 'Se ha eliminado la vinculación con el objetivo.'
      });
      
      // Notificar cambio
      onUpdate();
    } catch (error) {
      console.error('Error al eliminar vínculo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el vínculo. Intenta de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para actualizar monto de contribución
  const updateLinkAmount = async (linkId: string, amount: number) => {
    if (amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Monto inválido',
        description: 'El monto debe ser mayor que cero.'
      });
      return;
    }
    
    setSaving(true);
    try {
      await updateBudgetGoalLink(linkId, { monthly_amount: amount });
      
      // Actualizar estado local
      setGoalLinks(prev => prev.map(link => 
        link.id === linkId ? { ...link, monthly_amount: amount } : link
      ));
      
      toast({
        title: 'Monto actualizado',
        description: 'Se ha actualizado el monto de contribución.'
      });
      
      // Notificar cambio
      onUpdate();
    } catch (error) {
      console.error('Error al actualizar monto:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el monto. Intenta de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para actualizar auto-contribución
  const toggleAutoContribute = async (linkId: string, autoContribute: boolean) => {
    setSaving(true);
    try {
      await updateBudgetGoalLink(linkId, { auto_contribute: autoContribute });
      
      // Actualizar estado local
      setGoalLinks(prev => prev.map(link => 
        link.id === linkId ? { ...link, auto_contribute: autoContribute } : link
      ));
      
      toast({
        title: 'Configuración actualizada',
        description: autoContribute 
          ? 'Se realizarán contribuciones automáticas' 
          : 'Las contribuciones serán manuales'
      });
      
      // Notificar cambio
      onUpdate();
    } catch (error) {
      console.error('Error al actualizar auto-contribución:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la configuración. Intenta de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBudget) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="h-4 w-4 rounded-full mr-2" 
                  style={{ backgroundColor: selectedBudget.category?.color || '#ccc' }}></span>
            Configurar {selectedBudget.category?.name || 'Presupuesto'}
          </DialogTitle>
          <DialogDescription>
            Vincula gastos fijos y objetivos a esta categoría para automatizar tu presupuesto.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fixed-expenses" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fixed-expenses">Gastos Fijos</TabsTrigger>
            <TabsTrigger value="goals">Objetivos</TabsTrigger>
          </TabsList>
          
          {/* Tab de Gastos Fijos */}
          <TabsContent value="fixed-expenses">
            <div className="space-y-4 mt-2">
              <h3 className="text-sm font-medium">
                Gastos fijos vinculados a {selectedBudget.category?.name || 'esta categoría'}
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Cargando gastos fijos...</p>
                </div>
              ) : fixedExpenses.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      No hay gastos fijos asociados a esta categoría.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.location.href = '/gastos-fijos/nuevo'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear nuevo gasto fijo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {fixedExpenses.map((expense) => (
                    <Card key={expense.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex items-center p-4">
                          <div className="flex-1">
                            <div className="font-medium">{expense.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(expense.amount)}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="text-sm mr-2">Incluir</div>
                            <Checkbox 
                              checked={fixedExpenseSettings[expense.id] || false}
                              onCheckedChange={(checked) => 
                                toggleFixedExpenseInclusion(expense.id, checked as boolean)
                              }
                              disabled={saving}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Tab de Objetivos */}
          <TabsContent value="goals">
            <div className="space-y-4 mt-2">
              <h3 className="text-sm font-medium">
                Objetivos vinculados a {selectedBudget.category?.name || 'esta categoría'}
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Cargando objetivos...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Formulario para crear nuevo vínculo */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="text-sm font-medium">Añadir un objetivo</h4>
                      
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Select
                            label="Objetivo"
                            options={
                              goals.length === 0 
                                ? [{ value: '', label: 'No hay objetivos disponibles' }]
                                : goals
                                    .filter(goal => !goalLinks.some(link => link.goal_id === goal.id))
                                    .map(goal => ({ value: goal.id, label: goal.name }))
                            }
                            value={newGoalLink.goalId}
                            onChange={(value) => setNewGoalLink(prev => ({ ...prev, goalId: value }))}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="amount-input">Monto mensual</Label>
                          <Input
                            id="amount-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newGoalLink.amount}
                            onChange={(e) => setNewGoalLink(prev => ({ 
                              ...prev, 
                              amount: parseFloat(e.target.value) || 0
                            }))}
                            placeholder="Monto a contribuir mensualmente"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="auto-contribute"
                            checked={newGoalLink.autoContribute}
                            onCheckedChange={(checked) => setNewGoalLink(prev => ({ 
                              ...prev, 
                              autoContribute: checked as boolean 
                            }))}
                          />
                          <Label htmlFor="auto-contribute" className="cursor-pointer">
                            Contribuir automáticamente
                          </Label>
                        </div>
                        
                        <Button 
                          onClick={createGoalLink} 
                          disabled={saving || !newGoalLink.goalId || newGoalLink.amount <= 0}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Vincular objetivo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Lista de vínculos existentes */}
                  {goalLinks.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">
                          No hay objetivos vinculados a esta categoría.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Vincula objetivos para contribuir a ellos desde este presupuesto.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    goalLinks.map((link) => (
                      <Card key={link.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">{link.goal?.name}</h4>
                            <Badge variant={link.auto_contribute ? "default" : "outline"}>
                              {link.auto_contribute ? "Automático" : "Manual"}
                            </Badge>
                          </div>
                          
                          <div className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span>Contribución mensual:</span>
                              <span className="font-medium">{formatCurrency(link.monthly_amount)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Progreso:</span>
                              <span>{formatCurrency(link.goal?.current_amount)} de {formatCurrency(link.goal?.target_amount)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label htmlFor={`amount-${link.id}`}>Actualizar monto</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id={`amount-${link.id}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={link.monthly_amount}
                                  placeholder="Nuevo monto"
                                  className="flex-1"
                                  onBlur={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (value !== link.monthly_amount && value > 0) {
                                      updateLinkAmount(link.id, value);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`auto-${link.id}`}
                                  checked={link.auto_contribute}
                                  onCheckedChange={(checked) => 
                                    toggleAutoContribute(link.id, checked as boolean)
                                  }
                                  disabled={saving}
                                />
                                <Label htmlFor={`auto-${link.id}`} className="cursor-pointer">
                                  Automático
                                </Label>
                              </div>
                              
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => deleteLink(link.id)}
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  
                  {goals.length === 0 && (
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = '/objetivos/nuevo'}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crear nuevo objetivo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose} variant="secondary">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 