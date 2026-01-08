# Persistencia de Datos del Dashboard

## 📋 Resumen

Los componentes **TodoList** (Tareas) y **UpcomingDeadlines** (Próximas Fechas) ahora guardan automáticamente sus datos en el `localStorage` del navegador. Esto significa que:

✅ Los datos **persisten entre recargas de página** (Ctrl+R o F5)
✅ Los datos **se mantienen después de cerrar y abrir el navegador**
✅ Los datos **se sincronizan entre pestañas** del mismo navegador
✅ Cada usuario tiene **sus propios datos** en su navegador

## 🔧 Implementación Técnica

### Hook Personalizado: `useLocalStorage`

Creado en `front-v2/hooks/useLocalStorage.ts`, este hook maneja:
- Carga inicial de datos desde localStorage
- Guardado automático cuando los datos cambian
- Sincronización entre pestañas/ventanas
- Manejo robusto de errores

### Claves de Almacenamiento

```typescript
'dashboard_todos'      // Para las tareas
'dashboard_deadlines'  // Para las próximas fechas
```

### Utilidades de Almacenamiento

Archivo: `front-v2/lib/dashboardStorage.ts`

Funciones disponibles:
- `getTodos()` - Obtener todas las tareas
- `saveTodos(todos)` - Guardar tareas
- `getDeadlines()` - Obtener todas las fechas
- `saveDeadlines(deadlines)` - Guardar fechas
- `clearDashboardData()` - Limpiar todos los datos
- `exportDashboardData()` - Exportar a JSON
- `importDashboardData(json)` - Importar desde JSON

## 🎯 Características

### TodoList (Tareas)
- ✅ Añadir tareas con botón "Nueva"
- ✅ Marcar como completadas (checkbox)
- ✅ Eliminar tareas (botón papelera en hover)
- ✅ Persistencia automática
- ✅ Validación de entrada (trim de espacios)

### UpcomingDeadlines (Próximas Fechas)
- ✅ Añadir fechas con botón "Añadir"
- ✅ Seleccionar fecha con DatePicker
- ✅ Tipos: "Entrega" (azul) o "Reunión" (morado)
- ✅ Eliminar fechas (botón papelera en hover)
- ✅ Persistencia automática
- ✅ Formato de fecha: DD MMM YYYY

## 🔍 Cómo Verificar que Funciona

1. **Añade algunas tareas y fechas** en el dashboard
2. **Recarga la página** (Ctrl+R)
3. **Verifica que los datos siguen ahí** ✅

### Prueba Avanzada
1. Abre el dashboard en dos pestañas
2. Añade una tarea en la primera pestaña
3. La segunda pestaña se actualizará automáticamente

## 🛠 Debugging en Consola del Navegador

```javascript
// Ver tareas guardadas
console.log(localStorage.getItem('dashboard_todos'))

// Ver fechas guardadas
console.log(localStorage.getItem('dashboard_deadlines'))

// Limpiar todos los datos (si necesitas empezar de cero)
localStorage.removeItem('dashboard_todos')
localStorage.removeItem('dashboard_deadlines')
```

## 📦 Exportar/Importar Datos (Futuro)

Puedes usar las funciones de utilidad para hacer backup:

```typescript
import { exportDashboardData, importDashboardData } from '@/lib/dashboardStorage'

// Exportar
const backup = exportDashboardData()
console.log(backup) // JSON con todos los datos

// Importar
const success = importDashboardData(backup)
```

## ⚠️ Limitaciones de localStorage

- **Límite de almacenamiento**: ~5-10MB por dominio (suficiente para miles de tareas)
- **Navegador específico**: Los datos no se sincronizan entre dispositivos
- **Privacidad**: Los datos quedan en el navegador del usuario
- **Modo incógnito**: Los datos se borran al cerrar la ventana

## 🔐 Seguridad

- Los datos **solo se guardan en el navegador del usuario**
- **No se envían al servidor** (a menos que se implemente en el futuro)
- Cada usuario tiene su **propia copia local**

## 🚀 Mejoras Futuras (Opcional)

1. **Sincronización con Backend**
   - Guardar en base de datos
   - Sincronizar entre dispositivos
   - Compartir con equipo

2. **Funcionalidades Adicionales**
   - Editar tareas existentes
   - Ordenar por fecha/prioridad
   - Categorías/tags
   - Notificaciones de fechas límite
   - Exportar/importar en la UI

3. **Integración con Workspaces**
   - Tareas por workspace
   - Fechas por proyecto
   - Compartir entre usuarios

## 📝 Notas Técnicas

### Estructura de Datos

**Todo:**
```typescript
{
  id: number,        // Timestamp único
  text: string,      // Descripción de la tarea
  completed: boolean // Estado de completado
}
```

**Deadline:**
```typescript
{
  id: number,                    // Timestamp único
  title: string,                 // Título de la fecha
  date: string,                  // Formato: YYYY-MM-DD
  time?: string,                 // Opcional: HH:mm
  type: 'entrega' | 'reunion'   // Tipo de evento
}
```

## 🐛 Solución de Problemas

### Los datos no se guardan
1. Verifica que el navegador permita localStorage
2. Revisa la consola por errores
3. Verifica que no estés en modo incógnito

### Los datos se perdieron
1. Puede que hayas limpiado los datos del navegador
2. Puede que estés en un navegador diferente
3. Verifica en DevTools > Application > Local Storage

### Los datos no se sincronizan entre pestañas
- El evento `storage` solo funciona entre pestañas diferentes
- La misma pestaña siempre tiene los datos actualizados
