# APPTTIC - Sistema de Gestión de Seguridad Mercedes │

## Deploy Process

1. **Sincronizar cambios:**
   ```bash
   clasp push
## Arquitectura

### Módulos
- 0_Config.gs: Constantes globales
- 1_Interfaz.gs: UI y entrada de usuario
- 2_Consultas.gs: Lectura de datos
- 3_Utilidades.gs: Helpers
- 4_Seguridad.gs: RBAC
- 5_Operaciones.gs: Lógica de negocio
- 6_Notificaciones.gs: Emails
- 7_Triggers.gs: Auditoría de cambios
- 8_Informes.gs: Reportes
- 9_Tests.gs: Testing
- 10_Gestion_Solicitudes.gs: Workflow

## Flujos Principales                   

### Alta de Activo
1. ADMIN/SECRETARIO: ejecutarAltaDirecta()
2. COM/TECNICO: procesarSolicitudUnificada()
3. Registra en Historial
4. Notifica vía mail

### Contadores en Panel
- `actualizarBadgeSolicitudes()` devuelve cantidad de solicitudes pendientes
- `actualizarBadgeTareas()` calcula tareas según rol
- Llamadas desde `Panel.html` cada 2 minutos y al cambiar estado

### Filtros UI
La pantalla principal usa checkbox en vez de chips para filtrar por tipo/estado.
Funciones front-end: `filtrarTabla()` en Panel.html.

## Permisos (RBAC)

- ADMIN: Full access                    
- SECRETARIO: Gestión + Reportes
- TECNICO: Instalación + Reportes
- COM: Solicitudes + Tareas
- LECTURA: Solo informes                

## API Endpoints (Node.js)

### POST /api/solicitud
```json
{                                       
  "tipoActivo": "CAMARA",
  "nombre": "Ubicación",     
  "tipoAccion": "NUEVA_SOLICITUD"
}  
```

## Testing

Ejecuta en Editor:
- testSistema()
- testPerformance()
- testTrazabilidad()
- testErroresAvanzado()
- runTestsRefactorizacion()  *(incluye validación de payloades y utilidades)*

Todos deben mostrar ✅

## Troubleshooting

- Si trigger no funciona: abrirPanelTablerosModal()│
- Si permisos fallan: verificarYAutorizar()
- Si búsqueda lenta: usa precargarCacheHojas()  