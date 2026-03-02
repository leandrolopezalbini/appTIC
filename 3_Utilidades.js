//3_Utilidades.gs
function obtenerHoja(nombreHoja) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) throw new Error(`La hoja "${nombreHoja}" no se encontró.`);
    return hoja;
}

function normalizeHeader(h) {
    if (!h) return "";
    return h.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quita tildes
            .replace(/\s+/g, '')             // <--- ESTO: Quita todos los espacios
            .trim()
            .toLowerCase();
}


// Tu versión de Historial con el orden de columnas correcto
function registrarHistorial(tipo, idActivo, nuevoValor, detalle, usuarioEmail, columnaAfectada) {
    try {
        const sheet = obtenerHoja(HOJA.HISTORIAL);
        const email = usuarioEmail || usuarioActivo();
        const fecha = new Date();

        // Si la hoja está vacía, creamos cabeceras claras
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['ID_ACTIVO', 'ACCION', 'VALOR_NUEVO', 'FECHA', 'DETALLES', 'USUARIO', 'CAMPO_MODIFICADO']);
        }

        sheet.appendRow([idActivo, tipo, nuevoValor, fecha, detalle, email, columnaAfectada || '']);
    } catch (e) {
        Logger.log("Error registrarHistorial: " + e);
    }
}

// Tu versión de Registro de Acceso
function registrarAccesoUsuario(seccion) {
    try {
        const hoja = obtenerHoja(HOJA.HISTORIAL);
        const usuario = Session.getActiveUser().getEmail() || "Desconocido";
        const detalle = `Acceso desde APP: ${seccion}`;
        // Mantiene el formato de tu hoja de historial
        hoja.appendRow(["-", "ACCESO", "-", new Date(), detalle, usuario, "SISTEMA"]);
    } catch (err) {
        Logger.log("Error al registrar acceso: " + err);
    }
}

// Soporte para buscar filas rápidamente
function findRowByColValue(hoja, headerName, colValue) {
    const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const idx = getHeaderIndex(headers, headerName);
    if (idx === -1) return -1;

    const lastRow = hoja.getLastRow();
    if (lastRow < 2) return -1;

    const vals = hoja.getRange(2, idx + 1, lastRow - 1, 1).getValues();
    const normalizedTarget = colValue.toString().trim().toLowerCase();

    for (let i = 0; i < vals.length; i++) {
        if ((vals[i][0] || '').toString().trim().toLowerCase() === normalizedTarget) {
            return i + 2; 
        }
    }
    return -1;
}

function getHeaderIndex(headers, name) {
    // Normalizamos los nombres que buscamos
    const targets = Array.isArray(name) 
        ? name.map(normalizeHeader) 
        : [normalizeHeader(name)];
        
    for (let i = 0; i < headers.length; i++) {
        // Normalizamos cada cabecera de la hoja para comparar
        if (targets.indexOf(normalizeHeader(headers[i])) !== -1) return i;
    }
    return -1;
}

/** Retorna los encabezados limpios de una hoja. */
function getHeaders(hoja) {
    const lastCol = hoja.getLastColumn();
    if (lastCol === 0) return [];
    const vals = hoja.getRange(1, 1, 1, lastCol).getValues();
    return (vals && vals[0]) ? vals[0].map(h => (h || '').toString().trim()) : [];
}

/** Asegura que los encabezados mínimos existan en la hoja TABLEROS. */
function ensureTablerosHeaders() {
    try {
        const hoja = obtenerHoja(HOJA.TABLEROS);
        const headers = getHeaders(hoja);
        const required = Object.values(CAMPOS).filter(c => 
            c !== CAMPOS.LATITUD && c !== CAMPOS.LONGITUD
        );

        if (headers.length === 0 || headers.join('').trim() === '') {
            hoja.appendRow(required);
            return;
        }

        const missing = required.filter(h => headers.indexOf(h) === -1);
        if (missing.length > 0) {
            let lastCol = hoja.getLastColumn();
            missing.forEach(m => {
                hoja.insertColumnAfter(lastCol);
                lastCol++;
                hoja.getRange(1, lastCol).setValue(m);
            });
        }
    } catch (e) { Logger.log("Error en ensureHeaders: " + e); }
}

/** Retorna la URL base de la WebApp. */
function getWebAppBaseUrl() {
    return ScriptApp.getWebAppUrl();
}