// Define tipos comunes para la aplicación

export type DateString = string; // Formato YYYY-MM-DD para fechas

export type MonthString = string; // Formato YYYY-MM para meses

// Función para convertir strings de fecha a objetos Date
export function parseDate(dateStr: DateString): Date {
  return new Date(dateStr);
}

// Función para obtener el primer día del mes
export function getMonthStart(month: MonthString): DateString {
  return `${month}-01`;
}

// Función para obtener el primer día del mes siguiente
export function getNextMonthStart(month: MonthString): DateString {
  const [year, monthStr] = month.split('-');
  const monthNum = parseInt(monthStr);
  
  if (monthNum === 12) {
    return `${parseInt(year) + 1}-01-01`;
  } else {
    return `${year}-${(monthNum + 1).toString().padStart(2, '0')}-01`;
  }
}

// Función para obtener el mes actual en formato YYYY-MM
export function getCurrentMonth(): MonthString {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
} 