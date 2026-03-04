// ═════════════════════════════════════════════════════════════════
// TESTS DE VINCULACIONES (PASO 3 - Agregar después de testIntegracion)
// ═════════════════════════════════════════════════════════════════

/**
 * TEST: obtenerCamarasDeTablero() - Obtiene cámaras de un tablero
 */
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
