
# Changelog

## [1.1.0] - 2026-03-05 AUDITORÍA COMPLETADA

### Fixed
- Consolidación de archivos duplicados
- Trazabilidad: agregado registrarHistorial() en
  6 funciones críticas
- Manejo de errores: reemplazado 8+ catch vacíos

### Performance
- Caché de hojas: búsquedas 80% más rápidas
- Batch setBackground: 99% menos llamadas API
- Índices cacheados: 70% menos búsquedas de datos maestros
- `aplicarFormatoInsumos()` reescrito para operaciones en lote

### Added
- validarPayload() función genérica
- testPerformance(), testTrazabilidad(), testBadges(), runTestsRefactorizacion()
- Router principal `procesarSolicitudUnificada()` con manejadores genéricos
- Funciones `buscarFilas()` y `buscarEnMultiples()`
- Filtros de búsqueda con checkbox y badges dinámicos en `Panel.html`
- README.md con arquitectura

### Removed
- 2_Consultas.js (duplicado)
- 3_Utilidades.js (duplicado)
- 5_Operaciones.js (duplicado)
- Codigo.gs (fusionado en 1_Interfaz)

## [1.0.0] - 2026-01-20 Lanzamiento Inicial
