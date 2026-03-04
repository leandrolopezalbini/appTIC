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
        Logger.log("Error registrando historial: " + e.message);
        return {
            success: false,
            message: "No se pudo registrar en historial: " + e.message,
            errorCode: 'HISTORIAL_ERROR'
        };
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
        Logger.log("Error en registrar acceso: " + err.message);
        return {
            success: false,
            message: "Error registrando acceso: " + err.message,
            errorCode: 'ACCESO_ERROR'
        };
    }
}

/**
 * DEPRECATED: Usa buscarFilas() en su lugar
 * Se mantiene solo para backward compatibility
 */
function findRowByColValue(hoja, headerName, colValue) {
  const resultado = buscarFilas(
    hoja, 
    { headerName: headerName, valor: colValue },
    { returnAll: false, exact: true }
  );
  
  return resultado ? resultado.rowNum : -1;
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

/**
 * Valida que un payload tenga todos los campos requeridos
 * @param {Object} data - Datos a validar (ej: {tipoAccion: "UPDATE", id: "NSDS-001"})
 * @param {Array} requiredFields - Campos que DEBEN estar (ej: ['tipoAccion', 'id'])
 * @return {Object} {valid: true/false, error: "mensaje si hay problema"}
 */
function validarPayload(data, requiredFields = []) {
    // Si no es un objeto válido, rechaza
    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            error: "Payload debe ser un objeto válido"
        };
    }

    // Recorre cada campo requerido y verifica que exista
    for (const field of requiredFields) {
        if (!data[field] || data[field] === '' || data[field] === null) {
            return {
                valid: false,
                error: `Campo requerido faltante: ${field}`
            };
        }
    }

    // Si llegó aquí, todo está bien
    return { valid: true };
}
/**
 * BÚSQUEDA GENÉRICA UNIFICADA
 * Reemplaza findRowByColValue, buscarDatosParaReemplazo, etc
 * 
 * @param {Sheet} hoja - Hoja donde buscar
 * @param {Object|Array} criterios - Qué buscar
 *   - Obj simple: {headerName: "ID", valor: "NSDS-001"}
 *   - Array: [{headerName: "ID", valor: "X"}, {headerName: "IP", valor: "Y"}] (busca X OR Y)
 * @param {Object} opciones - Config
 *   - returnAll: true = devuelve array de matches, false = 1 match
 *   - exact: true = búsqueda exacta, false = parcial
 * @return {Object|Array} {rowNum, data, headers} o null/[]
 */
function buscarFilas(hoja, criterios, opciones = {}) {
  if (!hoja) return opciones.returnAll ? [] : null;

  const opts = {
    returnAll: opciones.returnAll || false,
    exact: opciones.exact !== undefined ? opciones.exact : false
  };

  try {
    const data = hoja.getDataRange().getValues();
    if (data.length <= 1) return opts.returnAll ? [] : null;

    const headers = data[0];
    let resultados = [];

    // Convierte criterios a array si es objeto simple
    const critArray = Array.isArray(criterios) ? criterios : [criterios];

    // Busca en cada fila
    for (let i = 1; i < data.length; i++) {
      const fila = data[i];
      let cumpleAlgunCriterio = false;

      // Verifica cada criterio (lógica OR)
      for (let crit of critArray) {
        const headerName = crit.headerName || crit.h;
        const valorBuscado = (crit.valor || crit.v).toString().toLowerCase().trim();
        const colIdx = getHeaderIndex(headers, headerName);

        if (colIdx >= 0) {
          const valorFila = (fila[colIdx] || '').toString().toLowerCase().trim();

          // Búsqueda: exacta o parcial
          const coincide = opts.exact 
            ? valorFila === valorBuscado
            : valorFila.includes(valorBuscado);

          if (coincide) {
            cumpleAlgunCriterio = true;
            break;
          }
        }
      }

      // Si cumple, agrega a resultados
      if (cumpleAlgunCriterio) {
        resultados.push({
          rowNum: i + 1,
          data: fila,
          headers: headers
        });

        if (!opts.returnAll) return resultados[0]; // Si solo quiere 1, retorna
      }
    }

    return opts.returnAll ? resultados : null;

  } catch (e) {
    Logger.log("❌ Error en buscarFilas: " + e.message);
    return opts.returnAll ? [] : null;
  }
}

/**
 * BÚSQUEDA EN MÚLTIPLES HOJAS
 * Busca el mismo criterio en varias hojas
 */
function buscarEnMultiples(hojas, criterios, opciones = {}) {
  let resultadosCombinados = [];

  for (let nombreHoja of hojas) {
    try {
      const hoja = typeof nombreHoja === 'string' 
        ? obtenerHoja(nombreHoja)
        : nombreHoja;

      if (!hoja) continue;

      const resultados = buscarFilas(
        hoja, 
        criterios, 
        { ...opciones, returnAll: true }
      );

      // Agrega de qué hoja vino cada resultado
      for (let r of resultados) {
        r.hoja = nombreHoja;
        resultadosCombinados.push(r);
      }
    } catch (e) {
      Logger.log("⚠️  Error buscando en " + nombreHoja + ": " + e.message);
    }
  }

  return resultadosCombinados;
}