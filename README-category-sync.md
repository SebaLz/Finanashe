# 📋 Sistema de Sincronización Inteligente de Categorías

## 🎯 Descripción General

Este sistema implementa **fuzzy matching inteligente** para sincronizar categorías entre mensajes de WhatsApp (procesados via OpenAI) y la base de datos de Supabase, manteniendo la coherencia visual y evitando duplicados.

## ✨ Características Principales

### 🔍 **Búsqueda Inteligente de Categorías**
- **Coincidencias exactas** (case-insensitive)
- **Búsqueda por sinónimos** (alimentación = comida, transporte = taxi, etc.)
- **Fuzzy matching** para errores tipográficos
- **Categoría fallback** ("Otros") cuando no se encuentra coincidencia

### 🔄 **Detección de Duplicados**
- Validación en ventana de 24 horas configurable
- Detección de transacciones exactas (±$1 tolerancia)
- Identificación de transacciones similares (±2 días, ±5% monto)
- Recomendaciones automáticas: `block`, `warn`, `allow`

### 📊 **Logging y Monitoreo**
- Métricas detalladas de búsquedas
- Estadísticas de éxito/fallo
- Monitoreo de uso de fallback
- Buffer de métricas con flush automático

## 🛠️ Instalación y Configuración

### **1. Dependencias**
```bash
npm install fuse.js
```

### **2. Variables de Entorno**
```env
# Configuración de fuzzy matching
CATEGORY_MATCH_THRESHOLD=0.6
DUPLICATE_CHECK_HOURS=24
ENABLE_CATEGORY_LOGGING=true
```

### **3. Script de Base de Datos**
**Este script debes de ejecutar en supabase para que funcione:**

```sql
-- Asegurar categoría Otros existe
INSERT INTO public.categories (
  id, user_id, name, color, icon, emoji, type, is_default, is_system
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  NULL, 'Otros', '#9E9E9E', 'help-circle', '❓', 'expense', false, true
) ON CONFLICT (id) DO NOTHING;

-- Crear índice para búsqueda
CREATE INDEX IF NOT EXISTS idx_categories_name_lower 
ON public.categories (LOWER(name));
```

## 📁 Estructura de Archivos

```
src/
├── services/
│   ├── category-matching.ts     # Lógica de fuzzy matching
│   ├── duplicate-validation.ts  # Detección de duplicados
│   └── categories.ts           # Servicio base de categorías
├── lib/
│   └── category-sync-logger.ts # Sistema de logging
├── app/api/whatsapp-webhook/
│   └── route.js                # Webhook integrado
└── tests/
    └── category-sync.test.ts   # Tests unitarios
```

## 🚀 Uso

### **Búsqueda de Categorías**
```typescript
import { findBestCategoryMatch, getCategoryFallback } from '@/services/category-matching';

// Buscar categoría con fuzzy matching
const match = await findBestCategoryMatch(
  'alimentacion',  // texto de búsqueda
  'user-id',       // ID del usuario
  'expense'        // tipo de transacción
);

if (match) {
  console.log(`Encontrada: ${match.name} (score: ${match.score})`);
} else {
  // Usar categoría fallback
  const fallbackId = await getCategoryFallback('user-id');
}
```

### **Validación de Duplicados**
```typescript
import { checkDuplicateTransaction } from '@/services/duplicate-validation';

const transactionData = {
  user_id: 'user-id',
  type: 'expense',
  amount: 100,
  category_id: 'cat-id',
  date: '2024-01-15'
};

const duplicateCheck = await checkDuplicateTransaction(transactionData);

switch (duplicateCheck.recommendation) {
  case 'block':
    // No permitir la transacción
    break;
  case 'warn':
    // Mostrar advertencia al usuario
    break;
  case 'allow':
    // Proceder normalmente
    break;
}
```

## 📈 Métricas y Monitoreo

### **Logs Disponibles**
- **Category Search**: Búsquedas realizadas con scores
- **Duplicate Check**: Detecciones de duplicados
- **Category Sync Event**: Eventos específicos del sistema
- **Category Sync Error**: Errores críticos

### **Estadísticas Agregadas**
```typescript
import { categorySyncLogger } from '@/lib/category-sync-logger';

const stats = categorySyncLogger.getAggregatedStats();
console.log('Tasa de éxito:', stats.categorySearches.successRate);
console.log('Uso de fallback:', stats.categorySearches.fallbackRate);
console.log('Duplicados detectados:', stats.duplicateDetections.duplicatesFound);
```

## 🔧 Configuración Avanzada

### **Ajustar Umbral de Similitud**
```env
CATEGORY_MATCH_THRESHOLD=0.8  # Más estricto (0.0-1.0)
```

### **Modificar Ventana de Duplicados**
```env
DUPLICATE_CHECK_HOURS=48  # Revisar 48 horas hacia atrás
```

### **Habilitar Logging Detallado**
```env
ENABLE_CATEGORY_LOGGING=true
NODE_ENV=development  # Para logs detallados
```

## 🔄 Sinónimos Configurados

```typescript
const SYNONYMS_MAP = {
  'alimentación': ['comida', 'alimento', 'mercado', 'supermercado'],
  'transporte': ['taxi', 'uber', 'colectivo', 'combustible'],
  'salud': ['medicina', 'doctor', 'farmacia', 'hospital'],
  'entretenimiento': ['cine', 'teatro', 'streaming', 'netflix'],
  'servicios': ['luz', 'agua', 'gas', 'internet', 'wifi'],
  'hogar': ['casa', 'alquiler', 'muebles', 'limpieza'],
  'ropa': ['vestimenta', 'zapatos', 'moda'],
  'educación': ['curso', 'libro', 'universidad']
};
```

## 🐛 Troubleshooting

### **Problema: Categorías no se encuentran**
```typescript
// Verificar logs
console.log('Category search failed, check:');
console.log('1. Threshold:', process.env.CATEGORY_MATCH_THRESHOLD);
console.log('2. Search text length:', searchText.length);
console.log('3. Available categories count:', categories.length);
```

### **Problema: Duplicados no se detectan**
```typescript
// Verificar configuración
console.log('Duplicate check window:', process.env.DUPLICATE_CHECK_HOURS);
console.log('Amount tolerance: ±$1');
console.log('Date tolerance: ±', checkHours, 'hours');
```

### **Problema: Logging no funciona**
```env
# Verificar variables de entorno
ENABLE_CATEGORY_LOGGING=true
NODE_ENV=development
```

## 📊 Métricas de Performance

### **Tiempos de Respuesta Esperados**
- Búsqueda de categoría: < 100ms
- Validación de duplicados: < 200ms
- Procesamiento total del webhook: < 3s

### **Tasas de Éxito Objetivo**
- Fuzzy matching: ≥90% precisión
- Prevención duplicados: ≥95% efectividad
- Uso de fallback: <10% de casos

## 🔐 Consideraciones de Seguridad

- Todas las búsquedas validan `user_id`
- No se exponen categorías de otros usuarios
- Sanitización de inputs de búsqueda
- Rate limiting implícito por ventanas de duplicados

## 🚧 Limitaciones Conocidas

1. **Sinónimos estáticos**: Requieren actualización manual
2. **Fuzzy matching en español**: Optimizado para español argentino
3. **Buffer de métricas**: Se pierde en restart de servidor
4. **Memoria de sesión**: No persiste entre reinicios

## 🔄 Mantenimiento

### **Actualizar Sinónimos**
Editar `SYNONYMS_MAP` en `src/services/category-matching.ts`

### **Ajustar Categorías del Sistema**
Ejecutar migraciones SQL en Supabase con nuevas categorías

### **Monitorear Performance**
Revisar logs y métricas regularmente para optimizar umbrales

---

**📝 Última actualización:** ${new Date().toISOString().split('T')[0]}
**�� Versión:** 1.0.0 