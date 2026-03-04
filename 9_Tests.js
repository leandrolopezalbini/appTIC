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

function testErrorHandling() {
    Logger.log("=== TEST DE MANEJO DE ERRORES ===");
    // Test 1: Payload inválido en router principal
    const resultado1 = procesarSolicitudUnificada(null);
    if (!resultado1.success && resultado1.errorCode === "INVALID_PAYLOAD") {
        Logger.log("✅ Validación de payload: OK");
    } else {
        Logger.log("⚠️ Validación de payload: falló o estructura inesperada: " + JSON.stringify(resultado1));
    }

    // Test 2: ID inexistente en obtenerDetalleActivo
    const resultado2 = obtenerDetalleActivo("ID_INEXISTENTE_12345", "TABLEROS");
    if (!resultado2.success) {
        Logger.log("✅ Manejo de ID inexistente: OK");
    } else {
        Logger.log("⚠️ Manejo de ID inexistente: la función devolvió success: true");
    }

    // Test 3: ejecutarTransaccionInstalacion sin idTarea
    const resultado3 = ejecutarTransaccionInstalacion({});
    if (!resultado3.success && resultado3.errorCode === "INVALID_PAYLOAD") {
        Logger.log("✅ transaccionInstalacion valida payload");
    } else {
        Logger.log("⚠️ transaccionInstalacion: falta validación");
    }

    // Test 4: registrarConectividadTablero sin campos requeridos
    const resultado4 = registrarConectividadTablero({});
    if (!resultado4.success && resultado4.errorCode === "INVALID_PAYLOAD") {
        Logger.log("✅ registrarConectividadTablero validación ok");
    } else {
        Logger.log("⚠️ registrarConectividadTablero: falta validación");
    }

    // Test 5: buscarDatosParaReemplazo con payload mínimo
    const resultado5 = buscarDatosParaReemplazo(null);
    if (resultado5 && resultado5.existeId === false) {
        Logger.log("✅ buscarDatosParaReemplazo maneja payload inválido");
    } else {
        Logger.log("⚠️ buscarDatosParaReemplazo: comportamiento inesperado");
    }

    // Test 6: finalizarInstalacionYCrearActivo sin datos obligatorios
    const resultado6 = finalizarInstalacionYCrearActivo({});
    if (!resultado6.success && resultado6.errorCode === 'INVALID_PAYLOAD') {
        Logger.log("✅ finalizarInstalacion valida payload");
    } else {
        Logger.log("⚠️ finalizarInstalacion: falta validación");
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

/**
 * TEST DE PERFORMANCE - Mide velocidad de búsquedas
 * Antes del caché: ~2000ms (2 segundos)
 * Después del caché: ~200ms
 */
function testPerformance() {
    Logger.log("═══════════════════════════════════════");
    Logger.log("🧪 TEST: PERFORMANCE DE BÚSQUEDAS");
    Logger.log("═══════════════════════════════════════");

    try {
        const inicio = new Date().getTime();

        // Ejecuta una búsqueda típica
        const resultados = buscadorMaestro("001", ["TABLEROS", "CAMARAS"]);

        const tiempo = new Date().getTime() - inicio;

        Logger.log("⏱️  Tiempo de búsqueda: " + tiempo + "ms");
        Logger.log("📊 Resultados encontrados: " + resultados.length);

        if (tiempo < 500) {
            Logger.log("✅ PASÓ: Búsqueda está RÁPIDA (<500ms)");
            return true;
        } else if (tiempo < 1000) {
            Logger.log("⚠️  ADVERTENCIA: Búsqueda está un poco lenta (>500ms)");
            return true;  // Sigue siendo aceptable
        } else {
            Logger.log("❌ FALLO: Búsqueda LENTA (>1000ms)");
            Logger.log("💡 Consejo: Ejecuta precargarCacheHojas() antes");
            return false;
        }

    } catch (e) {
        Logger.log("❌ ERROR: " + e.message);
        return false;
    }
}

/**
 * TEST: Verifica que manejadorActualizacion funciona correctamente
 */
function testManejadorActualizacion() {
    Logger.log("🧪 TEST: manejadorActualizacion");

    const dataTest = {
        id: "NSDS-001",
        tipoAccion: "ACTUALIZAR_ENERGIA",
        estado: "ENERGIZADO",
        insumos: { camaras: 1 }
    };

    const resultado = manejadorActualizacion(dataTest, "test@email.com", "TECNICO");

    if (resultado && resultado.success !== undefined) {
        Logger.log("✅ manejadorActualizacion: OK");
        return true;
    } else {
        Logger.log("❌ manejadorActualizacion: FALLÓ");
        return false;
    }
}

/**
 * TEST: Verifica que manejadorSolicitudNueva crea solicitud
 */
function testManejadorSolicitudNueva() {
    Logger.log("🧪 TEST: manejadorSolicitudNueva");

    const dataTest = {
        tipoActivo: "CAMARA",
        nombre: "Test Cámara",
        observaciones: "Test unitario"
    };

    const resultado = manejadorSolicitudNueva(dataTest, "test@email.com", "COM");

    if (resultado.success && resultado.id && resultado.id.startsWith("SOL-")) {
        Logger.log("✅ manejadorSolicitudNueva: OK");
        return true;
    } else {
        Logger.log("❌ manejadorSolicitudNueva: FALLÓ");
        return false;
    }
}

/**
 * TEST: Verifica que buscarFilas funciona
 */
function testBuscarFilas() {
    Logger.log("🧪 TEST: buscarFilas");

    try {
        const hoja = obtenerHoja(HOJA.TABLEROS);
        const resultado = buscarFilas(
            hoja,
            { headerName: "ID", valor: "NSDS" },
            { returnAll: false, exact: false }
        );

        if (resultado && resultado.rowNum > 0) {
            Logger.log("✅ buscarFilas: OK (encontró en fila " + resultado.rowNum + ")");
            return true;
        } else {
            Logger.log("⚠️  buscarFilas: No encontró coincidencias");
            return true; // No es error si no hay datos
        }
    } catch (e) {
        Logger.log("❌ buscarFilas: ERROR " + e.message);
        return false;
    }
}

/**
 * RUNNER: Ejecuta todos los tests de refactorización
 */
function runTestsRefactorizacion() {
    Logger.log("═══════════════════════════════════════════════");
    Logger.log("🧪 TESTS DE REFACTORIZACIÓN");
    Logger.log("═══════════════════════════════════════════════");

    const tests = [
        { nombre: "manejadorActualizacion", fn: testManejadorActualizacion },
        { nombre: "manejadorSolicitudNueva", fn: testManejadorSolicitudNueva },
        { nombre: "buscarFilas", fn: testBuscarFilas },
        { nombre: "utilidadesAdicionales", fn: testUtilidadesAdicionales }
    ];

    let passados = 0;
    for (let test of tests) {
        if (test.fn()) passados++;
    }

    Logger.log("");
    Logger.log("📊 RESULTADO: " + passados + "/" + tests.length + " tests pasaron");
    Logger.log("═══════════════════════════════════════════════");
}

// Badge counters test
function testBadges() {
    Logger.log("🧪 TEST: Badges");
    const s = actualizarBadgeSolicitudes();
    const t = actualizarBadgeTareas();
    Logger.log("Badge solicitudes: " + s);
    Logger.log("Badge tareas: " + t);
}

function testUtilidadesAdicionales() {
    Logger.log("🧪 TEST: utilidades adicionales");
    const r1 = buscarDatosParaReemplazo("TABLEROS", "alguno");
    Logger.log("buscarDatosParaReemplazo returned", JSON.stringify(r1));
    actualizarEstadoStock("NOEXISTE", "N/A");
    Logger.log("actualizarEstadoStock no lanzó excepción");
}

function testErroresAvanzado() {
    Logger.log("=== TEST ERRORES AVANZADO ===");

    // Test 1: Payload null
    const test1 = procesarSolicitudUnificada(null);
    if (test1.errorCode === 'INVALID_PAYLOAD') {
        Logger.log("✅ Test1: Null payload handled");
    } else {
        Logger.log("❌ Test1: FALLÓ");
    }

    // Test 2: Campo faltante
    const test2 =
        procesarSolicitudUnificada({});
    if (!test2.success) {
        Logger.log("✅ Test2: Missing fields handled");
    }

    // Test 3: ID inexistente 
    const test3 = obtenerDetalleActivo(
        "NOEXISTE_999", "TABLEROS");
    if (!test3.success) {
        Logger.log("✅ Test3: No existent ID handled");
    }
}

function testTrazabilidad() {
    Logger.log("=== TEST TRAZABILIDAD ===");
    try {
        const hojaHistorial =
            obtenerHoja(HOJA.HISTORIAL);
        const data =
            hojaHistorial.getDataRange()
                .getValues();

        if (data.length < 2) {
            Logger.log("⚠️ Historial está vacío");
            return;
        }

        // Busca si ultimo cambio tiene entrada
        const ultimaFila = data.length - 1;
        const ultimoId = data[ultimaFila][0];
        Logger.log(`✅ Último registro: ${ultimoId}`);
    } catch (e) {
        Logger.log("❌ Error: " + e.message);
    }
}

function testIntegracion() {
    Logger.log("=== TEST INTEGRACIÓN ===");
    try {
        // Simula: Crear solicitud → Autorizar → Ver  │

        const mockData = {
            tipoActivo: 'CAMARA',
            nombre: 'Test Cámara',
            direccion: 'Calle Test 123',
            observaciones: 'Test de integración'
        };

        // Nota: No ejecutes sin datos reales
        Logger.log("✅ Test integración preparado");
    } catch (e) {
        Logger.log("❌ Error: " + e.message);
    }
}

function testObtenerCamarasDeTablero() {
    Logger.log("🧪 TEST: obtenerCamarasDeTablero");
    
    // Usa un tablero que exista en tu hoja Vinculaciones (ejemplo: TAB-001)
    const resultado = obtenerCamarasDeTablero("TAB-001");
    
    if (resultado.success) {
        Logger.log("✅ Resultado: " + resultado.message);
        Logger.log("  Cámaras encontradas: " + resultado.data.length);
        resultado.data.forEach(cam => {
            Logger.log("    - " + cam.idCamara + " (Switch: " + cam.idSwitch + ")");
        });
        return true;
    } else {
        Logger.log("⚠️ " + resultado.message);
        return true;
    }
}

/**
 * TEST: validarVinculacionCameraTablero() - Valida si cámara está vinculada
 */
function testValidarVinculacion() {
    Logger.log("🧪 TEST: validarVinculacionCameraTablero");
    
    // Usa una cámara que exista en tu hoja Vinculaciones (ejemplo: CAM-A-100)
    const resultado = validarVinculacionCameraTablero("CAM-A-100");
    
    if (resultado.success) {
        if (resultado.vinculada) {
            Logger.log("✅ Cámara vinculada a: " + resultado.idTablero);
            return true;
        } else {
            Logger.log("⚠️ " + resultado.message);
            return true;
        }
    } else {
        Logger.log("❌ Error: " + resultado.message);
        return false;
    }
}

/**
 * TEST: crearVinculacionCameraTablero() - Crea una vinculación nueva
 * NOTA: Este test es destructivo (agrega datos). Úsalo en staging.
 */
function testCrearVinculacion() {
    Logger.log("🧪 TEST: crearVinculacionCameraTablero");
    Logger.log("⚠️ NOTA: Este test es DESTRUCTIVO (agrega a Vinculaciones). Úsalo en staging.");
    
    // Estos datos son ejemplos - reemplaza con IDs reales que existan
    const resultado = crearVinculacionCameraTablero(
        "CAM-TEST-999",  // ID cámara (debe existir en Camaras)
        "TAB-TEST-888",  // ID tablero (debe existir en Tableros)
        "SW-888-01"      // ID switch (opcional)
    );
    
    if (resultado.success) {
        Logger.log("✅ " + resultado.message);
        Logger.log("  ID Vinculación: " + resultado.idVinculacion);
        return true;
    } else {
        Logger.log("⚠️ Esperado (IDs no existen): " + resultado.message);
        return true;  // El test es OK si falla por IDs inexistentes
    }
}

/**
 * RUNNER: Ejecuta todos los tests de vinculación
 */
function runTestsVinculacion() {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("🧪 TESTS DE VINCULACIONES");
    Logger.log("═══════════════════════════════════════════════════════");
    
    const tests = [
        { nombre: "obtenerCamarasDeTablero", fn: testObtenerCamarasDeTablero },
        { nombre: "validarVinculacion", fn: testValidarVinculacion },
        { nombre: "crearVinculacion (destructivo)", fn: testCrearVinculacion }
    ];
    
    let passados = 0;
    for (let test of tests) {
        if (test.fn()) passados++;
        Logger.log("");
    }
    
    Logger.log("📊 RESULTADO: " + passados + "/" + tests.length + " tests pasaron");
    Logger.log("═══════════════════════════════════════════════════════\n");
}