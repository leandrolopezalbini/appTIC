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

/** Distribuye notificaciones por Mail o Sistema a perfiles específicos. */
function notificarEvento(evento, detalles) {
  const perfilesANotificar = [];

  switch(evento) {
    case 'NUEVA_SOLICITUD_COM':
      perfilesANotificar.push('SECRETARIO', 'ADMIN');
      break;
    case 'AUTORIZACION_TABLERO': // Secretario autoriza un tablero nuevo
      perfilesANotificar.push('SERVICIOS_PUBLICOS', 'ADMIN');
      break;
    case 'SOLICITUD_ENERGIA': // Se requiere que Eden de luz
      perfilesANotificar.push('EDEN', 'SECRETARIO');
      break;
    case 'SOLICITUD_CONECTIVIDAD': // Se requiere a IPNEXT o Instaladores
      perfilesANotificar.push('IPNEXT', 'INSTALADOR', 'TECNICO');
      break;
    case 'SOLICITUD_PODA':
      perfilesANotificar.push('ESPACIOS_VERDES', 'SECRETARIO');
      break;
    case 'ALTA_DEFINITIVA': // El instalador terminó todo
      perfilesANotificar.push('TECNICO', 'SECRETARIO', 'COM', 'ADMIN');
      break;
  }

  const emails = buscarEmailsPorPerfiles(perfilesANotificar);
  
  if (emails.length > 0) {
    MailApp.sendEmail({
      to: emails.join(","),
      subject: `SISTEMA SEGURIDAD: ${evento} - Activo: ${detalles.id}`,
      body: `Detalles: ${detalles.msg}\n\nUbicación: ${detalles.ubicacion || 'Ver en Mapa'}\nUsuario responsable: ${detalles.usuario}`
    });
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