"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Filter, 
  AlertCircle,
  CheckCircle,
  DollarSign,
  Percent,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import { BudgetWithFixedExpenses } from '@/services/budgets';
import { formatCurrency } from '@/lib/formatters';
import { useUser } from '@/hooks/useUser';
import { getCategoriesByType } from '@/services/categories';

interface BudgetEditFormProps {
  budgets: BudgetWithFixedExpenses[];
  onChange: (budgets: BudgetWithFixedExpenses[]) => void;
  onAddNew: () => void;
  onCancel: () => void;
  loading: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  calculatedTotal: number;
  availableCategories: { id: string; name: string; color: string }[];
  onRemoveCategory?: (categoryId: string) => void;
}

export function BudgetEditForm({
  budgets,
  onChange,
  onAddNew,
  onCancel,
  loading,
  saving,
  onSave,
  calculatedTotal,
  availableCategories,
  onRemoveCategory
}: BudgetEditFormProps) {
  const { user } = useUser();
  const [editMode, setEditMode] = useState<'percentage' | 'amount'>('percentage');
  const [error, setError] = useState<string | null>(null);
  const [availableExpenseCategories, setAvailableExpenseCategories] = useState<BudgetCategory[]>([]);
  
  // Calcular el total de porcentajes
  const totalPercentage = budgets.reduce((sum, budget) => sum + (budget.percentage || 0), 0);
  const percentageIsValid = Math.abs(totalPercentage - 100) < 0.01;

  // Obtener categorías de tipo gasto o ahorro disponibles
  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      
      try {
        // Cargar categorías de tipo 'expense'
        const expenseCats = await getCategoriesByType(user.id, 'expense');
        // Cargar categorías de tipo 'saving'
        const savingCats = await getCategoriesByType(user.id, 'saving');
        
        // Combinar ambos tipos
        const combinedCats = [...expenseCats, ...savingCats];
        
        // Filtrar para no incluir las que ya están en el presupuesto
        const budgetCategoryIds = budgets.map(b => b.category_id);
        const filtered = combinedCats
          .filter(cat => !budgetCategoryIds.includes(cat.id))
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color
          }));
        
        setAvailableExpenseCategories(filtered);
      } catch (error) {
        console.error('Error loading expense categories:', error);
      }
    };
    
    loadCategories();
  }, [user, budgets]);

  // Maneja cambios en los porcentajes
  const handlePercentageChange = (id: string, value: number) => {
    setError(null);
    
    // Limitar a 2 decimales y no permitir negativos
    value = Math.round(Math.max(0, value) * 100) / 100;
    
    const updatedBudgets = budgets.map(budget => 
      budget.id === id 
        ? { 
            ...budget, 
            percentage: value,
            amount: Math.round((value / 100) * calculatedTotal) 
          } 
        : budget
    );
    
    onChange(updatedBudgets);
  };

  // Maneja cambios en los montos
  const handleAmountChange = (id: string, value: number) => {
    setError(null);
    
    // No permitir valores negativos
    value = Math.max(0, value);
    
    const updatedBudgets = budgets.map(budget => 
      budget.id === id 
        ? { 
            ...budget, 
            amount: value,
            percentage: calculatedTotal > 0 
              ? Math.round((value / calculatedTotal) * 10000) / 100 
              : 0
          } 
        : budget
    );
    
    onChange(updatedBudgets);
  };

  // Maneja el guardado verificando si todo es válido
  const handleSave = async () => {
    // Validar que los porcentajes sumen 100%
    if (!percentageIsValid) {
      setError(`Los porcentajes deben sumar 100%. Actualmente suman ${totalPercentage.toFixed(2)}%`);
      return;
    }
    
    await onSave();
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4 border-b">
          <Skeleton variant="text" width="w-64" height="h-7" />
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton variant="circular" width="w-8" height="h-8" />
                <Skeleton variant="text" width="w-full" height="h-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-b border-blue-100 dark:border-blue-900/40">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-xl">
            <DollarSign size={20} className="mr-2 text-blue-600" />
            Editor de Presupuesto
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setEditMode(editMode === 'percentage' ? 'amount' : 'percentage')}
              className="h-9 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              {editMode === 'percentage' ? 
                <><DollarSign size={16} className="mr-1" /> Por monto</> : 
                <><Percent size={16} className="mr-1" /> Por porcentaje</>
              }
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {error && (
          <div className="p-3 m-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}
        
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Presupuesto mensual base: {formatCurrency(calculatedTotal)}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {editMode === 'percentage' 
                  ? 'Asigna porcentajes a cada categoría (debe sumar 100%)' 
                  : 'Asigna montos específicos a cada categoría'}
              </div>
            </div>
            
            <Badge 
              className={`px-2 py-1 ${
                percentageIsValid 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
              }`}
            >
              {percentageIsValid ? 
                <><CheckCircle size={14} className="mr-1" /> {totalPercentage.toFixed(2)}%</> : 
                <><AlertCircle size={14} className="mr-1" /> {totalPercentage.toFixed(2)}%</>
              }
            </Badge>
          </div>
        </div>
        
        <ScrollArea className="h-[350px] sm:h-[450px]">
          <div className="p-4 space-y-4">
            {budgets.map((budget) => (
              <div key={budget.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: budget.category && budget.category.color ? budget.category.color : '#3B82F6' }}
                ></div>
                
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium">{budget.category && budget.category.name ? budget.category.name : 'Sin categoría'}</span>
                    {budget.fixed_expenses_amount > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0 h-5 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        <Receipt size={12} className="mr-1" />
                        {formatCurrency(budget.fixed_expenses_amount)}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="relative flex-shrink-0 w-32">
                  {editMode === 'percentage' ? (
                    <div className="flex items-center">
                      <Input
                        type="number"
                        value={budget.percentage || 0}
                        onChange={(e) => handlePercentageChange(budget.id, parseFloat(e.target.value) || 0)}
                        className="h-9 text-right pr-8"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-3 text-gray-500">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="absolute left-3 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={budget.amount || 0}
                        onChange={(e) => handleAmountChange(budget.id, parseFloat(e.target.value) || 0)}
                        className="h-9 pl-8"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>
                
                {onRemoveCategory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveCategory(budget.category_id)}
                    className="h-9 w-9 p-0 flex items-center justify-center border-gray-200 dark:border-gray-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eliminar categoría"
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
              </div>
            ))}
            
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (availableExpenseCategories.length > 0) {
                    onAddNew();
                  }
                }}
                disabled={availableExpenseCategories.length === 0}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar categoría
              </Button>
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-10"
          >
            <ArrowLeft size={18} className="mr-2" />
            Volver
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving || !percentageIsValid}
            className="h-10 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Guardar Presupuesto
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 