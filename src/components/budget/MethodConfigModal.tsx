"use client";

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Settings, 
  Calculator, 
  DollarSign, 
  CheckCircle2,
  CreditCard
} from 'lucide-react';
import { 
  getBudgetMethodConfiguration, 
  updateBudgetMethodConfiguration,
  BudgetMethodType 
} from '@/services/budget-method';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

interface MethodConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUpdate: () => void;
}

export function MethodConfigModal({
  isOpen, 
  onClose, 
  userId,
  onUpdate
}: MethodConfigModalProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [budgetType, setBudgetType] = useState<BudgetMethodType>('salary');
  const [salaryAmount, setSalaryAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      loadConfig();
    }
  }, [isOpen, userId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      if (!userId) return;

      const data = await getBudgetMethodConfiguration(userId);
      if (data) {
        setConfig(data);
        // Actualizar estados con la configuración actual
        const currentType = data.budget_type as string;
        const safeType = currentType === 'manual' ? 'all_income' : currentType;
        setBudgetType(safeType as BudgetMethodType);
        setSalaryAmount(data.salary_amount);
      }
    } catch (error) {
      console.error('Error loading budget method configuration:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración del método",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!userId) return;

      await updateBudgetMethodConfiguration(userId, {
        id: config?.id,
        budget_type: budgetType,
        salary_amount: budgetType === 'salary' ? salaryAmount : null
      });

      // Recalcular el presupuesto total después de cambiar la configuración
      await supabase.rpc('calculate_monthly_budget_total', {
        p_user_id: userId,
        p_month: new Date().toISOString().substring(0, 7) // Mes actual en formato YYYY-MM
      });

      toast({
        title: "Configuración guardada", 
        description: "El método de presupuesto ha sido actualizado correctamente",
        variant: "default"
      });
      
      // Notificar actualización y cerrar modal
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving budget method configuration:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Función para obtener descripción de cada método
  const getMethodDescription = (type: BudgetMethodType) => {
    switch (type) {
      case 'salary':
        return "Define un monto fijo mensual como base de tu presupuesto. Ideal si tienes un ingreso estable.";
      case 'all_income':
        return "Usa todos tus ingresos del mes como base para el presupuesto. Ideal si tienes ingresos variables.";
      case 'salary_plus_selected':
        return "Elige qué ingresos incluir en tu presupuesto marcándolos en la sección de transacciones.";
      default:
        return "";
    }
  };

  // Función para obtener icono de cada método
  const getMethodIcon = (type: BudgetMethodType) => {
    switch (type) {
      case 'salary':
        return <DollarSign className="h-4 w-4 mr-2 text-blue-600" />;
      case 'all_income':
        return <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />;
      case 'salary_plus_selected':
        return <CreditCard className="h-4 w-4 mr-2 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Configuración del método de presupuesto"
      className="max-w-lg"
    >
      {loading ? (
        <div className="space-y-4 py-2">
          <Skeleton variant="text" width="w-full" height="h-6" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start space-x-2">
                <Skeleton variant="circular" width="w-5" height="h-5" />
                <div className="space-y-2 flex-1">
                  <Skeleton variant="text" width="w-3/4" height="h-5" />
                  <Skeleton variant="text" width="w-full" height="h-4" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton variant="rectangular" width="w-full" height="h-10" />
        </div>
      ) : (
        <div className="space-y-4">
          {!config && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuración inicial</AlertTitle>
              <AlertDescription>
                Esta es la primera vez que configuras tu método de presupuesto.
                Elige el método que mejor se adapte a tus necesidades.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium mb-3 block">
                ¿Cómo quieres calcular tu presupuesto mensual?
              </Label>
              <RadioGroup 
                value={budgetType} 
                onValueChange={(value) => setBudgetType(value as BudgetMethodType)}
                className="space-y-4 mt-2"
              >
                {/* Opción: Sueldo fijo */}
                <div className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors">
                  <RadioGroupItem 
                    value="salary" 
                    id="salary" 
                    className="mt-1"
                  />
                  <div className="space-y-1.5">
                    <Label 
                      htmlFor="salary" 
                      className="text-base font-medium flex items-center cursor-pointer"
                    >
                      <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                      Solo mi sueldo fijo mensual
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getMethodDescription('salary')}
                    </p>
                    
                    {budgetType === 'salary' && (
                      <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 border border-blue-100 dark:border-blue-800">
                        <Label htmlFor="salaryAmount" className="block text-sm mb-2 text-blue-800 dark:text-blue-200">
                          ¿Cuál es tu sueldo mensual?
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate
                          y-1/2 text-gray-500 dark:text-gray-400">$</span>
                          <Input
                            id="salaryAmount"
                            type="number"
                            value={salaryAmount || ''}
                            onChange={(e) => setSalaryAmount(Number(e.target.value))}
                            className="pl-7"
                            placeholder="Ingresa el monto"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Opción: Todos los ingresos */}
                <div className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors">
                  <RadioGroupItem 
                    value="all_income" 
                    id="all_income" 
                    className="mt-1"
                  />
                  <div className="space-y-1.5">
                    <Label 
                      htmlFor="all_income" 
                      className="text-base font-medium flex items-center cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      Todos mis ingresos del mes
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getMethodDescription('all_income')}
                    </p>
                  </div>
                </div>
                
                {/* Opción: Ingresos seleccionados */}
                <div className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors">
                  <RadioGroupItem 
                    value="salary_plus_selected" 
                    id="salary_plus_selected" 
                    className="mt-1"
                  />
                  <div className="space-y-1.5">
                    <Label 
                      htmlFor="salary_plus_selected" 
                      className="text-base font-medium flex items-center cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4 mr-2 text-amber-600" />
                      Ingresos seleccionados
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getMethodDescription('salary_plus_selected')}
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || (budgetType === 'salary' && (!salaryAmount || salaryAmount <= 0))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Guardar configuración
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
} 