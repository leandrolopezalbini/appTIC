# APPTTIC - Sistema de Gestión de Seguridad Mercedes

## Arquitectura

### Módulos
- **0_Config.gs:** Constantes globales y SESION_CACHE
- **1_Interfaz.gs:** UI y entrada de usuario
- **2_Consultas.gs:** Lectura de datos
- **3_Utilidades.gs:** Validación de payload, búsqueda genérica
- **4_Seguridad.gs:** RBAC y autenticación
- **5_Operaciones.gs:** Lógica de negocio, router, handlers
- **6_Notificaciones.gs:** Notificaciones por email
- **7_Triggers.gs:** Auditoría y triggers automáticos
- **8_Informes.gs:** Reportes y exportación
- **9_Tests.gs:** Suite de testing
- **10_Gestion_Solicitudes.gs:** Workflow de solicitudes

---

## Flujos Principales

### Alta de Nuevo Activo
```
ADMIN/SECRETARIO → ejecutarAltaDirecta() → [Alta inmediata]
COM/TECNICO → manejadorSolicitudNueva() → [Solicitud pendiente] → Aprobación
```

### Actualización de Activo
```
procesarSolicitudUnificada(data)
  ├─ Si es actualización → manejadorActualizacion()
  ├─ Si es nueva solicitud → manejadorSolicitudNueva()
  └─ Retorna {success, id, message}
```

### UI - Filtros y Badges
- **Checkboxes:** `filtrarTabla()` - Muestra/oculta filas por tipo
- **Badge Solicitudes:** `actualizarBadgeSolicitudes()` - Cuenta pendientes
- **Badge Tareas:** `actualizarBadgeTareas()` - Cuenta según rol
- Actualización automática cada 2 minutos

---

## Permisos (RBAC)

| Rol | Acceso | Funciones |
|-----|--------|-----------|
| **ADMIN** | Full | Todas las operaciones |
| **SECRETARIO** | Gestión + Reportes | Alta, aprobación, informes |
| **TECNICO** | Operativo | Instalación, tareas, reportes |
| **COM** | Limitado | Solicitudes, mis tareas |
| **LECTURA** | Solo consulta | Informes y mapas |

---

## Performance & Caché

### Estrategia
- **CACHE_SHEETS:** Hojas maestras (invalidación automática en `onEdit`)
- **SESION_CACHE:** PropertiesService con TTL configurable
- **Índices cacheados:** En funciones críticas para evitar búsquedas repetidas

### Targets
| Operación | Target |
|-----------|--------|
| Búsqueda ID | <300ms |
| offenderDetaile completo | <150ms |
| testPerformance() | <500ms |
| Carga Panel | <1s |

### Invalidación Manual
```javascript
precargarCacheHojas();       // Borra CACHE_SHEETS
SESION_CACHE.clearAll();     // Borra caché de usuario actual
SESION_CACHE.clear(clave);   // Borra una clave específica
```

---

## Testing

### Suite Completa
```javascript
// Tests básicos
runTests();                    // testTrazabilidad + testErrorHandling

// Tests de refactorización
runTestsRefactorizacion();     // manejadorActualizacion, Solicitud nueva, buscarFilas

// Performance
testPerformance();             // Debe estar <500ms

// Individual
testErrorHandling();
testBadges();
testUtilidadesAdicionales();
```

**Todos deben devolver ✅**

---

## Validation Pattern

Todas las funciones críticas usan:

```javascript
// 1. VALIDAR PAYLOAD
const val = validarPayload(data, ['campoObligatorio']);
if (!val.valid) return { success: false, message: val.error, errorCode: 'INVALID_PAYLOAD' };

// 2. OPERACIÓN CON TRY/CATCH
try {
  // Lógica aquí
  registrarHistorial(...);  // Auditoría
  return { success: true, ... };
} catch (e) {
  return { success: false, message: e.message, errorCode: 'ERROR_CODE' };
}
```

---

## Deploy Process

### Paso a Paso
1. **Realizar cambios** localmente
2. **Sincronizar:**
   ```bash
   clasp push
   ```
3. **Ejecutar tests** (desde Apps Script Editor):
   ```javascript
   runTests();
   runTestsRefactorizacion();
   testPerformance();
   ```
4. **Validar en staging** antes de producción
5. **Hacer backup** si lo requiere
6. **Notificar usuarios** de cambios

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Búsqueda lenta | Ejecutar `precargarCacheHojas()` |
| Trigger no funciona | Verificar `onEdit()` en 7_Triggers.gs |
| Badges desactualizados | Llamar `actualizarBadgeUI()` en Panel.html |
| Permiso denegado | Revisar rol en 4_Seguridad.gs |
| Test fallido | Revisar logs y ejecutar nuevamente |

---

## Auditoría Semestral

**Próxima auditoría:** 04/09/2026

Usar checklist en `AUDITORIA_SEMESTRAL_CHECKLIST.txt`:
- Validar seguridad y permisos
- Revisar performance y logs
- Ejecutar suite completa de tests
- Documentar hallazgos y acciones correctivas

---

## Funciones Principales

### Router
- `procesarSolicitudUnificada(data)` - Punto de entrada del backend

### Handlers
- `manejadorActualizacion(data, usuario, rol)` - Cambios en activos
- `manejadorSolicitudNueva(data, usuario, rol)` - Nuevas solicitudes

### Búsqueda
- `buscarFilas(hoja, criterio, opciones)` - Genérica y flexible
- `obtenerDetalleCompletoOptimizado(id, tipo)` - Con índices cacheados

### Validación
- `validarPayload(data, camposRequeridos)` - Valida estructura

### Auditoría
- `registrarHistorial(accion, id, estado, detalle, usuario, categoria)` - Tracing

### UI (Panel.html)
- `filtrarTabla()` - Filtra por checkboxes
- `actualizarBadgeUI()` - Actualiza contadores
- `cargarDataMaestra()` - Carga datos iniciales

---

## Version

**Actual:** v1.1.0 (04/03/2026)

Ver `CHANGELOG.md` para histórico completo.
