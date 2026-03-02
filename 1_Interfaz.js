//1_Interfaz.gs

/**
 * Punto de entrada único para la WebApp.
 */
function doGet() {
    // IMPORTANTE: Asegúrate de que tu archivo HTML se llame 'Panel' o 'PanelTableros'
    // He dejado 'Panel' por ser el estándar de tu última versión.
    return HtmlService.createTemplateFromFile('Panel') 
        .evaluate()
        .setTitle('App Sec. Seg. Mercedes')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** * Abre el panel como un cuadro de diálogo dentro de la propia hoja de cálculo.
 */
function abrirPanelTablerosModal() {
    try {
        registrarAccesoUsuario("Acceso via Modal Hoja"); // Trazabilidad
        const html = HtmlService.createTemplateFromFile("Panel") 
            .evaluate()
            .setWidth(1000)
            .setHeight(750);
        SpreadsheetApp.getUi().showModalDialog(html, "SISTEMA DE GESTIÓN Sec Seg MM");
    } catch (e) {
        const ui = SpreadsheetApp.getUi();
        ui.alert('Error', 'No se pudo cargar el Panel: ' + e.message, ui.ButtonSet.OK);
    }
}

/** * Función vital para insertar archivos HTML dentro de otros (CSS/JS).
 * Solo debe existir UNA en todo el proyecto.
 */
function incluir(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

/**
 * Obtiene la información del usuario logueado comparando con la hoja "Personal".
 */
function getUsuarioInfo() {
  const email = Session.getActiveUser().getEmail().toLowerCase();
  let info = {
    email: email,
    nombre: "Usuario Desconocido",
    rol: "VISOR" 
  };

  try {
    const hojaPersonal = obtenerHoja("Personal");
    const datos = hojaPersonal.getDataRange().getValues();

    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0].toString().toLowerCase() === email) {
        info.nombre = datos[i][1]; 
        info.rol = datos[i][2].toString().toUpperCase(); 
        break;
      }
    }
  } catch (e) {
    Logger.log("Error en getUsuarioInfo: " + e.message);
  }
  return info;
}

/**
 * Crea los menús personalizados al abrir la hoja de cálculo.
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('App TIC')
        .addItem('🚀 Abrir Panel', 'abrirPanelTablerosModal')
        .addSeparator()
        .addItem('✅ Verificar Permisos', 'verificarYAutorizar')
        .addItem('⚙️ Re-activar Trigger', 'crearTriggerOnEdit')
        .addToUi();
}