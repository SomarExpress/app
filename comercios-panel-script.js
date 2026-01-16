// Aquí iría el contenido completo, pero por límites voy a usar el approach de combinar archivos
cat /tmp/comercios-panel-script-full-part1.js > /tmp/comercios-panel-script-final.js

# Agregar la continuación del código
cat >> /tmp/comercios-panel-script-final.js << 'EOF'

// ============================================
// MAPAS
// ============================================

function mostrarMapaPreview(lat, lon, containerId) {
  window.secureLog(`🗺️ Mostrando mapa preview en ${containerId}:`, lat, lon);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Contenedor no encontrado:', containerId);
    return;
  }

  if (containerId === 'mapPreviewRecogida' && appData.mapRecogida) {
    try {
      appData.mapRecogida.off();
      appData.mapRecogida.remove();
    } catch (error) {
      window.secureLog('⚠️ Error limpiando mapa recogida:', error);
    }
    appData.mapRecogida = null;
  }
  
  if (containerId === 'mapPreviewEntrega' && appData.mapEntrega) {
    try {
      appData.mapEntrega.off();
      appData.mapEntrega.remove();
    } catch (error) {
      window.secureLog('⚠️ Error limpiando mapa entrega:', error);
    }
    appData.mapEntrega = null;
  }
  
  container.innerHTML = '';
  container.className = '';
  
  const newContainer = document.createElement('div');
  newContainer.id = containerId;
  newContainer.style.height = '250px';
  newContainer.style.borderRadius = '12px';
  newContainer.style.overflow = 'hidden';
  newContainer.style.position = 'relative';
  newContainer.className = 'mb-2';
  
  container.parentNode.replaceChild(newContainer, container);
  newContainer.classList.remove('hidden');
  
  setTimeout(() => {
    try {
      const map = L.map(containerId, {
        center: [lat, lon],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
      }).addTo(map);
      
      L.marker([lat, lon]).addTo(map);
      
      if (containerId === 'mapPreviewRecogida') {
        appData.mapRecogida = map;
      } else if (containerId === 'mapPreviewEntrega') {
        appData.mapEntrega = map;
      }
      
      setTimeout(() => map.invalidateSize(), 150);
      window.secureLog(`✅ Mapa ${containerId} creado`);
      
    } catch (error) {
      console.error(`❌ Error creando mapa ${containerId}:`, error);
    }
  }, 250);
}

function inicializarMapaInteractivo() {
  window.secureLog('🗺️ Inicializando mapa interactivo...');
  
  const modal = document.getElementById('mapModal');
  const container = document.getElementById('mapInteractive');

  if (appData.mapInteractive) {
    try {
      appData.mapInteractive.off();
      appData.mapInteractive.remove();
    } catch (error) {
      window.secureLog('⚠️ Error limpiando mapa:', error);
    }
    appData.mapInteractive = null;
    appData.markerInteractive = null;
  }

  container.innerHTML = '';
  container.className = '';
  
  const newContainer = document.createElement('div');
  newContainer.id = 'mapInteractive';
  newContainer.style.height = '250px';
  newContainer.style.borderRadius = '12px';
  newContainer.style.overflow = 'hidden';
  newContainer.style.position = 'relative';
  
  container.parentNode.replaceChild(newContainer, container);
  modal.classList.remove('hidden');

  setTimeout(() => {
    try {
      let centerLat = 15.5;
      let centerLon = -88.0;
      
      if (appData.comercio && appData.comercio.ubicacionGPS) {
        const coords = appData.comercio.ubicacionGPS.split(',');
        if (coords.length === 2) {
          centerLat = parseFloat(coords[0]);
          centerLon = parseFloat(coords[1]);
        }
      }
      
      appData.mapInteractive = L.map('mapInteractive', {
        center: [centerLat, centerLon],
        zoom: 13,
        zoomControl: true
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
      }).addTo(appData.mapInteractive);

      appData.markerInteractive = L.marker([centerLat, centerLon], { 
        draggable: true 
      }).addTo(appData.mapInteractive);

      appData.mapInteractive.on('click', (e) => {
        appData.markerInteractive.setLatLng(e.latlng);
      });
      
      setTimeout(() => appData.mapInteractive.invalidateSize(), 200);
      window.secureLog('✅ Mapa interactivo creado');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al cargar el mapa. Intenta de nuevo.');
    }
  }, 250);
}

// ============================================
// GESTIÓN DE ENVÍOS
// ============================================

async function cargarMisEnvios() {
  try {
    const url = `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      appData.envios = result.envios;
      renderizarEnvios();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function renderizarEnvios() {
  const container = document.getElementById('listaEnvios');
  const filtroEstado = document.getElementById('filtroEstado').value;

  let enviosFiltrados = appData.envios;
  if (filtroEstado) {
    enviosFiltrados = enviosFiltrados.filter(e => e.estado === filtroEstado || e.Estado === filtroEstado);
  }

  if (enviosFiltrados.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-500"><p>No hay envíos para mostrar</p></div>';
    return;
  }

  container.innerHTML = enviosFiltrados.map(envio => {
    const id = envio.id || envio.ID;
    const fecha = envio.fecha || envio['Fecha Solicitud'];
    const estado = envio.estado || envio.Estado || 'PENDIENTE_ASIGNACION';
    const tipoRegistro = envio.tipoRegistro || envio['Tipo Registro'] || 'ENVIO_NORMAL';
    const tipoServicio = envio.tipoServicio || envio['Tipo Servicio'] || 'SOLO_ENTREGA';
    const nombreDestinatario = envio.nombreDestinatario || envio['Nombre Destinatario'] || '-';
    const descripcion = envio.descripcionPaquete || envio['Descripción Paquete'] || '-';
    
    const esEntrega = tipoRegistro === 'SOLICITUD_ENTREGA';
    const icono = esEntrega ? '🔔' : '📦';
    const tipoLabel = esEntrega ? 'SOLICITUD DE ENTREGA' : 'ENVÍO';
    
    return `
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-bold text-lg">${icono} ${tipoLabel} #${id}</p>
            <p class="text-sm text-gray-600">${new Date(fecha).toLocaleString('es-HN')}</p>
          </div>
          <span class="status-badge status-${estado}">${estado.replace(/_/g, ' ')}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <p class="text-gray-500">Tipo:</p>
            <p class="font-semibold">${tipoServicio.replace(/_/g, ' ')}</p>
          </div>
          ${!esEntrega ? `
            <div>
              <p class="text-gray-500">Destinatario:</p>
              <p class="font-semibold">${nombreDestinatario}</p>
            </div>
          ` : ''}
        </div>
        <p class="text-sm text-gray-600 mt-2">${descripcion}</p>
      </div>
    `;
  }).join('');
}

async function procesarEnvio(e) {
  e.preventDefault();

  if (!appData.ubicacionRecogida) {
    alert('⚠️ Debes configurar la ubicación de recogida');
    return;
  }

  if (!appData.ubicacionEntrega) {
    alert('⚠️ Debes pegar la ubicación de entrega que te mandó tu cliente por WhatsApp');
    document.getElementById('linkEntrega').focus();
    return;
  }

  const tipoServicio = document.querySelector('input[name="tipoServicio"]:checked').value;
  const quienPaga = document.querySelector('input[name="quienPaga"]:checked').value;
  const nombreDestinatario = document.getElementById('nombreDestinatario').value;
  const telefonoDestinatario = document.getElementById('telefonoDestinatario').value;
  const descripcionPaquete = document.getElementById('descripcionPaquete').value;
  const montoCobrar = tipoServicio === 'PAGO_CONTRA_ENTREGA' ? document.getElementById('montoCobrar').value : 0;
  const tipoPagoEnvio = document.querySelector('input[name="tipoPagoEnvio"]:checked').value;
  const notasAdicionales = document.getElementById('notasAdicionales').value;

  let fotoUrl = null;
  const fotoFile = document.getElementById('fotoPaquete').files[0];

  const submitBtn = document.querySelector('#nuevoEnvioForm button[type="submit"]');
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;

  if (fotoFile) {
    try {
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
    } catch (error) {
      console.error('Error subiendo foto:', error);
    }
  }

  const datos = {
    esEntrega: false,
    idComercio: appData.comercio.id,
    nombreComercio: appData.comercio.nombre,
    telefonoComercio: appData.comercio.celular,
    tipoServicio,
    quienPaga,
    ubicacionRecogidaGPS: appData.ubicacionRecogida,
    ubicacionEntregaGPS: appData.ubicacionEntrega,
    nombreDestinatario,
    telefonoDestinatario,
    descripcionPaquete,
    montoCobrar,
    tipoPagoEnvio,
    notasAdicionales,
    fotoUrl,
    ciudadOrigen: document.getElementById('ciudadOrigen').textContent,
    ciudadDestino: document.getElementById('ciudadDestino').textContent,
    distanciaKm: document.getElementById('distanciaKm').textContent,
    tarifaEstimada: document.getElementById('tarifaTotal').textContent
  };

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registrarEnvioComercio',
        datos: datos
      })
    });

    alert('✅ Envío registrado exitosamente');
    document.getElementById('nuevoEnvioForm').reset();
    document.getElementById('tarifaResumen').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('ubicacionDetectada').classList.add('hidden');
    submitBtn.textContent = '🚀 Crear Envío';
    submitBtn.disabled = false;
    appData.ubicacionEntrega = null;

    document.getElementById('tabMisEnvios').click();
  } catch (error) {
    console.error('Error:', error);
    alert('⚠️ Error al registrar envío');
    submitBtn.textContent = '🚀 Crear Envío';
    submitBtn.disabled = false;
  }
}

// ============================================
// SOLICITAR ENTREGA
// ============================================

async function procesarSolicitudEntrega(e) {
  e.preventDefault();

  const tipoServicioEntrega = document.querySelector('input[name="tipoServicioEntrega"]:checked').value;
  const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
  const notasAdicionales = document.getElementById('notasAdicionalesEntrega').value;

  let datos = {
    esEntrega: true,
    idComercio: appData.comercio.id,
    nombreComercio: appData.comercio.nombre,
    telefonoComercio: appData.comercio.celular,
    tipoServicio: tipoServicioEntrega,
    metodoPago,
    notasAdicionales,
    fechaSolicitud: new Date().toISOString()
  };

  if (tipoServicioEntrega === 'TRASLADO_TIENDAS') {
    const tiendaOrigen = document.getElementById('tiendaOrigen').value;
    const tiendaDestino = document.getElementById('tiendaDestino').value;
    const ubicacionOrigen = document.getElementById('ubicacionOrigenTraslado').value;
    const ubicacionDestino = document.getElementById('ubicacionDestinoTraslado').value;
    const descripcion = document.getElementById('descripcionTraslado').value;

    if (!tiendaOrigen || !tiendaDestino || !ubicacionOrigen || !ubicacionDestino || !descripcion) {
      alert('⚠️ Por favor completa todos los campos obligatorios');
      return;
    }

    // Obtener datos de la tarifa calculada
    const distanciaKm = document.getElementById('distanciaKmEntrega')?.textContent || '';
    const tarifaTotal = document.getElementById('tarifaTotalEntrega')?.textContent || '0';

    datos = {
      ...datos,
      tiendaOrigen,
      tiendaDestino,
      ubicacionOrigen,
      ubicacionDestino,
      descripcionContenido: descripcion,
      distanciaKm,
      tarifa: tarifaTotal
    };

  } else if (tipoServicioEntrega === 'RECOGER_PAQUETE') {
    const nombreContacto = document.getElementById('nombreContacto').value;
    const telefonoContacto = document.getElementById('telefonoContacto').value;
    const ubicacionRecogida = document.getElementById('ubicacionRecogidaPaquete').value;
    const destinoPaquete = document.querySelector('input[name="destinoPaquete"]:checked').value;
    const descripcion = document.getElementById('descripcionPaquete2').value;
    const pagarAlRecoger = document.querySelector('input[name="pagarAlRecoger"]:checked').value;
    const montoRecoger = pagarAlRecoger === 'SI' ? document.getElementById('montoRecoger').value : 0;

    if (!nombreContacto || !telefonoContacto || !ubicacionRecogida || !descripcion) {
      alert('⚠️ Por favor completa todos los campos obligatorios');
      return;
    }

    let ubicacionEntrega = appData.comercio.ubicacionGPS;
    if (destinoPaquete === 'OTRA_DIRECCION') {
      ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete').value;
      if (!ubicacionEntrega) {
        alert('⚠️ Debes especificar la ubicación de entrega');
        return;
      }
    }

    const distanciaKm = document.getElementById('distanciaKmEntrega')?.textContent || '';
    const tarifaTotal = document.getElementById('tarifaTotalEntrega')?.textContent || '0';

    datos = {
      ...datos,
      nombreContacto,
      telefonoContacto,
      ubicacionOrigen: ubicacionRecogida,
      ubicacionDestino: ubicacionEntrega,
      destinoPaquete,
      descripcionContenido: descripcion,
      pagarAlRecoger,
      montoCobrar: montoRecoger,
      distanciaKm,
      tarifa: tarifaTotal
    };

  } else if (tipoServicioEntrega === 'REALIZAR_COMPRA') {
    const nombreComercioCompra = document.getElementById('nombreComercioCompra').value;
    const ubicacionComercio = document.getElementById('ubicacionComercioCompra').value;
    const listaProductos = document.getElementById('listaProductos').value;
    const presupuesto = document.getElementById('presupuesto').value;
    const comision = document.getElementById('comision').value;
    const destinoCompra = document.querySelector('input[name="destinoCompra"]:checked').value;

    if (!nombreComercioCompra || !ubicacionComercio || !listaProductos || !presupuesto || !comision) {
      alert('⚠️ Por favor completa todos los campos obligatorios');
      return;
    }

    let ubicacionEntrega = appData.comercio.ubicacionGPS;
    if (destinoCompra === 'OTRA_DIRECCION') {
      ubicacionEntrega = document.getElementById('ubicacionEntregaCompra').value;
      if (!ubicacionEntrega) {
        alert('⚠️ Debes especificar la ubicación de entrega');
        return;
      }
    }

    const distanciaKm = document.getElementById('distanciaKmEntrega')?.textContent || '';
    const tarifaTotal = document.getElementById('tarifaTotalEntrega')?.textContent || '0';

    datos = {
      ...datos,
      nombreComercioCompra,
      ubicacionOrigen: ubicacionComercio,
      ubicacionDestino: ubicacionEntrega,
      listaProductos,
      presupuesto,
      comision,
      destinoCompra,
      descripcionContenido: `Compra en ${nombreComercioCompra}:\n${listaProductos}`,
      distanciaKm,
      tarifa: tarifaTotal
    };
  }

  const submitBtn = document.querySelector('#solicitarEntregaForm button[type="submit"]');
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registrarEnvioComercio',
        datos: datos
      })
    });

    alert('✅ Solicitud de entrega registrada exitosamente.\n\nUn delivery será asignado pronto.');
    document.getElementById('solicitarEntregaForm').reset();
    submitBtn.textContent = '🚀 Solicitar Servicio';
    submitBtn.disabled = false;

    document.getElementById('seccionTrasladoTiendas').classList.remove('hidden');
    document.getElementById('seccionRecogerPaquete').classList.add('hidden');
    document.getElementById('seccionRealizarCompra').classList.add('hidden');
    document.getElementById('tarifaResumenEntrega').classList.add('hidden');

    document.getElementById('tabMisEnvios').click();
  } catch (error) {
    console.error('Error:', error);
    alert('⚠️ Error al registrar solicitud');
    submitBtn.textContent = '🚀 Solicitar Servicio';
    submitBtn.disabled = false;
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  verificarSesion();

  // AUTH
  document.getElementById('authPhoneForm').addEventListener('submit', (e) => {
    e.preventDefault();
    enviarCodigoVerificacion(document.getElementById('authPhone').value);
  });

  document.getElementById('authCodeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    verificarCodigoIngresado(document.getElementById('authCode').value);
  });

  document.getElementById('authRegisterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    completarRegistroComercio(
      document.getElementById('authNombreComercio').value,
      document.getElementById('authDireccionComercio').value,
      document.getElementById('authUbicacionGPS').value
    );
  });

  document.getElementById('resendCodeBtn').addEventListener('click', () => {
    enviarCodigoVerificacion(appData.numeroTemporal);
  });

  document.getElementById('authCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });

  document.getElementById('getLocationBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps = `${position.coords.latitude},${position.coords.longitude}`;
          document.getElementById('authUbicacionGPS').value = gps;
        },
        () => alert('No se pudo obtener ubicación')
      );
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

  // TABS
  document.getElementById('tabNuevoEnvio').addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('border-brand-orange', 'brand-orange');
      btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById('tabNuevoEnvio').classList.add('border-brand-orange', 'brand-orange');
    document.getElementById('tabNuevoEnvio').classList.remove('border-transparent', 'text-gray-500');
    
    document.getElementById('contentNuevoEnvio').classList.remove('hidden');
    document.getElementById('contentSolicitarEntrega').classList.add('hidden');
    document.getElementById('contentMisEnvios').classList.add('hidden');
  });

  document.getElementById('tabSolicitarEntrega').addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('border-brand-orange', 'brand-orange');
      btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById('tabSolicitarEntrega').classList.add('border-brand-orange', 'brand-orange');
    document.getElementById('tabSolicitarEntrega').classList.remove('border-transparent', 'text-gray-500');
    
    document.getElementById('contentNuevoEnvio').classList.add('hidden');
    document.getElementById('contentSolicitarEntrega').classList.remove('hidden');
    document.getElementById('contentMisEnvios').classList.add('hidden');
  });

  document.getElementById('tabMisEnvios').addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('border-brand-orange', 'brand-orange');
      btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById('tabMisEnvios').classList.add('border-brand-orange', 'brand-orange');
    document.getElementById('tabMisEnvios').classList.remove('border-transparent', 'text-gray-500');
    
    document.getElementById('contentNuevoEnvio').classList.add('hidden');
    document.getElementById('contentSolicitarEntrega').classList.add('hidden');
    document.getElementById('contentMisEnvios').classList.remove('hidden');
    cargarMisEnvios();
  });

  // NUEVO ENVÍO
  document.querySelectorAll('input[name="tipoServicio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const montoSection = document.getElementById('montoSection');
      if (e.target.value === 'PAGO_CONTRA_ENTREGA') {
        montoSection.classList.remove('hidden');
        document.getElementById('montoCobrar').setAttribute('required', 'required');
      } else {
        montoSection.classList.add('hidden');
        document.getElementById('montoCobrar').removeAttribute('required');
      }
    });
  });

  document.getElementById('cambiarRecogida').addEventListener('click', () => {
    document.getElementById('recogidaCustom').classList.remove('hidden');
  });

  document.getElementById('usarUbicacionGuardada').addEventListener('click', () => {
    document.getElementById('recogidaCustom').classList.add('hidden');
    appData.ubicacionRecogida = appData.comercio.ubicacionGPS;
  });

  let linkEntregaTimeout;
  document.getElementById('linkEntrega').addEventListener('input', (e) => {
    clearTimeout(linkEntregaTimeout);
    
    const statusIndicator = document.getElementById('linkEntregaStatus');
    const input = e.target.value.trim();
    
    document.getElementById('ubicacionDetectada').classList.add('hidden');
    document.getElementById('ubicacionError').classList.add('hidden');
    
    if (input.length > 5) {
      statusIndicator.classList.remove('hidden');
      
      linkEntregaTimeout = setTimeout(async () => {
        window.secureLog('🔍 Procesando entrada:', input);
        const resultado = await extraerCoordenadasDeLink(input);
        statusIndicator.classList.add('hidden');
        
        if (resultado.exito) {
          window.secureLog('✅ Coordenadas extraídas:', resultado.lat, resultado.lon);
          appData.ubicacionEntrega = `${resultado.lat},${resultado.lon}`;
          
          document.getElementById('ubicacionDetectada').classList.remove('hidden');
          document.getElementById('coordenadasDetectadas').textContent = `Lat: ${resultado.lat.toFixed(6)}, Lon: ${resultado.lon.toFixed(6)}`;
          
          mostrarMapaPreview(resultado.lat, resultado.lon, 'mapPreviewEntrega');
          await calcularTarifa(appData.ubicacionRecogida, appData.ubicacionEntrega);
          
          e.target.classList.remove('border-red-500');
          e.target.classList.add('border-green-500');
          
        } else {
          window.secureLog('❌ No se encontraron coordenadas');
          e.target.classList.remove('border-green-500');
          e.target.classList.add('border-red-500');
          
          document.getElementById('ubicacionError').classList.remove('hidden');
          
          if (resultado.error === 'LINK_ACORTADO') {
            alert(resultado.mensaje);
          }
        }
      }, 1000);
    } else {
      statusIndicator.classList.add('hidden');
      e.target.classList.remove('border-green-500', 'border-red-500');
    }
  });

  document.getElementById('usarMapaInteractivo').addEventListener('click', () => {
    inicializarMapaInteractivo();
  });

  document.getElementById('closeMapModal').addEventListener('click', () => {
    const modal = document.getElementById('mapModal');
    modal.classList.add('hidden');
    
    if (appData.mapInteractive) {
      try {
        appData.mapInteractive.off();
        appData.mapInteractive.remove();
      } catch (error) {}
      appData.mapInteractive = null;
      appData.markerInteractive = null;
    }
    
    const container = document.getElementById('mapInteractive');
    if (container) {
      container.innerHTML = '';
      container.className = '';
    }
  });

  document.getElementById('confirmarUbicacion').addEventListener('click', () => {
    if (!appData.markerInteractive) {
      alert('⚠️ Error: No se ha seleccionado ubicación');
      return;
    }

    const latlng = appData.markerInteractive.getLatLng();
    appData.ubicacionEntrega = `${latlng.lat},${latlng.lng}`;
    
    document.getElementById('ubicacionDetectada').classList.remove('hidden');
    document.getElementById('coordenadasDetectadas').textContent = `Lat: ${latlng.lat.toFixed(6)}, Lon: ${latlng.lng.toFixed(6)}`;
    
    document.getElementById('mapModal').classList.add('hidden');
    
    if (appData.mapInteractive) {
      try {
        appData.mapInteractive.off();
        appData.mapInteractive.remove();
      } catch (error) {}
      appData.mapInteractive = null;
      appData.markerInteractive = null;
    }
    
    const container = document.getElementById('mapInteractive');
    if (container) {
      container.innerHTML = '';
      container.className = '';
    }
    
    setTimeout(() => {
      mostrarMapaPreview(latlng.lat, latlng.lng, 'mapPreviewEntrega');
      setTimeout(async () => {
        await calcularTarifa(appData.ubicacionRecogida, appData.ubicacionEntrega);
      }, 500);
    }, 300);
  });

  document.getElementById('abrirAyudaWhatsapp').addEventListener('click', () => {
    document.getElementById('ayudaWhatsappModal').classList.remove('hidden');
  });

  document.getElementById('cerrarAyudaWhatsapp').addEventListener('click', () => {
    document.getElementById('ayudaWhatsappModal').classList.add('hidden');
  });

  document.getElementById('uploadArea').addEventListener('click', () => {
    document.getElementById('fotoPaquete').click();
  });

  document.getElementById('fotoPaquete').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('⚠️ Imagen muy grande. Máximo 5MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('previewImg').src = event.target.result;
        document.getElementById('uploadPlaceholder').classList.add('hidden');
        document.getElementById('uploadPreview').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('removeFoto').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('fotoPaquete').value = '';
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
  });

  document.getElementById('nuevoEnvioForm').addEventListener('submit', procesarEnvio);

  // SOLICITAR ENTREGA
  document.querySelectorAll('input[name="tipoServicioEntrega"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.getElementById('seccionTrasladoTiendas').classList.add('hidden');
      document.getElementById('seccionRecogerPaquete').classList.add('hidden');
      document.getElementById('seccionRealizarCompra').classList.add('hidden');

      if (e.target.value === 'TRASLADO_TIENDAS') {
        document.getElementById('seccionTrasladoTiendas').classList.remove('hidden');
      } else if (e.target.value === 'RECOGER_PAQUETE') {
        document.getElementById('seccionRecogerPaquete').classList.remove('hidden');
      } else if (e.target.value === 'REALIZAR_COMPRA') {
        document.getElementById('seccionRealizarCompra').classList.remove('hidden');
      }
    });
  });

  // NUEVO: Configurar autocompletado después de cargar ubicaciones
  setTimeout(() => {
    if (appData.ubicacionesFrecuentes.length > 0) {
      // Traslado
      configurarAutocomplete('ubicacionOrigenTraslado', async (ubicacion) => {
        window.secureLog('✅ Origen traslado seleccionado:', ubicacion.nombre);
        const destino = document.getElementById('ubicacionDestinoTraslado').value.trim();
        if (destino) {
          await calcularTarifaEntrega(ubicacion.ubicacion, destino);
        }
      });
      
      configurarAutocomplete('ubicacionDestinoTraslado', async (ubicacion) => {
        window.secureLog('✅ Destino traslado seleccionado:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionOrigenTraslado').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
      
      // Recoger Paquete
      configurarAutocomplete('ubicacionRecogidaPaquete', async (ubicacion) => {
        window.secureLog('✅ Ubicación recogida seleccionada:', ubicacion.nombre);
        const destinoPaquete = document.querySelector('input[name="destinoPaquete"]:checked').value;
        let ubicacionEntrega = appData.comercio.ubicacionGPS;
        if (destinoPaquete === 'OTRA_DIRECCION') {
          ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete').value.trim();
        }
        if (ubicacionEntrega) {
          await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
        }
      });
      
      configurarAutocomplete('ubicacionEntregaPaquete', async (ubicacion) => {
        window.secureLog('✅ Ubicación entrega paquete seleccionada:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionRecogidaPaquete').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
      
      // Realizar Compra
      configurarAutocomplete('ubicacionComercioCompra', async (ubicacion) => {
        window.secureLog('✅ Comercio compra seleccionado:', ubicacion.nombre);
        const destinoCompra = document.querySelector('input[name="destinoCompra"]:checked').value;
        let ubicacionEntrega = appData.comercio.ubicacionGPS;
        if (destinoCompra === 'OTRA_DIRECCION') {
          ubicacionEntrega = document.getElementById('ubicacionEntregaCompra').value.trim();
        }
        if (ubicacionEntrega) {
          await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
        }
      });
      
      configurarAutocomplete('ubicacionEntregaCompra', async (ubicacion) => {
        window.secureLog('✅ Ubicación entrega compra seleccionada:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionComercioCompra').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
    }
  }, 2000);

  // Detectar cambios manuales en inputs para calcular tarifa
  document.getElementById('ubicacionOrigenTraslado')?.addEventListener('blur', async function() {
    const origen = this.value.trim();
    const destino = document.getElementById('ubicacionDestinoTraslado').value.trim();
    if (origen && destino && origen.includes(',') && destino.includes(',')) {
      await calcularTarifaEntrega(origen, destino);
    }
  });

  document.getElementById('ubicacionDestinoTraslado')?.addEventListener('blur', async function() {
    const origen = document.getElementById('ubicacionOrigenTraslado').value.trim();
    const destino = this.value.trim();
    if (origen && destino && origen.includes(',') && destino.includes(',')) {
      await calcularTarifaEntrega(origen, destino);
    }
  });

  document.querySelectorAll('input[name="destinoPaquete"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'OTRA_DIRECCION') {
        document.getElementById('otraDireccionPaquete').classList.remove('hidden');
      } else {
        document.getElementById('otraDireccionPaquete').classList.add('hidden');
        // Calcular tarifa con ubicación del comercio
        const origen = document.getElementById('ubicacionRecogidaPaquete').value.trim();
        if (origen && appData.comercio.ubicacionGPS) {
          calcularTarifaEntrega(origen, appData.comercio.ubicacionGPS);
        }
      }
    });
  });

  document.querySelectorAll('input[name="destinoCompra"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'OTRA_DIRECCION') {
        document.getElementById('otraDireccionCompra').classList.remove('hidden');
      } else {
        document.getElementById('otraDireccionCompra').classList.add('hidden');
        // Calcular tarifa con ubicación del comercio
        const origen = document.getElementById('ubicacionComercioCompra').value.trim();
        if (origen && appData.comercio.ubicacionGPS) {
          calcularTarifaEntrega(origen, appData.comercio.ubicacionGPS);
        }
      }
    });
  });

  document.querySelectorAll('input[name="pagarAlRecoger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'SI') {
        document.getElementById('montoRecogerSection').classList.remove('hidden');
      } else {
        document.getElementById('montoRecogerSection').classList.add('hidden');
      }
    });
  });

  document.getElementById('solicitarEntregaForm').addEventListener('submit', procesarSolicitudEntrega);

  document.getElementById('filtroEstado').addEventListener('change', renderizarEnvios);
  document.getElementById('refrescarEnvios').addEventListener('click', cargarMisEnvios);
});

// SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        window.secureLog('✅ Service Worker registrado');
        setInterval(() => registration.update(), 5 * 60 * 1000);
      })
      .catch((error) => {
        window.secureLog('❌ Error al registrar Service Worker:', error);
      });
  });
}
EOF

echo "Archivo combinado creado exitosamente"