// 10_Gestion_Solicitudes.gs

/** Obtiene las solicitudes con estado SOLICITADA de forma dinámica */
function listarSolicitudesPendientes() {
  try {
    const hoja = obtenerHoja("Solicitudes");
    const data = hoja.getDataRange().getValues();
    const headers = data[0];
    
    const idx = {
      id: getHeaderIndex(headers, "ID"),
      fecha: getHeaderIndex(headers, "Fecha"),
      tipo: getHeaderIndex(headers, "Tipo_Activo"),
      dir: getHeaderIndex(headers, ["Direccion", "Ubicación"]),
      user: getHeaderIndex(headers, "Usuario"),
      est: getHeaderIndex(headers, "Estado")
    };

    return data.slice(1)
      .filter(fila => (fila[idx.est] || "").toString().toUpperCase() === "SOLICITADA")
      .map((fila, i) => ({
        id: fila[idx.id],
        fecha: fila[idx.fecha] instanceof Date ? Utilities.formatDate(fila[idx.fecha], "GMT-3", "dd/MM/yy") : fila[idx.fecha],
        tipo: fila[idx.tipo],
        direccion: fila[idx.dir],
        usuario: fila[idx.user],
        filaIndex: i + 2 // Guardamos la posición real en la hoja por si acaso
      }));
  } catch (e) {
    Logger.log("Error listarSolicitudes: " + e.message);
    return [];
  }
}

function autorizarSolicitud(solicitudId) {
  try {
    const usuario = usuarioActivo();
    const hojaSol = obtenerHoja("Solicitudes");
    
    // 1. Localizar la fila usando tu utilidad (Busca solicitudId en la columna "ID")
    const filaIndex = findRowByColValue(hojaSol, "ID", solicitudId);
    if (filaIndex === -1) throw new Error("Solicitud no encontrada: " + solicitudId);

    // 2. Obtener datos de la fila de forma dinámica
    const headers = getHeaders(hojaSol);
    const datosFila = hojaSol.getRange(filaIndex, 1, 1, hojaSol.getLastColumn()).getValues()[0];

    // Mapeo de datos para el alta
    const dataParaAlta = {
      tipoActivo: datosFila[getHeaderIndex(headers, "Tipo")],
      direccion: datosFila[getHeaderIndex(headers, "Ubicación")],
      latitud: datosFila[getHeaderIndex(headers, "Latitud")],
      longitud: datosFila[getHeaderIndex(headers, "Longitud")],
      observaciones: "Autorizado por Secretario. Obs. Original: " + (datosFila[getHeaderIndex(headers, "Observaciones")] || "")
    };

    // 3. Ejecutar el Alta Real en la hoja correspondiente (Tableros, Camaras, etc)
    const resultadoAlta = ejecutarAltaDirecta(dataParaAlta, usuario);
    
    // Verificamos que el alta devolvió un objeto con id
    if (!resultadoAlta || !resultadoAlta.id) throw new Error("Error al generar el nuevo activo.");

    // 4. Marcar la solicitud como AUTORIZADA (Columna F / Índice 5)
    // Usamos getHeaderIndex para seguridad extra
    const idxEstado = getHeaderIndex(headers, "Estado");
    hojaSol.getRange(filaIndex, idxEstado + 1).setValue("AUTORIZADA");

    // 5. Notificar al equipo (Opcional)
    if (typeof notificarEvento === "function") {
      notificarEvento('AUTORIZACION_SECRETARIO', {
        id: resultadoAlta.id,
        msg: `Nueva solicitud aprobada en ${dataParaAlta.direccion}. ID asignado: ${resultadoAlta.id}`,
        usuario: usuario
      });
    }

    return { 
      success: true, 
      message: "Solicitud aprobada con éxito. Nuevo ID: " + resultadoAlta.id 
    };

  } catch (e) {
    Logger.log("Error en autorizarSolicitud: " + e.message);
    return { success: false, message: "Error al autorizar: " + e.message };
  }
}

function rechazarSolicitud(solicitudId) {
  try {
    const hojaSol = obtenerHoja("Solicitudes");
    const headers = getHeaders(hojaSol);
    
    // Localizar la fila dinámicamente
    const filaIndex = findRowByColValue(hojaSol, "ID", solicitudId);
    
    if (filaIndex !== -1) {
      // Opción: En lugar de borrar, marcamos como RECHAZADA para auditoría
      const idxEstado = getHeaderIndex(headers, "Estado");
      hojaSol.getRange(filaIndex, idxEstado + 1).setValue("RECHAZADA");
      
      // Si prefieres borrarla, descomenta la siguiente línea y comenta la de arriba:
      // hojaSol.deleteRow(filaIndex);
      
      return { success: true, message: "Solicitud rechazada correctamente." };
    } else {
      return { success: false, message: "No se encontró el ID de solicitud: " + solicitudId };
    }
  } catch (e) {
    return { success: false, message: "Error al rechazar: " + e.toString() };
  }
}