//8_Informes.gs
/** Genera el informe PDF a partir de los datos filtrados y lo devuelve en Base64. */
function generarInformePDF(filters) {
    try {
        const filas = obtenerTablerosFiltrados(filters);
        const usuario = usuarioActivo();
        const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

        if (!filas || filas.length === 0) {
            const errorHtml = '<html><body><h2>No hay datos para mostrar</h2></body></html>';
            return Utilities.base64Encode(Utilities.newBlob(errorHtml, 'text/html').getBytes());
        }

        let html = '<!doctype html><html><head><style>body{font-family:Arial;font-size:10px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:5px} th{background-color:#eee}</style></head><body>';
        html += `<h2>Informe de Tableros - Cantidad: ${filas.length}</h2>`;
        html += `<p>Generado por: ${usuario} | Fecha: ${fecha}</p>`;
        html += '<table><tr><th>ID</th><th>Dirección</th><th>Estado</th><th>Energía</th><th>Conectividad</th><th>Proveedor</th><th>Tipo</th><th>Marcado</th></tr>';

        filas.forEach(r => {
            html += `<tr>
                <td>${r.id || '-'}</td>
                <td>${r.direccion || '-'}</td>
                <td>${r.estado || '-'}</td>
                <td>${r.energia || '-'}</td>
                <td>${r.conectividad || '-'}</td>
                <td>${r.proveedor || ''}</td>
                <td>${r.tipo || 'TABLERO'}</td>
                <td>${r.marcado || 'NO'}</td>
            </tr>`;
        });
        html += '</table></body></html>';

        const pdf = Utilities.newBlob(html, 'text/html', 'informe.html').getAs('application/pdf');
        pdf.setName(`Informe_${Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd_HHmm")}.pdf`);

        registrarHistorial('Descarga Informe', 'TODAS', 'INFORME', `Informe generado: ${filas.length} registros`, usuario, 'SISTEMA');

        return Utilities.base64Encode(pdf.getBytes());
    } catch (e) {
        Logger.log('Error en generarInformePDF: ' + e);
        throw e;
    }
}