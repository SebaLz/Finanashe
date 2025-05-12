import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/format';
import { TrendingUp, TrendingDown, Pencil, Trash2, Calendar, Package, LinkIcon } from 'lucide-react';
import { BudgetWithFixedExpenses } from '@/services/budgets';
import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BudgetCardProps {
  budget: BudgetWithFixedExpenses;
  onEdit?: (budget: BudgetWithFixedExpenses) => void;
  onDelete?: (budgetId: string) => void;
  onViewFixedExpenses?: (budget: BudgetWithFixedExpenses) => void;
  onViewGoalLinks?: (budget: BudgetWithFixedExpenses) => void;
}

export function BudgetCard({ 
  budget, 
  onEdit, 
  onDelete,
  onViewFixedExpenses,
  onViewGoalLinks
}: BudgetCardProps) {
  // Calcular deducciones totales y monto disponible
  const fixedExpensesAmount = budget.fixed_expenses_amount || 0;
  const goalDeductionsAmount = budget.goal_deductions_amount || 0;
  const totalDeductions = fixedExpensesAmount + goalDeductionsAmount;
  const availableAmount = budget.amount - totalDeductions;
  
  // Calcular porcentaje de gasto
  const spent = budget.spent || 0;
  const remaining = budget.amount - totalDeductions - spent;
  
  // Porcentaje con respecto al disponible real (no al total del presupuesto)
  const percentage = availableAmount > 0 
    ? Math.min(100, Math.round((spent / availableAmount) * 100)) 
    : 100;
  
  // Definir color según el porcentaje
  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-green-500";
  };
  
  const progressColor = getStatusColor(percentage);
  const StatusIcon = percentage >= 100 ? TrendingUp : TrendingDown;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center p-4">
          <div 
            className="w-4 h-4 rounded-full mr-3" 
            style={{ backgroundColor: budget.category?.color || '#ccc' }}
          />
          <div className="font-medium flex-grow">{budget.category?.name}</div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-500"
                  onClick={() => onViewFixedExpenses && onViewFixedExpenses(budget)}
                >
                  <Package className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Gestionar gastos fijos y objetivos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 ml-1"
              onClick={() => onEdit(budget)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="px-4 pb-2">
          <div className="flex justify-between mb-1 items-center">
            <span className="text-sm text-gray-500">Presupuestado:</span>
            <span className="font-medium">{formatCurrency(budget.amount)}</span>
          </div>
          
          {totalDeductions > 0 && (
            <>
              {fixedExpensesAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Gastos fijos:</span>
                  <span>-{formatCurrency(fixedExpensesAmount)}</span>
                </div>
              )}
              
              {goalDeductionsAmount > 0 && (
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Objetivos:</span>
                  <span>-{formatCurrency(goalDeductionsAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xs font-medium border-t pt-1 mb-1">
                <span>Disponible:</span>
                <span>{formatCurrency(availableAmount)}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-500">Gastado:</span>
            <span className={percentage >= 100 ? "text-red-600 font-medium" : "font-medium"}>
              {formatCurrency(spent)}
            </span>
          </div>
          
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Restante:</span>
            <span className={remaining < 0 ? "text-red-600 font-medium" : "font-medium"}>
              {formatCurrency(remaining)}
            </span>
          </div>
          
          <div className="relative pt-1">
            <Progress 
              value={percentage} 
              max={100} 
              className="h-2" 
              indicatorClassName={progressColor} 
            />
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center">
              <StatusIcon 
                className={
                  percentage >= 100 
                    ? "h-4 w-4 text-red-500 mr-1" 
                    : "h-4 w-4 text-green-500 mr-1"
                } 
              />
              <span className="text-xs text-gray-600">
                {percentage >= 100 
                  ? "Excedido" 
                  : percentage >= 80 
                    ? "Atención" 
                    : "En control"}
              </span>
            </div>
            <Badge variant="outline" className={
              percentage >= 100 
                ? "bg-red-50 text-red-700 border-red-200" 
                : percentage >= 80 
                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                  : "bg-green-50 text-green-700 border-green-200"
            }>
              {percentage}%
            </Badge>
          </div>
        </div>
      </CardContent>
      
      {onDelete && (
        <CardFooter className="flex justify-between px-4 py-2 border-t">
          <div className="text-xs text-gray-500 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {budget.month}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-gray-500 hover:text-red-500"
            onClick={() => onDelete(budget.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 