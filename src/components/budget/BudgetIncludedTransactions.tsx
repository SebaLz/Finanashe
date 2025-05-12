"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getIncludedTransactions, toggleTransactionInclusion } from '@/services/budget-method';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BudgetIncludedTransactionsProps {
  userId: string;
  month: string;
}

export function BudgetIncludedTransactions({ userId, month }: BudgetIncludedTransactionsProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId && month) {
      loadTransactions();
    }
  }, [userId, month]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener transacciones incluidas en el presupuesto
      const data = await getIncludedTransactions(userId, month);
      
      // Asegurar que data sea un array
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        console.warn('getIncludedTransactions no devolvió un array:', data);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading included transactions:', err);
      setError('No se pudieron cargar las transacciones incluidas');
      setTransactions([]);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las transacciones incluidas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInclusion = async (transactionId: string) => {
    try {
      setUpdating(transactionId);
      await toggleTransactionInclusion(userId, transactionId, month, false);
      await loadTransactions();
      toast({
        title: 'Éxito',
        description: 'Transacción actualizada correctamente'
      });
    } catch (err) {
      console.error('Error toggling transaction inclusion:', err);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la transacción',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin mr-2" size={24} />
            <span>Cargando transacciones...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 py-8 text-amber-600">
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="outline" onClick={loadTransactions}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    // No mostrar nada cuando no hay transacciones
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacciones Incluidas en el Presupuesto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 bg-card rounded-lg border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{transaction.description || 'Sin descripción'}</span>
                  <span className="text-sm px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Ingreso
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {transaction.date ? format(new Date(transaction.date), "d 'de' MMMM, yyyy", { locale: es }) : 'Fecha no disponible'}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-green-600">
                  ${transaction.amount ? transaction.amount.toLocaleString() : '0'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleInclusion(transaction.id)}
                  disabled={updating === transaction.id}
                >
                  {updating === transaction.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 