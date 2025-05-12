"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  ChevronRight, 
  Info, 
  Pencil, 
  Settings,
  ArrowRight,
  Target,
  Plus,
  RefreshCw
} from 'lucide-react';
import { BudgetWithFixedExpenses } from '@/services/budgets';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

interface BudgetSummaryProps {
  budgets: BudgetWithFixedExpenses[];
  loading: boolean;
  month: string;
  calculatedTotal: number;
  editMode: boolean;
  onEdit: () => void;
  onViewFixedExpenses: (budget: BudgetWithFixedExpenses) => void;
  onViewGoalLinks?: (budget: BudgetWithFixedExpenses) => void;
  onProcessGoalContributions: () => void;
}

export function BudgetSummary({
  budgets,
  loading,
  month,
  calculatedTotal,
  editMode,
  onEdit,
  onViewFixedExpenses,
  onViewGoalLinks,
  onProcessGoalContributions
}: BudgetSummaryProps) {
  
  // Estado para mostrar una descripción o ayuda sobre los conceptos
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null);

  // Cálculo de estadísticas globales
  const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
  const totalFixedExpenses = budgets.reduce((sum, budget) => sum + (budget.fixed_expenses_amount || 0), 0);
  
  // Nueva variable para mostrar el total de contribuciones a objetivos
  const totalGoalContributions = budgets.reduce((sum, budget) => sum + (budget.goal_deductions_amount || 0), 0);
  
  // Ahora el total disponible tiene en cuenta tanto gastos fijos como contribuciones a objetivos
  const totalRemaining = budgets.reduce((sum, budget) => {
    const totalDeductions = (budget.fixed_expenses_amount || 0) + (budget.goal_deductions_amount || 0);
    return sum + (budget.amount - totalDeductions - (budget.spent || 0));
  }, 0);
  
  // Porcentaje global de gastos
  const globalPercentage = totalRemaining > 0 
    ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) 
    : 100;
  
  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <CardSkeleton 
          hasHeader={true}
          contentRows={4}
          color="blue"
          className="md:col-span-2"
        />
        
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton 
            key={i}
            hasHeader={true}
            contentRows={3}
            color={["blue", "green", "amber", "purple"][i % 4]}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta de resumen global */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 shadow-md border-blue-100 dark:border-blue-900/50 overflow-hidden">
        <CardHeader className="border-b border-blue-100 dark:border-blue-900/50 bg-white/50 dark:bg-gray-950/20">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center text-xl">
              <BarChart3 className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              Resumen de Presupuesto
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              className="h-9 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              <Pencil className="mr-1 h-4 w-4" />
              {editMode ? "Guardar" : "Editar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-blue-100 dark:border-blue-900/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  Total Presupuestado
                  <button 
                    onClick={() => setShowInfoTooltip(showInfoTooltip === 'total' ? null : 'total')}
                    className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Info size={14} />
                  </button>
                </span>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {month}
                </Badge>
              </div>
              {showInfoTooltip === 'total' && (
                <div className="mb-2 p-2 text-xs bg-blue-50 dark:bg-blue-900/30 rounded text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                  El total que has asignado a todas las categorías para este mes.
                </div>
              )}
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatCurrency(totalBudgeted)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Calculado: {formatCurrency(calculatedTotal)}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-green-100 dark:border-green-900/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  Disponible
                  <button 
                    onClick={() => setShowInfoTooltip(showInfoTooltip === 'available' ? null : 'available')}
                    className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Info size={14} />
                  </button>
                </span>
                <Badge className={`${totalRemaining >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                  {totalRemaining >= 0 ? 'Positivo' : 'Excedido'}
                </Badge>
              </div>
              {showInfoTooltip === 'available' && (
                <div className="mb-2 p-2 text-xs bg-green-50 dark:bg-green-900/30 rounded text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800">
                  Cantidad que aún puedes gastar este mes (presupuesto menos gastos).
                </div>
              )}
              <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(Math.abs(totalRemaining))}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalRemaining >= 0 ? 'Restante para gastar' : 'Excedido del presupuesto'}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-amber-100 dark:border-amber-900/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  Gastos Fijos
                  <button 
                    onClick={() => setShowInfoTooltip(showInfoTooltip === 'fixed' ? null : 'fixed')}
                    className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Info size={14} />
                  </button>
                </span>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  {Math.round((totalFixedExpenses / totalBudgeted) * 100)}%
                </Badge>
              </div>
              {showInfoTooltip === 'fixed' && (
                <div className="mb-2 p-2 text-xs bg-amber-50 dark:bg-amber-900/30 rounded text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                  Gastos recurrentes que se restan automáticamente del presupuesto disponible.
                </div>
              )}
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(totalFixedExpenses)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total en gastos recurrentes
              </div>
            </div>
          </div>
          
          {/* Progreso global */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progreso mensual
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {globalPercentage}%
              </span>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                <div 
                  className={`${getStatusColor(globalPercentage)} shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500`}
                  style={{ width: `${globalPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de integraciones */}
      <Card className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 shadow-md border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
        <CardHeader className="border-b border-indigo-100 dark:border-indigo-900/50 bg-white/50 dark:bg-gray-950/20">
          <CardTitle className="flex items-center text-xl">
            <Receipt className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Integraciones
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Integración con gastos fijos */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-medium flex items-center">
                  <Receipt className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Gastos Fijos
                </h3>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  {totalFixedExpenses > 0 ? `${Math.round((totalFixedExpenses / totalBudgeted) * 100)}%` : '0%'}
                </Badge>
              </div>
              
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">
                {formatCurrency(totalFixedExpenses)}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Descuentos automáticos de tu presupuesto para gastos recurrentes como servicios, alquiler, etc.
              </p>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/gastos-fijos'} 
                className="w-full mt-2 border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Ver todos los gastos fijos
              </Button>
            </div>
            
            {/* Integración con objetivos */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-medium flex items-center">
                  <Target className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  Objetivos Financieros
                </h3>
                <Badge variant="outline" className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  {totalGoalContributions > 0 ? `${Math.round((totalGoalContributions / totalBudgeted) * 100)}%` : '0%'}
                </Badge>
              </div>
              
              <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">
                {formatCurrency(totalGoalContributions)}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Contribuciones automáticas a tus objetivos financieros desde categorías específicas.
              </p>
              
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/objetivos'} 
                  className="w-full border-green-200 text-green-700 dark:border-green-800 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Administrar objetivos
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onProcessGoalContributions} 
                  className="w-full border-green-200 text-green-700 dark:border-green-800 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Procesar contribuciones
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de presupuestos por categoría */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length > 0 ? (
          budgets.map((budget) => {
            // Calcular total de deducciones (gastos fijos + contribuciones a objetivos)
            const fixedExpensesAmount = budget.fixed_expenses_amount || 0;
            const goalDeductionsAmount = budget.goal_deductions_amount || 0;
            const totalDeductions = fixedExpensesAmount + goalDeductionsAmount;
            
            // Calcular disponible real (presupuesto - deducciones)
            const available = budget.amount - totalDeductions;
            
            // Calcular porcentaje de gasto sobre el disponible real
            const percentage = available > 0 
              ? Math.min(100, Math.round(((budget.spent || 0) / available) * 100)) 
              : 100;
              
            // Color del progreso basado en el porcentaje
            const progressColor = percentage >= 100 
              ? "bg-red-500" 
              : percentage >= 80 
                ? "bg-amber-500" 
                : "bg-green-500";
                
            // Icono basado en si excede el presupuesto
            const StatusIcon = percentage >= 100 ? TrendingUp : TrendingDown;
            
            return (
              <Card key={budget.id} className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <CardHeader className="py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: budget.category && budget.category.color ? budget.category.color : '#3B82F6' }}
                    ></div>
                    <CardTitle className="text-base">{budget.category && budget.category.name ? budget.category.name : 'Sin categoría'}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    {fixedExpensesAmount > 0 && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        <Receipt className="h-3 w-3 mr-1" />
                        Fijos
                      </Badge>
                    )}
                    {goalDeductionsAmount > 0 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800">
                        <Target className="h-3 w-3 mr-1" />
                        Objetivos
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        percentage >= 100 
                          ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800" 
                          : percentage >= 80 
                            ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800" 
                            : "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800"
                      }`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Asignado</div>
                      <div className="text-lg font-semibold">{formatCurrency(budget.amount)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Disponible</div>
                      <div className={`text-lg font-semibold ${(budget.remaining || 0) < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {formatCurrency(budget.remaining || 0)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="my-3">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                      <div 
                        className={`${progressColor} shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Deducciones e info de presupuesto */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{formatCurrency(budget.spent || 0)}</span>
                      <span className="mx-1">/</span>
                      <span>{formatCurrency(available)}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {fixedExpensesAmount > 0 && (
                        <Button 
                          onClick={() => onViewFixedExpenses(budget)} 
                          variant="ghost" 
                          size="sm"
                          className="h-8 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                          <Receipt className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">{formatCurrency(fixedExpensesAmount)}</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                      
                      {goalDeductionsAmount > 0 && onViewGoalLinks && (
                        <Button 
                          onClick={() => onViewGoalLinks(budget)} 
                          variant="ghost" 
                          size="sm"
                          className="h-8 text-green-600 dark:text-green-400 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <Target className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">{formatCurrency(goalDeductionsAmount)}</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
              <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay presupuestos configurados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Configura tu presupuesto mensual para llevar un mejor control de tus finanzas.
              Define montos por categoría para monitorear tus gastos.
            </p>
            <Button onClick={onEdit}>
              Configurar Presupuesto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 