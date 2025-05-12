"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Settings } from 'lucide-react';
import { 
  getBudgetMethodConfiguration, 
  updateBudgetMethodConfiguration,
  BudgetMethodType 
} from '@/services/budget-method';
import { getCurrentUser } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export function BudgetMethodConfig() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [budgetType, setBudgetType] = useState<BudgetMethodType>('salary');
  const [salaryAmount, setSalaryAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const data = await getBudgetMethodConfiguration(user.id);
      if (data) {
        setConfig(data);
        // Si el método era 'manual', cambiarlo a 'all_income'
        const currentType = data.budget_type as string;
        const safeType = currentType === 'manual' ? 'all_income' : currentType;
        setBudgetType(safeType as BudgetMethodType);
        setSalaryAmount(data.salary_amount);

        // Si el tipo era 'manual', actualizarlo automáticamente a 'all_income'
        if (currentType === 'manual') {
          await updateBudgetMethodConfiguration(user.id, {
            id: data.id,
            budget_type: 'all_income',
            salary_amount: null
          });
          
          toast({
            title: "Configuración actualizada",
            description: "El método 'Lo ingreso manualmente cada mes' ya no está disponible y ha sido cambiado a 'Todos mis ingresos del mes'."
          });
        }
      }
    } catch (error) {
      console.error('Error loading budget method configuration:', error);
      toast({
        title: "Error",
        description: "Error al cargar la configuración"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = await getCurrentUser();
      if (!user) return;

      await updateBudgetMethodConfiguration(user.id, {
        id: config?.id,
        budget_type: budgetType,
        salary_amount: budgetType === 'salary' ? salaryAmount : null
      });

      // Recalcular el total del presupuesto después de cambiar la configuración
      await supabase.rpc('calculate_monthly_budget_total', {
        p_user_id: user.id,
        p_month: new Date().toISOString().substring(0, 7) // Mes actual en formato YYYY-MM
      });

      toast({
        title: "Éxito", 
        description: "Configuración guardada correctamente. Los presupuestos se han actualizado."
      });
      await loadConfig();
    } catch (error) {
      console.error('Error saving budget method configuration:', error);
      toast({
        title: "Error",
        description: "Error al guardar la configuración"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Atención</AlertTitle>
        <AlertDescription>
          Aún no configuraste tu método de presupuesto.
          Elegí si querés usar tu sueldo, todos tus ingresos o ingresos seleccionados como base mensual.
        </AlertDescription>
        <Button onClick={() => setConfig({})} className="mt-4">
          Configurar ahora
        </Button>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Configuración de Método de Presupuesto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label>¿Cómo querés calcular tu presupuesto mensual?</Label>
            <RadioGroup 
              value={budgetType} 
              onValueChange={async (value) => {
                const newType = value as BudgetMethodType;
                setBudgetType(newType);
                
                // Si cambia de un método de salario a otro, actualizar provisionalmente el valor
                if (newType !== 'salary' && salaryAmount) {
                  setSalaryAmount(null);
                }
                
                // Realizar un recálculo provisional inmediato
                try {
                  const user = await getCurrentUser();
                  if (!user) return;
                  
                  // Aplicar el cambio temporalmente para ver el resultado
                  await updateBudgetMethodConfiguration(user.id, {
                    id: config?.id,
                    budget_type: newType,
                    salary_amount: newType === 'salary' ? salaryAmount : null
                  });
                  
                  // Recalcular el total del presupuesto
                  await supabase.rpc('calculate_monthly_budget_total', {
                    p_user_id: user.id,
                    p_month: new Date().toISOString().substring(0, 7) // Mes actual en formato YYYY-MM
                  });
                  
                  toast({
                    title: "Método actualizado",
                    description: "Se ha recalculado el presupuesto con el nuevo método."
                  });
                } catch (error) {
                  console.error('Error al actualizar método de presupuesto:', error);
                }
              }}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="salary" id="salary" />
                <Label htmlFor="salary">Solo mi sueldo fijo mensual</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_income" id="all_income" />
                <Label htmlFor="all_income">Todos mis ingresos del mes (sin filtrar)</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="salary_plus_selected" id="salary_plus_selected" />
                <Label htmlFor="salary_plus_selected">Seleccionados en transacciones</Label>
              </div>
            </RadioGroup>
          </div>

          {budgetType === 'salary' && (
            <div>
              <Label htmlFor="salaryAmount">Monto del sueldo</Label>
              <Input
                id="salaryAmount"
                type="number"
                value={salaryAmount || ''}
                onChange={(e) => setSalaryAmount(Number(e.target.value))}
                className="mt-1"
                min="0"
                step="0.01"
              />
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 