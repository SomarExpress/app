// Code.gs - Sistema Completo: Delivery + Panel Comercios
// Sheet ID: 1Pu6yB-H6RuutRqqDjUPewDRP5mu-lZQAq-q2vCd2QAc

const SHEET_ID = '1Pu6yB-H6RuutRqqDjUPewDRP5mu-lZQAq-q2vCd2QAc';

function doGet(e) {
  // COMERCIOS: Verificar código
  if (e.parameter.action === 'verificarCodigoComercio') {
    const result = verificarCodigoComercio(e.parameter.numero, e.parameter.codigo);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
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
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // COMERCIOS: Obtener envíos/solicitudes
  if (e.parameter.action === 'obtenerEnviosComercio') {
    const result = obtenerEnviosComercio(e.parameter.idComercio);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // CLIENTES: Verificar código
  if (e.parameter.action === 'verificarCodigo') {
    const result = verificarCodigo(e.parameter.numero, e.parameter.codigo);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
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
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // CLIENTES: Obtener perfil
  if (e.parameter.action === 'obtenerPerfil') {
    const result = obtenerPerfil(e.parameter.celular);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Obtener datos de delivery (comercios, categorías, productos)
  if (e.parameter.action === 'getData') {
    return ContentService
      .createTextOutput(JSON.stringify(getData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Servir HTML (si aplica)
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Somar Express')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    Logger.log('POST recibido');
    const params = JSON.parse(e.postData.contents);
    Logger.log('Action: ' + params.action);
    
    // COMERCIOS: Enviar código de verificación
    if (params.action === 'enviarCodigoVerificacionComercio') {
      const resultado = enviarCodigoVerificacion(params.numero, 'COMERCIO');
      return ContentService
        .createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // COMERCIOS: Registrar envío
    if (params.action === 'registrarEnvioComercio') {
      Logger.log('📦 Registrando envío/entrega...');
      Logger.log('Es Entrega: ' + (params.datos.esEntrega ? 'SÍ' : 'NO'));
      Logger.log('Tipo Servicio: ' + params.datos.tipoServicio);
      
      const result = registrarEnvioComercio(params.datos);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // CLIENTES: Enviar código de verificación
    if (params.action === 'enviarCodigoVerificacion') {
      const resultado = enviarCodigoVerificacion(params.numero, 'CLIENTE');
      return ContentService
        .createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // CLIENTES: Registrar pedido
    if (params.action === 'registrarPedido') {
      Logger.log('🛒 Registrando pedido de cliente...');
      const result = registrarPedido(params.datos);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // WhatsApp
    if (params.action === 'enviarWhatsApp') {
      Logger.log('📱 Enviando WhatsApp...');
      const resultado = enviarWhatsAppBuilderBot(
        params.numero,
        params.mensaje,
        params.imagenUrl || null
      );
      return ContentService
        .createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }


    
    Logger.log('⚠️ Acción no válida: ' + params.action);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'Acción no válida: ' + params.action 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('❌ Error en doPost: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// AUTENTICACIÓN GENERAL
// ============================================

function enviarCodigoVerificacion(numero, tipo) {
  try {
    Logger.log('📱 === ENVIANDO CÓDIGO ===');
    Logger.log('Tipo: ' + tipo);
    Logger.log('Número: ' + numero);
    
    let numeroLimpio = numero.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    Logger.log('🔢 Código: ' + codigo);
    
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
      `🔐 *CÓDIGO DE VERIFICACIÓN*\n\n` +
      `Tu código para ${tipo === 'COMERCIO' ? 'Panel Comercios' : 'Somar Express'} es:\n\n` +
      `*${codigo}*\n\n` +
      `⏱️ Válido por 10 minutos.\n\n` +
      `_Somar Express - Delivery_`;
    
    enviarWhatsAppBuilderBot(numeroLimpio, mensaje, null);
    
    return { success: true, message: 'Código enviado' };
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// COMERCIOS - AUTENTICACIÓN
// ============================================

function verificarCodigoComercio(numero, codigoIngresado) {
  try {
    Logger.log('🔍 === VERIFICANDO CÓDIGO COMERCIO ===');
    
    let numeroLimpio = numero.toString().replace(/[^0-9]/g, '');
    if (!numeroLimpio.startsWith('504') && numeroLimpio.length === 8) {
      numeroLimpio = '504' + numeroLimpio;
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const codigosSheet = ss.getSheetByName('CODIGOS_VERIFICACION');
    
    if (!codigosSheet) {
      return { success: false, error: 'No se encontraron códigos' };
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
          
          // Verificar si el comercio existe
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
          return { success: false, error: 'Código expirado' };
        }
      }
    }
    
    return { success: false, error: 'Código incorrecto' };
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function completarRegistroComercio(datos) {
  try {
    Logger.log('📝 === REGISTRANDO COMERCIO ===');
    
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
    
    Logger.log('✅ Comercio registrado: ' + idComercio);
    
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
    Logger.log('❌ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// COMERCIOS - GESTIÓN DE ENVÍOS
// ============================================

function registrarEnvioComercio(datos) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ENVIO_COMERCIO');
    
    if (!sheet) {
      return { success: false, error: 'Hoja ENVIO_COMERCIO no encontrada' };
    }
    
    // Generar ID único
    const timestamp = new Date().getTime();
    const id = datos.esEntrega ? `ENT-${timestamp}` : `ENV-${timestamp}`;
    
    // Determinar tipo de registro
    const tipoRegistro = datos.esEntrega ? 'SOLICITUD_ENTREGA' : 'ENVIO_NORMAL';
    
    // Preparar datos comunes
    const rowData = [
      id,                                                    // A: ID
      datos.fechaSolicitud || new Date().toISOString(),     // B: Fecha
      datos.idComercio || '',                               // C: ID Comercio
      datos.nombreComercio || '',                           // D: Nombre Comercio
      datos.telefonoComercio || '',                         // E: Teléfono Comercio
      tipoRegistro,                                         // F: Tipo Registro (NUEVO)
      datos.tipoServicio || '',                             // G: Tipo Servicio
      datos.quienPaga || 'COMERCIO',                        // H: Quien Paga
      datos.ubicacionRecogidaGPS || datos.ubicacionOrigen,  // I: Ubicación Recogida GPS
      datos.ubicacionEntregaGPS || datos.ubicacionDestino,  // J: Ubicación Entrega GPS
      datos.nombreDestinatario || '',                       // K: Nombre Destinatario
      datos.telefonoDestinatario || datos.telefonoContacto || '', // L: Teléfono Destinatario
      datos.descripcionPaquete || datos.descripcionContenido || '', // M: Descripción
      datos.montoCobrar || 0,                               // N: Monto a Cobrar
      datos.tipoPagoEnvio || datos.metodoPago || '',        // O: Tipo Pago Envío
      datos.notasAdicionales || '',                         // P: Notas
      datos.fotoUrl || '',                                  // Q: Foto URL
      datos.ciudadOrigen || '',                             // R: Ciudad Origen
      datos.ciudadDestino || '',                            // S: Ciudad Destino
      datos.distanciaKm || '',                              // T: Distancia Km
      datos.tarifaEstimada || datos.tarifa || 0,            // U: Tarifa Estimada
      datos.estado || 'PENDIENTE_ASIGNACION',               // V: Estado
      '',                                                   // W: Delivery Asignado
      '',                                                   // X: Fecha Asignación
      '',                                                   // Y: Fecha Recogido
      '',                                                   // Z: Fecha Entregado
      JSON.stringify(datos)                                 // AA: Datos Extra (JSON completo)
    ];
    
    // Agregar fila a la hoja
    sheet.appendRow(rowData);
    
    // Si es una solicitud de entrega, enviar notificación especial
    if (datos.esEntrega) {
      enviarNotificacionSolicitudEntrega(datos, id);
    }
    
    return { 
      success: true, 
      id: id,
      tipoRegistro: tipoRegistro
    };
    
  } catch (error) {
    Logger.log('Error en registrarEnvioComercio: ' + error.toString());
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

function obtenerEnviosComercio(idComercio) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ENVIO_COMERCIO');
    
    if (!sheet) {
      return { success: false, error: 'Hoja no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Filtrar por comercio
    const envios = rows
      .filter(row => row[2] == idComercio) // Columna C: ID Comercio
      .map(row => {
        const envio = {};
        headers.forEach((header, index) => {
          envio[header] = row[index];
        });
        
        // Agregar campos derivados para compatibilidad
        envio.esEntrega = envio['Tipo Registro'] === 'SOLICITUD_ENTREGA';
        envio.tipoRegistro = envio['Tipo Registro'];
        
        return envio;
      })
      .reverse(); // Más recientes primero
    
    return { 
      success: true, 
      envios: envios 
    };
    
  } catch (error) {
    Logger.log('Error en obtenerEnviosComercio: ' + error.toString());
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

// ============================================
// FUNCIÓN: enviarNotificacionSolicitudEntrega (NUEVA)
// ============================================
// Enviar notificación especial cuando es una solicitud de entrega

function enviarNotificacionSolicitudEntrega(datos, id) {
  try {
    // Construir mensaje según tipo de servicio
    let mensaje = `🚚 *NUEVA SOLICITUD DE ENTREGA*\n\n`;
    mensaje += `*ID:* ${id}\n`;
    mensaje += `*Comercio:* ${datos.nombreComercio}\n`;
    mensaje += `*Teléfono:* ${datos.telefonoComercio}\n\n`;
    
    switch(datos.tipoServicio) {
      case 'TRASLADO_TIENDAS':
        mensaje += `📦 *Tipo:* Traslado entre Tiendas\n`;
        mensaje += `*Desde:* ${datos.tiendaOrigen || 'No especificado'}\n`;
        mensaje += `*Hasta:* ${datos.tiendaDestino || 'No especificado'}\n`;
        break;
        
      case 'RECOGER_PAQUETE':
        mensaje += `📦 *Tipo:* Recoger Paquete\n`;
        mensaje += `*Contacto:* ${datos.nombreContacto}\n`;
        mensaje += `*Teléfono:* ${datos.telefonoContacto}\n`;
        mensaje += `*Entregar en:* ${datos.destinoPaquete || 'No especificado'}\n`;
        break;
        
      case 'REALIZAR_COMPRA':
        mensaje += `🛒 *Tipo:* Realizar Compra\n`;
        mensaje += `*Comercio Compra:* ${datos.nombreComercioCompra}\n`;
        mensaje += `*Presupuesto:* L.${datos.presupuesto}\n`;
        mensaje += `*Comisión:* L.${datos.comision}\n`;
        mensaje += `*Entregar en:* ${datos.destinoCompra || 'No especificado'}\n\n`;
        mensaje += `*Lista de Compra:*\n${datos.listaProductos}\n`;
        break;
    }
    
    mensaje += `\n📋 *Descripción:*\n${datos.descripcionContenido || datos.descripcionPaquete}\n\n`;
    mensaje += `💰 *Tarifa Estimada:* L.${datos.tarifa || datos.tarifaEstimada}\n`;
    mensaje += `💳 *Método Pago:* ${datos.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}\n`;
    
    if (datos.notasAdicionales) {
      mensaje += `\n📝 *Notas:* ${datos.notasAdicionales}\n`;
    }
    
    mensaje += `\n⏰ *Fecha Solicitud:* ${new Date().toLocaleString('es-HN')}\n`;
    mensaje += `\n✅ _Esta solicitud requiere asignación de delivery_`;
    
    // Aquí puedes enviar el mensaje a un número administrativo
    // o a un grupo de WhatsApp de deliveries
    // enviarWhatsAppAdministrativo(mensaje);
    
    Logger.log('Notificación de solicitud de entrega enviada');
    
  } catch (error) {
    Logger.log('Error en enviarNotificacionSolicitudEntrega: ' + error.toString());
  }
}

// ============================================
// CLIENTES - AUTENTICACIÓN (YA EXISTENTE)
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
      return { success: false, error: 'No se encontraron códigos' };
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
          return { success: false, error: 'Código expirado' };
        }
      }
    }
    
    return { success: false, error: 'Código incorrecto' };
    
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

// ============================================
// DELIVERY APP - DATOS (YA EXISTENTE)
// ============================================

function getData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    const comerciosSheet = ss.getSheetByName('COMERCIOS');
    if (!comerciosSheet) throw new Error('No se encontró COMERCIOS');
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
    if (!categoriasSheet) throw new Error('No se encontró CATEGORIAS');
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
    if (!productosSheet) throw new Error('No se encontró PRODUCTOS');
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
    if (!catxcomSheet) throw new Error('No se encontró CATEGORIASxCOMERCIO');
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

// ============================================
// WHATSAPP
// ============================================

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