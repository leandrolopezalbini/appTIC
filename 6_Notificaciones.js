//6_Notificaciones.gs
function enviarMailCambioEstado(idTablero, estado, detalle, usuarioEmail) {
    // Asegúrate de definir MAILS_ESTADO en 0_Config.gs
    const destinatarios = (typeof MAILS_ESTADO !== 'undefined') ? MAILS_ESTADO[estado] : null;
    
    if (!destinatarios || destinatarios.length === 0) {
        Logger.log("No hay correo configurado para estado: " + estado);
        return;
    }

    const asunto = `Tablero ${idTablero} cambiado a ${estado}`;
    const cuerpo = `
    El tablero con ID ${idTablero} cambió su estado a: ${estado}.
    
    Detalle: ${detalle}
    
    Usuario que realizó la modificación: ${usuarioEmail || 'Desconocido'}
    
    Fecha: ${new Date().toLocaleString()}
    `;

    try {
        destinatarios.forEach(dest => {
            MailApp.sendEmail(dest, asunto, cuerpo);
        });
    } catch(e) { Logger.log("Error enviando mail: " + e); }
}

/**
 * Notifica a destinatarios por email
 * @param {string} tipoEvento - Tipo de evento (ej: "SOLICITUD_APROBADA")
 * @param {Object} detalles - Detalles adicionales del evento
 * @return {Object} {success: true/false, enviados: [], fallos: []}
 */
function notificarEvento(tipoEvento, detalles) {
  const resultado = {
    success: true,
    enviados: [],     // Emails que se mandaron OK
    fallos: [],       // Emails que fallaron + error
    total: 0
  };

  try {
    // Obtiene lista de emails destinatarios
    const emails = obtenerDestinatariosNotificacion(tipoEvento);
    
    if (!emails || emails.length === 0) {
      resultado.success = false;
      resultado.error = "No hay destinatarios configurados para: " + tipoEvento;
      Logger.log("⚠️ " + resultado.error);
      return resultado;
    }

    const asunto = generarAsuntoNotificacion(tipoEvento);
    const cuerpo = generarCuerpoNotificacion(tipoEvento, detalles);
    resultado.total = emails.length;

    // Intenta mandar a cada email por separado para capturar fallos
    for (let email of emails) {
      try {
        MailApp.sendEmail(email, asunto, cuerpo);
        resultado.enviados.push(email);
        Logger.log("✅ Email enviado a: " + email);
      } catch (emailError) {
        resultado.fallos.push({
          email: email,
          error: emailError.message
        });
        Logger.log("❌ Fallo al enviar a " + email + ": " + emailError.message);
      }
    }

    // Determina si fue exitoso general
    if (resultado.fallos.length === 0) {
      resultado.success = true;
      Logger.log("✅ Notificación " + tipoEvento + " enviada completamente");
    } else if (resultado.enviados.length > 0) {
      resultado.success = true; // Exitoso parcial
      Logger.log("⚠️ Notificación enviada parcialmente");
    } else {
      resultado.success = false;
      Logger.log("❌ Notificación falló completamente");
    }

    return resultado;

  } catch (e) {
    Logger.log("❌ Error crítico en notificarEvento: " + e.message);
    return {
      success: false,
      error: e.message,
      enviados: [],
      fallos: emails || []
    };
  }
}

function buscarEmailsPorPerfiles(listaPerfiles) {
  const hoja = obtenerHoja("Personal");
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];
  
  // Buscamos dinámicamente dónde están el Email y el Rol
  const idxEmail = getHeaderIndex(headers, ["Email", "Mail", "Usuario"]);
  const idxRol = getHeaderIndex(headers, ["Rol", "Perfil", "Permiso"]);

  return datos.slice(1)
    .filter(fila => listaPerfiles.includes(fila[idxRol].toString().toUpperCase()))
    .map(fila => fila[idxEmail]);
}