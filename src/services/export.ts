import { getTransactions } from './transactions';
import { getBudgets } from './budgets';
import { getGoals } from './goals';
import { getInvestments } from './investments';
import { format } from 'date-fns';

// Función para exportar transacciones a CSV
export async function exportTransactionsToCSV(userId: string): Promise<string> {
  try {
    const transactions = await getTransactions(userId);
    
    if (!transactions || transactions.length === 0) {
      throw new Error('No hay transacciones para exportar');
    }
    
    // Cabecera CSV
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'];
    
    // Datos de filas
    const rows = transactions.map(transaction => {
      const category = transaction.categories ? transaction.categories.name : 'Sin categoría';
      const type = transaction.type === 'income' ? 'Ingreso' : 'Gasto';
      
      return [
        transaction.date,
        type,
        category,
        transaction.description || '',
        transaction.amount.toString()
      ];
    });
    
    // Combinar todo en formato CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error al exportar transacciones a CSV:', error);
    throw new Error('No se pudieron exportar las transacciones');
  }
}

// Función para exportar presupuestos a CSV
export async function exportBudgetsToCSV(userId: string, month: string): Promise<string> {
  try {
    const budgets = await getBudgets(userId, month);
    
    if (!budgets || budgets.length === 0) {
      throw new Error('No hay presupuestos para exportar');
    }
    
    // Cabecera CSV
    const headers = ['Mes', 'Categoría', 'Monto', 'Porcentaje'];
    
    // Datos de filas
    const rows = budgets.map(budget => {
      const category = budget.category ? budget.category.name : 'Sin categoría';
      
      return [
        budget.month,
        category,
        budget.amount.toString(),
        (budget.percentage || 0).toString()
      ];
    });
    
    // Combinar todo en formato CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  } catch (error) {
    console.error('Error al exportar presupuestos a CSV:', error);
    throw new Error('No se pudieron exportar los presupuestos');
  }
}

// Función para generar archivo CSV y descargarlo
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Función de ayuda para generar un nombre de archivo con fecha
export function generateFileName(prefix: string): string {
  const date = format(new Date(), 'yyyy-MM-dd');
  return `${prefix}_${date}.csv`;
} 