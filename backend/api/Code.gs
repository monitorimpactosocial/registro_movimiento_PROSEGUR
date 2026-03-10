// IDs proveídos por PARACEL
const SHEET_ID = '1I0koYNQswuNJVT6I8zTS5TYVxxE4r2eUtUFp6uEfZT8';
const FOLDER_ID = '1g9eb1fIAj2VlM1A6tYBXasu57nWraEZH';

function doPost(e) {
  // Conectar a la planilla específica
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetEntradas = ss.getSheetByName('Movimientos') || ss.insertSheet('Movimientos');
  const sheetEventos = ss.getSheetByName('Eventos') || ss.insertSheet('Eventos');

  // Inicializar cabeceras si las hojas están vacías
  if (sheetEntradas.getLastRow() === 0) {
    sheetEntradas.appendRow(['ID', 'Timestamp', 'Sincronizado', 'Puesto', 'Registrante', 'Tipo', 'Transeúnte', 'Documento', 'Cantidad Acompañantes', 'Detalle Acompañantes', 'Sexo', 'Medio Transporte', 'Origen', 'Destino', 'Motivo', 'Observaciones']);
  }
  if (sheetEventos.getLastRow() === 0) {
    sheetEventos.appendRow(['ID', 'Timestamp', 'Sincronizado', 'Puesto', 'Registrante', 'Tipo Evento', 'Fecha', 'Hora', 'Lugar', 'Descripción', 'Gravedad', 'Involucrados', 'Vehículo', 'Link Evidencia']);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const dateSynced = new Date().toISOString();

    // 1. Procesar Movimientos (Entradas/Salidas)
    if (data.movimientos && data.movimientos.length > 0) {
      const rowData = data.movimientos.map(item => {
        const p = item.payload;
        return [
          item.id,
          item.timestamp,
          dateSynced,
          p.puesto_control,
          p.registrante,
          p.tipo_movimiento,
          p.transeunte_nombre,
          p.transeunte_doc,
          p.acompanantes,
          p.detalle_acompanantes || 'Ninguno',
          p.sexo,
          p.medio_transporte,
          p.origen,
          p.destino,
          p.motivo,
          p.observaciones
        ];
      });
      sheetEntradas.getRange(sheetEntradas.getLastRow() + 1, 1, rowData.length, rowData[0].length).setValues(rowData);
    }

    // 2. Procesar Eventos y Archivos Adjuntos
    if (data.eventos && data.eventos.length > 0) {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      
      const rowDataEventos = data.eventos.map(item => {
        const p = item.payload;
        let fileUrl = "";

        // Proceso de subida de imagen de evidencia si existe (base64)
        if (p.evidencia_base64) {
           try {
              // Parse data URI: data:image/png;base64,iVBORw0K...
              const mimeMatch = p.evidencia_base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
              let mimeType = 'image/jpeg'; // default
              let b64Data = p.evidencia_base64;
              
              if (mimeMatch && mimeMatch.length > 1) {
                  mimeType = mimeMatch[1];
                  b64Data = p.evidencia_base64.split(',')[1]; 
              }

              const decoded = Utilities.base64Decode(b64Data);
              const extension = mimeType.split('/')[1] || 'img';
              const fileName = `EVID_EVT_${item.id.split('-')[0]}.${extension}`;
              
              const blob = Utilities.newBlob(decoded, mimeType, fileName);
              const file = folder.createFile(blob);
              fileUrl = file.getUrl();
           } catch(err) {
              fileUrl = "Error al subir adjunto: " + err.toString();
           }
        }

        return [
          item.id,
          item.timestamp,
          dateSynced,
          p.puesto_control,
          p.registrante,
          p.tipo_evento,
          p.fecha_evento,
          p.hora_evento,
          p.lugar_evento,
          p.descripcion_evento,
          p.nivel_gravedad,
          p.cantidad_involucrados,
          p.medio_transporte,
          fileUrl  // Link a la foto en Drive
        ];
      });
      sheetEventos.getRange(sheetEventos.getLastRow() + 1, 1, rowDataEventos.length, rowDataEventos[0].length).setValues(rowDataEventos);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Registros y adjuntos guardados correctamente.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para evitar errores de CORS en el Preflight request
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ------------------------------------------------------------------------
// DASHBOARD ADMIN ESTADÍSTICO (METODO GET)
// ------------------------------------------------------------------------

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Estadísticas
    const stats = {
      entradasTotales: 0,
      salidasTotales: 0,
      eventosTotales: 0,
      eventosRecientes: []
    };

    // 1. Contar Movimientos
    const sheetMov = ss.getSheetByName('Movimientos');
    if (sheetMov && sheetMov.getLastRow() > 1) {
      const dataMov = sheetMov.getDataRange().getValues();
      // Empezamos en 1 para saltar cabeceras
      for (let i = 1; i < dataMov.length; i++) {
        const tipo = dataMov[i][5];
        if (tipo === 'entrada') stats.entradasTotales++;
        if (tipo === 'salida') stats.salidasTotales++;
      }
    }

    // 2. Contar Eventos y extraer los 10 más recientes
    const sheetEvt = ss.getSheetByName('Eventos');
    if (sheetEvt && sheetEvt.getLastRow() > 1) {
      const dataEvt = sheetEvt.getDataRange().getValues();
      stats.eventosTotales = dataEvt.length - 1;

      // Iteramos al revés para agarrar los más nuevos (basado en el orden de fila)
      for (let i = dataEvt.length - 1; i > 0 && stats.eventosRecientes.length < 10; i--) {
        stats.eventosRecientes.push({
          fecha: Utilities.formatDate(new Date(dataEvt[i][1]), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
          puesto: dataEvt[i][3],
          tipo: dataEvt[i][5],
          descripcion: dataEvt[i][9],
          gravedad: dataEvt[i][10],
          foto: dataEvt[i][13]
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: stats
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------------------
// ENVÍO DE CORREOS DIARIOS (CRON JOB)
// ------------------------------------------------------------------------

function enviarReporteDiario() {
  const destinatarios = "diego.meza@paracel.com.py, noelia.mendoza@paracel.com.py";
  const hoy = new Date();
  const fechaStr = Utilities.formatDate(hoy, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Analizar Movimientos
  const sheetMov = ss.getSheetByName('Movimientos');
  let conteoEntradas = 0;
  let conteoSalidas = 0;
  
  if (sheetMov && sheetMov.getLastRow() > 1) {
    const dataMov = sheetMov.getDataRange().getValues();
    for (let i = 1; i < dataMov.length; i++) {
        const rowDate = dataMov[i][2]; // Columna Sincronizado (C)
        if (rowDate && rowDate.toString().includes(fechaStr)) {
            if (dataMov[i][5] === 'entrada') conteoEntradas++;
            if (dataMov[i][5] === 'salida') conteoSalidas++;
        }
    }
  }

  // Analizar Eventos
  const sheetEvt = ss.getSheetByName('Eventos');
  let conteoEventos = 0;
  let eventosCriticosHTML = "";
  
  if (sheetEvt && sheetEvt.getLastRow() > 1) {
    const dataEvt = sheetEvt.getDataRange().getValues();
    for (let i = 1; i < dataEvt.length; i++) {
        const rowDate = dataEvt[i][2]; // Columna Sincronizado (C)
        if (rowDate && rowDate.toString().includes(fechaStr)) {
            conteoEventos++;
            const gravedad = dataEvt[i][10];
            const tipo = dataEvt[i][5];
            const desc = dataEvt[i][9];
            const puesto = dataEvt[i][3];
            const linkFoto = dataEvt[i][13];
            
            let htmlFoto = linkFoto.startsWith('http') ? ` <a href="${linkFoto}" style="font-size:12px;">[Ver Foto]</a>` : '';

            if (gravedad === 'alta' || gravedad === 'critica' || gravedad === 'crítica') {
                eventosCriticosHTML += `<li style="margin-bottom: 5px;"><strong>[${gravedad.toUpperCase()}] ${tipo}</strong> en ${puesto}: ${desc}${htmlFoto}</li>`;
            }
        }
    }
  }

  if (conteoEntradas === 0 && conteoSalidas === 0 && conteoEventos === 0) {
      console.log("No hubieron registros sincronizados en la fecha: " + fechaStr);
      return; 
  }

  const asunto = `[PROSEGUR] Reporte Diario de Accesos y Eventos - ${fechaStr}`;
  let cuerpoHTML = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #00763C;">Resumen Operativo Diario - PROSEGUR</h2>
      <p>Estimados,<br><br>A continuación se presenta el resumen de las operaciones y registros sincronizados el día <strong>${fechaStr}</strong> en los puestos de control de PARACEL:</p>
      
      <table style="border-collapse: collapse; width: 50%; margin-bottom: 20px;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Entradas Registradas</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${conteoEntradas}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Salidas Registradas</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${conteoSalidas}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; background-color: #fcf0e8;"><strong>Eventos / Novedades</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;"><strong>${conteoEventos}</strong></td>
        </tr>
      </table>
  `;

  if (eventosCriticosHTML !== "") {
    cuerpoHTML += `
      <h3 style="color: #d9534f;">Novedades Destacadas (Alta / Crítica)</h3>
      <ul style="border-left: 4px solid #d9534f; padding-left: 20px; background-color: #f9f2f2; padding-top: 10px; padding-bottom: 10px;">
        ${eventosCriticosHTML}
      </ul>
    `;
  }

  cuerpoHTML += `
      <p style="font-size: 12px; color: #777; margin-top: 30px;">
        Este es un mensaje automático generado por el Sistema de Registro Offline de PROSEGUR.<br>
        Monitoreo de Impacto Social - PARACEL S.A.<br>
        <a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}">Ver Base de Datos Completa</a>
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: destinatarios,
    subject: asunto,
    htmlBody: cuerpoHTML
  });
  
  console.log("Reporte diario enviado con éxito.");
}
