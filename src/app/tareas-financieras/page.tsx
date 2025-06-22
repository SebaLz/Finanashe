"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { Select } from '@/components/ui/select';
import { format, addMonths, parseISO, isToday, isPast, isFuture, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LoaderCircle, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  Filter, 
  MessageSquare, 
  Edit,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  BarChart3,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  getFinancialTasks, 
  markTaskAsPaid, 
  markTaskAsPending, 
  generateTasksFromFixedExpenses,
  FinancialTaskWithDetails,
  updateFinancialTask
} from '@/services/financial-tasks';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { updateFixedExpense } from '@/services/fixed-expenses';
import { getCategories, Category } from '@/services/categories';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageContainer } from '@/components/layout/page-container';

export default function TareasFinancierasPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fecha actual para filtrar tareas
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'paid'>('all');
  
  // Estado para datos
  const [tasks, setTasks] = useState<FinancialTaskWithDetails[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<FinancialTaskWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Estado para comentarios
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<FinancialTaskWithDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Unificar los formularios en uno solo
  const [formData, setFormData] = useState({
    // Datos compartidos
    title: '', // Este será el nombre tanto para la tarea como para el gasto fijo
    amount: '',
    // Datos específicos de la tarea
    due_date: '',
    status: 'pending' as const,
    // Datos específicos del gasto fijo
    category_id: '',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    fixed_due_date: '1',
    description: '',
    installments: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCalendar, setShowCalendar] = useState(false);

  // Cargar datos cuando cambia el usuario o el mes seleccionado
  useEffect(() => {
    loadTasks();
  }, [user, selectedMonth, selectedStatus]);

  // Filtrar tareas basado en el estado seleccionado
  useEffect(() => {
    if (tasks.length === 0) {
      setFilteredTasks([]);
      return;
    }

    if (selectedStatus === 'all') {
      setFilteredTasks(tasks);
    } else {
      setFilteredTasks(tasks.filter(task => task.status === selectedStatus));
    }
  }, [tasks, selectedStatus]);

  // Cargar categorías cuando cambia el usuario
  useEffect(() => {
    if (user) {
      getCategories(user.id).then(setCategories).catch(console.error);
    }
  }, [user]);

  async function loadTasks() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Cargar tareas basadas en el mes seleccionado
      const tasksData = await getFinancialTasks(user.id, selectedMonth);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error al cargar tareas financieras:', err);
      setError('No se pudieron cargar las tareas financieras');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsPaid(taskId: string) {
    if (!user) return;
    
    try {
      await markTaskAsPaid(taskId);
      // Recargar tareas
      loadTasks();
    } catch (err) {
      console.error('Error al marcar tarea como pagada:', err);
      setError('No se pudo marcar la tarea como pagada');
    }
  }

  async function handleMarkAsPending(taskId: string) {
    if (!user) return;
    
    try {
      await markTaskAsPending(taskId);
      // Recargar tareas
      loadTasks();
    } catch (err) {
      console.error('Error al marcar tarea como pendiente:', err);
      setError('No se pudo marcar la tarea como pendiente');
    }
  }

  async function handleGenerateTasks() {
    if (!user) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      // Generar tareas desde gastos fijos
      await generateTasksFromFixedExpenses(user.id, selectedMonth);
      // Recargar tareas
      loadTasks();
    } catch (err) {
      console.error('Error al generar tareas desde gastos fijos:', err);
      setError('No se pudieron generar las tareas desde los gastos fijos');
    } finally {
      setGenerating(false);
    }
  }

  const handleOpenModal = (task?: FinancialTaskWithDetails) => {
    if (task) {
      setSelectedTask(task);
      setFormData({
        // Datos compartidos
        title: task.title, // Usar el título de la tarea
        amount: task.amount.toString(),
        // Datos específicos de la tarea
        due_date: task.due_date,
        status: task.status,
        // Datos específicos del gasto fijo
        category_id: task.fixed_expense?.category_id || '',
        frequency: task.fixed_expense?.frequency || 'monthly',
        fixed_due_date: task.fixed_expense?.due_date.toString() || '1',
        description: task.fixed_expense?.description || '',
        installments: task.fixed_expense?.installments?.toString() || ''
      });
      setIsEditing(true);
    } else {
      setSelectedTask(null);
      setFormData({
        title: '',
        amount: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
        category_id: '',
        frequency: 'monthly',
        fixed_due_date: '1',
        description: '',
        installments: ''
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  // Generar opciones para selector de meses
  const monthOptions = [];
  for (let i = -1; i < 3; i++) {
    const date = addMonths(new Date(), i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy', { locale: es });
    monthOptions.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  // Función para renderizar el estado de la tarea
  function renderTaskStatus(task: FinancialTaskWithDetails) {
    const dueDate = parseISO(task.due_date);
    
    if (task.status === 'paid') {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 size={14} /> Pagado
        </Badge>
      );
    }
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      const daysOverdue = Math.abs(differenceInDays(new Date(), dueDate));
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle size={14} /> Vencido ({daysOverdue} días)
        </Badge>
      );
    }
    
    if (isToday(dueDate)) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock size={14} /> Vence hoy
        </Badge>
      );
    }
    
    if (isFuture(dueDate)) {
      const daysLeft = differenceInDays(dueDate, new Date());
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar size={14} /> En {daysLeft} días
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <ArrowUpRight size={14} /> Pendiente
      </Badge>
    );
  }

  // Función para obtener la etiqueta de frecuencia
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

  // Función para manejar la actualización
  async function handleUpdate() {
    if (!user || !selectedTask) return;
    
    try {
      // Actualizar la tarea
      await updateFinancialTask(selectedTask.id, {
        title: formData.title,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status
      });

      // Si tiene un gasto fijo asociado, actualizarlo también
      if (selectedTask.fixed_expense) {
        await updateFixedExpense(selectedTask.fixed_expense.id, {
          user_id: user.id,
          name: formData.title, // Usar el mismo título como nombre
          amount: parseFloat(formData.amount),
          category_id: formData.category_id,
          frequency: formData.frequency,
          due_date: parseInt(formData.fixed_due_date),
          active: selectedTask.fixed_expense.active,
          description: formData.description || null,
          installments: formData.installments ? parseInt(formData.installments) : null
        });
      }
      
      // Recargar tareas y cerrar modal
      await loadTasks();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al actualizar:', err);
      setError('No se pudo actualizar la tarea');
    }
  }

  // Calcular estadísticas
  const stats = {
    totalTasks: filteredTasks.length,
    pendingTasks: filteredTasks.filter(t => t.status === 'pending').length,
    totalPendingAmount: filteredTasks
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0),
    totalPaidAmount: filteredTasks
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0),
    completionRate: filteredTasks.length > 0 
      ? (filteredTasks.filter(t => t.status === 'paid').length / filteredTasks.length) * 100 
      : 0
  };

  // Filtrar y ordenar tareas
  const processedTasks = filteredTasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.fixed_expense?.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
        task.fixed_expense?.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'date':
          return multiplier * (new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        case 'amount':
          return multiplier * (a.amount - b.amount);
        case 'title':
          return multiplier * a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // Agrupar tareas por categoría
  const tasksByCategory = processedTasks.reduce((acc, task) => {
    if (!task.fixed_expense?.category) {
      // Si no tiene gasto fijo o categoría, va a "Sin categoría"
      const categoryId = 'sin-categoria';
      if (!acc[categoryId]) {
        acc[categoryId] = {
          name: 'Sin categoría',
          color: '#666',
          tasks: []
        };
      }
      acc[categoryId].tasks.push(task);
    } else {
      // Si tiene categoría, usar esa información
      const { id, name, color } = task.fixed_expense.category;
      if (!acc[id]) {
        acc[id] = {
          name,
          color,
          tasks: []
        };
      }
      acc[id].tasks.push(task);
    }
    return acc;
  }, {} as Record<string, { name: string; color: string; tasks: FinancialTaskWithDetails[] }>);

  return (
    <PageContainer>
      <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tareas Financieras</h1>
        <div className="flex items-center gap-3">
          <Select
            options={monthOptions}
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-48"
          />
          <Button 
            variant="secondary" 
            className="flex items-center gap-2"
            onClick={handleGenerateTasks}
            disabled={generating}
          >
            {generating ? (
              <>
                <LoaderCircle className="animate-spin" size={18} />
                Generando...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Generar Tareas
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tareas Pendientes</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{stats.pendingTasks}</h3>
                <span className="text-sm text-muted-foreground">de {stats.totalTasks}</span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monto Pendiente</p>
              <h3 className="text-2xl font-bold">${stats.totalPendingAmount.toLocaleString()}</h3>
              <p className="text-xs text-muted-foreground">
                {stats.pendingTasks} {stats.pendingTasks === 1 ? 'tarea' : 'tareas'} por pagar
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monto Pagado</p>
              <h3 className="text-2xl font-bold">${stats.totalPaidAmount.toLocaleString()}</h3>
              <p className="text-xs text-muted-foreground">
                {stats.totalTasks - stats.pendingTasks} {stats.totalTasks - stats.pendingTasks === 1 ? 'tarea' : 'tareas'} pagadas
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tasa de Completado</p>
              <h3 className="text-2xl font-bold">{Math.round(stats.completionRate)}%</h3>
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Buscar tareas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: 'all', label: 'Todas las categorías' },
                  ...categories.map(cat => ({ value: cat.id, label: (cat as any).emoji ? `${(cat as any).emoji} ${cat.name}` : cat.name }))
                ]}
                className="w-48"
              />
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as 'date' | 'amount' | 'title')}
                options={[
                  { value: 'date', label: 'Ordenar por fecha' },
                  { value: 'amount', label: 'Ordenar por monto' },
                  { value: 'title', label: 'Ordenar por título' }
                ]}
                className="w-48"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                <CalendarIcon size={18} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Tareas</CardTitle>
            <Tabs 
              defaultValue="all" 
              value={selectedStatus} 
              onValueChange={(value) => setSelectedStatus(value as 'all' | 'pending' | 'paid')}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="paid">Pagadas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoaderCircle className="animate-spin mr-2" size={20} />
              <span>Cargando tareas...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-8">
              <AlertCircle className="text-red-500 mr-2" size={20} />
              <span className="text-red-500">{error}</span>
            </div>
          ) : processedTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay tareas financieras para mostrar.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleGenerateTasks}
                disabled={generating}
              >
                {generating ? 'Generando...' : 'Generar desde gastos fijos'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByCategory).map(([categoryId, { name, color, tasks }]) => (
                <Collapsible key={categoryId} defaultOpen>
                  <div className="flex items-center justify-between mb-2">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <h3 className="font-medium">{name}</h3>
                      <span className="text-sm text-muted-foreground">({tasks.length})</span>
                    </CollapsibleTrigger>
                    <div className="text-sm text-muted-foreground">
                      ${tasks.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: `${color}40` }}>
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={`border rounded-lg p-4 ${
                            task.status === 'paid' 
                              ? 'bg-muted/30' 
                              : isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
                                ? 'border-red-500/30'
                                : isToday(parseISO(task.due_date))
                                  ? 'border-yellow-500/30'
                                  : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <h3 className="font-medium flex items-center gap-2">
                                {task.title}
                                {task.fixed_expense && (
                                  <Badge variant="outline" className="text-xs">
                                    Recurrente
                                  </Badge>
                                )}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                  Fecha: {format(parseISO(task.due_date), 'dd/MM/yyyy')}
                                </span>
                                <span className="font-medium">${task.amount.toLocaleString()}</span>
                              </div>
                              {task.fixed_expense?.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.fixed_expense.description}
                                </p>
                              )}
                              {task.fixed_expense?.installments && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Cuotas: {task.fixed_expense.installments}</span>
                                    <span>Progreso</span>
                                  </div>
                                  <Progress 
                                    value={(task.fixed_expense.paid_installments || 0) / task.fixed_expense.installments * 100} 
                                    className="h-1.5"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex items-start gap-3">
                              {renderTaskStatus(task)}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => handleOpenModal(task)}
                              >
                                Editar
                              </Button>
                              {task.status === 'pending' ? (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleMarkAsPaid(task.id)}
                                >
                                  Marcar como pagado
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAsPending(task.id)}
                                >
                                  Marcar como pendiente
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Editar tarea" : "Nueva tarea"}
        className="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Datos de la tarea */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Datos de la tarea</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej. Alquiler, Netflix, etc."
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Monto</label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de vencimiento</label>
                <Input
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  type="date"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  options={[{ value: 'pending', label: 'Pendiente' }, { value: 'paid', label: 'Pagada' }]}
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value as 'pending' | 'paid' })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Datos del gasto fijo (solo si existe) */}
          {selectedTask?.fixed_expense && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Datos del gasto fijo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoría</label>
                  <Select
                    value={formData.category_id}
                    onChange={(value) => setFormData({ ...formData, category_id: value })}
                    options={categories.map(cat => ({ value: cat.id, label: (cat as any).emoji ? `${(cat as any).emoji} ${cat.name}` : cat.name }))}
                    placeholder="Selecciona una categoría"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Frecuencia</label>
                  <Select
                    value={formData.frequency}
                    onChange={(value) => setFormData({ ...formData, frequency: value as 'monthly' | 'weekly' | 'biweekly' })}
                    options={[
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'biweekly', label: 'Quincenal' }
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Día de vencimiento</label>
                  <Input
                    type="number"
                    value={formData.fixed_due_date}
                    onChange={(e) => setFormData({ ...formData, fixed_due_date: e.target.value })}
                    min="1"
                    max="31"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cuotas (opcional)</label>
                  <Input
                    type="number"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                    placeholder="Número de cuotas"
                    min="1"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Descripción (opcional)</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Agrega detalles adicionales sobre el gasto"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.title.trim() || !formData.amount.trim() || !formData.due_date.trim()}
            >
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </PageContainer>
  );
} 