//5_Operaciones.gs

/**
 * ENRUTADOR PRINCIPAL: Recibe todas las peticiones del Frontend.
 * Maneja tanto actualizaciones de activos existentes como nuevas solicitudes.
 */

function procesarSolicitudUnificada(data) {
  try {
    const usuario = usuarioActivo(); // Tu función de validación de sesión
    const rol = OBTENER_ROL_USUARIO(usuario);

    // --- BLOQUE 1: ACCIONES SOBRE ACTIVOS O TAREAS EXISTENTES ---
    if ((data.id || data.idTarea) && data.tipoAccion) {
      let resultado;

      switch (data.tipoAccion) {
        case 'FINALIZAR_INSTALACION':
          // Llamamos a la función atómica que asegura que no se pierdan datos
          resultado = ejecutarTransaccionInstalacion(data, usuario);
          break;

        case 'ACTUALIZAR_ENERGIA':
          resultado = registrarEnergiaYPedidoMaterial(data);
          break;

        case 'REPORTE_COM':
          resultado = gestionarTarea(data.id, data.tipoFalla, data.observaciones, data.direccion, usuario);
          break;

        case 'MANTENIMIENTO_SITIO':
          resultado = registrarMantenimiento(data, usuario);
          break;
          
        case 'ACTUALIZAR_HITO_INFRAESTRUCTURA':
          // Nueva acción para el flujo del Secretario/Instalador
          resultado = cambiarHitoInfraestructura(data.idTarea, data.nuevoHito, usuario, rol);
          break;

        default:
          throw new Error("Acción '" + data.tipoAccion + "' no reconocida.");
      }
      
      aplicarFormatoInsumos();
      return resultado; 
    }

    // --- BLOQUE 2: SOLICITUDES DE ALTA (NUEVOS DISPOSITIVOS) ---
    // A. Si es ADMIN o SECRETARIO, se crea el activo directamente
    if (rol === "ADMIN" || rol === "SECRETARIO") {
      const resultadoAlta = ejecutarAltaDirecta(data, usuario);
      return { success: true, message: "Activo creado directamente. ID: " + resultadoAlta.id };
    }

    // B. Para otros roles (COM), se crea una SOLICITUD pendiente
    const fecha = new Date();
    const idSolicitud = "SOL-" + (data.tipoActivo || "ACT").substring(0, 3).toUpperCase() + "-" + Utilities.formatDate(fecha, "GMT-3", "yyMMdd-HHmm");
    
    obtenerHoja("Solicitudes").appendRow([
      idSolicitud, 
      fecha, 
      data.tipoActivo, 
      data.nombre, 
      usuario, 
      "SOLICITADA", 
      data.latitud || "", 
      data.longitud || "", 
      data.observaciones || ""
    ]);

    return { success: true, message: "Solicitud enviada correctamente. ID: " + idSolicitud };

  } catch (e) {
    Logger.log("Error en procesarSolicitudUnificada: " + e.toString());
    return { success: false, message: "Error en el servidor: " + e.message };
  }
}

function cambiarHitoInfraestructura(idTarea, hito, usuario, rol) {
  // Validamos que solo roles autorizados operen infraestructura
  const rolesAutorizados = ["ADMIN", "SECRETARIO", "INSTALADOR", "TECNICO"];
  if (!rolesAutorizados.includes(rol)) {
    throw new Error("No tienes permisos para actualizar hitos de infraestructura.");
  }

  const hoja = obtenerHoja("Tareas");
  const fila = findRowByColValue(hoja, "ID_Tarea", idTarea);
  
  if (fila === -1) throw new Error("No se encontró la tarea de infraestructura.");

  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const colEstado = getHeaderIndex(headers, "Estado_Ticket") + 1;
  const colObs = getHeaderIndex(headers, "Observaciones") + 1;

  // Actualizamos el estado
  hoja.getRange(fila, colEstado).setValue(hito);
  
  // Registro de auditoría en la misma fila
  const logInformativo = "\n[" + Utilities.formatDate(new Date(), "GMT-3", "dd/MM HH:mm") + " - " + rol + "]: " + hito;
  const obsActual = hoja.getRange(fila, colObs).getValue();
  hoja.getRange(fila, colObs).setValue(obsActual + logInformativo);

  registrarHistorial("INFRAESTRUCTURA", idTarea, hito, "Actualizado por " + usuario, usuario, "TAREAS");

  return { success: true, message: "Hito de infraestructura actualizado a: " + hito };
}

/**
 * ESTA ES LA FUNCIÓN ATÓMICA (La que garantiza que no se pierdan datos)
 */
function ejecutarTransaccionInstalacion(d, usuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaTareas = obtenerHoja("Tareas");
  const hojaMaestra = obtenerHoja(d.tipoActivo); // Ej: "CAMARAS"

  if (!hojaMaestra) throw new Error("No existe la hoja maestra: " + d.tipoActivo);

  // 1. Buscamos la fila en Tareas
  const filaTarea = findRowByColValue(hojaTareas, "ID_Tarea", d.idTarea);
  if (filaTarea === -1) throw new Error("Tarea no encontrada");

  // --- PASO A: ESCRIBIR EN MAESTRA (SI FALLA AQUÍ, NO PASA AL SIGUIENTE) ---
  // El orden de las columnas debe coincidir con tu hoja Maestra
  const nuevaFilaMaestra = [
    d.idDefinitivo, 
    d.direccion, 
    d.ip, 
    "OPERATIVO", 
    d.latitud, 
    d.longitud, 
    usuario, 
    new Date()
  ];
  hojaMaestra.appendRow(nuevaFilaMaestra);

  // --- PASO B: CERRAR TAREA (SOLO SI EL PASO A FUE EXITOSO) ---
  const headers = hojaTareas.getRange(1, 1, 1, hojaTareas.getLastColumn()).getValues()[0];
  const colEstado = getHeaderIndex(headers, "Estado_Ticket") + 1;
  
  hojaTareas.getRange(filaTarea, colEstado).setValue("FINALIZADA");

  // 2. Registrar en historial para auditoría
  registrarHistorial('INSTALACION', d.idDefinitivo, 'ALTA_MAESTRA', d.observaciones, usuario, d.tipoActivo);

  return { success: true, message: "Activo " + d.idDefinitivo + " registrado y tarea cerrada." };
}

function obtenerDetalleActivo(id, tipo) {
  try {
    const nombreHoja = HOJA[tipo.toUpperCase()] || tipo;
    const hoja = obtenerHoja(nombreHoja);
    const data = hoja.getDataRange().getValues();
    const headers = data[0];

    // Usamos tu utilidad para buscar la fila correctamente
    const filaIndex = findRowByColValue(hoja, ["ID", "ID_ACTIVO", "ID_TAREA", "ID_SOLICITUD"], id);
    
    if (filaIndex === -1) throw new Error("No se encontró el registro: " + id);

    // Recordar: findRowByColValue devuelve posición de hoja (1-based)
    // Para el array 'data', restamos 1.
    const filaArr = data[filaIndex - 1];

    const detalles = {};
    headers.forEach((h, index) => {
      if (h) detalles[h] = filaArr[index];
    });

    return { 
      success: true, 
      data: { 
        detalles: detalles,
        estado: detalles["Estado"] || detalles["Estado_Ticket"] || "N/A"
      } 
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
/** * Se ejecuta automáticamente al editar la hoja */
function onEdit(e) {
  const hoja = e.source.getActiveSheet();
  const celda = e.range;
  
  // Si se edita la Columna F (Estado) en la hoja Solicitudes
  if (hoja.getName() === "Solicitudes" && celda.getColumn() === 6 && celda.getRow() > 1) {
    const nuevoEstado = celda.getValue();
    
    // Si el estado ya no es el inicial, refrescamos el formato
    if (["COMPRADO", "INSTALADO", "RECHAZADA", "FINALIZADO"].includes(nuevoEstado)) {
      // Opcional: Podrías borrar el texto de insumos aquí si quisieras
      // hoja.getRange(celda.getRow(), 12).setValue(""); 
      aplicarFormatoInsumos(); 
    }
  }
}

/** Resalta filas en la hoja Solicitudes Verde:poda - Naranja:desenfoque - Amarillo: Pedido materiales*/

function aplicarFormatoInsumos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Solicitudes");
  const ultimaFila = hoja.getLastRow();
  
  if (ultimaFila < 2) return; // Si no hay datos, salir

  // Obtenemos el rango desde la fila 2 hasta el final (Col A hasta N)
  const rango = hoja.getRange(2, 1, ultimaFila - 1, 14);
  const valores = rango.getValues();
  
  for (let i = 0; i < valores.length; i++) {
    const filaActual = i + 2;
    const estadoGeneral = valores[i][5];    // Col F: Estado
    const obsFalla = valores[i][9];         // Col J: Tipo de Falla (en reportes)
    const celdaInsumos = valores[i][11];    // Col L: Insumos (en energía)
    
    let colorFondo = null; // Por defecto sin color

    // REGLA 1: Pedido de Insumos (Amarillo Claro)
    if (celdaInsumos && celdaInsumos.toString().trim() !== "") {
      colorFondo = "#fff9c4"; 
    }

    // REGLA 2: Reporte de PODA (Verde Claro)
    if (obsFalla === "PODA") {
      colorFondo = "#c8e6c9"; 
    }

    // REGLA 3: Reporte de DESENFOQUE (Naranja Claro)
    if (obsFalla === "DESENFOQUE") {
      colorFondo = "#ffe0b2"; 
    }

    // REGLA 4: Si la tarea ya está FINALIZADA o INSTALADA, quitamos el color
    if (["FINALIZADO", "INSTALADO", "COMPRADO"].includes(estadoGeneral)) {
      colorFondo = null;
    }

    // Aplicamos el color a toda la fila (de la A a la N)
    hoja.getRange(filaActual, 1, 1, 14).setBackground(colorFondo);
  }
}

/** Esta función hace todo: marca CONECTADA en la Columna E del tablero y crea la tarea para el técnico */
/** Esta función marca energía en el activo y crea el ticket para el laboratorio */
function registrarEnergiaYPedidoMaterial(datos) {
  try {
    const usuario = usuarioActivo();
    const idActivo = datos.id;
    
    // 1. Intentamos actualizar la hoja de origen (Tableros o Cámaras)
    // Esto es opcional si solo quieres el ticket, pero útil para el inventario
    try {
      const nombreHoja = HOJA.TABLEROS; // O detectar según el ID
      const hojaActivo = obtenerHoja(nombreHoja);
      const fila = findRowByColValue(hojaActivo, "ID", idActivo);
      if (fila !== -1) {
        hojaActivo.getRange(fila, 5).setValue(datos.estado); // Col E: Energia
      }
    } catch(e) { Logger.log("No se actualizó hoja de inventario, solo se creará ticket."); }

    // 2. Crear Pedido para Laboratorio en hoja TAREAS
    const ins = datos.insumos || {};
    const detalle = `REQ. EQUIPAMIENTO: Cam: ${ins.camaras || 0} | Sw: ${ins.switches || 0} | UPS: ${ins.fuentes || 0} | Cajas: ${ins.cajas || 0}. Obs: ${datos.observaciones}`;

    const hojaTareas = obtenerHoja("Tareas");
    const idTicket = "REQ-" + idActivo;

    // Mapeo A-I: ID_Tarea, ID_Activo, Motivo, Solicitante, Fecha, Estado, Perfil, Obs, Direccion
    hojaTareas.appendRow([
      idTicket,            // A
      idActivo,            // B
      "ENTREGA MATERIAL",  // C
      usuario,             // D
      new Date(),          // E
      "PENDIENTE",         // F
      "TECNICO",           // G
      detalle,             // H
      datos.direccion || ""// I
    ]);

    return { success: true, message: "Pedido enviado a Laboratorio." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function registrarConectividadTablero(datos) {
  try {
    const usuario = usuarioActivo();
    if (!usuarioTienePermiso('CONECTIVIDAD')) return { success: false, message: "Sin permiso de Conectividad" };

    const hoja = obtenerHoja(HOJA.TABLEROS);
    const headers = getHeaders(hoja);
    const fila = findRowByColValue(hoja, CAMPOS.ID, datos.id);

    if (fila === -1) throw new Error("ID de activo no encontrado en Tableros");

    // Determinamos el nombre real del proveedor
    const proveedorFinal = datos.proveedor === "OTRO" ? datos.detalleProveedor : datos.proveedor;

    // Guardamos los 3 datos clave en la hoja de Tableros
    hoja.getRange(fila, getHeaderIndex(headers, "Proveedor_Internet") + 1).setValue(proveedorFinal);
    hoja.getRange(fila, getHeaderIndex(headers, "Tipo_Enlace") + 1).setValue(datos.tipo);
    hoja.getRange(fila, getHeaderIndex(headers, "Estado_Conectividad") + 1).setValue("CONECTADO");

    // Registrar en historial con el detalle
    const detalleHistorial = `Proveedor: ${proveedorFinal} | Tipo: ${datos.tipo} | Obs: ${datos.observaciones || ''}`;
    registrarHistorial('Conectividad', datos.id, 'CONECTADO', detalleHistorial, usuario, 'RED');

    // Notificar a Técnico/Secretario/COM según tu nueva lógica
    notificarEvento('NUEVA_FALLA_TECNICA', {
      id: datos.id,
      msg: `Conectividad establecida (${proveedorFinal}). Listo para configuración final de cámaras.`,
      usuario: usuario
    });

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** Registra el proceso de Instalación Física */
function registrarInstalacionTablero(datos) {
  try {
    const usuario = usuarioActivo();
    if (!usuarioTienePermiso('INSTALACION')) return { success: false, message: `Sin permiso` };

    const hoja = obtenerHoja(HOJA.TABLEROS);
    const headers = getHeaders(hoja);
    const filaIndex = findRowByColValue(hoja, CAMPOS.ID, datos.id);
    if (filaIndex === -1) return { success: false, message: 'Activo no encontrado' };

    // 1. Actualizamos Estado General (Col D) y Estado Tablero para el Dashboard
    hoja.getRange(filaIndex, getHeaderIndex(headers, CAMPOS.ESTADO) + 1).setValue("INSTALADO");

    // Intentamos marcar "Estado_Tablero" como INSTALADO si la columna existe
    const idxTab = getHeaderIndex(headers, "Estado_Tablero");
    if (idxTab !== -1) hoja.getRange(filaIndex, idxTab + 1).setValue("INSTALADO");

    // 2. Anexar Observaciones y GPS
    const idxObs = getHeaderIndex(headers, CAMPOS.OBSERVACIONES);
    const obsPrevia = (hoja.getRange(filaIndex, idxObs + 1).getValue() || '');
    const nuevaObs = `[${new Date().toLocaleDateString()}] INSTALACION FINAL por ${usuario}. GPS: ${datos.latitud},${datos.longitud}.`;
    hoja.getRange(filaIndex, idxObs + 1).setValue(obsPrevia ? obsPrevia + "\n" + nuevaObs : nuevaObs);

    // 3. Sincronizar MAPS
    const hojaMaps = obtenerHoja(HOJA.MAPS);
    const filaMaps = findRowByColValue(hojaMaps, "ID", datos.id); // Buscamos por la columna A

    if (filaMaps !== -1) {
      // C es columna 3, D es columna 4
      hojaMaps.getRange(filaMaps, 3).setValue(datos.latitud);
      hojaMaps.getRange(filaMaps, 4).setValue(datos.longitud);
    } else {
      // Si no existía en Maps, lo agregamos nuevo
      hojaMaps.appendRow([datos.id, datos.direccion || "Sin Nombre", datos.latitud, datos.longitud]);
    }

    registrarHistorial('INSTALACION', datos.id, "FINALIZADO", "Dispositivo operativo en campo", usuario, "EQUIPAMIENTO");
    notificarEvento('ALTA_DEFINITIVA', { id: datos.id, msg: "Activo 100% Operativo", usuario: usuario });

    enviarMailCambioEstado(datos.id, "INSTALADO", "Instalación física completada por técnico.", usuario);
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function buscarDatosParaReemplazo(tipoActivo, idBuscado, ipBuscada) {
  const hoja = obtenerHoja(tipoActivo);
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];
  
  // Índices (Asumiendo A: ID, E o F: IP según tu estructura de columnas)
  // Si no tienes una columna fija para IP, supongamos que es la columna J (índice 9) 
  // o busca el índice por el nombre del encabezado "IP"
  const colIpIndex = headers.indexOf("IP"); 

  let resultado = { existeId: false, existeIp: false, datosId: null, datosIp: null };

  for (let i = 1; i < datos.length; i++) {
    // Verificar ID (Solo activos que no sean "BAJA")
    if (datos[i][0] === idBuscado && datos[i][3] !== "BAJA") {
      resultado.existeId = true;
      resultado.datosId = { direccion: datos[i][1], estado: datos[i][3] };
    }
    // Verificar IP (Solo activos que no sean "BAJA")
    if (colIpIndex !== -1 && datos[i][colIpIndex] === ipBuscada && datos[i][3] !== "BAJA") {
      resultado.existeIp = true;
      resultado.datosIp = { id: datos[i][0], direccion: datos[i][1] };
    }
  }
  return resultado;
}

/** * Realiza el intercambio físico de hardware (Cámaras, Switches, Alarmas) */
function ejecutarReemplazoFisico(data) {
  try {
    const { idUbicacion, idNuevoHardware } = data; // idUbicacion ej: "CAM-A-100" o "ALM-B-05"
    
    // Determinamos la hoja de destino según el ID
    let hojaNombre = "";
    if (idUbicacion.startsWith("CAM")) hojaNombre = "Camaras";
    else if (idUbicacion.startsWith("SWI")) hojaNombre = "Switches";
    else if (idUbicacion.startsWith("ALM")) hojaNombre = "Alarmas";
    else throw new Error("Tipo de activo no reconocido.");

    const hojaActivos = obtenerHoja(hojaNombre);
    const dataActivos = hojaActivos.getDataRange().getValues();
    
    let filaUbicacion = -1;
    let datosOriginales = {};

    // 1. Buscar el equipo roto/anterior
    for (let i = 1; i < dataActivos.length; i++) {
      if (dataActivos[i][0] == idUbicacion) {
        filaUbicacion = i + 1;
        datosOriginales = {
          direccion: dataActivos[i][1],
          ip: dataActivos[i][2], 
          segmento: dataActivos[i][3]
        };
        break;
      }
    }

    if (filaUbicacion === -1) throw new Error("No se encontró el ID de ubicación en la base.");

    // 2. Renombrar el equipo roto a BAJA
    const fecha = new Date();
    const idBaja = idUbicacion + "-BAJA-" + Utilities.formatDate(fecha, "GMT-3", "yyMMdd");
    hojaActivos.getRange(filaUbicacion, 1).setValue(idBaja); 
    hojaActivos.getRange(filaUbicacion, 6).setValue("REEMPLAZADO POR: " + idNuevoHardware); 

    // 3. Dar de alta el equipo nuevo con el ID de la ubicación (hereda dirección e IP)
    hojaActivos.appendRow([
      idUbicacion, 
      datosOriginales.direccion, 
      datosOriginales.ip, 
      datosOriginales.segmento,
      "ACTIVO",
      "Reemplazo físico con hardware: " + idNuevoHardware
    ]);

    // 4. Actualizar la hoja de STOCK
    actualizarEstadoStock(idNuevoHardware, idUbicacion);

    return { success: true, message: `Reemplazo exitoso de ${idUbicacion}` };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/** Inicia el proceso de alta y genera el ticket de trabajo. */
function ejecutarAltaDirecta(data, usuario) {
  try {
    const fecha = new Date();
    // Generamos el ID basado en el tipo (CAM, TAB, ALM)
    const prefijo = (data.tipoActivo || "ACT").substring(0,3).toUpperCase();
    const idTemporal = "SOL-" + prefijo + "-" + Utilities.formatDate(fecha, "GMT-3", "yyMMdd-HHmm");

    // Abrimos el ticket para que el técnico lo vea en su lista
    gestionarTarea(
      idTemporal, 
      "INSTALACION INICIAL", 
      data.observaciones || "Alta directa por " + usuario, 
      data.nombre || data.direccion
    );

    registrarHistorial('ALTA_INICIADA', idTemporal, 'PENDIENTE', `Inicio de proceso por ${usuario}`, usuario, 'SISTEMA');

    return { 
      success: true, 
      id: idTemporal, 
      message: "Proceso iniciado. Ticket generado: " + idTemporal 
    };
  } catch (e) {
    return { success: false, message: "Error en Alta Directa: " + e.message };
  }
}

/** * Decodifica si una entrada de formulario es una solicitud de aprobación 
 * o un alta directa (Admin/Secretario) y deriva a la función correcta. */
function procesarEntradaActivo(data) {
  try {
    const usuario = usuarioActivo();
    const rol = OBTENER_ROL_USUARIO(usuario);

    // Si es ADMIN o SECRETARIO, va directo a la hoja Tareas para que el técnico lo instale
    if (rol === "ADMIN" || rol === "SECRETARIO") {
      return ejecutarAltaDirecta(data, usuario);
    }

    // Si es un usuario común (COM/TECNICO), se crea una SOLICITUD de aprobación
    const fecha = new Date();
    const idSolicitud = "SOL-" + (data.tipoActivo || "ACT").substring(0, 3).toUpperCase() + "-" + Utilities.formatDate(fecha, "GMT-3", "yyMMdd-HHmm");
    
    obtenerHoja("Solicitudes").appendRow([
      idSolicitud, 
      fecha, 
      data.tipoActivo, 
      data.nombre, // Dirección/Nombre
      usuario, 
      "SOLICITADA", 
      data.latitud, 
      data.longitud, 
      data.observaciones
    ]);

    return { success: true, message: "Solicitud enviada para aprobación. ID: " + idSolicitud };

  } catch (e) {
    return { success: false, message: "Error al procesar entrada: " + e.toString() };
  }
}

/** * Marca un equipo del stock como INSTALADO y le pone fecha de egreso */
function actualizarEstadoStock(idHardware, nuevaUbicacion) {
  const hojaStock = obtenerHoja("Stock");
  const dataStock = hojaStock.getDataRange().getValues();
  
  for (let i = 1; i < dataStock.length; i++) {
    if (dataStock[i][0] == idHardware) {
      const fila = i + 1;
      hojaStock.getRange(fila, 3).setValue("INSTALADO"); // Col C: Estado
      hojaStock.getRange(fila, 4).setValue(nuevaUbicacion); // Col D: Donde quedó
      hojaStock.getRange(fila, 8).setValue(new Date()); // Col H: Fecha Egreso
      break;
    }
  }
}

/** Finaliza la tarea del instalador, valida datos y crea/actualiza el activo en la hoja maestra. */
function finalizarInstalacionYCrearActivo(datosFinales) {
  try {
    const usuario = usuarioActivo();
    
    // 1. Extraemos datos (mapeando 'direccion' del form a 'nombre' de la hoja)
    const { idDefinitivo, tipoActivo, ip, direccion, latitud, longitud, idTarea } = datosFinales;
    const nombreHojaDestino = HOJA[tipoActivo.toUpperCase()] || tipoActivo;
    const hojaDestino = obtenerHoja(nombreHojaDestino);
    
    // 2. VALIDACIÓN DE IP (Evitar duplicados en equipos activos)
    const datosHoja = hojaDestino.getDataRange().getValues();
    const headers = datosHoja[0];
    const colIpIdx = headers.indexOf("IP");
    const colEstadoIdx = headers.indexOf(CAMPOS.ESTADO); // Generalmente Col D (índice 3)

    if (colIpIdx !== -1 && ip) {
      const duplicadoIp = datosHoja.find(fila => 
        fila[colIpIdx] === ip && 
        fila[0] !== idDefinitivo && 
        fila[colEstadoIdx] !== "BAJA"
      );
      if (duplicadoIp) {
        throw new Error(`Conflicto de Red: La IP ${ip} ya está asignada al dispositivo ${duplicadoIp[0]} en ${duplicadoIp[1]}.`);
      }
    }

    // 3. LÓGICA DE REEMPLAZO O BAJA PREVIA
    // Si el ID ya existe, lo "bajamos" para que el nuevo registro sea el vigente
    const filaExistenteIndex = findRowByColValue(hojaDestino, CAMPOS.ID, idDefinitivo);
    if (filaExistenteIndex !== -1) {
      const idBaja = idDefinitivo + "-BAJA-" + Utilities.formatDate(new Date(), "GMT-3", "yyMMdd");
      hojaDestino.getRange(filaExistenteIndex, 1).setValue(idBaja);
      hojaDestino.getRange(filaExistenteIndex, colEstadoIdx + 1).setValue("BAJA");
      registrarHistorial('REEMPLAZO', idDefinitivo, 'BAJA', `Reemplazo físico. Anterior movido a ${idBaja}`, usuario, 'SISTEMA');
    }

    // 4. REGISTRO DEL NUEVO ACTIVO (Siguiendo tu orden de CAMPOS en 0_Config)
    // A:ID, B:Nombre, C:Marcado, D:Estado, E:Energia, F:Conectividad, G:Proveedor, H:Tipo, I:Obs, J:Switch, K:Workflow, L:Perfil, M:IP
    const nuevaFila = [
      idDefinitivo,           // Col A: ID
      direccion,              // Col B: Nombre (La dirección final validada)
      "SI",                   // Col C: Marcado
      "OPERATIVO",            // Col D: Estado
      "OK",                   // Col E: Energia
      "CONECTADA",            // Col F: Conectividad
      datosFinales.proveedor || "PROPIO", // Col G: Proveedor
      tipoActivo,             // Col H: Tipo
      datosFinales.observaciones || "",   // Col I: Observaciones
      datosFinales.idSwitch || "",        // Col J: Switch
      "FINALIZADO",           // Col K: Workflow
      "MANTENIMIENTO",        // Col L: Perfil
      ip                      // Col M: IP
    ];
    hojaDestino.appendRow(nuevaFila);

    // 5. ACTUALIZAR MAPS (Sincronización de ubicación)
    const hojaMaps = obtenerHoja(HOJA.MAPS);
    const filaMaps = findRowByColValue(hojaMaps, "ID", idDefinitivo);
    if (filaMaps !== -1) {
      // Actualiza Nombre (Col B), Lat (Col C), Lng (Col D)
      hojaMaps.getRange(filaMaps, 2, 1, 3).setValues([[direccion, latitud, longitud]]);
    } else {
      hojaMaps.appendRow([idDefinitivo, direccion, latitud, longitud]);
    }

    // 6. CERRAR TICKET EN TAREAS
    const hojaTareas = obtenerHoja(HOJA.TAREAS);
    const headersTareas = hojaTareas.getDataRange().getValues()[0];
    const colIdTareaIdx = headersTareas.indexOf("ID_Tarea");
    const filaTicket = findRowByColValue(hojaTareas, "ID_Tarea", idTarea);
    
    if (filaTicket !== -1) {
      const colEstadoTareaIdx = headersTareas.indexOf("Estado");
      if (colEstadoTareaIdx !== -1) {
        hojaTareas.getRange(filaTicket, colEstadoTareaIdx + 1).setValue("FINALIZADA");
      }
    }

    // 7. NOTIFICACIÓN FINAL
    if (typeof notificarEvento === 'function') {
      notificarEvento('INSTALACION_FINALIZADA', { 
        id: idDefinitivo, 
        msg: `Activo ${idDefinitivo} instalado en ${direccion} por ${usuario}` 
      });
    }

    return { 
      success: true, 
      message: (filaExistenteIndex !== -1) ? 
        `Reemplazo exitoso. ID ${idDefinitivo} actualizado.` : 
        `Nuevo activo ${idDefinitivo} registrado y ticket cerrado.` 
    };
    
  } catch (e) {
    Logger.log("Error en finalizarInstalacion: " + e.message);
    return { success: false, message: e.message };
  }
}

function cargarTareasTecnico() {
    google.script.run
        .withSuccessHandler(tareas => {
            const lista = document.getElementById('lista-tareas-tecnico');
            if (!tareas || tareas.length === 0) {
                lista.innerHTML = "<li class='collection-item'>No tienes tareas asignadas.</li>";
                return;
            }
            lista.innerHTML = tareas.map(t => `
                <li class="collection-item">
                    <div><b>${t.id}</b> - ${t.direccion}
                        <a href="#!" class="secondary-content" onclick="prepararFinalizacion('${t.id}', '${t.tipo}', '${t.direccion}')">
                            <i class="material-icons">send</i>
                        </a>
                    </div>
                </li>
            `).join('');
        })
        .obtenerMisTareasAsignadas();
}

function gestionarVisibilidadMenu(user) {
    // Ocultar todo por defecto
    const btnAlta = document.getElementById('btn-seccion-alta');
    const btnSoli = document.getElementById('btn-ver-solicitudes');

    if (user.rol === 'ADMIN' || user.rol === 'SECRETARIO') {
        if(btnAlta) btnAlta.style.display = 'block';
        if(btnSoli) btnSoli.style.display = 'block';
    } else {
        if(btnAlta) btnAlta.style.display = 'none';
        if(btnSoli) btnSoli.style.display = 'none';
    }
}

/** Vincula Switch y Conectividad  */
function vincularSwitchTablero(data) {
  try {
    const usuario = usuarioActivo();
    if (!usuarioTienePermiso('SWITCH')) throw new Error("Sin permisos para Switch");

    const hoja = obtenerHoja(HOJA.TABLEROS);
    const headers = getHeaders(hoja);
    const filaIndex = findRowByColValue(hoja, CAMPOS.ID, data.id);

    hoja.getRange(filaIndex, getHeaderIndex(headers, CAMPOS.SWITCH) + 1).setValue(data.switch);
    registrarHistorial('Switch', data.id, 'SWITCH_AGREGADO', `Switch: ${data.switch}`, usuario, CAMPOS.SWITCH);

    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

/** Vincula físicamente una cámara o switch a un tablero. */
function instalarDispositivoEnTablero(datos) {
  try {
    const { tipoDispositivo, idDispositivo, idTablero, observaciones } = datos;
    const usuario = usuarioActivo();
    const fecha = new Date();

    // 1. Determinar en qué hoja trabajar
    let nombreHoja = (tipoDispositivo === 'CAMARA') ? HOJA.CAMARAS : HOJA.SWITCHES;
    let columnaID = (tipoDispositivo === 'CAMARA') ? CAMPOS.ID : 'ID_Switch';

    const hojaDispositivo = obtenerHoja(nombreHoja);
    const filaIndex = findRowByColValue(hojaDispositivo, columnaID, idDispositivo);

    if (filaIndex === -1) throw new Error("Dispositivo no encontrado en la base de datos.");

    // 2. Obtener encabezados para saber dónde escribir
    const headers = getHeaders(hojaDispositivo);

    // 3. Actualizar la hoja del Dispositivo (Cámara o Switch)
    // Buscamos la columna donde se guarda el Tablero asignado
    const idxTableroRel = getHeaderIndex(headers, ["Tablero", "Tablero_Asignado"]);
    const idxEstado = getHeaderIndex(headers, ["Estado", "Estado_Workflow"]);
    const idxObs = getHeaderIndex(headers, CAMPOS.OBSERVACIONES);

    if (idxTableroRel !== -1) {
      hojaDispositivo.getRange(filaIndex, idxTableroRel + 1).setValue(idTablero);
    }

    if (idxEstado !== -1) {
      hojaDispositivo.getRange(filaIndex, idxEstado + 1).setValue("INSTALADO");
    }

    if (idxObs !== -1) {
      let obsPrevia = hojaDispositivo.getRange(filaIndex, idxObs + 1).getValue();
      let nuevaObs = `[${fecha.toLocaleDateString()}] Instalado en ${idTablero} por ${usuario}. ${observaciones || ''}`;
      hojaDispositivo.getRange(filaIndex, idxObs + 1).setValue(obsPrevia ? obsPrevia + "\n" + nuevaObs : nuevaObs);
    }

    // 4. Registrar en Historial General
    registrarHistorial(
      `INSTALACION_${tipoDispositivo}`,
      idTablero,
      "ACTUALIZADO",
      `Se vinculó ${tipoDispositivo} ID: ${idDispositivo}. Obs: ${observaciones}`,
      usuario,
      tipoDispositivo
    );

    return { success: true, message: `${tipoDispositivo} vinculada con éxito al tablero ${idTablero}` };

  } catch (e) {
    Logger.log("Error en instalarDispositivoEnTablero: " + e);
    return { success: false, message: e.message };
  }
}

/** Permite al técnico cambiar el estado de una tarea y notificar
 * Resuelve tareas y gestiona la entrega de materiales de laboratorio. 
 * Solo cambia un estado de PENDIENTE a FINALIZADA*/
function resolverTarea(idTarea, nuevoEstado) {
  try {
    const usuario = usuarioActivo();
    const hoja = obtenerHoja("Tareas");
    const fila = findRowByColValue(hoja, "ID_Tarea", idTarea);

    if (fila === -1) throw new Error("Tarea no encontrada");

    const headers = getHeaders(hoja);
    const colEstado = getHeaderIndex(headers, "Estado_Ticket") + 1;
    const colPerfil = getHeaderIndex(headers, "Perfil_Asignado") + 1;
    const colIdActivo = getHeaderIndex(headers, "ID_Activo");

    // Obtenemos el ID del activo relacionado para el historial
    const datosFila = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getValues()[0];
    const idActivoRelacionado = datosFila[colIdActivo];

    if (nuevoEstado === "RESUELTA") {
      hoja.getRange(fila, colEstado).setValue("FINALIZADA");

      // LÓGICA DE LOGÍSTICA: Si la tarea era un pedido de materiales (REQ-)
      if (idTarea.toString().startsWith("REQ-")) {
        registrarHistorial('LOGISTICA', idActivoRelacionado, 'EQUIPO_ENTREGADO',
          `Materiales configurados y entregados por técnico ${usuario}`,
          usuario, 'TECNICO');

        // Notificamos al Instalador que ya puede retirar el equipo
        notificarEvento('INSTALACION_COMPLETA', {
          id: idActivoRelacionado,
          msg: "Materiales listos en Laboratorio. Puede proceder a la instalación final.",
          usuario: usuario
        });
      } else {
        // Registro normal para fallas técnicas
        registrarHistorial('TAREA', idTarea, 'FINALIZADA', `Resuelta por técnico ${usuario}`, usuario, 'TAREAS');
        notificarEvento('INSTALACION_COMPLETA', { id: idTarea, msg: "Falla técnica solucionada", usuario: usuario });
      }

    } else if (nuevoEstado === "DERIVADA") {
      hoja.getRange(fila, colPerfil).setValue("INSTALADOR");
      hoja.getRange(fila, colEstado).setValue("PENDIENTE_INSTALADOR");

      notificarEvento('AUTORIZACION_SECRETARIO', {
        id: idActivoRelacionado || idTarea,
        msg: "Tarea derivada para intervención física en campo",
        usuario: usuario
      });
    }

    return { success: true, message: "Tarea actualizada correctamente" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function registrarMantenimiento(data, usuario) {
  try {
    // Registramos en el historial la intervención
    registrarHistorial(
      'MANTENIMIENTO', 
      data.id, 
      'SITIO', 
      `Tareas: ${data.tareasRealizadas}. Obs: ${data.observaciones}`, 
      usuario, 
      'TECNICO'
    );
    
    return { success: true, message: "Mantenimiento registrado en historial." };
  } catch (e) {
    throw new Error("Error al registrar mantenimiento: " + e.message);
  }
}
/** Genera el siguiente ID correlativo basado en el prefijo configurado.
 * Busca en la hoja Tableros el último ID que empiece con el prefijo. */
function generarProximoID(tipo) { // 'tipo' es el parámetro que recibe
  try {
    const hoja = obtenerHoja(HOJA.TABLEROS);
    const data = hoja.getDataRange().getValues();
    const prefijo = PREFIJO_ID; // Ej: "NSDS-"
    let maxId = 99;

    if (data.length > 1) {
      data.slice(1).forEach(row => {
        let idStr = row[0].toString();
        if (idStr.indexOf(prefijo) !== -1) {
          // Extraemos el número después del guion
          let partes = idStr.split('-');
          let num = parseInt(partes[1]);
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      });
    }
    return prefijo + (maxId + 1);
  } catch (e) {
    return (tipo || "ACT") + "-" + Math.floor(Date.now() / 1000);
  }
}

/** Edición genérica de cualquier activo (Cámaras, Tableros, etc.) */
function editarDatosMaestro(tipoActivo, idActivo, nuevosDatos) {
  try {
    const nombreRealHoja = HOJA[tipoActivo.toUpperCase()] || tipoActivo;
    const hoja = obtenerHoja(nombreRealHoja);
    const data = hoja.getDataRange().getValues();
    const headers = data[0];

    const filaIndex = findRowByColValue(hoja, headers[0], idActivo);
    if (filaIndex === -1) throw new Error("No se encontró el activo");

    let camposActualizados = [];
    for (let campo in nuevosDatos) {
      if (campo.toUpperCase() === 'ID') continue;
      let colIndex = headers.indexOf(campo);
      if (colIndex > -1) {
        hoja.getRange(filaIndex, colIndex + 1).setValue(nuevosDatos[campo]);
        camposActualizados.push(campo);
      }
    }

    registrarHistorial('Edición Maestro', idActivo, 'MODIFICADO', `Campos: ${camposActualizados.join(', ')}`, usuarioActivo(), 'SISTEMA');
    return "✅ " + idActivo + " actualizado correctamente.";
  } catch (e) { return "❌ Error: " + e.message; }
}

/** Modificamos tu función para que acepte el solicitante */
function gestionarTarea(idActivo, tipoTarea, obs, direccion = "", solicitante = "SISTEMA") {
  try {
    const hojaTareas = obtenerHoja("Tareas");
    const idTarea = "TSK-" + Utilities.formatDate(new Date(), "GMT-3", "yyMMdd-HHmm");

    // Perfil asignado según el tipo de tarea
    let perfil = "TECNICO";
    if (tipoTarea === 'PODA') perfil = "ESPACIOS VERDES";
    if (tipoTarea === 'LIMPIEZA' || tipoTarea === 'MOVIMIENTO') perfil = "INSTALADOR";

    hojaTareas.appendRow([
      idTarea, 
      idActivo, 
      tipoTarea, 
      solicitante, 
      new Date(), 
      "PENDIENTE", 
      perfil, 
      obs, 
      direccion
    ]);

    return { success: true, message: `Reporte ${idTarea} creado.` };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/** El "Cerebro" de derivaciones del Secretario. */
function procesarDerivacionSecretario(idActivo, etapa) {
  try {
    const usuario = usuarioActivo();
    let evento = "";
    let mensaje = "";

    switch (etapa) {
      case 'AUTORIZACION':
        evento = 'AUTORIZACION_SECRETARIO';
        mensaje = "Activo autorizado. Derivado a Técnico/Instalador para relevamiento.";
        break;
      case 'TABLERO':
        evento = 'AUTORIZACION_TABLERO';
        mensaje = "Tablero solicitado a Servicios Públicos.";
        break;
      case 'ENERGIA':
        evento = 'SOLICITUD_ENERGIA';
        mensaje = "Pedido de suministro eléctrico enviado (EDEN).";
        break;
      case 'RED':
        evento = 'SOLICITUD_CONECTIVIDAD';
        mensaje = "Solicitud de enlace de datos enviada.";
        break;
    }

    // 1. Notificar al perfil correspondiente
    notificarEvento(evento, {
      id: idActivo,
      msg: mensaje,
      usuario: usuario
    });

    // 2. Registrar en el historial de la auditoría
    registrarHistorial('DERIVACION', idActivo, etapa, mensaje, usuario, 'SISTEMA');

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**Procesa la autorización de una solicitud (SOL-...) 
 * Cambia el estado en la hoja Solicitudes y crea el ticket de instalación inicial. */
/** El "Cerebro" de derivaciones del Secretario. */
function procesarDerivacionSecretario(idActivo, etapa) {
  try {
    const usuario = usuarioActivo();
    let evento = "";
    let mensaje = "";

    switch (etapa) {
      case 'AUTORIZACION':
        evento = 'AUTORIZACION_SECRETARIO';
        mensaje = "Activo autorizado. Derivado a Técnico para relevamiento.";
        break;
      case 'TABLERO':
        evento = 'AUTORIZACION_TABLERO';
        mensaje = "Tablero solicitado a Servicios Públicos.";
        break;
      case 'ENERGIA':
        evento = 'SOLICITUD_ENERGIA';
        mensaje = "Pedido de suministro eléctrico enviado (EDEN).";
        break;
      case 'RED':
        evento = 'SOLICITUD_CONECTIVIDAD';
        mensaje = "Solicitud de enlace de datos enviada.";
        break;
    }

    // notificarEvento debe estar en los bloques que faltan (posiblemente 6 o 7)
    if (typeof notificarEvento === 'function') {
      notificarEvento(evento, { id: idActivo, msg: mensaje, usuario: usuario });
    }

    registrarHistorial('DERIVACION', idActivo, etapa, mensaje, usuario, 'SISTEMA');
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/** * Lista solicitudes con estado "SOLICITADA" para el Secretario.
 */
function listarSolicitudesPendientes() {
  try {
    const hoja = obtenerHoja("Solicitudes");
    const data = hoja.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0];
    const idx = {
      id: getHeaderIndex(headers, "ID"),
      fecha: getHeaderIndex(headers, "Fecha"),
      tipo: getHeaderIndex(headers, "Tipo_Activo"),
      dir: getHeaderIndex(headers, "Direccion"),
      user: getHeaderIndex(headers, "Usuario"),
      est: getHeaderIndex(headers, "Estado")
    };

    return data.slice(1)
      .filter(fila => (fila[idx.est] || "").toString().toUpperCase() === "SOLICITADA")
      .map(fila => ({
        id: fila[idx.id],
        fecha: fila[idx.fecha] ? Utilities.formatDate(new Date(fila[idx.fecha]), "GMT-3", "dd/MM/yyyy") : "-",
        tipoActivo: fila[idx.tipo],
        direccion: fila[idx.dir],
        usuario: fila[idx.user],
        estado: fila[idx.est]
      }));
  } catch (e) {
    Logger.log("Error en listarSolicitudesPendientes: " + e.toString());
    return [];
  }
}

/** Procesa la autorización y crea la tarea técnica. */
function autorizarSolicitud(idSol) {
  try {
    const hojaSoli = obtenerHoja("Solicitudes");
    const datos = hojaSoli.getDataRange().getValues();
    let filaIdx = -1;

    // Buscar la solicitud
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === idSol) {
        filaIdx = i + 1;
        // Cambiar estado a AUTORIZADA
        hojaSoli.getRange(filaIdx, 6).setValue("AUTORIZADA");
        
        // --- LA MAGIA: Convertir en Tarea para el técnico ---
        const dataParaTarea = {
          tipoActivo: datos[i][2],
          nombre: datos[i][3],
          latitud: datos[i][6],
          longitud: datos[i][7],
          observaciones: "Autorizado por Secretario. Origen: " + idSol
        };
        
        ejecutarAltaDirecta(dataParaTarea, usuarioActivo());
        break;
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function rechazarSolicitud(idSol) {
  try {
    const hojaSoli = obtenerHoja("Solicitudes");
    const datos = hojaSoli.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === idSol) {
        hojaSoli.getRange(i + 1, 6).setValue("RECHAZADA");
        break;
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}