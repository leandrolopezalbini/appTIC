//9_Tests.gs

function testSistema() {
    try {
        const datos = _getDatosTableros();
        Logger.log("Columnas detectadas correctamente");
        Logger.log("Índice de ID: " + datos.indices[CAMPOS.ID]);
        Logger.log("Índice de Workflow: " + datos.indices[CAMPOS.WORKFLOW]);

        // Simular creación (puedes borrar la fila manualmente después)
        // const res = crearNuevoTablero({nombre: "Calle Falsa 123", observaciones: "Prueba de sistema"});
        // Logger.log("Resultado creación: " + JSON.stringify(res));

        return "Todo parece estar en orden";
    } catch (e) {
        Logger.log("ERROR EN LA REVISIÓN: " + e.message);
        return "Hay un error en los encabezados: " + e.message;
    }
}

function verificarIntegridadTotal() {
    Logger.log("--- INICIANDO TEST DE INTEGRIDAD ---");

    // Test 1: Mapeo de columnas
    try {
        const t = _getDatosTableros();
        Logger.log("✅ Motor de Tableros: OK. (ID encontrado en col: " + t.indices[CAMPOS.ID] + ")");
    } catch (e) { Logger.log("❌ Error en Tableros: " + e.message); }

    // Test 2: Simular Instalación de Cámara
    try {
        const dummyData = {
            tipoDispositivo: 'CAMARA',
            idDispositivo: 'CAM-TEST-01', // El que creaste manualmente
            idTablero: 'NSDS-001',
            observaciones: 'Prueba técnica de vinculación'
        };
        const res = instalarDispositivoEnTablero(dummyData);
        if (res.success) {
            Logger.log("✅ Vínculo Cámara-Tablero: OK.");
        } else {
            Logger.log("⚠️ Vínculo fallido (es normal si no creaste la cámara de prueba): " + res.message);
        }
    } catch (e) { Logger.log("❌ Error en función de instalación: " + e.message); }

    Logger.log("--- TEST FINALIZADO ---");
}

/** * TEST: Simula la aprobación de una solicitud.
 * Antes de correrlo, asegúrate de tener una fila en "Solicitudes" con el ID que pongas abajo.
 */
function testAutorizar() {
  const idDePrueba = "SOL-ACT-250829-1200"; // <--- CAMBIA ESTO por un ID real que tengas en tu hoja
  
  console.log("Iniciando prueba de autorización para: " + idDePrueba);
  
  const resultado = autorizarSolicitud(idDePrueba);
  
  if (resultado.success) {
    console.log("✅ ÉXITO: " + resultado.message);
  } else {
    console.error("❌ FALLÓ: " + resultado.message);
  }
}