/**
 * CORRECCIONES DE CÓDIGO - APPTTIC AUDIT
 * Senior Lead Developer Recommendations - 2026
 * 
 * Este archivo contiene snippets listos para copiar/pegar
 * que remmedian los problemas encontrados en la auditoría.
 */

// ============================================
// CORRECCIÓN 1: Agregar Trazabilidad Faltante
// ============================================

// ANTES (5_Operaciones.js línea 30-45):
/*
case 'ACTUALIZAR_ENERGIA':
    if (filaIndex === -1) throw new Error("No se encontró el ID para actualizar energía.");
    hojaSoli.getRange(filaIndex, 6).setValue(data.estado); // Col F
    hojaSoli.getRange(filaIndex, 10).setValue(data.estado); // Col J
    hojaSoli.getRange(filaIndex, 11).setValue(data.proveedor); // Col K
    hojaSoli.getRange(filaIndex, 12).setValue(txtInsumos); // Col L
    const obsE = hojaSoli.getRange(filaIndex, 9).getValue(); 
    hojaSoli.getRange(filaIndex, 9).setValue(obsE + " | TÉCNICO (Energía): " + (data.observaciones || "Sin obs"));
    break;
*/

// DESPUÉS (versión corregida):
case 'ACTUALIZAR_ENERGIA':
    if (filaIndex === -1) throw new Error("No se encontró el ID para actualizar energía.");
    hojaSoli.getRange(filaIndex, 6).setValue(data.estado); // Col F
    hojaSoli.getRange(filaIndex, 10).setValue(data.estado); // Col J
    hojaSoli.getRange(filaIndex, 11).setValue(data.proveedor); // Col K
    hojaSoli.getRange(filaIndex, 12).setValue(txtInsumos); // Col L
    const obsE = hojaSoli.getRange(filaIndex, 9).getValue(); 
    hojaSoli.getRange(filaIndex, 9).setValue(obsE + " | TÉCNICO (Energía): " + (data.observaciones || "Sin obs"));
    
    // ✅ AGREGAR ESTAS LÍNEAS:
    const detalleEnergia = `Proveedor: ${data.proveedor} | Insumos: ${txtInsumos} | Obs: ${data.observaciones}`;
    registrarHistorial('ACTUALIZAR_ENERGIA', data.id, data.estado, detalleEnergia, usuarioActivo(), 'ENERGIA');
    break;

// ---

// ANTES (10_Gestion_Solicitudes.js línea 33):
/*
const idxEstado = getHeaderIndex(headers, "Estado");
hojaSol.getRange(filaIndex, idxEstado + 1).setValue("AUTORIZADA");
*/

// DESPUÉS:
const idxEstado = getHeaderIndex(headers, "Estado");
hojaSol.getRange(filaIndex, idxEstado + 1).setValue("AUTORIZADA");

// ✅ AGREGAR ESTAS LÍNEAS:
registrarHistorial(
    'AUTORIZACION_SOLICITUD', 
    solicitudId, 
    'AUTORIZADA', 
    `Solicitud autorizada por ${usuario}. Nuevo ID generado: ${resultadoAlta.id}`,
    usuario,
    'ESTADO'
);

// ---

// ANTES (10_Gestion_Solicitudes.js línea 50):
/*
rechazarSolicitud(solicitudId) {
  if (filaIndex !== -1) {
    const idxEstado = getHeaderIndex(headers, "Estado");
    hojaSol.getRange(filaIndex, idxEstado + 1).setValue("RECHAZADA");
*/

// DESPUÉS:
rechazarSolicitud(solicitudId) {
  try {
    const hojaSol = obtenerHoja("Solicitudes");
    const headers = getHeaders(hojaSol);
    const usuario = usuarioActivo(); // ✅ AGREGAR
    
    const filaIndex = findRowByColValue(hojaSol, "ID", solicitudId);
    
    if (filaIndex !== -1) {
      const idxEstado = getHeaderIndex(headers, "Estado");
      hojaSol.getRange(filaIndex, idxEstado + 1).setValue("RECHAZADA");
      
      // ✅ AGREGAR HISTORIAL:
      registrarHistorial(
          'RECHAZO_SOLICITUD',
          solicitudId,
          'RECHAZADA',
          'Solicitud rechazada por ' + usuario,
          usuario,
          'ESTADO'
      );
      
      return { success: true, message: "Solicitud rechazada correctamente." };

// ============================================
// CORRECCIÓN 2: Validación de Payloads
// ============================================

// ✅ AGREGAR función validadora general:
function validarPayload(data, requiredFields = []) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: "Payload inválido (no es objeto)" };
    }
    
    for (const field of requiredFields) {
        if (data[field] === null || data[field] === undefined || data[field] === '') {
            return { valid: false, error: `Campo requerido falta: ${field}` };
        }
    }
    
    return { valid: true };
}

// USO EN procesarSolicitudUnificada():
function procesarSolicitudUnificada(data) {
  try {
    // ✅ AGREGAR VALIDACIÓN AL INICIO:
    const validacion = validarPayload(data, ['tipoAccion']);
    if (!validacion.valid) {
        Logger.log("Error: " + validacion.error);
        return { success: false, message: validacion.error, errorCode: "INVALID_PAYLOAD" };
    }
    
    const usuario = usuarioActivo();
    // ... resto del código ...

// ============================================
// CORRECCIÓN 3: Manejo de Errores Mejorado
// ============================================

// ANTES (6_Notificaciones.gs):
/*
try {
    destinatarios.forEach(dest => {
        MailApp.sendEmail(dest, asunto, cuerpo);
    });
} catch(e) { Logger.log("Error enviando mail: " + e); }
*/

// DESPUÉS:
function notificarEvento(evento, detalles) {
  const perfilesANotificar = [];
  const resultado = { 
      success: true, 
      notificacionesEnviadas: 0, 
      notificacionesFallidas: [],
      evento: evento
  };

  switch(evento) {
    case 'NUEVA_SOLICITUD_COM':
      perfilesANotificar.push('SECRETARIO', 'ADMIN');
      break;
    // ... resto de casos ...
  }

  const emails = buscarEmailsPorPerfiles(perfilesANotificar);
  
  if (emails.length > 0) {
    try {
        emails.forEach(email => {
            try {
                MailApp.sendEmail({
                    to: email,
                    subject: `SISTEMA SEGURIDAD: ${evento} - Activo: ${detalles.id}`,
                    body: `Detalles: ${detalles.msg}\n\nUbicación: ${detalles.ubicacion || 'Ver en Mapa'}\nUsuario responsable: ${detalles.usuario}`
                });
                resultado.notificacionesEnviadas++;
            } catch(innerE) {
                // Registra pero continúa con otros emails
                Logger.log(`Error enviando email a ${email}: ${innerE.message}`);
                resultado.notificacionesFallidas.push({
                    email: email,
                    error: innerE.message
                });
                resultado.success = false;
            }
        });
    } catch(e) {
        Logger.log(`Error crítico en notificarEvento: ${e.message}`);
        resultado.success = false;
        resultado.error = e.message;
    }
  }
  
  return resultado;
}

// ============================================
// CORRECCIÓN 4: Optimización - Caché de Sheets
// ============================================

// ✅ AGREGAR VARIABLES GLOBALES AL INICIO DE 2_Consultas.js:
const CACHE_SHEETS = {};
let CACHE_TIMESTAMP = 0;
const CACHE_VALIDITY = 5 * 60 * 1000; // 5 minutos

// ✅ FUNCIÓN PARA PRECARGAR CACHÉ:
function precargarCacheHojas() {
    const ahora = new Date().getTime();
    
    // Recarga cada 5 minutos
    if (CACHE_TIMESTAMP && (ahora - CACHE_TIMESTAMP) < CACHE_VALIDITY) {
        return; // Caché válido
    }
    
    const categorias = ['TABLEROS', 'CAMARAS', 'ALARMAS', 'SWITCHES', 'TAREAS'];
    
    categorias.forEach(tipo => {
        try {
            const hoja = obtenerHoja(HOJA[tipo]);
            CACHE_SHEETS[tipo] = hoja.getDataRange().getValues();
        } catch(e) {
            Logger.log(`Error precargando ${tipo}: ${e.message}`);
        }
    });
    
    CACHE_TIMESTAMP = ahora;
    Logger.log("✅ Caché de hojas actualizado");
}

// ✅ MODIFICAR buscadorMaestro() PARA USAR CACHÉ:
function buscadorMaestro(query, tipos) {
  precargarCacheHojas(); // Asegura caché válido
  
  const resultados = [];
  const q = (query || "").toString().toUpperCase().trim();
  
  const categorias = (tipos && tipos.length > 0) 
    ? tipos 
    : ["TABLEROS", "CAMARAS", "ALARMAS", "SWITCHES"];

  categorias.forEach(tipo => {
    try {
      const data = CACHE_SHEETS[tipo]; // ✅ LEE DEL CACHÉ, NO DE SHEETS
      if (!data || data.length <= 1) return;

      const headers = data[0];
      const idxID = getHeaderIndex(headers, ["ID", "ID_ACTIVO", "ID_TAREA"]);
      const idxNom = getHeaderIndex(headers, ["Dirección", "Nombre", "Ubicación"]);

      for (let i = 1; i < data.length; i++) {
        const idVal = data[i][idxID] ? data[i][idxID].toString() : "";
        const nomVal = data[i][idxNom] ? data[i][idxNom].toString() : "";

        if (q === "" || idVal.toUpperCase().includes(q) || nomVal.toUpperCase().includes(q)) {
          resultados.push({
            ID: idVal,
            DIRECCION: nomVal,
            TIPO_HOJA: tipo.toUpperCase()
          });
        }
      }
    } catch (e) {
      Logger.log("Error en búsqueda de " + tipo + ": " + e.message);
    }
  });
  
  return resultados;
}

// ============================================
// CORRECCIÓN 5: Optimización - Batch Operations
// ============================================

// ANTES (5_Operaciones.js - aplicarFormatoInsumos):
/*
for (let i = 0; i < valores.length; i++) {
    const filaActual = i + 2;
    hoja.getRange(filaActual, 1, 1, 14).setBackground(colorFondo);
}
*/

// DESPUÉS:
function aplicarFormatoInsumos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Solicitudes");
  const ultimaFila = hoja.getLastRow();
  
  if (ultimaFila < 2) return;

  const rango = hoja.getRange(2, 1, ultimaFila - 1, 14);
  const valores = rango.getValues();
  
  // ✅ BATCH: Preparar todos los colores ANTES de aplicar
  const backgroundColors = [];
  
  for (let i = 0; i < valores.length; i++) {
    const estadoGeneral = valores[i][5];    // Col F: Estado
    const obsFalla = valores[i][9];         // Col J: Tipo de Falla
    const celdaInsumos = valores[i][11];    // Col L: Insumos
    
    let colorFondo = null;

    if (celdaInsumos && celdaInsumos.toString().trim() !== "") {
      colorFondo = "#fff9c4"; 
    }
    if (obsFalla === "PODA") {
      colorFondo = "#c8e6c9"; 
    }
    if (obsFalla === "DESENFOQUE") {
      colorFondo = "#ffe0b2"; 
    }
    if (["FINALIZADO", "INSTALADO", "COMPRADO"].includes(estadoGeneral)) {
      colorFondo = null;
    }

    // ✅ Construye array de colores para TODA la fila
    const coloresRow = [];
    for (let j = 0; j < 14; j++) {
      coloresRow.push(colorFondo);
    }
    backgroundColors.push(coloresRow);
  }
  
  // ✅ UNA SOLA llamada a setBackgrounds (batch)
  rango.setBackgrounds(backgroundColors);
}

// ============================================
// CORRECCIÓN 6: Índices Cacheados
// ============================================

// ✅ MODIFICAR registrarInstalacionTablero():
function registrarInstalacionTablero(datos) {
  try {
    const usuario = usuarioActivo();
    if (!usuarioTienePermiso('INSTALACION')) return { success: false, message: `Sin permiso` };

    const hoja = obtenerHoja(HOJA.TABLEROS);
    const headers = getHeaders(hoja);
    
    // ✅ CACHE índices UNA SOLA VEZ
    const idx = {
      estado: getHeaderIndex(headers, CAMPOS.ESTADO),
      tablero: getHeaderIndex(headers, "Estado_Tablero"),
      obs: getHeaderIndex(headers, CAMPOS.OBSERVACIONES)
    };
    
    const filaIndex = findRowByColValue(hoja, CAMPOS.ID, datos.id);
    if (filaIndex === -1) return { success: false, message: 'Activo no encontrado' };

    // Usa idx en lugar de llamar getHeaderIndex() múltiples veces
    hoja.getRange(filaIndex, idx.estado + 1).setValue("INSTALADO");
    if (idx.tablero !== -1) {
      hoja.getRange(filaIndex, idx.tablero + 1).setValue("INSTALADO");
    }

    const obsPrevia = (hoja.getRange(filaIndex, idx.obs + 1).getValue() || '');
    const nuevaObs = `[${new Date().toLocaleDateString()}] INSTALACION FINAL por ${usuario}. GPS: ${datos.latitud},${datos.longitud}.`;
    hoja.getRange(filaIndex, idx.obs + 1).setValue(obsPrevia ? obsPrevia + "\n" + nuevaObs : nuevaObs);

    registrarHistorial('INSTALACION', datos.id, "FINALIZADO", "Dispositivo operativo en campo", usuario, "EQUIPAMIENTO");
    notificarEvento('ALTA_DEFINITIVA', { id: datos.id, msg: "Activo 100% Operativo", usuario: usuario });

    enviarMailCambioEstado(datos.id, "INSTALADO", "Instalación física completada por técnico.", usuario);
    return { success: true };
  } catch (e) { 
    Logger.log("Error en registrarInstalacionTablero: " + e.message);
    return { success: false, message: e.message }; 
  }
}

// ============================================
// CORRECCIÓN 7: Tests Mejorados
// ============================================

// ✅ AGREGAR a 9_Tests.js:
function testTrazabilidad() {
    Logger.log("=== TEST DE TRAZABILIDAD ===");
    
    try {
        const hojaHistorial = obtenerHoja(HOJA.HISTORIAL);
        const data = hojaHistorial.getDataRange().getValues();
        
        Logger.log(`✅ Historial tiene ${data.length - 1} registros`);
        
        // Busca escrituras SIN correlativo de historial
        const hojaTableros = obtenerHoja(HOJA.TABLEROS);
        const dataTabs = hojaTableros.getDataRange().getValues();
        
        for (let i = 1; i < dataTabs.length; i++) {
            const idTab = dataTabs[i][0];
            
            // Busca si hay cambios en Historial para este ID
            const tieneHistorial = data.some(row => row[0] === idTab);
            
            if (!tieneHistorial && dataTabs[i][0]) {
                Logger.log(`⚠️ ALERTA: ID ${idTab} tiene cambios sin historial`);
            }
        }
        
        Logger.log("✅ Test de trazabilidad completado");
    } catch(e) {
        Logger.log("❌ Error en test: " + e.message);
    }
}

function testErrorHandling() {
    Logger.log("=== TEST DE MANEJO DE ERRORES ===");
    
    // Test 1: Payload inválido
    const resultado1 = procesarSolicitudUnificada(null);
    if (!resultado1.success && resultado1.errorCode === "INVALID_PAYLOAD") {
        Logger.log("✅ Validación de payload: OK");
    }
    
    // Test 2: ID inexistente
    const resultado2 = obtenerDetalleActivo("ID_INEXISTENTE_12345", "TABLEROS");
    if (!resultado2.success) {
        Logger.log("✅ Manejo de ID inexistente: OK");
    }
    
    Logger.log("✅ Tests de errores completados");
}

// ============================================
// FIN DE CORRECCIONES
// ============================================
