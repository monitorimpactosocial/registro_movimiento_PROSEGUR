// IDs proveídos por PARACEL para PROSEGUR
const SHEET_ID = '1I0koYNQswuNJVT6I8zTS5TYVxxE4r2eUtUFp6uEfZT8';
// El ID de la carpeta no está claro en tu requerimiento actual de refactor, asumo mantener el anterior
const FOLDER_ID = '1g9eb1fIAj2VlM1A6tYBXasu57nWraEZH'; 

const CACHE_TIME = 28800; // 8 horas en segundos para la expiración del token

// ------------------------------------------------------------------------
// ROUTER PRINCIPAL (NUNCA DEVOLVER HtmlService AHORA, SIEMPRE JSON)
// ------------------------------------------------------------------------
function doPost(e) {
  try {
    let rawData;
    let requestData = {};

    // 1. Parsear el cuerpo de la petición HTTP POST
    if (e && e.postData && e.postData.contents) {
      rawData = e.postData.contents;
      try {
        requestData = JSON.parse(rawData);
      } catch (parseErr) {
        throw new Error("El body no es JSON válido: " + parseErr.message);
      }
    } else {
      throw new Error("No se recibieron datos en el POST body.");
    }

    const accion = requestData.accion;

    // 2. Rutas Públicas (No requieren Token)
    if (accion === 'verificarLogin') {
      return jsonResponse(verificarLogin(requestData.user, requestData.pass));
    }

    // 3. Verificación de Seguridad por Token
    const token = requestData.token;
    if (!token) {
      return jsonResponse({ authError: true, success: false, message: "Token de acceso no proporcionado." });
    }

    const sessionUser = validarToken(token);
    if (!sessionUser) {
      return jsonResponse({ authError: true, success: false, message: "Sesión expirada o token inválido." });
    }

    // 4. Inyectamos la sesión autenticada en el payload para uso del controlador
    requestData.sessionUser = sessionUser;

    // 5. Rutas Privadas (Requieren Token Válido)
    switch (accion) {
      case 'getDashboardData':
        // Solo administradores pueden ver el dashboard gerencial
        if (sessionUser.rol !== 'admin') {
           return jsonResponse({ success: false, message: "Acceso denegado. Se requiere rol de administrador." });
        }
        return jsonResponse(getDashboardData());

      case 'sincronizarRegistros':
        return jsonResponse(procesarSincronizacion(requestData));

      default:
        throw new Error(`Acción '${accion}' desconocida.`);
    }

  } catch (error) {
    return jsonResponse({
      success: false,
      message: "Error del servidor: " + error.toString(),
      stack: error.stack
    });
  }
}

// Responder a visitas directas en el navegador (Evita error "No se encontró doGet")
function doGet(e) {
  return ContentService.createTextOutput("API PROSEGUR V2 - Backend Activo y Seguro.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Permitir solicitudes de pre-vuelo CORS (Modo PWA)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Función auxiliar para emitir respuestas JSON estandarizadas
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------------
// SISTEMA DE SEGURIDAD Y SESIONES (CacheService)
// ------------------------------------------------------------------------

function verificarLogin(user, pass) {
  // Hardcoded simple authentication based on previous PROSEGUR logic
  // En producción real, esto buscaría en una pestaña "Usuarios" del Sheet
  let authUser = null;

  if (user === 'prosegur' && pass === 'pr0segur2026') {
    authUser = { id: 1, nombre: 'Guardia Puesto', rol: 'guardia' };
  } else if (user === 'paracel' && pass === 'parac3l2026') {
    authUser = { id: 2, nombre: 'Administrador PARACEL', rol: 'admin' };
  } else if (user === 'diego' && pass === 'diego2026') {
    authUser = { id: 3, nombre: 'Diego Meza', rol: 'admin' };
  } else if (user === 'user' && pass === '123') {
    authUser = { id: 4, nombre: 'Admin Temporal', rol: 'admin' };
  }

  if (authUser) {
    // Generar un UUID único para el Token de Sesión
    const token = Utilities.getUuid();
    
    // Guardar en la Base de Datos RAM temporal de Google (Cache)
    const cache = CacheService.getScriptCache();
    cache.put(token, JSON.stringify(authUser), CACHE_TIME);

    return { 
      success: true, 
      token: token, 
      user: authUser 
    };
  }

  return { success: false, message: "Usuario o contraseña incorrectos." };
}

function validarToken(token) {
  const cache = CacheService.getScriptCache();
  const userDataJSON = cache.get(token);
  if (userDataJSON) {
    return JSON.parse(userDataJSON);
  }
  return null;
}

// ------------------------------------------------------------------------
// CONTROLADOR: OBTENER DATOS DEL DASHBOARD MODO JSON PURO
// ------------------------------------------------------------------------

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const stats = {
    entradasTotales: 0,
    salidasTotales: 0,
    eventosTotales: 0,
    eventosRecientes: []
  };

  const sheetMov = ss.getSheetByName('Movimientos');
  if (sheetMov && sheetMov.getLastRow() > 1) {
    const dataMov = sheetMov.getDataRange().getValues();
    for (let i = 1; i < dataMov.length; i++) {
       const tipo = String(dataMov[i][5] || "").trim().toLowerCase();
       if (tipo === 'entrada') stats.entradasTotales++;
       if (tipo === 'salida') stats.salidasTotales++;
    }
  }

  const sheetEvt = ss.getSheetByName('Eventos');
  if (sheetEvt && sheetEvt.getLastRow() > 1) {
    const dataEvt = sheetEvt.getDataRange().getValues();
    stats.eventosTotales = dataEvt.length - 1;

    for (let i = dataEvt.length - 1; i > 0 && stats.eventosRecientes.length < 15; i--) {
      try {
          const rawDate = dataEvt[i][6]; // Fecha del evento (Header: 'Fecha' en col G)
          const dateObj = new Date(rawDate);
          let formattedDate = rawDate;
          if (!isNaN(dateObj.getTime())) {
             formattedDate = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
          }
          
          let hora = String(dataEvt[i][7] || "");
          if (hora) formattedDate += " " + hora;

          stats.eventosRecientes.push({
            fecha: formattedDate,
            puesto: dataEvt[i][3],       // Puesto
            tipo: dataEvt[i][5],         // Tipo Evento
            descripcion: dataEvt[i][9],  // Descripción
            gravedad: dataEvt[i][10],    // Gravedad
            foto: dataEvt[i][13]         // Link Evidencia
          });
      } catch(e) {
          // Ignorar fila si hay error de fecha
      }
    }
  }

  return { success: true, data: stats };
}

// ------------------------------------------------------------------------
// CONTROLADOR: PROCESAR SINCRONIZACIÓN DE REGISTROS PENDIENTES
// ------------------------------------------------------------------------

function procesarSincronizacion(requestData) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetEntradas = ss.getSheetByName('Movimientos') || ss.insertSheet('Movimientos');
  const sheetEventos = ss.getSheetByName('Eventos') || ss.insertSheet('Eventos');
  
  const dateSynced = new Date().toISOString();
  let uploadedEntradas = 0;
  let uploadedEventos = 0;

  // 1. Guardar Movimientos (Entradas / Salidas)
  if (requestData.movimientos && requestData.movimientos.length > 0) {
    const rowData = requestData.movimientos.map(item => {
      const p = item.payload;
      return [
        item.id,
        item.timestamp,
        dateSynced,
        p.puesto_control,
        requestData.sessionUser.nombre, // Inyectamos el nombre validado del token por seguridad (Antispoofing)
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
    uploadedEntradas = rowData.length;
  }

  // 2. Guardar Eventos (Con conversión de imágenes Base64)
  if (requestData.eventos && requestData.eventos.length > 0) {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    const rowDataEventos = requestData.eventos.map(item => {
      const p = item.payload;
      let fileUrl = "";

      if (p.evidencia_base64) {
         try {
            const mimeMatch = p.evidencia_base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
            let mimeType = 'image/jpeg';
            let b64Data = p.evidencia_base64;
            
            if (mimeMatch && mimeMatch.length > 1) {
                mimeType = mimeMatch[1];
                b64Data = p.evidencia_base64.split(',')[1]; 
            }

            const decoded = Utilities.base64Decode(b64Data);
            const extension = mimeType.split('/')[1] || 'img';
            const evtId = (item.id && typeof item.id === 'string') ? item.id.split('-')[0] : new Date().getTime();
            const fileName = "EVID_EVT_" + evtId + "." + extension;            
            const blob = Utilities.newBlob(decoded, mimeType, fileName);
            const file = folder.createFile(blob);
            fileUrl = file.getUrl();
         } catch(err) {
            fileUrl = "Error adjunto: " + err.toString();
         }
      }

      return [
        item.id,
        item.timestamp,
        dateSynced,
        p.puesto_control,
        requestData.sessionUser.nombre, // Inyectado
        p.tipo_evento,
        p.fecha_evento,
        p.hora_evento,
        p.lugar_evento,
        p.descripcion_evento,
        p.nivel_gravedad,
        p.cantidad_involucrados,
        p.medio_transporte,
        fileUrl
      ];
    });
    sheetEventos.getRange(sheetEventos.getLastRow() + 1, 1, rowDataEventos.length, rowDataEventos[0].length).setValues(rowDataEventos);
    uploadedEventos = rowDataEventos.length;
  }

  return { 
    success: true, 
    message: "Data enviada al servidor remoto correctamente.",
    detalles: { movimientos: uploadedEntradas, eventos: uploadedEventos }
  };
}
