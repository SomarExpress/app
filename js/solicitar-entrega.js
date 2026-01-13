// ========================================
// MÓDULO: SOLICITAR ENTREGA - JAVASCRIPT
// Para comercios-panel.html
// ========================================

// Variables globales del módulo
let datosEntrega = {
  tipoServicio: 'TRASLADO_TIENDAS',
  ubicacionOrigen: null,
  ubicacionDestino: null,
  tarifa: 0
};

// ========================================
// INICIALIZACIÓN DEL MÓDULO
// ========================================
function inicializarSolicitarEntrega() {
  console.log('📦 Inicializando módulo Solicitar Entrega...');
  
  // Event listeners para tipo de servicio
  document.querySelectorAll('input[name="tipoServicioEntrega"]').forEach(radio => {
    radio.addEventListener('change', cambiarTipoServicio);
  });

  // Event listeners para selects de tiendas
  document.getElementById('tiendaOrigen')?.addEventListener('change', calcularTarifaTraslado);
  document.getElementById('tiendaDestino')?.addEventListener('change', calcularTarifaTraslado);

  // Event listeners para recoger paquete
  document.getElementById('ubicacionRecogidaPaquete')?.addEventListener('input', debounce(validarUbicacionRecogida, 500));
  document.getElementById('destinoPaquete')?.addEventListener('change', manejarDestinoPaquete);

  // Event listeners para realizar compra
  document.getElementById('presupuestoCompra')?.addEventListener('input', calcularComisionCompra);
  document.getElementById('destinoCompra')?.addEventListener('change', calcularTarifaCompra);

  // Upload de foto
  document.getElementById('uploadAreaEntrega')?.addEventListener('click', () => {
    document.getElementById('fotoEntrega').click();
  });

  document.getElementById('fotoEntrega')?.addEventListener('change', manejarFotoEntrega);
  document.getElementById('removeFotoEntrega')?.addEventListener('click', (e) => {
    e.stopPropagation();
    removerFotoEntrega();
  });

  // Botones
  document.getElementById('cancelarSolicitudEntrega')?.addEventListener('click', cancelarSolicitudEntrega);
  document.getElementById('formSolicitarEntrega')?.addEventListener('submit', procesarSolicitudEntrega);
}

// ========================================
// CAMBIAR TIPO DE SERVICIO
// ========================================
function cambiarTipoServicio(e) {
  const tipoServicio = e.target.value;
  datosEntrega.tipoServicio = tipoServicio;
  
  // Ocultar todas las secciones
  document.getElementById('seccionTrasladoTiendas').classList.add('hidden');
  document.getElementById('seccionRecogerPaquete').classList.add('hidden');
  document.getElementById('seccionRealizarCompra').classList.add('hidden');
  document.getElementById('resumenTarifaEntrega').classList.add('hidden');
  
  // Mostrar sección correspondiente
  switch(tipoServicio) {
    case 'TRASLADO_TIENDAS':
      document.getElementById('seccionTrasladoTiendas').classList.remove('hidden');
      break;
    case 'RECOGER_PAQUETE':
      document.getElementById('seccionRecogerPaquete').classList.remove('hidden');
      break;
    case 'REALIZAR_COMPRA':
      document.getElementById('seccionRealizarCompra').classList.remove('hidden');
      break;
  }
  
  // Reset tarifa
  datosEntrega.tarifa = 0;
  datosEntrega.ubicacionOrigen = null;
  datosEntrega.ubicacionDestino = null;
}

// ========================================
// CALCULAR TARIFA - TRASLADO ENTRE TIENDAS
// ========================================
async function calcularTarifaTraslado() {
  const origenSelect = document.getElementById('tiendaOrigen');
  const destinoSelect = document.getElementById('tiendaDestino');
  
  if (!origenSelect.value || !destinoSelect.value) {
    document.getElementById('resumenTarifaEntrega').classList.add('hidden');
    return;
  }
  
  if (origenSelect.value === destinoSelect.value) {
    alert('⚠️ La tienda de origen y destino no pueden ser la misma');
    destinoSelect.value = '';
    return;
  }
  
  const gpsOrigen = origenSelect.options[origenSelect.selectedIndex].dataset.gps;
  const gpsDestino = destinoSelect.options[destinoSelect.selectedIndex].dataset.gps;
  
  if (!gpsOrigen || !gpsDestino) {
    console.error('❌ Falta GPS en las tiendas');
    return;
  }
  
  datosEntrega.ubicacionOrigen = gpsOrigen;
  datosEntrega.ubicacionDestino = gpsDestino;
  
  // Calcular tarifa usando la función existente
  const resultado = await calcularTarifaDelivery(gpsOrigen, gpsDestino);
  
  if (resultado) {
    mostrarResumenTarifa(resultado);
  }
}

// ========================================
// VALIDAR UBICACIÓN DE RECOGIDA (PAQUETE)
// ========================================
async function validarUbicacionRecogida() {
  const input = document.getElementById('ubicacionRecogidaPaquete').value.trim();
  
  if (input.length < 10) return;
  
  // Extraer coordenadas
  const coordMatch = input.match(/([0-9]{1,2}\.[0-9]+)\s*,\s*(-?[0-9]{1,3}\.[0-9]+)/);
  
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    
    if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
      datosEntrega.ubicacionOrigen = `${lat},${lon}`;
      console.log('✅ Ubicación de recogida válida:', datosEntrega.ubicacionOrigen);
      
      // Si ya hay destino, calcular tarifa
      const destinoSelect = document.getElementById('destinoPaquete');
      if (destinoSelect.value && destinoSelect.value !== 'otra') {
        calcularTarifaPaquete();
      }
    }
  }
}

// ========================================
// MANEJAR DESTINO DEL PAQUETE
// ========================================
function manejarDestinoPaquete() {
  const destinoSelect = document.getElementById('destinoPaquete');
  const otraUbicacion = document.getElementById('otraUbicacionDestino');
  
  if (destinoSelect.value === 'otra') {
    otraUbicacion.classList.remove('hidden');
  } else {
    otraUbicacion.classList.add('hidden');
    
    if (destinoSelect.value) {
      const gpsDestino = destinoSelect.options[destinoSelect.selectedIndex].dataset.gps;
      datosEntrega.ubicacionDestino = gpsDestino;
      calcularTarifaPaquete();
    }
  }
}

// ========================================
// CALCULAR TARIFA - RECOGER PAQUETE
// ========================================
async function calcularTarifaPaquete() {
  if (!datosEntrega.ubicacionOrigen || !datosEntrega.ubicacionDestino) {
    return;
  }
  
  const resultado = await calcularTarifaDelivery(datosEntrega.ubicacionOrigen, datosEntrega.ubicacionDestino);
  
  if (resultado) {
    mostrarResumenTarifa(resultado);
  }
}

// ========================================
// CALCULAR COMISIÓN DE COMPRA
// ========================================
function calcularComisionCompra() {
  const presupuesto = parseFloat(document.getElementById('presupuestoCompra').value) || 0;
  const comision = presupuesto * 0.10; // 10% de comisión
  
  document.getElementById('comisionCompra').textContent = comision.toFixed(2);
  
  if (presupuesto > 0) {
    document.getElementById('comisionCompraRow').classList.remove('hidden');
  } else {
    document.getElementById('comisionCompraRow').classList.add('hidden');
  }
  
  // Recalcular total
  const tarifaBase = parseFloat(document.getElementById('tarifaBaseEntrega').textContent) || 0;
  const recargo = parseFloat(document.getElementById('tarifaRecargoNocturnoEntrega').textContent) || 0;
  const total = tarifaBase + recargo + comision;
  document.getElementById('tarifaTotalEntrega').textContent = total.toFixed(2);
}

// ========================================
// CALCULAR TARIFA - REALIZAR COMPRA
// ========================================
async function calcularTarifaCompra() {
  const ubicacionComercio = document.getElementById('ubicacionComercioCompra').value.trim();
  const destinoSelect = document.getElementById('destinoCompra');
  
  if (!ubicacionComercio || !destinoSelect.value) {
    return;
  }
  
  const gpsDestino = destinoSelect.options[destinoSelect.selectedIndex].dataset.gps;
  
  datosEntrega.ubicacionOrigen = ubicacionComercio;
  datosEntrega.ubicacionDestino = gpsDestino;
  
  const resultado = await calcularTarifaDelivery(ubicacionComercio, gpsDestino);
  
  if (resultado) {
    mostrarResumenTarifa(resultado);
    calcularComisionCompra(); // Actualizar con comisión
  }
}

// ========================================
// MOSTRAR RESUMEN DE TARIFA
// ========================================
function mostrarResumenTarifa(resultado) {
  document.getElementById('distanciaKmEntrega').textContent = resultado.distanciaKm + ' km';
  document.getElementById('tarifaBaseEntrega').textContent = resultado.tarifaBase;
  document.getElementById('tarifaTotalEntrega').textContent = resultado.tarifaTotal;
  
  // Mostrar/ocultar recargo nocturno
  if (resultado.esModoNocturno) {
    document.getElementById('recargoNocturnoRowEntrega').classList.remove('hidden');
    document.getElementById('tarifaRecargoNocturnoEntrega').textContent = resultado.recargoNocturno;
    document.getElementById('modoNocturnoIndicadorEntrega').classList.remove('hidden');
  } else {
    document.getElementById('recargoNocturnoRowEntrega').classList.add('hidden');
    document.getElementById('modoNocturnoIndicadorEntrega').classList.add('hidden');
  }
  
  document.getElementById('resumenTarifaEntrega').classList.remove('hidden');
  
  datosEntrega.tarifa = parseFloat(resultado.tarifaTotal);
}

// ========================================
// MANEJO DE FOTO
// ========================================
function manejarFotoEntrega(e) {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ La imagen es muy grande. Máximo 5MB.');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('previewImgEntrega').src = event.target.result;
      document.getElementById('uploadPlaceholderEntrega').classList.add('hidden');
      document.getElementById('uploadPreviewEntrega').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function removerFotoEntrega() {
  document.getElementById('fotoEntrega').value = '';
  document.getElementById('uploadPlaceholderEntrega').classList.remove('hidden');
  document.getElementById('uploadPreviewEntrega').classList.add('hidden');
}

// ========================================
// PROCESAR SOLICITUD DE ENTREGA
// ========================================
async function procesarSolicitudEntrega(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;
  
  try {
    // Subir foto si existe
    let fotoUrl = null;
    const fotoFile = document.getElementById('fotoEntrega').files[0];
    
    if (fotoFile) {
      submitBtn.textContent = 'Subiendo foto...';
      
      const formData = new FormData();
      formData.append('file', fotoFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      
      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      const cloudinaryData = await cloudinaryResponse.json();
      fotoUrl = cloudinaryData.secure_url;
    }
    
    // Recopilar datos según tipo de servicio
    const datos = {
      tipoServicio: datosEntrega.tipoServicio,
      idComercio: appData.comercio.id,
      nombreComercio: appData.comercio.nombre,
      telefonoComercio: appData.comercio.celular,
      descripcionContenido: document.getElementById('descripcionContenido').value,
      metodoPago: document.querySelector('input[name="metodoPagoEntrega"]:checked').value,
      notasAdicionales: document.getElementById('notasAdicionalesEntrega').value,
      fotoUrl: fotoUrl,
      ubicacionOrigen: datosEntrega.ubicacionOrigen,
      ubicacionDestino: datosEntrega.ubicacionDestino,
      tarifa: datosEntrega.tarifa,
      fechaSolicitud: new Date().toISOString()
    };
    
    // Datos específicos según tipo
    switch(datosEntrega.tipoServicio) {
      case 'TRASLADO_TIENDAS':
        const origenSelect = document.getElementById('tiendaOrigen');
        const destinoSelect = document.getElementById('tiendaDestino');
        datos.tiendaOrigen = origenSelect.options[origenSelect.selectedIndex].text;
        datos.tiendaDestino = destinoSelect.options[destinoSelect.selectedIndex].text;
        break;
        
      case 'RECOGER_PAQUETE':
        datos.nombreContacto = document.getElementById('nombreContactoRecogida').value;
        datos.telefonoContacto = document.getElementById('telefonoContactoRecogida').value;
        const destinoPaq = document.getElementById('destinoPaquete');
        datos.destinoPaquete = destinoPaq.options[destinoPaq.selectedIndex].text;
        break;
        
      case 'REALIZAR_COMPRA':
        datos.nombreComercioCompra = document.getElementById('nombreComercioCompra').value;
        datos.listaProductos = document.getElementById('listaProductosCompra').value;
        datos.presupuesto = parseFloat(document.getElementById('presupuestoCompra').value);
        datos.comision = datos.presupuesto * 0.10;
        const destCompra = document.getElementById('destinoCompra');
        datos.destinoCompra = destCompra.options[destCompra.selectedIndex].text;
        break;
    }
    
    // Enviar a Google Sheets (ENVIO_COMERCIO)
    submitBtn.textContent = 'Enviando solicitud...';
    
    // Agregar campos adicionales para identificar como SOLICITUD
    datos.esEntrega = true; // Identificador para diferenciar de envíos normales
    datos.estado = 'PENDIENTE_ASIGNACION';
    datos.tipoRegistro = 'SOLICITUD_ENTREGA'; // Campo para filtrar en Mis Solicitudes
    
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registrarEnvioComercio', // Usar la misma acción para guardar en ENVIO_COMERCIO
        datos: datos
      })
    });
    
    // Éxito
    alert('✅ Solicitud de entrega registrada exitosamente. Pronto nos pondremos en contacto contigo.');
    
    // Limpiar formulario
    document.getElementById('formSolicitarEntrega').reset();
    document.getElementById('resumenTarifaEntrega').classList.add('hidden');
    removerFotoEntrega();
    datosEntrega = { tipoServicio: 'TRASLADO_TIENDAS', ubicacionOrigen: null, ubicacionDestino: null, tarifa: 0 };
    
    // Volver a tab de Mis Solicitudes (que mostrará tanto envíos como entregas)
    document.getElementById('tabMisSolicitudes')?.click();
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('⚠️ Error al procesar solicitud. Intenta nuevamente.');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ========================================
// CANCELAR SOLICITUD
// ========================================
function cancelarSolicitudEntrega() {
  if (confirm('¿Estás seguro que deseas cancelar? Se perderán los datos ingresados.')) {
    document.getElementById('formSolicitarEntrega').reset();
    document.getElementById('resumenTarifaEntrega').classList.add('hidden');
    removerFotoEntrega();
    datosEntrega = { tipoServicio: 'TRASLADO_TIENDAS', ubicacionOrigen: null, ubicacionDestino: null, tarifa: 0 };
    
    // Volver al tab principal
    document.getElementById('tabNuevoEnvio')?.click();
  }
}

// ========================================
// UTILIDADES
// ========================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========================================
// EXPORTAR FUNCIONES (si es necesario)
// ========================================
if (typeof window !== 'undefined') {
  window.inicializarSolicitarEntrega = inicializarSolicitarEntrega;
}