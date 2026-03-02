//7_Triggers.gs
/** Función vinculada al trigger instalable "Al editar".
 *  * Registra cambios hechos directamente en la hoja de cálculo. */
function onEditTrigger(e) {
    procesarEdicionManual(e);
}

function procesarEdicionManual(e) {
    if (!e || !e.range) return;

    const hojaEditada = e.range.getSheet();
    if (hojaEditada.getName() !== HOJA.TABLEROS) return;

    const fila = e.range.getRow();
    if (fila === 1) return; 

    const valorAnterior = e.oldValue;
    const nuevoValor = e.value;

    if (valorAnterior === nuevoValor || nuevoValor === undefined) return;

    const columna = e.range.getColumn();
    const encabezados = getHeaders(hojaEditada);
    if (encabezados.length === 0) return;

    const nombreColumna = encabezados[columna - 1] || `Columna ${columna}`;

    // Obtener ID del Tablero
    let idTablero = "Desconocido";
    try {
        const idxID = getHeaderIndex(encabezados, CAMPOS.ID);
        idTablero = hojaEditada.getRange(fila, idxID + 1).getValue();
    } catch (err) { return; }

    // Obtener el Estado actual
    let estadoActual = 'N/A';
    try {
        const idxEstado = getHeaderIndex(encabezados, CAMPOS.ESTADO);
        estadoActual = (nombreColumna === CAMPOS.ESTADO) ? nuevoValor : hojaEditada.getRange(fila, idxEstado + 1).getValue();
    } catch (err) { }

    // Capturar el usuario de forma segura
    let usuarioEmail = "Usuario Planilla";
    try {
        usuarioEmail = Session.getActiveUser().getEmail() || (e.user ? e.user.getEmail() : "Usuario Planilla");
    } catch (err) { usuarioEmail = "Privacidad Restringida"; }

    const detalle = `Edición MANUAL: ${nombreColumna}. Ant: "${valorAnterior || 'Vacío'}". Nuevo: "${nuevoValor}".`;

    registrarHistorial(
        'Edición Manual',
        idTablero,
        estadoActual,
        detalle,
        usuarioEmail,
        nombreColumna
    );
}

/** Utilidad para mantenimiento de triggers */
function listarTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
        Logger.log(`Trigger: ${t.getHandlerFunction()} - Tipo: ${t.getEventType()}`);
    });
}

/** Crea o restablece el trigger instalable para ediciones manuales.
 * Útil si el trigger deja de funcionar o cambias de cuenta propietaria. */
function crearTriggerOnEdit() {
  const funcionTrigger = 'onEditTrigger';
  
  // Eliminar triggers existentes para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === funcionTrigger) ScriptApp.deleteTrigger(t);
  });

  // Crear el nuevo trigger
  ScriptApp.newTrigger(funcionTrigger)
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
    
  SpreadsheetApp.getUi().alert("✅ Trigger re-activado correctamente.");
}