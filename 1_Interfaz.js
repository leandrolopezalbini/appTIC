//1_Interfaz.gs
/* eslint-env browser */
/* global google, M */
function doGet() {
    return HtmlService.createTemplateFromFile('Panel') 
        .evaluate()
        .setTitle('App Sec. Seg. Mercedes')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function abrirPanelTablerosModal() {
    try {
        registrarAccesoUsuario("Panel Principal SPA");
        const html = HtmlService.createTemplateFromFile("Panel") 
            .evaluate()
            .setWidth(1000)
            .setHeight(750);
        SpreadsheetApp.getUi().showModalDialog(html, "Gestión de Sec. Seg. MM.");
    } catch (e) {
        const ui = SpreadsheetApp.getUi();
        ui.alert('Error', `No se pudo cargar Panel.html: ${e.message}`, ui.ButtonSet.OK);
    }
}
/** * Función necesaria para insertar archivos HTML dentro de otros (CSS/JS) */
function incluir(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

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