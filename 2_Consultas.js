//2_Consultas.gs
// ═══════════════════════════════════════════════════════════════════════════
// CACHE DE HOJAS - Optimización de búsquedas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Almacena en memoria las hojas principales para evitar lecturas repetidas
 * Formato: { TABLEROS: [[...], [...]], CAMARAS: [...], ... }
 */
const CACHE_SHEETS = {};

/**
 * Timestamp de cuando se última precargó el caché
 * Si pasó 5 minutos, se actualiza automáticamente
 */
let CACHE_TIMESTAMP = 0;

/**
 * Tiempo que el caché es válido (5 minutos = 300,000 ms)
 */
const CACHE_VALIDITY = 5 * 60 * 1000;

/**
 * Precarga TODAS las hojas importantes en memoria
 * SE EJECUTA AUTOMÁTICAMENTE en buscadorMaestro() si el caché expiró
 * 
 * @return {Object} { success: true, cached: 6 } ← número de hojas cacheadas
 */
function precargarCacheHojas() {
  const ahora = new Date().getTime();
  
  // Si el caché aún es válido, no recarga
  if (CACHE_TIMESTAMP && (ahora - CACHE_TIMESTAMP) < CACHE_VALIDITY) {
    Logger.log("⏱️  Caché aún válido, no recarga");
    return { success: true, cached: Object.keys(CACHE_SHEETS).length };
  }

  try {
    const categoriasACargar = ['TABLEROS', 'CAMARAS', 'ALARMAS', 'SWITCHES', 'TAREAS'];

    categoriasACargar.forEach(tipo => {
      try {
        const hoja = obtenerHoja(HOJA[tipo]);
        CACHE_SHEETS[tipo] = hoja.getDataRange().getValues();
        Logger.log("📦 Caché: " + tipo + " (" + CACHE_SHEETS[tipo].length + " filas)");
      } catch(e) {
        Logger.log(`⚠️  Error precargando ${tipo}: ${e.message}`);
      }
    });

    CACHE_TIMESTAMP = ahora;
    Logger.log("✅ Caché precargado: " + Object.keys(CACHE_SHEETS).length + " hojas");
    
    return { 
      success: true, 
      cached: Object.keys(CACHE_SHEETS).length,
      validUntil: new Date(ahora + CACHE_VALIDITY).toString()
    };

  } catch (e) {
    Logger.log("❌ Error precargando caché: " + e.message);
    CACHE_SHEETS = {};
    return { success: false, error: e.message };
  }
}

/**
 * Limpia el caché (útil si editas hojas manualmente)
 * Usa: limpiarCache() luego buscas de nuevo
 */
function limpiarCache() {
  CACHE_SHEETS = {};
  CACHE_TIMESTAMP = 0;
  Logger.log("✅ Caché limpiado, próxima búsqueda lo recargará");
}

function _getDatosTableros() {
    const hoja = obtenerHoja(HOJA.TABLEROS);
    const vals = hoja.getDataRange().getValues();
    if (!vals || vals.length < 2) return { headers: [], data: [], indices: {} };

    const headers = vals[0];
    const data = vals.slice(1);
    const indices = {};

    // Mapeo dinámico usando tus constantes de CAMPOS
    Object.keys(CAMPOS).forEach(key => {
        indices[CAMPOS[key]] = getHeaderIndex(headers, CAMPOS[key]);
    });

    return { headers, data, indices };
}

function obtenerTablerosFiltrados(filters) {
    const { headers, data: dataPrincipal, indices } = _getDatosTableros();
    let datosCombinados = [...dataPrincipal];

    // Lógica para incluir Paradas Seguras (Tu versión completa)
    try {
        const hojaSecundaria = obtenerHoja(HOJA.PARADAS_SEGURAS);
        const valsSecundarios = hojaSecundaria.getDataRange().getValues();
        if (valsSecundarios && valsSecundarios.length > 1) {
            const headersSecundarios = valsSecundarios[0];
            for (let i = 1; i < valsSecundarios.length; i++) {
                const rowSecundaria = valsSecundarios[i];
                const rowPrincipal = new Array(headers.length).fill('');
                headersSecundarios.forEach((h, j) => {
                    const targetIdx = headers.indexOf(h);
                    if (targetIdx !== -1) rowPrincipal[targetIdx] = rowSecundaria[j];
                });
                const nombreSecundario = rowSecundaria[getHeaderIndex(headersSecundarios, CAMPOS.NOMBRE)];
                if (!datosCombinados.some(r => r[indices[CAMPOS.NOMBRE]] === nombreSecundario)) {
                    datosCombinados.push(rowPrincipal);
                }
            }
        }
    } catch (e) { Logger.log('Error Paradas Seguras: ' + e.message); }

    // Aplicación de Filtros (Tu versión completa)
    const filasFiltradas = datosCombinados.filter(row => {
        if (filters.estado && (row[indices[CAMPOS.ESTADO]] || '').toString().toUpperCase() !== filters.estado.toUpperCase()) return false;
        if (filters.energia && (row[indices[CAMPOS.ENERGIA]] || '').toString().toUpperCase() !== filters.energia.toUpperCase()) return false;
        if (filters.conectividad && (row[indices[CAMPOS.CONECTIVIDAD]] || '').toString().toUpperCase() !== filters.conectividad.toUpperCase()) return false;
        
        if (filters.switchContains) {
            const s = filters.switchContains.toUpperCase();
            if (!(row[indices[CAMPOS.SWITCH]] || "").toUpperCase().includes(s)) return false;
        }

        if (filters.direccionContains) {
            const q = filters.direccionContains.toUpperCase();
            const nom = (row[indices[CAMPOS.NOMBRE]] || "").toUpperCase();
            const id = (row[indices[CAMPOS.ID]] || "").toUpperCase();
            if (!nom.includes(q) && !id.includes(q)) return false;
        }
        return true;
    });

    return filasFiltradas.map(r => ({
        id: r[indices[CAMPOS.ID]] || '',
        direccion: r[indices[CAMPOS.NOMBRE]] || '',
        estado: r[indices[CAMPOS.ESTADO]] || '',
        energia: r[indices[CAMPOS.ENERGIA]] || '',
        conectividad: r[indices[CAMPOS.CONECTIVIDAD]] || '',
        proveedor: r[indices[CAMPOS.PROVEEDOR]] || '',
        switch: r[indices[CAMPOS.SWITCH]] || ''
    }));
}

/** Retorna cámaras y switches disponibles para un técnico. */
function obtenerStockTecnico(emailUsuario) {
    try {
        const stock = { camaras: [], switches: [] };

        // 1. Cámaras disponibles
        const hojaCam = obtenerHoja(HOJA.CAMARAS);
        const dataCam = hojaCam.getDataRange().getValues();
        const headCam = dataCam[0];
        const idxIDCam = getHeaderIndex(headCam, CAMPOS.ID);
        const idxPerfilCam = getHeaderIndex(headCam, CAMPOS.PERFIL);
        const idxTableroCam = getHeaderIndex(headCam, ["Tablero", "Tablero_Asignado"]);

        dataCam.slice(1).forEach(row => {
            if (row[idxPerfilCam] === emailUsuario && !row[idxTableroCam]) {
                stock.camaras.push({
                    id: row[idxIDCam],
                    detalle: `Cámara ${row[idxIDCam]} - ${row[getHeaderIndex(headCam, "Marca")] || ''}`
                });
            }
        });

        // 2. Switches en Stock
        const hojaSw = obtenerHoja(HOJA.SWITCHES);
        const dataSw = hojaSw.getDataRange().getValues();
        const headSw = dataSw[0];
        const idxIDSw = getHeaderIndex(headSw, "ID_Switch");
        const idxEstadoSw = getHeaderIndex(headSw, ["Estado", "SITUACION"]);

        dataSw.slice(1).forEach(row => {
            if (row[idxEstadoSw] === "Stock") {
                stock.switches.push({
                    id: row[idxIDSw],
                    detalle: `Switch ${row[idxIDSw]} (${row[getHeaderIndex(headSw, "Puertos")] || '?'} puertos)`
                });
            }
        });

        return stock;
    } catch (e) {
        Logger.log("Error en obtenerStockTecnico: " + e);
        return { camaras: [], switches: [] };
    }
}

/** Obtiene toda la información de un activo para el modal de detalles con filtro de privacidad. */
function obtenerDetalleCompleto(tipo, id) {
    try {
        const nombreHoja = HOJA[tipo];
        const hoja = obtenerHoja(nombreHoja);
        const data = hoja.getDataRange().getValues();
        const headers = data[0];
        const rolActual = OBTENER_ROL_USUARIO();

        const colIDStr = (tipo === 'SWITCHES') ? 'ID_Switch' : (tipo === 'TAREAS') ? 'ID_Tarea' : CAMPOS.ID;
        const idxID = getHeaderIndex(headers, colIDStr);

        const fila = data.find(r => r[idxID] == id);
        if (!fila) throw new Error("No se encontró el registro.");

        const detalles = {};
        headers.forEach((h, i) => {
            // Lógica de privacidad para COM
            if (rolActual === "COM") {
                const hLimpio = h.toString().toUpperCase();
                if (hLimpio.includes("IP") || hLimpio.includes("PASSWORD") || hLimpio.includes("PASS")) return;
            }

            if (h !== CAMPOS.ID && h !== "Observaciones") {
                detalles[h] = fila[i];
            }
        }); // <-- Aquí cerraba el forEach

        const respuesta = { 
            detalles: detalles, 
            estado: fila[getHeaderIndex(headers, [CAMPOS.ESTADO, "Estado_Ticket", CAMPOS.ESTADO])] 
        };

        if (tipo === 'TABLEROS') {
            respuesta.vinculados = buscarVinculadosAlTablero(id);
        }

        return respuesta;
    } catch (e) { 
        Logger.log("Error detalle completo: " + e);
        return { error: e.message }; 
    }
}

function buscarVinculadosAlTablero(idTablero) {
    const vinculados = [];
    try {
        const hCam = obtenerHoja(HOJA.CAMARAS).getDataRange().getValues();
        const idxTabCam = getHeaderIndex(hCam[0], ["Tablero", "Tablero_Asignado"]);
        hCam.slice(1).forEach(r => {
            if (r[idxTabCam] == idTablero) vinculados.push({ tipo: 'CAMARA', id: r[0] });
        });
    } catch(e) { Logger.log("Error buscando vinculados: " + e); }
    return vinculados;
}

/** Motor interno para filtrar tableros según condiciones específicas. */
function _filtrarTableros(filtroFn) {
    try {
        const { data, indices } = _getDatosTableros();
        const out = [];

        data.forEach(row => {
            if (filtroFn(row, indices)) {
                out.push({
                    id: row[indices[CAMPOS.ID]] || '',
                    direccion: row[indices[CAMPOS.NOMBRE]] || '',
                    estado: row[indices[CAMPOS.ESTADO]] || '',
                    energia: row[indices[CAMPOS.ENERGIA]] || '',
                    conectividad: row[indices[CAMPOS.CONECTIVIDAD]] || '',
                    switch: row[indices[CAMPOS.SWITCH]] || ''
                });
            }
        });
        return out;
    } catch (e) {
        Logger.log('_filtrarTableros error: ' + e);
        return [];
    }
}

function buscadorMaestro(query, tipos) {
  const resultados = [];
  const q = (query || "").toString().toUpperCase().trim();
  
  // lista de pedido
  const categorias = (tipos && tipos.length > 0) 
    ? tipos 
    : ["TABLEROS", "CAMARAS", "ALARMAS", "SWITCHES", "TAREAS", "SOLICITUDES"];

  categorias.forEach(tipo => {
    try {
      const nombreHoja = HOJA[tipo.toUpperCase()] || tipo; 
      const hoja = obtenerHoja(nombreHoja);
      if (!hoja) return;

      const data = hoja.getDataRange().getValues();
      if (data.length <= 1) return; // Hoja vacía

      const headers = data[0];
      
      // Buscamos columnas de ID y Dirección/Nombre
      const idxID = getHeaderIndex(headers, ["ID", "ID_Activo", "ID_Tarea", "ID_SOLICITUD"]);
      const idxNom = getHeaderIndex(headers, ["Dirección", "Direccion", "Nombre", "Ubicación", "SOLICITANTE"]);

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
  
  Logger.log("Total resultados encontrados: " + resultados.length);
  return resultados;
}

function obtenerDashboardSeguimiento() {
  const hoja = obtenerHoja(HOJA.TABLEROS);
  const data = hoja.getDataRange().getValues();
  const headers = data[0];
  
  // Mapeamos los índices exactos según tus CAMPOS y la realidad de la hoja
  const idx = {
    id: getHeaderIndex(headers, CAMPOS.ID),
    dir: getHeaderIndex(headers, ["Direccion", "NOMBRE", "Ubicación"]),
    est: getHeaderIndex(headers, CAMPOS.ESTADO), // Columna D aprox.
    luz: 4, // COLUMNA E (Energía) - Forzamos el índice 4 si CAMPOS.ENERGIA falla
    red: getHeaderIndex(headers, CAMPOS.CONECTIVIDAD),
    tab: getHeaderIndex(headers, "Estado_Tablero")
  };

  return data.slice(1).map(row => {
    const valorEnergia = (row[idx.luz] || "").toString().toUpperCase();
    const valorEstado = (row[idx.est] || "").toString().toUpperCase();
    
    return {
      id: row[idx.id],
      direccion: row[idx.dir],
      autorizado: "OK", 
      tablero: row[idx.tab] === "INSTALADO" ? "OK" : "PENDIENTE",
      // Aquí validamos contra el texto exacto que guarda tu nuevo botón
      energia: valorEnergia === "CONECTADA" || valorEnergia === "CON_LUZ" ? "OK" : "PENDIENTE",
      red: row[idx.red] === "CONECTADA" || row[idx.red] === "CONECTADO" ? "OK" : "PENDIENTE",
      final: valorEstado === "INSTALADO" ? "OK" : "PENDIENTE"
    };
  });
}

/** Devuelve las tareas asignadas específicamente al perfil TECNICO que estén PENDIENTES.
 * Se usa en la página 'tareas' (Mis Tareas).*/
function obtenerMisTareasAsignadas() {
  try {
    const usuarioInfo = obtenerMisPermisos(); // Usamos la función de seguridad que ya tienes
    const hoja = obtenerHoja("Tareas");
    if (!hoja) return [];

    const data = hoja.getDataRange().getValues();
    const headers = data[0];
    
    // Tus índices dinámicos (están perfectos)
    const idx = {
      idT: getHeaderIndex(headers, "ID_Tarea"),
      idA: getHeaderIndex(headers, "ID_Activo"),
      mot: getHeaderIndex(headers, "Motivo"),
      est: getHeaderIndex(headers, "Estado_Ticket"),
      per: getHeaderIndex(headers, "Perfil_Asignado"),
      obs: getHeaderIndex(headers, "Observaciones"),
      dir: getHeaderIndex(headers, "Direccion"),
      fec: headers.indexOf("Fecha") // Añadimos la fecha para mostrar en la card
    };

    return data.slice(1)
      .filter(row => {
        const estado = (row[idx.est] || "").toString().toUpperCase();
        const perfil = (row[idx.per] || "").toString().toUpperCase();
        
        if (estado === "FINALIZADA" || estado === "ARCHIVADA") return false;
        if (usuarioInfo.rol === "ADMIN") return true;
        return perfil === usuarioInfo.rol;
      })
      .map(row => {
        // Extraemos el tipo (CAMARA, TABLERO, etc.) del ID o del Motivo
        const idTarea = row[idx.idT].toString();
        let tipoCalculado = "ACTIVO";
        if (idTarea.includes("CAM")) tipoCalculado = "CAMARA";
        else if (idTarea.includes("TAB")) tipoCalculado = "TABLERO";
        else if (idTarea.includes("SWI")) tipoCalculado = "SWITCH";

        return {
          id: idTarea,
          idActivo: row[idx.idA],
          tipo: tipoCalculado, // Esto define el color de la tarjeta
          motivo: row[idx.mot],
          direccion: row[idx.dir] || "Sin dirección",
          observaciones: row[idx.obs],
          estado: row[idx.est],
          fecha: row[idx.fec] ? Utilities.formatDate(new Date(row[idx.fec]), "GMT-3", "dd/MM") : ""
        };
      });
  } catch (e) {
    Logger.log("Error en obtenerMisTareasAsignadas: " + e.toString());
    return [];
  }
}
