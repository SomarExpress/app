// Code.gs - Sistema Completo con CORS configurado
// Sheet ID: 1Pu6yB-H6RuutRqqDjUPewDRP5mu-lZQAq-q2vCd2QAc

const SHEET_ID = '1Pu6yB-H6RuutRqqDjUPewDRP5mu-lZQAq-q2vCd2QAc';

function doGet(e) {
  // COMERCIOS: Verificar cÃ³digo
  if (e.parameter.action === 'verificarCodigoComercio') {
    const result = verificarCodigoComercio(e.parameter.numero, e.parameter.codigo);
    return createCorsResponse(result);
  }
  
  // COMERCIOS: Completar registro
  if (e.parameter.action === 'completarRegistroComercio') {
    const datos = {
      celular: e.parameter.celular,
      nombre: e.parameter.nombre,
      direccion: e.parameter.direccion,
      ubicacionGPS: e.parameter.ubicacionGPS
    };
    const result = completarRegistroComercio(datos);
    return createCorsResponse(result);
  }
  
  // COMERCIOS: Obtener envÃ­os/solicitudes
  if (e.parameter.action === 'obtenerEnviosComercio') {
    const result = obtenerEnviosComercio(e.parameter.idComercio);
    return createCorsResponse(result);
  }
  
  // NUEVO: Obtener ubicaciones frecuentes
  if (e.parameter.action === 'obtenerUbicacionesFrecuentes') {
    const result = obtenerUbicacionesFrecuentes();
    return createCorsResponse(result);
  }
  
  // CLIENTES: Verificar cÃ³digo
  if (e.parameter.action === 'verificarCodigo') {
    const result = verificarCodigo(e.parameter.numero, e.parameter.codigo);
    return createCorsResponse(result);
  }
  
  // CLIENTES: Completar registro
  if (e.parameter.action === 'completarRegistro') {
    const datos = {
      celular: e.parameter.celular,
      nombre: e.parameter.nombre,
      direccion: e.parameter.direccion,
      ubicacionGPS: e.parameter.ubicacionGPS
    };
    const result = completarRegistro(datos);
    return createCorsResponse(result);
  }
  
  // CLIENTES: Obtener perfil
  if (e.parameter.action === 'obtenerPerfil') {
    const result = obtenerPerfil(e.parameter.celular);
    return createCorsResponse(result);
  }
  
  // Obtener datos de delivery
  if (e.parameter.action === 'getData') {
    return createCorsResponse(getData());
  }
  
  // Servir HTML
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Somar Express')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    Logger.log('POST recibido');
    const params = JSON.parse(e.postData.contents);
    Logger.log('Action: ' + params.action);
    
    // COMERCIOS: Enviar cÃ³digo
    if (params.action === 'enviarCodigoVerificacionComercio') {
      const resultado = enviarCodigoVerificacion(params.numero, 'COMERCIO');
      return createCorsResponse(resultado);
    }
    
    // COMERCIOS: Registrar envÃ­o
    if (params.action === 'registrarEnvioComercio') {
      Logger.log('ðŸ“¦ Registrando envÃ­o/entrega...');
      const result = registrarEnvioComercio(params.datos);
      return createCorsResponse(result);
    }
    
    // CLIENTES: Enviar cÃ³digo
    if (params.action === 'enviarCodigoVerificacion') {
      const resultado = enviarCodigoVerificacion(params.numero, 'CLIENTE');
      return createCorsResponse(resultado);
    }
    
    // CLIENTES: Registrar pedido
    if (params.action === 'registrarPedido') {
      Logger.log('ðŸ›’ Registrando pedido...');
      const result = registrarPedido(params.datos);
      return createCorsResponse(result);
    }
    
    // WhatsApp
    if (params.action === 'enviarWhatsApp') {
      Logger.log('ðŸ“± Enviando WhatsApp...');
      const resultado = enviarWhatsAppBuilderBot(
        params.numero,
        params.mensaje,
        params.imagenUrl || null
      );
      return createCorsResponse(resultado);
    }
    
    Logger.log('âš ï¸ AcciÃ³n no vÃ¡lida: ' + params.action);
    return createCorsResponse({ 
      success: false, 
      error: 'AcciÃ³n no vÃ¡lida: ' + params.action 
    });
      
  } catch (error) {
    Logger.log('âŒ Error en doPost: ' + error.toString());
    return createCorsResponse({ 
      success: false, 
      error: error.toString()
    });
  }
}

// ============================================
// FUNCIÃ“N CORS - CRÃTICA
// ============================================

function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

// ============================================
// NUEVA FUNCIÃ“N: OBTENER UBICACIONES FRECUENTES
// ============================================

function obtenerUbicacionesFrecuentes() {
  try {
    Logger.log('ðŸ“ === OBTENIENDO UBICACIONES FRECUENTES ===');
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ubicaciones = [];
    
    // 1. OBTENER COMERCIOS
    const comerciosSheet = ss.getSheetByName('COMERCIOS');
    if (comerciosSheet) {
      const comerciosData = comerciosSheet.getDataRange().getValues();
      const comerciosHeaders = comerciosData[0];
      
      const nombreIdx = comerciosHeaders.indexOf('COMERCIO');
      const direccionIdx = comerciosHeaders.indexOf('DIRECCION');
      const gpsIdx = comerciosHeaders.findIndex(h => 
        h === 'GPS COMERCIO' || h === 'GPS_COMERCIO' || h === 'GPS' || h === 'GPS COORDENADAS'
      );
      
      Logger.log('Comercios - Ãndices: nombre=' + nombreIdx + ', direcciÃ³n=' + direccionIdx + ', gps=' + gpsIdx);
      
      for (let i = 1; i < comerciosData.length; i++) {
        const row = comerciosData[i];
        const nombre = row[nombreIdx];
        const direccion = row[direccionIdx];
        const gps = row[gpsIdx];
        
        if (nombre && gps && String(gps).trim() !== '') {
          ubicaciones.push({
            tipo: 'COMERCIO',
            nombre: nombre,
            descripcion: direccion || '',
            ubicacion: String(gps).trim()
          });
        }
      }
      
      Logger.log('âœ… Comercios encontrados: ' + (comerciosData.length - 1));
    }
    
    // 2. OBTENER UBICACIONES FRECUENTES
    const ubicacionesSheet = ss.getSheetByName('UBICACIONES FRECUENTES');
    if (ubicacionesSheet) {
      const ubicacionesData = ubicacionesSheet.getDataRange().getValues();
      const ubicacionesHeaders = ubicacionesData[0];
      
      const ubicacionIdx = ubicacionesHeaders.indexOf('UBICACION');
      const descripcionIdx = ubicacionesHeaders.indexOf('DESCRIPCION');
      
      Logger.log('Ubicaciones - Ãndices: ubicacion=' + ubicacionIdx + ', descripcion=' + descripcionIdx);
      
      for (let i = 1; i < ubicacionesData.length; i++) {
        const row = ubicacionesData[i];
        const ubicacion = row[ubicacionIdx];
        const descripcion = row[descripcionIdx];
        
        if (ubicacion && String(ubicacion).trim() !== '') {
          ubicaciones.push({
            tipo: 'FRECUENTE',
            nombre: descripcion || 'UbicaciÃ³n #' + i,
            descripcion: descripcion || '',
            ubicacion: String(ubicacion).trim()
          });
        }
      }
      
      Logger.log('âœ… Ubicaciones frecuentes: ' + (ubicacionesData.length - 1));
    }
    
    Logger.log('âœ… Total ubicaciones: ' + ubicaciones.length);
    
    return {
      success: true,
      ubicaciones: ubicaciones
    };
    
  } catch (error) {
    Logger.log('âŒ Error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      ubicaciones: []
    };
  }
}

// ============================================
// AUTENTICACIÃ“N GENERAL
// ============================================

function enviarCodigoVerificacion(numero, tipo) {
  try {
    Logger.log('ðŸ“± === ENVIANDO CÃ“DIGO ===');
    Logger.log('Tipo: ' + tipo);
    Logger.log('NÃºmero: ' + numero);
    
    let numeroLimpio = numero.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    Logger.log('ðŸ”¢ CÃ³digo: ' + codigo);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let codigosSheet = ss.getSheetByName('CODIGOS_VERIFICACION');
    
    if (!codigosSheet) {
      codigosSheet = ss.insertSheet('CODIGOS_VERIFICACION');
      codigosSheet.appendRow(['NUMERO', 'CODIGO', 'TIMESTAMP', 'USADO', 'TIPO']);
      const headerRange = codigosSheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#FF8C00');
      headerRange.setFontColor('#FFFFFF');
    }
    
    codigosSheet.appendRow([numeroLimpio, codigo, new Date(), false, tipo]);
    
    const mensaje = 
      `ðŸ” *CÃ“DIGO DE VERIFICACIÃ“N*\n\n` +
      `Tu cÃ³digo para ${tipo === 'COMERCIO' ? 'Panel Comercios' : 'Somar Express'} es:\n\n` +
      `*${codigo}*\n\n` +
      `â±ï¸ VÃ¡lido por 10 minutos.\n\n` +
      `_Somar Express - Delivery_`;
    
    enviarWhatsAppBuilderBot(numeroLimpio, mensaje, null);
    
    return { success: true, message: 'CÃ³digo enviado' };
    
  } catch (error) {
    Logger.log('âŒ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// COMERCIOS - AUTENTICACIÃ“N
// ============================================

function verificarCodigoComercio(numero, codigoIngresado) {
  try {
    Logger.log('ðŸ” === VERIFICANDO CÃ“DIGO COMERCIO ===');
    
    let numeroLimpio = numero.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const codigosSheet = ss.getSheetByName('CODIGOS_VERIFICACION');
    
    if (!codigosSheet) {
      return { success: false, error: 'No se encontraron cÃ³digos' };
    }
    
    const data = codigosSheet.getDataRange().getValues();
    const ahora = new Date();
    
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const numeroRow = row[0].toString();
      const codigoRow = row[1].toString();
      const timestampRow = new Date(row[2]);
      const usado = row[3];
      const tipo = row[4];
      
      if (numeroRow === numeroLimpio && codigoRow === codigoIngresado && !usado && tipo === 'COMERCIO') {
        const minutosTranscurridos = (ahora - timestampRow) / 1000 / 60;
        
        if (minutosTranscurridos <= 10) {
          codigosSheet.getRange(i + 1, 4).setValue(true);
          
          const comerciosSheet = ss.getSheetByName('COMERCIOS_USUARIOS');
          let comercioExiste = false;
          let datosComercio = null;
          
          if (comerciosSheet) {
            const comerciosData = comerciosSheet.getDataRange().getValues();
            
            for (let j = 1; j < comerciosData.length; j++) {
              const celularEnSheet = comerciosData[j][1].toString();
              
              if (celularEnSheet === numeroLimpio) {
                comercioExiste = true;
                datosComercio = {
                  id: comerciosData[j][0],
                  celular: comerciosData[j][1],
                  nombre: comerciosData[j][2],
                  direccion: comerciosData[j][3],
                  ubicacionGPS: comerciosData[j][4],
                  fechaRegistro: comerciosData[j][5]
                };
                break;
              }
            }
          }
          
          return {
            success: true,
            comercioExiste: comercioExiste,
            datosComercio: datosComercio
          };
        } else {
          return { success: false, error: 'CÃ³digo expirado' };
        }
      }
    }
    
    return { success: false, error: 'CÃ³digo incorrecto' };
    
  } catch (error) {
    Logger.log('âŒ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function completarRegistroComercio(datos) {
  try {
    Logger.log('ðŸ“ === REGISTRANDO COMERCIO ===');
    
    let numeroLimpio = datos.celular.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let comerciosSheet = ss.getSheetByName('COMERCIOS_USUARIOS');
    
    if (!comerciosSheet) {
      comerciosSheet = ss.insertSheet('COMERCIOS_USUARIOS');
      comerciosSheet.appendRow([
        'ID_COMERCIO',
        'CELULAR',
        'NOMBRE',
        'DIRECCION',
        'UBICACION_GPS',
        'FECHA_REGISTRO'
      ]);
      
      const headerRange = comerciosSheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#FF8C00');
      headerRange.setFontColor('#FFFFFF');
    }
    
    const lastRow = comerciosSheet.getLastRow();
    const idComercio = lastRow === 1 ? 1 : comerciosSheet.getRange(lastRow, 1).getValue() + 1;
    
    comerciosSheet.appendRow([
      idComercio,
      numeroLimpio,
      datos.nombre || '',
      datos.direccion || '',
      datos.ubicacionGPS || '',
      new Date()
    ]);
    
    Logger.log('âœ… Comercio registrado: ' + idComercio);
    
    return {
      success: true,
      comercio: {
        id: idComercio,
        celular: numeroLimpio,
        nombre: datos.nombre,
        direccion: datos.direccion,
        ubicacionGPS: datos.ubicacionGPS
      }
    };
    
  } catch (error) {
    Logger.log('âŒ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// COMERCIOS - GESTIÃ“N DE ENVÃOS
// â­ FUNCIONES CORREGIDAS CON ENVIOS_COMERCIOS
// ============================================

function registrarEnvioComercio(datos) {
  try {
    Logger.log('ðŸ“ === REGISTRANDO ENVÃO ===');
    Logger.log('Datos recibidos: ' + JSON.stringify(datos));
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('ENVIOS_COMERCIOS');
    
    // Si no existe la hoja, crearla
    if (!sheet) {
      Logger.log('âš ï¸ Creando hoja ENVIOS_COMERCIOS...');
      sheet = ss.insertSheet('ENVIOS_COMERCIOS');
      
      // Headers segÃºn tu estructura
      sheet.appendRow([
        'ID_ENVIO',
        'FECHA_HORA',
        'ID_COMERCIO',
        'NOMBRE_COMERCIO',
        'TELEFONO_COMERCIO',
        'TIPO_SERVICIO',
        'QUIEN_PAGA',
        'UBICACION_RECOGIDA_GPS',
        'UBICACION_ENTREGA_GPS',
        'CIUDAD_ORIGEN',
        'CIUDAD_DESTINO',
        'DISTANCIA_KM',
        'TARIFA_ESTIMADA',
        'NOMBRE_DESTINATARIO',
        'TELEFONO_DESTINATARIO',
        'DESCRIPCION_PAQUETE',
        'FOTO_PAQUETE',
        'MONTO_COBRAR',
        'TIPO_PAGO_ENVIO',
        'NOTAS_ADICIONALES',
        'ESTADO',
        'ID_DELIVERY',
        'NOMBRE_DELIVERY',
        'DATOS_JSON'
      ]);
      
      // Formatear headers
      const headerRange = sheet.getRange(1, 1, 1, 24);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#FF8C00');
      headerRange.setFontColor('#FFFFFF');
    }
    
    const timestamp = new Date().getTime();
    const id = datos.esEntrega ? `ENT-${timestamp}` : `ENV-${timestamp}`;
    
    Logger.log('ID generado: ' + id);
    Logger.log('Es entrega: ' + (datos.esEntrega || false));
    
    // Preparar datos segÃºn estructura
    const rowData = [
      id,                                           // A: ID_ENVIO
      new Date(),                                   // B: FECHA_HORA
      datos.idComercio || '',                       // C: ID_COMERCIO
      datos.nombreComercio || '',                   // D: NOMBRE_COMERCIO
      datos.telefonoComercio || '',                 // E: TELEFONO_COMERCIO
      datos.tipoServicio || 'SOLO_ENTREGA',        // F: TIPO_SERVICIO
      datos.quienPaga || 'DESTINATARIO',           // G: QUIEN_PAGA
      datos.ubicacionRecogidaGPS || datos.ubicacionOrigen || '', // H: UBICACION_RECOGIDA_GPS
      datos.ubicacionEntregaGPS || datos.ubicacionDestino || '', // I: UBICACION_ENTREGA_GPS
      datos.ciudadOrigen || '',                     // J: CIUDAD_ORIGEN
      datos.ciudadDestino || '',                    // K: CIUDAD_DESTINO
      datos.distanciaKm || '',                      // L: DISTANCIA_KM
      datos.tarifaEstimada || datos.tarifa || 0,   // M: TARIFA_ESTIMADA
      datos.nombreDestinatario || datos.nombreContacto || '', // N: NOMBRE_DESTINATARIO
      datos.telefonoDestinatario || datos.telefonoContacto || '', // O: TELEFONO_DESTINATARIO
      datos.descripcionPaquete || datos.descripcionContenido || '', // P: DESCRIPCION_PAQUETE
      datos.fotoUrl || '',                          // Q: FOTO_PAQUETE
      datos.montoCobrar || 0,                       // R: MONTO_COBRAR
      datos.tipoPagoEnvio || datos.metodoPago || 'EFECTIVO', // S: TIPO_PAGO_ENVIO
      datos.notasAdicionales || '',                 // T: NOTAS_ADICIONALES
      'PENDIENTE',                                  // U: ESTADO
      '',                                           // V: ID_DELIVERY
      '',                                           // W: NOMBRE_DELIVERY
      JSON.stringify(datos)                         // X: DATOS_JSON
    ];
    
    sheet.appendRow(rowData);
    
    Logger.log('âœ… EnvÃ­o registrado exitosamente');
    
    return { 
      success: true, 
      id: id,
      tipoRegistro: datos.esEntrega ? 'SOLICITUD_ENTREGA' : 'ENVIO_NORMAL'
    };
    
  } catch (error) {
    Logger.log('âŒ ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

function obtenerEnviosComercio(idComercio) {
  try {
    Logger.log('ðŸ“¦ === OBTENIENDO ENVÃOS DEL COMERCIO ===');
    Logger.log('ID Comercio recibido: ' + idComercio);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // CORRECCIÃ“N: El nombre correcto es ENVIOS_COMERCIOS (con S)
    const sheet = ss.getSheetByName('ENVIOS_COMERCIOS');
    
    if (!sheet) {
      Logger.log('âš ï¸ La hoja ENVIOS_COMERCIOS no existe');
      Logger.log('Hojas disponibles: ' + ss.getSheets().map(s => s.getName()).join(', '));
      
      return { 
        success: true, 
        envios: [],
        mensaje: 'No hay envÃ­os registrados aÃºn'
      };
    }
    
    Logger.log('âœ… Hoja ENVIOS_COMERCIOS encontrada');
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('â„¹ï¸ No hay envÃ­os (solo headers)');
      return { 
        success: true, 
        envios: [],
        mensaje: 'No tienes envÃ­os registrados aÃºn'
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers: ' + headers.join(', '));
    Logger.log('Total filas: ' + rows.length);
    
    // Buscar la columna ID_COMERCIO (deberÃ­a ser columna C, Ã­ndice 2)
    const idComercioIdx = headers.findIndex(h => {
      const headerNorm = String(h).toUpperCase().replace(/\s+/g, '_');
      return headerNorm === 'ID_COMERCIO' || 
             headerNorm === 'IDCOMERCIO' ||
             (headerNorm.includes('COMERCIO') && headerNorm.includes('ID'));
    });
    
    Logger.log('Ãndice columna ID_COMERCIO: ' + idComercioIdx);
    
    // Si no encontramos el header, usar Ã­ndice 2 (columna C) como fallback
    const indiceAUsar = idComercioIdx !== -1 ? idComercioIdx : 2;
    
    Logger.log('Usando Ã­ndice: ' + indiceAUsar + ' para filtrar');
    
    // Filtrar envÃ­os del comercio
    const enviosFiltrados = rows.filter(row => {
      const idEnFila = String(row[indiceAUsar]).trim();
      const idBuscado = String(idComercio).trim();
      const coincide = idEnFila === idBuscado;
      
      if (coincide) {
        Logger.log('âœ… EnvÃ­o encontrado - ID en fila: ' + idEnFila + ' | Buscado: ' + idBuscado);
      }
      
      return coincide;
    });
    
    Logger.log('Total envÃ­os encontrados: ' + enviosFiltrados.length);
    
    // Convertir a objetos (mapeo manual segÃºn Ã­ndices de columna)
    const envios = enviosFiltrados.map(row => {
      const envio = {
        // Mapeo directo por Ã­ndice segÃºn estructura de tu imagen
        'ID_ENVIO': row[0],              // Columna A
        'FECHA_HORA': row[1],             // Columna B
        'ID_COMERCIO': row[2],            // Columna C
        'NOMBRE_COMERCIO': row[3],        // Columna D
        'TELEFONO_COMERCIO': row[4],      // Columna E
        'TIPO_SERVICIO': row[5],          // Columna F
        'QUIEN_PAGA': row[6],             // Columna G
        'UBICACION_RECOGIDA_GPS': row[7], // Columna H
        'UBICACION_ENTREGA_GPS': row[8],  // Columna I
        'CIUDAD_ORIGEN': row[9],          // Columna J
        'CIUDAD_DESTINO': row[10],        // Columna K
        'DISTANCIA_KM': row[11],          // Columna L
        'TARIFA_ESTIMADA': row[12],       // Columna M
        'NOMBRE_DESTINATARIO': row[13],   // Columna N
        'TELEFONO_DESTINATARIO': row[14], // Columna O
        'DESCRIPCION_PAQUETE': row[15],   // Columna P
        'FOTO_PAQUETE': row[16],          // Columna Q
        'MONTO_COBRAR': row[17],          // Columna R
        'TIPO_PAGO_ENVIO': row[18],       // Columna S
        'NOTAS_ADICIONALES': row[19],     // Columna T
        'ESTADO': row[20] || 'PENDIENTE', // Columna U
        'ID_DELIVERY': row[21],           // Columna V
        'NOMBRE_DELIVERY': row[22],       // Columna W
        
        // Alias para compatibilidad con el frontend
        'id': row[0],
        'ID': row[0],
        'fecha': row[1],
        'Fecha Solicitud': row[1],
        'estado': row[20] || 'PENDIENTE',
        'Estado': row[20] || 'PENDIENTE',
        'tipoServicio': row[5],
        'Tipo Servicio': row[5],
        'nombreDestinatario': row[13],
        'Nombre Destinatario': row[13],
        'descripcionPaquete': row[15],
        'DescripciÃ³n Paquete': row[15],
        'tipoRegistro': 'ENVIO_NORMAL',
        'Tipo Registro': 'ENVIO_NORMAL'
      };
      
      return envio;
    }).reverse(); // MÃ¡s recientes primero
    
    Logger.log('âœ… EnvÃ­os procesados correctamente');
    
    return { 
      success: true, 
      envios: envios 
    };
    
  } catch (error) {
    Logger.log('âŒ ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    return { 
      success: false, 
      error: error.toString(),
      detalles: error.stack
    };
  }
}

// ============================================
// CLIENTES - FUNCIONES
// ============================================

function verificarCodigo(numero, codigoIngresado) {
  try {
    let numeroLimpio = numero.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const codigosSheet = ss.getSheetByName('CODIGOS_VERIFICACION');
    
    if (!codigosSheet) {
      return { success: false, error: 'No se encontraron cÃ³digos' };
    }
    
    const data = codigosSheet.getDataRange().getValues();
    const ahora = new Date();
    
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const numeroRow = row[0].toString();
      const codigoRow = row[1].toString();
      const timestampRow = new Date(row[2]);
      const usado = row[3];
      const tipo = row[4] || 'CLIENTE';
      
      if (numeroRow === numeroLimpio && codigoRow === codigoIngresado && !usado && tipo === 'CLIENTE') {
        const minutosTranscurridos = (ahora - timestampRow) / 1000 / 60;
        
        if (minutosTranscurridos <= 10) {
          codigosSheet.getRange(i + 1, 4).setValue(true);
          
          const usuariosSheet = ss.getSheetByName('USUARIOS');
          let usuarioExiste = false;
          let datosUsuario = null;
          
          if (usuariosSheet) {
            const usuariosData = usuariosSheet.getDataRange().getValues();
            
            for (let j = 1; j < usuariosData.length; j++) {
              const celularEnSheet = usuariosData[j][1].toString();
              
              if (celularEnSheet === numeroLimpio) {
                usuarioExiste = true;
                datosUsuario = {
                  id: usuariosData[j][0],
                  celular: usuariosData[j][1],
                  nombre: usuariosData[j][2],
                  direccion: usuariosData[j][3],
                  ubicacionGPS: usuariosData[j][4],
                  fechaRegistro: usuariosData[j][5]
                };
                break;
              }
            }
          }
          
          return {
            success: true,
            usuarioExiste: usuarioExiste,
            datosUsuario: datosUsuario
          };
        } else {
          return { success: false, error: 'CÃ³digo expirado' };
        }
      }
    }
    
    return { success: false, error: 'CÃ³digo incorrecto' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function completarRegistro(datos) {
  try {
    let numeroLimpio = datos.celular.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let usuariosSheet = ss.getSheetByName('USUARIOS');
    
    if (!usuariosSheet) {
      usuariosSheet = ss.insertSheet('USUARIOS');
      usuariosSheet.appendRow([
        'ID_USUARIO',
        'CELULAR',
        'NOMBRE',
        'DIRECCION',
        'UBICACION_GPS',
        'FECHA_REGISTRO'
      ]);
      
      const headerRange = usuariosSheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#FF8C00');
      headerRange.setFontColor('#FFFFFF');
    }
    
    const lastRow = usuariosSheet.getLastRow();
    const idUsuario = lastRow === 1 ? 1 : usuariosSheet.getRange(lastRow, 1).getValue() + 1;
    
    usuariosSheet.appendRow([
      idUsuario,
      numeroLimpio,
      datos.nombre || '',
      datos.direccion || '',
      datos.ubicacionGPS || '',
      new Date()
    ]);
    
    return {
      success: true,
      usuario: {
        id: idUsuario,
        celular: numeroLimpio,
        nombre: datos.nombre,
        direccion: datos.direccion,
        ubicacionGPS: datos.ubicacionGPS
      }
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function obtenerPerfil(celular) {
  try {
    let numeroLimpio = celular.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const usuariosSheet = ss.getSheetByName('USUARIOS');
    
    if (!usuariosSheet) {
      return { success: false, error: 'No hay usuarios' };
    }
    
    const usuariosData = usuariosSheet.getDataRange().getValues();
    
    for (let i = 1; i < usuariosData.length; i++) {
      if (usuariosData[i][1].toString() === numeroLimpio) {
        return {
          success: true,
          usuario: {
            id: usuariosData[i][0],
            celular: usuariosData[i][1],
            nombre: usuariosData[i][2],
            direccion: usuariosData[i][3],
            ubicacionGPS: usuariosData[i][4],
            fechaRegistro: usuariosData[i][5]
          }
        };
      }
    }
    
    return { success: false, error: 'Usuario no encontrado' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    const comerciosSheet = ss.getSheetByName('COMERCIOS');
    if (!comerciosSheet) throw new Error('No se encontrÃ³ COMERCIOS');
    const comerciosData = comerciosSheet.getDataRange().getValues();
    const comerciosHeaders = comerciosData[0];
    const comercios = comerciosData.slice(1).map(row => {
      let obj = {};
      comerciosHeaders.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    
    const categoriasSheet = ss.getSheetByName('CATEGORIAS');
    if (!categoriasSheet) throw new Error('No se encontrÃ³ CATEGORIAS');
    const categoriasData = categoriasSheet.getDataRange().getValues();
    const categoriasHeaders = categoriasData[0];
    const categorias = categoriasData.slice(1)
      .filter(row => row[0])
      .map(row => {
        let obj = {};
        categoriasHeaders.forEach((header, i) => {
          obj[header] = row[i];
        });
        return obj;
      })
      .filter(cat => {
        const estatus = cat.ESTATUS || '';
        return estatus.toString().toUpperCase() === 'ACTIVA' || 
               estatus.toString().toUpperCase() === 'ACTIVO' || 
               estatus === true;
      });
    
    const productosSheet = ss.getSheetByName('PRODUCTOS');
    if (!productosSheet) throw new Error('No se encontrÃ³ PRODUCTOS');
    const productosData = productosSheet.getDataRange().getValues();
    const productosHeaders = productosData[0];
    const productos = productosData.slice(1).map(row => {
      let obj = {};
      productosHeaders.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    }).filter(prod => prod.ESTATUS === 'ACTIVO' || prod.ESTATUS === true);
    
    const catxcomSheet = ss.getSheetByName('CATEGORIASxCOMERCIO');
    if (!catxcomSheet) throw new Error('No se encontrÃ³ CATEGORIASxCOMERCIO');
    const catxcomData = catxcomSheet.getDataRange().getValues();
    const catxcomHeaders = catxcomData[0];
    const categoriasxcomercio = catxcomData.slice(1).map(row => {
      let obj = {};
      catxcomHeaders.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    
    return {
      success: true,
      comercios: comercios,
      categorias: categorias,
      productos: productos,
      categoriasxcomercio: categoriasxcomercio
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function registrarPedido(datos) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let pedidosSheet = ss.getSheetByName('PEDIDOS');
    
    if (!pedidosSheet) {
      pedidosSheet = ss.insertSheet('PEDIDOS');
      pedidosSheet.appendRow([
        'ID_PEDIDO',
        'MARCA_TIEMPO',
        'ID_USUARIO',
        'CELULAR_CLIENTE',
        'UBICACION_GPS',
        'DIRECCION',
        'DETALLE_PEDIDO',
        'SUBTOTAL',
        'PROPINA',
        'TOTAL',
        'COMERCIO',
        'WHATSAPP_COMERCIO',
        'METODO_PAGO',
        'MONTO_PAGO',
        'CAMBIO',
        'NOTAS_ESPECIALES',
        'COMPROBANTE_URL'
      ]);
      
      const headerRange = pedidosSheet.getRange(1, 1, 1, 17);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#FF8C00');
      headerRange.setFontColor('#FFFFFF');
    }
    
    const lastRow = pedidosSheet.getLastRow();
    const idPedido = lastRow === 1 ? 1 : pedidosSheet.getRange(lastRow, 1).getValue() + 1;
    
    const detallePedido = JSON.stringify(datos.items);
    
    pedidosSheet.appendRow([
      idPedido,
      new Date(),
      datos.idUsuario || '',
      datos.celular || '',
      datos.ubicacionGPS || '',
      datos.direccion || '',
      detallePedido,
      datos.subtotal || 0,
      datos.propina || 0,
      datos.total || 0,
      datos.comercio || '',
      datos.whatsappComercio || '',
      datos.metodoPago || 'efectivo',
      datos.montoPago || '',
      datos.cambio || '',
      datos.notasEspeciales || '',
      datos.comprobanteUrl || ''
    ]);
    
    return { success: true, idPedido: idPedido };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function enviarWhatsAppBuilderBot(numero, mensaje, imagenUrl) {
  try {
    const url = 'https://app.builderbot.cloud/api/v2/72940379-becf-4dec-8233-2d4bd1de6e1c/messages';
    
    const payload = {
      messages: {
        content: mensaje
      },
      number: numero.toString(),
      checkIfExists: false
    };
    
    if (imagenUrl && imagenUrl.trim() !== '') {
      payload.messages.mediaUrl = imagenUrl;
    }
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Content-Type': 'application/json',
        'x-api-builderbot': 'bb-32307901-f2b8-4ac2-a849-68a02b24f43f'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      return { success: true };
    } else {
      return { success: false, error: 'HTTP ' + responseCode };
    }
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}