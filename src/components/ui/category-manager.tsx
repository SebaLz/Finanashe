"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { 
  getCategories, 
  createCustomCategory, 
  updateCategory, 
  deleteCategory, 
  getAllCategories,
  setCategoryVisibility,
  setCategoryBudgetVisibility
} from '@/services/categories';
import { useUser } from '@/hooks/useUser';
import { 
  Plus, 
  Edit2, 
  Save, 
  X, 
  EyeOff, 
  Eye, 
  Filter,
  Check,
  Power,
  PowerOff,
  Palette,
  Tag,
  Settings,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Skeleton, TableRowsSkeleton } from './skeleton';
import { Select, SelectOption } from '@/components/ui/select';

export type CategoryWithVisibility = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string | null;
  is_system?: boolean;
  is_visible?: boolean;
  visible_in_budget?: boolean;
  created_at?: string;
  type: string;
};

export function CategoryManager({ onCategoriesChanged }: { onCategoriesChanged?: () => void }) {
  const { user } = useUser();
  const [customCategories, setCustomCategories] = useState<CategoryWithVisibility[]>([]);
  const [defaultCategories, setDefaultCategories] = useState<CategoryWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    color: '#3B82F6', 
    icon: 'tag',
    type: 'expense' 
  });
  const [editForm, setEditForm] = useState({ 
    name: '', 
    color: '', 
    icon: '',
    type: '' 
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('custom');

  // Función para notificar cambios en categorías
  const notifyChanges = useCallback(() => {
    if (onCategoriesChanged) {
      onCategoriesChanged();
    }
  }, [onCategoriesChanged]);

  // Cargar categorías
  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await getAllCategories(user.id);
        
        // Separar categorías personalizadas y del sistema
        const custom = data.filter(cat => !cat.is_system);
        const defaults = data.filter(cat => cat.is_system);
        
        setCustomCategories(custom);
        setDefaultCategories(defaults);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        setError('No se pudieron cargar las categorías');
      } finally {
        setLoading(false);
      }
    };
    
    loadCategories();
  }, [user]);

  // Opciones para el campo type
  const typeOptions: SelectOption[] = [
    { value: 'income', label: 'Ingreso' },
    { value: 'expense', label: 'Gasto' },
    { value: 'saving', label: 'Ahorro' },
    { value: 'goal', label: 'Objetivo' },
    { value: 'investment', label: 'Inversión' }
  ];

  const handleCreateCategory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (!newCategory.name || !newCategory.color) {
        setError('El nombre y el color son obligatorios');
        return;
      }
      
      await createCustomCategory(user.id, {
        name: newCategory.name,
        color: newCategory.color,
        icon: newCategory.icon,
        type: newCategory.type
      });
      
      setNewCategory({ 
        name: '', 
        color: '#3B82F6', 
        icon: 'tag',
        type: 'expense' 
      });
      setShowForm(false);
      
      // Recargar categorías
      loadCategories();
      
      // Notificar cambios
      notifyChanges();
    } catch (err) {
      console.error('Error creando categoría:', err);
      setError('No se pudo crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (!editForm.name || !editForm.color) {
        setError('El nombre y el color son obligatorios');
        return;
      }
      
      await updateCategory(id, {
        name: editForm.name,
        color: editForm.color,
        icon: editForm.icon,
        type: editForm.type
      });
      
      setEditingId(null);
      setEditForm({ name: '', color: '', icon: '', type: '' });
      
      // Recargar categorías
      loadCategories();
      
      // Notificar cambios
      notifyChanges();
    } catch (err) {
      console.error('Error actualizando categoría:', err);
      setError('No se pudo actualizar la categoría');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditCategory = (category: CategoryWithVisibility) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      color: category.color,
      icon: category.icon || '',
      type: category.type || 'expense'
    });
  };

  // Eliminar categoría o cambiar visibilidad
  const handleToggleVisibility = async (category: CategoryWithVisibility) => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Cambiar visibilidad
      const newVisibility = !(category.is_visible ?? true);
      await setCategoryVisibility(user.id, category.id, newVisibility);
      
      // Actualizar localmente
      if (category.is_system) {
        setDefaultCategories(defaultCategories.map(cat => 
          cat.id === category.id ? { ...cat, is_visible: newVisibility } : cat
        ));
      } else {
        setCustomCategories(customCategories.map(cat => 
          cat.id === category.id ? { ...cat, is_visible: newVisibility } : cat
        ));
      }
      
      setError(null);
      
      // Notificar cambios
      notifyChanges();
    } catch (err) {
      console.error('Error cambiando visibilidad:', err);
      setError('No se pudo cambiar la visibilidad de la categoría');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar visibilidad en presupuesto
  const handleToggleBudgetVisibility = async (category: CategoryWithVisibility) => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Cambiar visibilidad en presupuesto
      const newBudgetVisibility = !(category.visible_in_budget ?? true);
      await setCategoryBudgetVisibility(user.id, category.id, newBudgetVisibility);
      
      // Actualizar localmente
      if (category.is_system) {
        setDefaultCategories(defaultCategories.map(cat => 
          cat.id === category.id ? { ...cat, visible_in_budget: newBudgetVisibility } : cat
        ));
      } else {
        setCustomCategories(customCategories.map(cat => 
          cat.id === category.id ? { ...cat, visible_in_budget: newBudgetVisibility } : cat
        ));
      }
      
      setError(null);
      
      // Notificar cambios
      notifyChanges();
    } catch (err) {
      console.error('Error cambiando visibilidad en presupuesto:', err);
      setError('No se pudo cambiar la visibilidad en presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const iconOptions = [
    { value: 'tag', label: 'Etiqueta' },
    { value: 'shopping-cart', label: 'Compras' },
    { value: 'home', label: 'Hogar' },
    { value: 'car', label: 'Transporte' },
    { value: 'heart', label: 'Salud' },
    { value: 'film', label: 'Entretenimiento' },
    { value: 'book', label: 'Educación' },
    { value: 'briefcase', label: 'Trabajo' },
    { value: 'coffee', label: 'Comida' },
    { value: 'dollar-sign', label: 'Dinero' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 shadow-sm border border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <LayoutGrid className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personalización de Categorías</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Administra y personaliza las categorías para organizar tus finanzas
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-12 px-4 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Nueva Categoría
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md dark:bg-red-900/30 dark:border-red-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Formulario para nueva categoría */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 animate-fade-in">
            <div className="flex items-center mb-4">
              <Tag className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Nueva Categoría</h3>
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium">Nombre</label>
              <Input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Nombre de la categoría"
              />
              
              <label className="block text-sm font-medium">Color</label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="w-12 h-10 p-1"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                />
                <Input
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>

              <label className="block text-sm font-medium">Tipo</label>
              <Select
                options={typeOptions}
                value={newCategory.type}
                onChange={(value) => setNewCategory({ ...newCategory, type: value })}
                placeholder="Selecciona un tipo"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setNewCategory({ name: '', color: '#3B82F6', icon: 'tag', type: 'expense' });
                }}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleCreateCategory}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Pestañas de categorías */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <TabsTrigger 
              value="custom"
              className="py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
            >
              <div className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                <span>Mis Categorías</span>
                {customCategories.length > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {customCategories.length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="default"
              className="py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md"
            >
              <div className="flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                <span>Categorías Predeterminadas</span>
                {defaultCategories.length > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {defaultCategories.length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>
          
          {/* Contenido: Categorías personalizadas */}
          <TabsContent value="custom" className="mt-6">
            {loading && customCategories.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex justify-between items-center">
                    <Skeleton variant="text" width="w-40" color="blue" />
                    <Skeleton variant="text" width="w-24" color="blue" />
                  </div>
                </div>
                <TableRowsSkeleton 
                  rows={5}
                  columns={4}
                  color="blue"
                  showAvatar={true}
                  avatarSize="w-8 h-8"
                />
              </div>
            ) : customCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                  <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">No tienes categorías personalizadas</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Crea una nueva categoría usando el botón superior</p>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Crear Categoría
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Nombre</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Color</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Estado</th>
                        <th className="text-right py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customCategories.map((category) => (
                        <tr 
                          key={category.id} 
                          className={`border-b border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                            category.is_visible === false ? 'opacity-60 bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400' : ''
                          }`}
                        >
                          {editingId === category.id ? (
                            <>
                              <td className="py-4 px-6">
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full h-12"
                                />
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center">
                                  <Input
                                    type="color"
                                    value={editForm.color}
                                    onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                                    className="w-14 h-12 p-1 mr-3"
                                  />
                                  <Input
                                    value={editForm.color}
                                    onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                                    className="flex-1 h-12"
                                  />
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <Badge 
                                  variant={category.is_visible !== false ? "success" : "outline"}
                                  className={category.is_visible !== false ? "px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                                >
                                  {category.is_visible !== false ? "Activa" : "Inactiva"}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    className="h-10 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleEditCategory(category)}
                                    disabled={category.is_system}
                                  >
                                    <Edit2 size={18} />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className={`h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 ${
                                      category.is_visible !== false 
                                        ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
                                        : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    }`}
                                    onClick={() => handleToggleVisibility(category)}
                                  >
                                    {category.is_visible !== false ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className={`h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 ${
                                      category.visible_in_budget !== false 
                                        ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                        : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    }`}
                                    onClick={() => handleToggleBudgetVisibility(category)}
                                  >
                                    {category.visible_in_budget !== false ? (
                                      <Filter size={18} />
                                    ) : (
                                      <Check size={18} />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-4 px-6 font-medium">
                                <div className="flex items-center">
                                  <div 
                                    className="w-5 h-5 rounded mr-3" 
                                    style={{ backgroundColor: category.color }}
                                  ></div>
                                  {category.name}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center">
                                  <div 
                                    className="w-8 h-8 rounded-full mr-3 flex items-center justify-center" 
                                    style={{ backgroundColor: category.color }}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-white opacity-30"></div>
                                  </div>
                                  <code className="text-sm py-1 px-2 bg-gray-100 dark:bg-gray-700 rounded">{category.color}</code>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex flex-col space-y-2">
                                  <Badge 
                                    variant={category.is_visible !== false ? "success" : "outline"}
                                    className={category.is_visible !== false ? "px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                                  >
                                    <div className="flex items-center">
                                      {category.is_visible !== false ? (
                                        <Power size={14} className="mr-1.5" />
                                      ) : (
                                        <PowerOff size={14} className="mr-1.5" />
                                      )}
                                      <span className="mr-1">{category.is_visible !== false ? "Activa" : "Inactiva"}</span>
                                      <span className="text-xs opacity-75">(Transacciones)</span>
                                    </div>
                                  </Badge>
                                  <Badge 
                                    variant={category.visible_in_budget !== false ? "success" : "outline"}
                                    className={category.visible_in_budget !== false ? "px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" : "px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                                  >
                                    <div className="flex items-center">
                                      <Filter size={14} className="mr-1.5" />
                                      <span className="mr-1">{category.visible_in_budget !== false ? "Visible" : "Oculta"}</span>
                                      <span className="text-xs opacity-75">(Presupuesto)</span>
                                    </div>
                                  </Badge>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="outline" 
                                    className="h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => handleEditCategory(category)}
                                    disabled={category.is_system}
                                  >
                                    <Edit2 size={18} />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className={`h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 ${
                                      category.is_visible !== false 
                                        ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
                                        : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    }`}
                                    onClick={() => handleToggleVisibility(category)}
                                  >
                                    {category.is_visible !== false ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className={`h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 ${
                                      category.visible_in_budget !== false 
                                        ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                        : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    }`}
                                    onClick={() => handleToggleBudgetVisibility(category)}
                                  >
                                    {category.visible_in_budget !== false ? (
                                      <Filter size={18} />
                                    ) : (
                                      <Check size={18} />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Contenido: Categorías predeterminadas */}
          <TabsContent value="default" className="mt-6">
            {loading && defaultCategories.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex justify-between items-center">
                    <Skeleton variant="text" width="w-40" color="gray" />
                    <Skeleton variant="text" width="w-24" color="gray" />
                  </div>
                </div>
                <TableRowsSkeleton 
                  rows={5}
                  columns={3}
                  color="gray"
                  showAvatar={true}
                  avatarSize="w-8 h-8"
                />
              </div>
            ) : defaultCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                  <Tag className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">No hay categorías predeterminadas disponibles</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Nombre</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Color</th>
                        <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Estado</th>
                        <th className="text-right py-4 px-6 font-medium text-gray-600 dark:text-gray-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaultCategories.map((category) => (
                        <tr 
                          key={category.id} 
                          className={`border-b border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                            category.is_visible === false ? 'opacity-60 bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400' : ''
                          }`}
                        >
                          <td className="py-4 px-6 font-medium">
                            <div className="flex items-center">
                              <div 
                                className="w-5 h-5 rounded mr-3" 
                                style={{ backgroundColor: category.color }}
                              ></div>
                              {category.name}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <div 
                                className="w-8 h-8 rounded-full mr-3 flex items-center justify-center" 
                                style={{ backgroundColor: category.color }}
                              >
                                <div className="w-4 h-4 rounded-full bg-white opacity-30"></div>
                              </div>
                              <code className="text-sm py-1 px-2 bg-gray-100 dark:bg-gray-700 rounded">{category.color}</code>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col space-y-2">
                              <Badge 
                                variant={category.is_visible !== false ? "success" : "outline"}
                                className={category.is_visible !== false ? "px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                              >
                                <div className="flex items-center">
                                  {category.is_visible !== false ? (
                                    <Power size={14} className="mr-1.5" />
                                  ) : (
                                    <PowerOff size={14} className="mr-1.5" />
                                  )}
                                  <span className="mr-1">{category.is_visible !== false ? "Activa" : "Inactiva"}</span>
                                  <span className="text-xs opacity-75">(Transacciones)</span>
                                </div>
                              </Badge>
                              <Badge 
                                variant={category.visible_in_budget !== false ? "success" : "outline"}
                                className={category.visible_in_budget !== false ? "px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" : "px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                              >
                                <div className="flex items-center">
                                  <Filter size={14} className="mr-1.5" />
                                  <span className="mr-1">{category.visible_in_budget !== false ? "Visible" : "Oculta"}</span>
                                  <span className="text-xs opacity-75">(Presupuesto)</span>
                                </div>
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                className={`h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 ${
                                  category.is_visible !== false 
                                    ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
                                    : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                }`}
                                onClick={() => handleToggleVisibility(category)}
                              >
                                {category.is_visible !== false ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                className={`h-10 min-w-0 w-10 p-0 border-gray-300 dark:border-gray-600 ${
                                  category.visible_in_budget !== false 
                                    ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                    : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                }`}
                                onClick={() => handleToggleBudgetVisibility(category)}
                              >
                                {category.visible_in_budget !== false ? (
                                  <Filter size={18} />
                                ) : (
                                  <Check size={18} />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 