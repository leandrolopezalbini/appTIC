//4_Seguridad.gs
/**
 * Busca el rol del usuario en la hoja "Personal".
 * Col A: Email (0) | Col C: Rol (2)
 */
function OBTENER_ROL_USUARIO(email) {
  try {
    const emailBuscado = (email || usuarioActivo()).toLowerCase().trim();
    const hoja = obtenerHoja("Personal");
    const datos = hoja.getDataRange().getValues();

    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0].toString().toLowerCase().trim() === emailBuscado) {
        return (datos[i][2] || "LECTURA").toString().toUpperCase().trim();
      }
    }
    return "LECTURA";
  } catch (e) {
    Logger.log("Error en OBTENER_ROL_USUARIO: " + e.message);
    return "LECTURA";
  }
}

function usuarioTienePermiso(permisoRequerido) {
  const rol = OBTENER_ROL_USUARIO();
  const config = DEFINICION_ROLES[rol];
  if (!config) return false;
  if (config.esFull) return true;
  return config.permisos.includes(permisoRequerido.toUpperCase());
}

/** Versión consolidada: Cruza email con Hoja Personal y trae configuración de Roles */
function obtenerMisPermisos() {
  const email = usuarioActivo().toLowerCase().trim();
  const hojaPersonal = obtenerHoja("Personal");
  
  let misPermisos = { email: email, rol: "SIN ACCESO", esFull: false, permisos: {} };

  if (!hojaPersonal) return misPermisos;

  const datos = hojaPersonal.getDataRange().getValues();
  
  for (let i = 1; i < datos.length; i++) {
    const emailHoja = datos[i][0].toString().toLowerCase().trim();
    const rolHoja = datos[i][2] ? datos[i][2].toString().toUpperCase().trim() : "";

    if (emailHoja === email) {
      // DEFINICION_ROLES debe estar en 0_Config.gs
      const config = DEFINICION_ROLES[rolHoja] || { esFull: false, permisos: [] };
      misPermisos.rol = rolHoja;
      misPermisos.esFull = config.esFull;
      
      config.permisos.forEach(p => {
        misPermisos.permisos[p.toUpperCase()] = true;
      });
      break; 
    }
  }
  return misPermisos;
}

function usuarioActivo() {
  try {
    return Session.getActiveUser().getEmail() || 'Desconocido';
  } catch (e) { return 'Desconocido'; }
}

/** Función para forzar la autorización del usuario y mostrar confirmación */
function verificarYAutorizar() {
    const email = Session.getActiveUser().getEmail();
    const ui = SpreadsheetApp.getUi();
    if (email) {
        ui.alert('Autorización exitosa', 'Hola ' + email + ', ahora tus ediciones se registrarán correctamente en el historial.', ui.ButtonSet.OK);
    } else {
        ui.alert('Aviso de Privacidad', 'No se pudo obtener tu email. Por favor, asegúrate de haber aceptado los permisos del script.', ui.ButtonSet.OK);
    }
}