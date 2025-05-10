"use client";

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { 
  getCategories, 
  createCustomCategory, 
  updateCategory, 
  deleteCategory, 
  getAllCategories,
  setCategoryVisibility
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
  PowerOff
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';

export type CategoryWithVisibility = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string | null;
  is_system?: boolean;
  is_visible?: boolean;
  created_at?: string;
};

export function CategoryManager() {
  const { user } = useUser();
  const [customCategories, setCustomCategories] = useState<CategoryWithVisibility[]>([]);
  const [defaultCategories, setDefaultCategories] = useState<CategoryWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3B82F6', icon: 'tag' });
  const [editForm, setEditForm] = useState({ name: '', color: '', icon: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('custom');

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

  // Crear nueva categoría
  const handleCreateCategory = async () => {
    if (!user) return;
    
    // Validación simple
    if (!newCategory.name.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      const createdCategory = await createCustomCategory(user.id, newCategory);
      setCustomCategories([...customCategories, createdCategory]);
      setNewCategory({ name: '', color: '#3B82F6', icon: 'tag' });
      setShowForm(false);
      setError(null);
    } catch (err) {
      console.error('Error creando categoría:', err);
      setError('No se pudo crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar edición
  const handleStartEdit = (category: CategoryWithVisibility) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      color: category.color,
      icon: category.icon || 'tag'
    });
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', color: '', icon: '' });
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    // Validación simple
    if (!editForm.name.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      const updatedCategory = await updateCategory(editingId, editForm);
      
      // Actualizar la lista de categorías
      setCustomCategories(customCategories.map(cat => 
        cat.id === editingId ? { ...cat, ...updatedCategory } : cat
      ));
      
      setEditingId(null);
      setEditForm({ name: '', color: '', icon: '' });
      setError(null);
    } catch (err) {
      console.error('Error actualizando categoría:', err);
      setError('No se pudo actualizar la categoría');
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error('Error cambiando visibilidad:', err);
      setError('No se pudo cambiar la visibilidad de la categoría');
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
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Administrar Categorías</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={16} className="mr-1" />
            Nueva Categoría
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 mb-4 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
            {error}
          </div>
        )}
        
        {/* Formulario para nueva categoría */}
        {showForm && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-3">Nueva Categoría</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <Input 
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <div className="flex items-center">
                  <Input 
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                    className="w-12 h-8 p-1"
                  />
                  <Input 
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                    className="flex-1 ml-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Ícono</label>
                <select 
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  {iconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCategory} disabled={loading}>
                Crear Categoría
              </Button>
            </div>
          </div>
        )}
        
        {/* Pestañas de categorías */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">
              Mis Categorías
              {customCategories.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {customCategories.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="default">
              Categorías Predeterminadas
              {defaultCategories.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {defaultCategories.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Contenido: Categorías personalizadas */}
          <TabsContent value="custom" className="mt-4">
            {loading && customCategories.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>Cargando categorías...</p>
              </div>
            ) : customCategories.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No tienes categorías personalizadas.</p>
                <p className="text-sm mt-1">Crea una nueva categoría usando el botón superior.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4">Nombre</th>
                      <th className="text-left py-2 px-4">Color</th>
                      <th className="text-left py-2 px-4">Estado</th>
                      <th className="text-right py-2 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customCategories.map((category) => (
                      <tr 
                        key={category.id} 
                        className={`border-b border-gray-200 dark:border-gray-700 ${
                          category.is_visible === false ? 'opacity-60 bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400' : ''
                        }`}
                      >
                        {editingId === category.id ? (
                          <>
                            <td className="py-2 px-4">
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="w-full"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center">
                                <Input
                                  type="color"
                                  value={editForm.color}
                                  onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                                  className="w-10 h-7 p-1"
                                />
                                <Input
                                  value={editForm.color}
                                  onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                                  className="flex-1 ml-2"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <Badge 
                                variant={category.is_visible !== false ? "success" : "outline"}
                                className={category.is_visible !== false ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                              >
                                {category.is_visible !== false ? "Activa" : "Inactiva"}
                              </Badge>
                            </td>
                            <td className="py-2 px-4 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="text-green-600"
                                >
                                  <Save size={16} />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-4">{category.name}</td>
                            <td className="py-2 px-4">
                              <div className="flex items-center">
                                <div 
                                  className="w-6 h-6 rounded-full mr-2" 
                                  style={{ backgroundColor: category.color }}
                                ></div>
                                {category.color}
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <Badge 
                                variant={category.is_visible !== false ? "success" : "outline"}
                                className={category.is_visible !== false ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                              >
                                {category.is_visible !== false ? "Activa" : "Inactiva"}
                              </Badge>
                            </td>
                            <td className="py-2 px-4 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleToggleVisibility(category)}
                                  title={category.is_visible === false ? "Activar categoría" : "Desactivar categoría"}
                                  className={category.is_visible === false ? "text-green-600" : "text-amber-600"}
                                >
                                  {category.is_visible === false ? <PowerOff size={16} /> : <Power size={16} />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleStartEdit(category)}
                                  title="Editar categoría"
                                >
                                  <Edit2 size={16} />
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
            )}
          </TabsContent>
          
          {/* Contenido: Categorías predeterminadas */}
          <TabsContent value="default" className="mt-4">
            {loading && defaultCategories.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>Cargando categorías predeterminadas...</p>
              </div>
            ) : defaultCategories.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No hay categorías predeterminadas disponibles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4">Nombre</th>
                      <th className="text-left py-2 px-4">Color</th>
                      <th className="text-left py-2 px-4">Estado</th>
                      <th className="text-right py-2 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultCategories.map((category) => (
                      <tr 
                        key={category.id} 
                        className={`border-b border-gray-200 dark:border-gray-700 ${
                          category.is_visible === false ? 'opacity-60 bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400' : ''
                        }`}
                      >
                        <td className="py-2 px-4">{category.name}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <div 
                              className="w-6 h-6 rounded-full mr-2" 
                              style={{ backgroundColor: category.color }}
                            ></div>
                            {category.color}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <Badge 
                            variant={category.is_visible !== false ? "success" : "outline"}
                            className={category.is_visible !== false ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
                          >
                            {category.is_visible !== false ? "Activa" : "Inactiva"}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleToggleVisibility(category)}
                              title={category.is_visible === false ? "Activar categoría" : "Desactivar categoría"}
                              className={category.is_visible === false ? "text-green-600" : "text-amber-600"}
                            >
                              {category.is_visible === false ? <PowerOff size={16} /> : <Power size={16} />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 