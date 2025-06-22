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
  Search,
  LayoutGrid,
  Loader2,
  Trash2,
  Settings,
  Grid3X3,
  List,
  Hash
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Skeleton } from './skeleton';
import { Select, SelectOption } from '@/components/ui/select';

export type CategoryWithVisibility = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string | null;
  emoji?: string | null;
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
    type: 'expense'
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Función para notificar cambios en categorías
  const notifyChanges = useCallback(() => {
    if (onCategoriesChanged) {
      onCategoriesChanged();
    }
  }, [onCategoriesChanged]);

  // Cargar categorías
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

  useEffect(() => {
    loadCategories();
  }, [user]);

  // Opciones para el campo type
  const typeOptions: SelectOption[] = [
    { value: 'income', label: '💰 Ingreso' },
    { value: 'expense', label: '💸 Gasto' },
    { value: 'saving', label: '🐷 Ahorro' },
    { value: 'goal', label: '🎯 Objetivo' },
    { value: 'investment', label: '📈 Inversión' }
  ];

  const typeFilterOptions: SelectOption[] = [
    { value: 'all', label: 'Todos los tipos' },
    ...typeOptions
  ];

  // Filtrar categorías
  const filteredCategories = useCallback(() => {
    const allCategories = activeTab === 'custom' ? customCategories :
                          activeTab === 'system' ? defaultCategories :
                          [...customCategories, ...defaultCategories];

    return allCategories.filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || cat.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [customCategories, defaultCategories, activeTab, searchTerm, typeFilter]);

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
        type: newCategory.type as any
      });
      
      setNewCategory({ 
        name: '', 
        color: '#3B82F6', 
        icon: 'tag',
        type: 'expense' 
      });
      setShowForm(false);
      
      // Recargar categorías
      await loadCategories();
      
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
        type: editForm.type as any
      });
      
      setEditingId(null);
      setEditForm({ name: '', color: '', icon: '', type: 'expense' });
      
      // Recargar categorías
      await loadCategories();
      
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

  const handleToggleVisibility = async (category: CategoryWithVisibility) => {
    if (!user) return;
    
    try {
      setLoading(true);
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
      notifyChanges();
    } catch (err) {
      console.error('Error cambiando visibilidad:', err);
      setError('No se pudo cambiar la visibilidad de la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBudgetVisibility = async (category: CategoryWithVisibility) => {
    if (!user) return;
    
    try {
      setLoading(true);
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
      notifyChanges();
    } catch (err) {
      console.error('Error cambiando visibilidad en presupuesto:', err);
      setError('No se pudo cambiar la visibilidad en presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: CategoryWithVisibility) => {
    if (!user || category.is_system) return;
    
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await deleteCategory(category.id, user.id);
      
      // Recargar categorías
      await loadCategories();
      
      // Notificar cambios
      notifyChanges();
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      setError('No se pudo eliminar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'saving': return '🐷';
      case 'goal': return '🎯';
      case 'investment': return '📈';
      default: return '📊';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return 'Ingreso';
      case 'expense': return 'Gasto';
      case 'saving': return 'Ahorro';
      case 'goal': return 'Objetivo';
      case 'investment': return 'Inversión';
      default: return 'Otro';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'expense': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'saving': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'goal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'investment': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const CategoryCard = ({ category }: { category: CategoryWithVisibility }) => {
    const isEditing = editingId === category.id;
    
    if (isEditing) {
      return (
        <Card className="border-blue-200 dark:border-blue-800 shadow-lg">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nombre de la categoría"
                className="font-medium"
              />
              
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="w-12 h-10 p-1 border rounded cursor-pointer"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                />
                <Input
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>

              <Select
                options={typeOptions}
                value={editForm.type}
                onChange={(value) => setEditForm({ ...editForm, type: value })}
                placeholder="Tipo de categoría"
              />
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleUpdateCategory(category.id)}
                  className="flex-1"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Guardar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingId(null);
                    setEditForm({ name: '', color: '', icon: '', type: 'expense' });
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`transition-all duration-200 hover:shadow-lg ${
        category.is_visible === false ? 'opacity-60' : ''
      } ${category.is_system ? 'border-blue-100 dark:border-blue-900' : 'border-gray-200 dark:border-gray-700'}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {category.emoji ? (
                  <div className="text-2xl">{category.emoji}</div>
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center" 
                    style={{ backgroundColor: category.color }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white opacity-30"></div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {category.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={`text-xs px-2 py-0.5 ${getTypeColor(category.type)}`}>
                      <span className="mr-1">{getTypeIcon(category.type)}</span>
                      {getTypeLabel(category.type)}
                    </Badge>
                    {category.is_system && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        Sistema
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                category.is_visible !== false 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-50 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'
              }`}>
                {category.is_visible !== false ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Oculta
                  </>
                )}
              </div>
              
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                category.visible_in_budget !== false 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-gray-50 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'
              }`}>
                <Filter className="w-3 h-3 mr-1" />
                {category.visible_in_budget !== false ? 'En presupuesto' : 'Sin presupuesto'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                {!category.is_system && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditCategory(category)}
                    className="h-9 w-9 p-0 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-md"
                    title="Editar categoría"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleVisibility(category)}
                  className={`h-9 w-9 p-0 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md border ${
                    category.is_visible !== false 
                      ? 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700' 
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                  }`}
                  title={category.is_visible !== false ? "Ocultar categoría" : "Mostrar categoría"}
                >
                  {category.is_visible !== false ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleBudgetVisibility(category)}
                  className={`h-9 w-9 p-0 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md border ${
                    category.visible_in_budget !== false 
                      ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700' 
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                  }`}
                  title={category.visible_in_budget !== false ? "Quitar del presupuesto" : "Incluir en presupuesto"}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                
                {!category.is_system && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCategory(category)}
                    className="h-9 w-9 p-0 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 transition-all duration-200 hover:scale-105 hover:shadow-md"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center">
                <div className="relative group">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm group-hover:shadow-md transition-all duration-200 cursor-pointer" 
                    style={{ backgroundColor: category.color }}
                    title={`Color: ${category.color}`}
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-blue-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-4">
              <LayoutGrid className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Gestión de Categorías
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                {filteredCategories().length} categorías • Organiza y personaliza tus finanzas
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3"
          >
            <Plus size={18} className="mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg dark:bg-red-900/30 dark:border-red-700">
          <div className="flex items-center">
            <X className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <Card className="border-green-200 dark:border-green-800 shadow-lg">
          <CardHeader className="bg-green-50 dark:bg-green-900/20 border-b">
            <CardTitle className="flex items-center text-green-800 dark:text-green-200">
              <Plus className="h-5 w-5 mr-2" />
              Crear Nueva Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ej: Alimentación, Transporte..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
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
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <Select
                  options={typeOptions}
                  value={newCategory.type}
                  onChange={(value) => setNewCategory({ ...newCategory, type: value })}
                  placeholder="Selecciona el tipo de categoría"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowForm(false);
                  setNewCategory({ name: '', color: '#3B82F6', icon: 'tag', type: 'expense' });
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateCategory}
                disabled={loading || !newCategory.name}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Categoría
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Type filter */}
          <Select
            options={typeFilterOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Filtrar por tipo"
            className="w-48"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <TabsTrigger value="all" className="flex items-center">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Todas ({customCategories.length + defaultCategories.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Mis Categorías ({customCategories.length})
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center">
            <Hash className="h-4 w-4 mr-2" />
            Sistema ({defaultCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredCategories().length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <LayoutGrid className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay categorías
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || typeFilter !== 'all' 
                  ? 'No se encontraron categorías que coincidan con tu búsqueda'
                  : 'Comienza creando tu primera categoría personalizada'
                }
              </p>
              {!searchTerm && typeFilter === 'all' && (
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Categoría
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories().map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 