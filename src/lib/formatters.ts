/**
 * Utilidades para formatear valores en la aplicación
 */

/**
 * Formatea un valor numérico como moneda
 * @param value Valor a formatear
 * @param options Opciones de formateo
 * @returns Texto formateado como moneda
 */
export function formatCurrency(
  value: number | string | undefined, 
  options?: { 
    symbol?: string; 
    decimals?: number;
    forceSign?: boolean;
  }
): string {
  // Valores por defecto
  const symbol = options?.symbol ?? '$';
  const decimals = options?.decimals ?? 0;
  const forceSign = options?.forceSign ?? false;
  
  // Manejar valores undefined o null
  if (value === undefined || value === null) {
    return `${symbol}0`;
  }
  
  // Convertir a número si es string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Si es NaN después de la conversión, devolver 0
  if (isNaN(numValue)) {
    return `${symbol}0`;
  }
  
  // Formatear el número con separadores de miles y decimales
  const formattedNumber = Math.abs(numValue).toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  // Agregar signo si es negativo o si se fuerza el signo
  const sign = numValue < 0 ? '-' : (forceSign && numValue > 0 ? '+' : '');
  
  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Formatea un porcentaje
 * @param value Valor a formatear (0-100 o 0-1)
 * @param options Opciones de formateo
 * @returns Texto formateado como porcentaje
 */
export function formatPercentage(
  value: number | string | undefined,
  options?: {
    decimals?: number;
    convertFromDecimal?: boolean;
  }
): string {
  // Valores por defecto
  const decimals = options?.decimals ?? 0;
  const convertFromDecimal = options?.convertFromDecimal ?? false;
  
  // Manejar valores undefined o null
  if (value === undefined || value === null) {
    return '0%';
  }
  
  // Convertir a número si es string
  let numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Si es NaN después de la conversión, devolver 0
  if (isNaN(numValue)) {
    return '0%';
  }
  
  // Convertir de decimal a porcentaje si es necesario
  if (convertFromDecimal && numValue <= 1) {
    numValue *= 100;
  }
  
  // Formatear el número con separadores de miles y decimales
  const formattedNumber = numValue.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return `${formattedNumber}%`;
}

/**
 * Formatea una fecha en español
 * @param date Fecha a formatear
 * @param format Formato de la fecha (default: 'd de MMMM, yyyy')
 * @returns Texto formateado como fecha
 */
export function formatDate(
  date: Date | string | undefined,
  format?: string
): string {
  if (!date) return '';
  
  // Utilizar el objeto Intl.DateTimeFormat para formatear fechas
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObject.getTime())) {
    return '';
  }
  
  try {
    // Si se proporciona un formato específico
    if (format) {
      // Implementación básica de algunos formatos comunes
      const day = dateObject.getDate();
      const month = dateObject.getMonth() + 1;
      const year = dateObject.getFullYear();
      const hours = dateObject.getHours();
      const minutes = dateObject.getMinutes();
      
      // Nombres de meses en español
      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      // Reemplazos básicos
      let result = format
        .replace('dd', day.toString().padStart(2, '0'))
        .replace('d', day.toString())
        .replace('MMMM', monthNames[month - 1])
        .replace('MM', month.toString().padStart(2, '0'))
        .replace('M', month.toString())
        .replace('yyyy', year.toString())
        .replace('yy', year.toString().substr(2, 2))
        .replace('HH', hours.toString().padStart(2, '0'))
        .replace('mm', minutes.toString().padStart(2, '0'));
        
      return result;
    }
    
    // Formato predeterminado
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObject);
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return '';
  }
} 