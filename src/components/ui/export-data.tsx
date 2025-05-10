"use client";

import { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { useUser } from '@/hooks/useUser';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportTransactionsToCSV, exportBudgetsToCSV, downloadCSV, generateFileName } from '@/services/export';
import { format } from 'date-fns';

export function ExportData() {
  const { user } = useUser();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Opciones de exportación
  const exportOptions = [
    { 
      id: 'transactions', 
      name: 'Transacciones', 
      description: 'Exporta todas tus transacciones con detalles de fecha, categoría y monto.',
      icon: <FileSpreadsheet className="h-8 w-8 text-blue-500" />
    },
    { 
      id: 'budgets', 
      name: 'Presupuestos', 
      description: 'Exporta tu presupuesto mensual con asignaciones por categoría.',
      icon: <FileSpreadsheet className="h-8 w-8 text-green-500" />
    }
  ];

  // Manejar la exportación
  const handleExport = async (type: string) => {
    if (!user) {
      setError('Debes iniciar sesión para exportar datos');
      return;
    }
    
    setExporting(true);
    setError(null);
    
    try {
      let csvContent = '';
      let fileName = '';
      
      // Exportar según el tipo seleccionado
      if (type === 'transactions') {
        csvContent = await exportTransactionsToCSV(user.id);
        fileName = generateFileName('transacciones');
      } else if (type === 'budgets') {
        // Para presupuestos, usamos el mes actual
        const currentMonth = format(new Date(), 'yyyy-MM');
        csvContent = await exportBudgetsToCSV(user.id, currentMonth);
        fileName = generateFileName('presupuestos');
      }
      
      // Descargar el archivo CSV
      downloadCSV(csvContent, fileName);
    } catch (err: any) {
      console.error('Error al exportar datos:', err);
      setError(err.message || 'No se pudieron exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Datos</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 mb-4 rounded">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Exporta tus datos financieros para analizarlos en Excel, Google Sheets u otras herramientas.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {exportOptions.map((option) => (
              <div 
                key={option.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start mb-2">
                  {option.icon}
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">{option.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleExport(option.id)} 
                  disabled={exporting}
                  variant="outline"
                  className="w-full mt-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar {option.name}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Formato de exportación: CSV (valores separados por comas)</p>
            <p>Compatible con: Microsoft Excel, Google Sheets, LibreOffice Calc, etc.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 