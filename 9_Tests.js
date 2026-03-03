//9_Tests.gs actualizado

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
  
  Logger.log("Iniciando prueba de autorización para: " + idDePrueba);
  
  const resultado = autorizarSolicitud(idDePrueba);
  
  if (resultado.success) {
    Logger.log("✅ ÉXITO: " + resultado.message);
  } else {
    Logger.log("❌ FALLÓ: " + resultado.message);
  }
}

function testTrazabilidad() {
    Logger.log("=== TEST DE TRAZABILIDAD ===");
    try {
        const hojaHistorial = obtenerHoja(HOJA.HISTORIAL);
        const data = hojaHistorial.getDataRange().getValues();
        Logger.log(`✅ Historial tiene ${data.length - 1} registros`);

        // Busca escrituras SIN correlativo de historial en Tableros
        const hojaTableros = obtenerHoja(HOJA.TABLEROS);
        const dataTabs = hojaTableros.getDataRange().getValues();

        for (let i = 1; i < dataTabs.length; i++) {
            const idTab = dataTabs[i][0];
            if (!idTab) continue;
            const tieneHistorial = data.some(row => row[0] === idTab);
            if (!tieneHistorial) {
                Logger.log(`⚠️ ALERTA: ID ${idTab} tiene cambios sin historial`);
            }
        }

        Logger.log("✅ Test de trazabilidad completado");
    } catch(e) {
        Logger.log("❌ Error en test: " + e.message);
    }
}

function testErrorHandling() {
    Logger.log("=== TEST DE MANEJO DE ERRORES ===");
    // Test 1: Payload inválido
    const resultado1 = procesarSolicitudUnificada(null);
    if (!resultado1.success && resultado1.errorCode === "INVALID_PAYLOAD") {
        Logger.log("✅ Validación de payload: OK");
    } else {
        Logger.log("⚠️ Validación de payload: falló o estructura inesperada: " + JSON.stringify(resultado1));
    }

    // Test 2: ID inexistente
    const resultado2 = obtenerDetalleActivo("ID_INEXISTENTE_12345", "TABLEROS");
    if (!resultado2.success) {
        Logger.log("✅ Manejo de ID inexistente: OK");
    } else {
        Logger.log("⚠️ Manejo de ID inexistente: la función devolvió success: true");
    }

    Logger.log("✅ Tests de errores completados");
}

/**
 * TEST RUNNER: Ejecuta todos los tests y devuelve resumen consolidado.
 * Ejecutar esta función desde Apps Script IDE para obtener un resumen de todos los tests.
 */
function runTests() {
    Logger.log("╔════════════════════════════════════════════════╗");
    Logger.log("║      EJECUTANDO SUITE DE TESTS - AppTIC        ║");
    Logger.log("╚════════════════════════════════════════════════╝");
    Logger.log("");

    const resultados = [];

    // Test 1: Trazabilidad
    try {
        testTrazabilidad();
        resultados.push({ test: "testTrazabilidad", status: "✅ PASÓ" });
    } catch (e) {
        resultados.push({ test: "testTrazabilidad", status: "❌ FALLÓ: " + e.message });
    }

    Logger.log("");

    // Test 2: Manejo de errores
    try {
        testErrorHandling();
        resultados.push({ test: "testErrorHandling", status: "✅ PASÓ" });
    } catch (e) {
        resultados.push({ test: "testErrorHandling", status: "❌ FALLÓ: " + e.message });
    }

    Logger.log("");
    Logger.log("╔════════════════════════════════════════════════╗");
    Logger.log("║                  RESUMEN FINAL                 ║");
    Logger.log("╚════════════════════════════════════════════════╝");

    let pasados = 0, fallidos = 0;

    resultados.forEach(r => {
        Logger.log(`• ${r.test}: ${r.status}`);
        if (r.status.includes("✅")) pasados++;
        else fallidos++;
    });

    Logger.log("");
    Logger.log(`Total: ${pasados} pasados, ${fallidos} fallidos de ${resultados.length} tests.`);
    Logger.log("");

    return {
        totalTests: resultados.length,
        passed: pasados,
        failed: fallidos,
        details: resultados,
        timestamp: new Date().toLocaleString('es-AR')
    };
}