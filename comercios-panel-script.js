// ========================================
// COMERCIOS-PANEL.JS - VERSIÃ“N COMPLETA
// Con Autocompletado y CÃ¡lculo de Tarifas
// ========================================

const SCRIPT_URL = window.APP_CONFIG.apiEndpoint;
const CLOUDINARY_CLOUD_NAME = window.APP_CONFIG.cloudinary.cloudName;
const CLOUDINARY_UPLOAD_PRESET = window.APP_CONFIG.cloudinary.uploadPreset;

// Validar origen al cargar
if (!window.APP_SECURITY.validateOrigin()) {
  document.body.innerHTML = '<h1 style="text-align:center;margin-top:50px;">Acceso no autorizado</h1>';
  throw new Error('Invalid origin');
}

let appData = {
  comercio: null,
  ubicacionRecogida: null,
  ubicacionEntrega: null,
  mapRecogida: null,
  mapEntrega: null,
  mapInteractive: null,
  markerInteractive: null,
  envios: [],
  ubicacionesFrecuentes: [] // NUEVO
};

// ============================================
// NUEVO: CARGAR UBICACIONES FRECUENTES
// ============================================

async function cargarUbicacionesFrecuentes() {
  try {
    console.log('📍 === CARGANDO UBICACIONES FRECUENTES ===');
    
    const response = await fetch(`${SCRIPT_URL}?action=obtenerUbicacionesFrecuentes`);
    const result = await response.json();
    
    if (result.success) {
      appData.ubicacionesFrecuentes = result.ubicaciones;
      window.ubicacionesFrecuentes = result.ubicaciones;
      
      console.log(`✅ ${result.ubicaciones.length} ubicaciones cargadas:`);
      console.log('  - Comercios:', result.ubicaciones.filter(u => u.tipo === 'COMERCIO').length);
      console.log('  - Frecuentes:', result.ubicaciones.filter(u => u.tipo === 'FRECUENTE').length);
      
      setTimeout(configurarTodosLosAutocompletados, 500);
    } else {
      console.log('⚠️ Error:', result.error);
      appData.ubicacionesFrecuentes = [];
    }
  } catch (error) {
    console.error('❌ Error:', error);
    appData.ubicacionesFrecuentes = [];
  }
}

// ============================================
// NUEVO: AUTOCOMPLETADO DE UBICACIONES
// ============================================

function configurarAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  
  if (!input) {
    console.warn(`⚠️ Input ${inputId} no encontrado`);
    return;
  }
  
  console.log(`🔧 Configurando autocomplete: ${inputId}`);
  
  if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
    console.warn('⚠️ No hay ubicaciones');
    return;
  }
  
  const container = document.createElement('div');
  container.className = 'autocomplete-container hidden';
  container.id = `autocomplete-${inputId}`;
  
  const wrapper = input.parentElement;
  if (!wrapper.classList.contains('input-autocomplete-wrapper')) {
    const newWrapper = document.createElement('div');
    newWrapper.className = 'input-autocomplete-wrapper';
    input.parentNode.insertBefore(newWrapper, input);
    newWrapper.appendChild(input);
    newWrapper.appendChild(container);
  } else {
    wrapper.appendChild(container);
  }
  
  input.addEventListener('input', (e) => {
    const valor = e.target.value.toLowerCase().trim();
    
    if (valor.length < 2) {
      container.classList.add('hidden');
      return;
    }
    
    const coincidencias = appData.ubicacionesFrecuentes.filter(u => {
      const nombre = (u.nombre || '').toLowerCase();
      const desc = (u.descripcion || '').toLowerCase();
      const ubi = (u.ubicacion || '').toLowerCase();
      return nombre.includes(valor) || desc.includes(valor) || ubi.includes(valor);
    });
    
    console.log(`🔍 "${valor}" → ${coincidencias.length} resultados`);
    
    if (coincidencias.length === 0) {
      container.innerHTML = '<div class="autocomplete-no-results">Sin resultados</div>';
      container.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = coincidencias.slice(0, 8).map(u => {
      const icon = u.tipo === 'COMERCIO' ? '🏪' : '📍';
      const typeClass = `type-${u.tipo}`;
      
      return `
        <div class="autocomplete-item" data-ubicacion='${JSON.stringify(u).replace(/'/g, "&#39;")}'>
          <div class="autocomplete-item-title">
            <span>${icon}</span>
            <span>${u.nombre}</span>
            <span class="autocomplete-item-type ${typeClass}">${u.tipo}</span>
          </div>
          ${u.descripcion ? `<div class="autocomplete-item-description">${u.descripcion}</div>` : ''}
          <div class="autocomplete-item-coords">📍 ${u.ubicacion}</div>
        </div>
      `;
    }).join('');
    
    container.classList.remove('hidden');
    
    container.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const ubi = JSON.parse(item.dataset.ubicacion.replace(/&#39;/g, "'"));
        
        console.log('✅ Seleccionado:', ubi.nombre);
        
        input.value = ubi.ubicacion;
        container.classList.add('hidden');
        
        if (onSelect) onSelect(ubi);
      });
    });
  });
  
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !container.contains(e.target)) {
      container.classList.add('hidden');
    }
  });
  
  console.log(`✅ Configurado: ${inputId}`);
}

// ============================================
// AUTENTICACIÃ“N
// ============================================

function verificarSesion() {
  const comercioGuardado = window.APP_SECURITY.getSecureSession('somarComercioUser');
  if (comercioGuardado) {
    try {
      appData.comercio = comercioGuardado;
      document.getElementById('authModal').classList.add('hidden');
      document.getElementById('mainContent').classList.remove('hidden');
      document.getElementById('comercioName').textContent = appData.comercio.nombre;
      document.getElementById('direccionRecogidaDisplay').textContent = appData.comercio.direccion;
      appData.ubicacionRecogida = appData.comercio.ubicacionGPS;
      
      // NUEVO: Cargar ubicaciones frecuentes
      cargarUbicacionesFrecuentes();
      
      return true;
    } catch (error) {
      localStorage.removeItem('somarComercioUser');
    }
  }
  return false;
}

async function enviarCodigoVerificacion(numero) {
  try {
    const submitBtn = document.querySelector('#authPhoneForm button[type="submit"]');
    submitBtn.textContent = 'Enviando...';
    submitBtn.disabled = true;

    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'enviarCodigoVerificacionComercio',
        numero: numero
      })
    });

    appData.numeroTemporal = numero;
    document.getElementById('phoneDisplay').textContent = numero;
    document.getElementById('authStep1').classList.add('hidden');
    document.getElementById('authStep2').classList.remove('hidden');
    submitBtn.textContent = 'Continuar';
    submitBtn.disabled = false;
    alert('âœ… CÃ³digo enviado por WhatsApp');
  } catch (error) {
    console.error('Error:', error);
    alert('âš ï¸ Error al enviar cÃ³digo');
  }
}

async function verificarCodigoIngresado(codigo) {
  try {
    const submitBtn = document.querySelector('#authCodeForm button[type="submit"]');
    submitBtn.textContent = 'Verificando...';
    submitBtn.disabled = true;

    const url = `${SCRIPT_URL}?action=verificarCodigoComercio&numero=${encodeURIComponent(appData.numeroTemporal)}&codigo=${encodeURIComponent(codigo)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      if (result.comercioExiste) {
        appData.comercio = result.datosComercio;
        window.APP_SECURITY.saveSecureSession('somarComercioUser', appData.comercio);
        document.getElementById('authModal').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('comercioName').textContent = appData.comercio.nombre;
        document.getElementById('direccionRecogidaDisplay').textContent = appData.comercio.direccion;
        appData.ubicacionRecogida = appData.comercio.ubicacionGPS;
        
        // NUEVO: Cargar ubicaciones
        await cargarUbicacionesFrecuentesCorregida();
        
        alert(`Â¡Bienvenido ${result.datosComercio.nombre}!`);
      } else {
        document.getElementById('authStep2').classList.add('hidden');
        document.getElementById('authStep3').classList.remove('hidden');
      }
    } else {
      alert(result.error || 'CÃ³digo incorrecto');
      submitBtn.textContent = 'Verificar';
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('âš ï¸ Error al verificar cÃ³digo');
  }
}

async function completarRegistroComercio(nombre, direccion, ubicacionGPS) {
  try {
    const submitBtn = document.querySelector('#authRegisterForm button[type="submit"]');
    submitBtn.textContent = 'Registrando...';
    submitBtn.disabled = true;

    const params = new URLSearchParams({
      action: 'completarRegistroComercio',
      celular: appData.numeroTemporal,
      nombre: nombre,
      direccion: direccion,
      ubicacionGPS: ubicacionGPS || ''
    });

    const response = await fetch(`${SCRIPT_URL}?${params.toString()}`);
    const result = await response.json();

    if (result.success) {
      appData.comercio = result.comercio;
      window.APP_SECURITY.saveSecureSession('somarComercioUser', appData.comercio);
      document.getElementById('authModal').classList.add('hidden');
      document.getElementById('mainContent').classList.remove('hidden');
      document.getElementById('comercioName').textContent = appData.comercio.nombre;
      document.getElementById('direccionRecogidaDisplay').textContent = appData.comercio.direccion;
      appData.ubicacionRecogida = appData.comercio.ubicacionGPS;
      
      await cargarUbicacionesFrecuentes();
      
      alert('Â¡Comercio registrado exitosamente!');
    } else {
      alert(result.error || 'Error al registrar');
      submitBtn.textContent = 'Registrar Comercio';
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('âš ï¸ Error al registrar');
  }
}

function cerrarSesion() {
  if (confirm('Â¿Cerrar sesiÃ³n?')) {
    localStorage.removeItem('somarComercioUser');
    location.reload();
  }
}

// ============================================
// EXTRACCIÃ“N DE COORDENADAS
// ============================================

async function extraerCoordenadasDeLink(input) {
  try {
    input = input.trim();
    window.secureLog('ðŸ” Procesando entrada:', input);

    const soloCoordMatch = input.match(/^\s*([0-9]{1,2}\.[0-9]+)\s*,\s*(-?[0-9]{1,3}\.[0-9]+)\s*$/);
    if (soloCoordMatch) {
      const lat = parseFloat(soloCoordMatch[1]);
      const lon = parseFloat(soloCoordMatch[2]);
      
      if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
        window.secureLog('âœ… Coordenadas directas detectadas');
        return { lat, lon, exito: true };
      }
    }

    if (input.includes('goo.gl') || input.includes('maps.app.goo.gl')) {
      window.secureLog('âš ï¸ Link acortado detectado');
      return { 
        exito: false, 
        error: 'LINK_ACORTADO',
        mensaje: 'Link acortado detectado.\n\nPor favor:\n1. Abre el link en Google Maps\n2. Espera que cargue\n3. Toca y mantÃ©n sobre la ubicaciÃ³n\n4. AparecerÃ¡n las coordenadas abajo\n5. CÃ³pialas y pÃ©galas aquÃ­\n\nO usa el mapa interactivo ðŸ—ºï¸'
      };
    }

    return await extraerCoordenadasDeURL(input);

  } catch (error) {
    console.error('âŒ Error:', error);
    return { exito: false, error: error.toString() };
  }
}

async function extraerCoordenadasDeURL(url) {
  const qMatch = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/);
  if (qMatch) {
    window.secureLog('âœ… Coordenadas encontradas (q)');
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]), exito: true };
  }

  const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
  if (atMatch) {
    window.secureLog('âœ… Coordenadas encontradas (@)');
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]), exito: true };
  }

  const placeMatch = url.match(/\/place\/.*?@([0-9.-]+),([0-9.-]+)/);
  if (placeMatch) {
    window.secureLog('âœ… Coordenadas encontradas (place)');
    return { lat: parseFloat(placeMatch[1]), lon: parseFloat(placeMatch[2]), exito: true };
  }

  const coordMatch = url.match(/([0-9]{1,2}\.[0-9]{4,})[,\s]+(-?[0-9]{1,3}\.[0-9]{4,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    
    if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
      window.secureLog('âœ… Coordenadas encontradas (patrÃ³n general)');
      return { lat, lon, exito: true };
    }
  }

  window.secureLog('âŒ No se encontraron coordenadas en la URL');
  return { exito: false, error: 'No se detectaron coordenadas vÃ¡lidas' };
}

// ============================================
// CÃLCULO DE TARIFAS
// ============================================

function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function obtenerCiudad(lat, lon) {
  const ciudades = [
    { nombre: 'Choloma', lat: 15.61, lon: -87.95, radio: 0.10 },
    { nombre: 'San Pedro Sula', lat: 15.50, lon: -88.03, radio: 0.15 },
    { nombre: 'Tegucigalpa', lat: 14.08, lon: -87.21, radio: 0.15 },
    { nombre: 'La Ceiba', lat: 15.78, lon: -86.80, radio: 0.10 },
    { nombre: 'El Progreso', lat: 15.40, lon: -87.80, radio: 0.08 },
    { nombre: 'Comayagua', lat: 14.45, lon: -87.64, radio: 0.10 },
    { nombre: 'Puerto CortÃ©s', lat: 15.85, lon: -87.94, radio: 0.08 },
    { nombre: 'Villanueva', lat: 15.32, lon: -88.00, radio: 0.08 },
    { nombre: 'La Lima', lat: 15.43, lon: -87.91, radio: 0.06 },
    { nombre: 'Choluteca', lat: 13.30, lon: -87.19, radio: 0.10 },
    { nombre: 'DanlÃ­', lat: 14.03, lon: -86.58, radio: 0.08 },
    { nombre: 'Juticalpa', lat: 14.66, lon: -86.22, radio: 0.08 },
    { nombre: 'Santa Rosa de CopÃ¡n', lat: 14.77, lon: -88.78, radio: 0.08 },
    { nombre: 'Siguatepeque', lat: 14.60, lon: -87.84, radio: 0.08 },
    { nombre: 'Tocoa', lat: 15.66, lon: -86.00, radio: 0.08 },
    { nombre: 'Tela', lat: 15.78, lon: -87.46, radio: 0.08 }
  ];

  for (const ciudad of ciudades) {
    const distancia = Math.sqrt(Math.pow(lat - ciudad.lat, 2) + Math.pow(lon - ciudad.lon, 2));
    if (distancia < ciudad.radio) {
      window.secureLog(`âœ… Ciudad detectada: ${ciudad.nombre}`);
      return ciudad.nombre;
    }
  }

  if (lat >= 15.3 && lat <= 16.0 && lon >= -88.5 && lon <= -87.3) return 'CortÃ©s';
  else if (lat >= 13.8 && lat <= 14.4 && lon >= -87.5 && lon <= -86.8) return 'Francisco MorazÃ¡n';
  else if (lat >= 15.5 && lat <= 16.0 && lon >= -87.0 && lon <= -86.0) return 'AtlÃ¡ntida';
  else if (lat >= 14.4 && lat <= 15.0 && lon >= -86.8 && lon <= -86.0) return 'Olancho';
  else if (lat >= 13.0 && lat <= 13.8 && lon >= -87.5 && lon <= -86.8) return 'Choluteca';

  window.secureLog('âš ï¸ Ciudad no detectada, usando genÃ©rico');
  return 'Honduras';
}

async function calcularDistanciaOSRM(lat1, lon1, lat2, lon2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    window.secureLog('ðŸŒ Consultando OSRM...');
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM failed');
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No route');
    const distanciaKm = data.routes[0].distance / 1000;
    window.secureLog(`âœ… OSRM: ${distanciaKm.toFixed(2)} km por carretera`);
    return distanciaKm;
  } catch (error) {
    console.error('âŒ OSRM error:', error);
    throw error;
  }
}

function calcularTarifaCholoma(km) {
  const tabla = [
    { min: 0, max: 3, tarifa: 50 },
    { min: 3, max: 7, tarifa: 75 },
    { min: 7, max: 9, tarifa: 90 },
    { min: 9, max: 11, tarifa: 105 },
    { min: 11, max: 13, tarifa: 120 },
    { min: 13, max: 15, tarifa: 135 }
  ];
  for (const r of tabla) {
    if (km >= r.min && km < r.max) {
      window.secureLog(`âœ… Choloma ${r.min}-${r.max}km: L.${r.tarifa}`);
      return r.tarifa;
    }
  }
  const calc = 30 + (km * 6.8);
  const redondeado = Math.round(calc / 5) * 5;
  window.secureLog(`ðŸ“Š Choloma fuera de tabla: ${calc.toFixed(2)} â†’ L.${redondeado}`);
  return redondeado;
}

function calcularTarifaOtrasCiudades(km) {
  const tabla = [
    { min: 0, max: 11, tarifa: 125 },
    { min: 11, max: 13, tarifa: 135 },
    { min: 13, max: 15, tarifa: 150 },
    { min: 15, max: 17, tarifa: 165 },
    { min: 17, max: 19, tarifa: 180 },
    { min: 19, max: 21, tarifa: 195 }
  ];
  for (const r of tabla) {
    if (km >= r.min && km < r.max) {
      window.secureLog(`âœ… Otras ${r.min}-${r.max}km: L.${r.tarifa}`);
      return r.tarifa;
    }
  }
  const calc = 40 + (km * 7.5);
  const redondeado = Math.round(calc / 5) * 5;
  window.secureLog(`ðŸ“Š Otras fuera de tabla: ${calc.toFixed(2)} â†’ L.${redondeado}`);
  return redondeado;
}

async function calcularTarifa(ubicacionRecogida, ubicacionEntrega) {
  if (!ubicacionRecogida || !ubicacionEntrega) {
    window.secureLog('âš ï¸ Faltan ubicaciones');
    return;
  }

  try {
    const [lat1, lon1] = ubicacionRecogida.split(',').map(Number);
    const [lat2, lon2] = ubicacionEntrega.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error('âŒ Coordenadas invÃ¡lidas');
      return;
    }

    const ciudadOrigen = obtenerCiudad(lat1, lon1);
    const ciudadDestino = obtenerCiudad(lat2, lon2);

    window.secureLog(`ðŸ“ Origen: ${ciudadOrigen}, Destino: ${ciudadDestino}`);

    let distanciaKm;
    try {
      distanciaKm = await calcularDistanciaOSRM(lat1, lon1, lat2, lon2);
    } catch (error) {
      console.warn('âš ï¸ OSRM fallback a Haversine');
      distanciaKm = calcularDistanciaHaversine(lat1, lon1, lat2, lon2);
    }

    const esCholoma = ciudadOrigen.toLowerCase().includes('choloma') && 
                      ciudadDestino.toLowerCase().includes('choloma');

    const tarifaTotal = esCholoma ? 
      calcularTarifaCholoma(distanciaKm) : 
      calcularTarifaOtrasCiudades(distanciaKm);

    document.getElementById('ciudadOrigen').textContent = ciudadOrigen;
    document.getElementById('ciudadDestino').textContent = ciudadDestino;
    document.getElementById('distanciaKm').textContent = distanciaKm.toFixed(2) + ' km';
    document.getElementById('tarifaTotal').textContent = tarifaTotal.toFixed(2);
    document.getElementById('tarifaResumen').classList.remove('hidden');

    window.secureLog(`âœ… Tarifa: L.${tarifaTotal.toFixed(2)}`);
    
    return {
      ciudadOrigen,
      ciudadDestino,
      distanciaKm: distanciaKm.toFixed(2),
      tarifaTotal: tarifaTotal.toFixed(2)
    };
  } catch (error) {
    console.error('âŒ Error:', error);
    return null;
  }
}

// NUEVO: Calcular tarifa para formulario de Solicitar Entrega
async function calcularTarifaEntrega(ubicacionOrigen, ubicacionDestino) {
  if (!ubicacionOrigen || !ubicacionDestino) {
    window.secureLog('âš ï¸ Faltan ubicaciones');
    return;
  }

  try {
    const [lat1, lon1] = ubicacionOrigen.split(',').map(Number);
    const [lat2, lon2] = ubicacionDestino.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error('âŒ Coordenadas invÃ¡lidas');
      return;
    }

    let distanciaKm;
    try {
      distanciaKm = await calcularDistanciaOSRM(lat1, lon1, lat2, lon2);
    } catch (error) {
      console.warn('âš ï¸ OSRM fallback a Haversine');
      distanciaKm = calcularDistanciaHaversine(lat1, lon1, lat2, lon2);
    }

    const ciudadOrigen = obtenerCiudad(lat1, lon1);
    const ciudadDestino = obtenerCiudad(lat2, lon2);
    const esCholoma = ciudadOrigen.toLowerCase().includes('choloma') && 
                      ciudadDestino.toLowerCase().includes('choloma');

    const tarifaTotal = esCholoma ? 
      calcularTarifaCholoma(distanciaKm) : 
      calcularTarifaOtrasCiudades(distanciaKm);

    document.getElementById('distanciaKmEntrega').textContent = distanciaKm.toFixed(2) + ' km';
    document.getElementById('tarifaTotalEntrega').textContent = tarifaTotal.toFixed(2);
    document.getElementById('tarifaResumenEntrega').classList.remove('hidden');

    window.secureLog(`âœ… Tarifa Entrega: L.${tarifaTotal.toFixed(2)}`);
    
    return {
      ciudadOrigen,
      ciudadDestino,
      distanciaKm: distanciaKm.toFixed(2),
      tarifaTotal: tarifaTotal.toFixed(2)
    };
  } catch (error) {
    console.error('âŒ Error:', error);
    return null;
  }
}

// (ContinÃºa en siguiente mensaje por lÃ­mite de caracteres...)

// ============================================
// MAPAS
// ============================================

function mostrarMapaPreview(lat, lon, containerId) {
  window.secureLog(`ðŸ—ºï¸ Mostrando mapa preview en ${containerId}:`, lat, lon);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('âŒ Contenedor no encontrado:', containerId);
    return;
  }

  if (containerId === 'mapPreviewRecogida' && appData.mapRecogida) {
    try {
      appData.mapRecogida.off();
      appData.mapRecogida.remove();
    } catch (error) {
      window.secureLog('âš ï¸ Error limpiando mapa recogida:', error);
    }
    appData.mapRecogida = null;
  }
  
  if (containerId === 'mapPreviewEntrega' && appData.mapEntrega) {
    try {
      appData.mapEntrega.off();
      appData.mapEntrega.remove();
    } catch (error) {
      window.secureLog('âš ï¸ Error limpiando mapa entrega:', error);
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
        attribution: 'Â© OpenStreetMap',
        maxZoom: 18
      }).addTo(map);
      
      L.marker([lat, lon]).addTo(map);
      
      if (containerId === 'mapPreviewRecogida') {
        appData.mapRecogida = map;
      } else if (containerId === 'mapPreviewEntrega') {
        appData.mapEntrega = map;
      }
      
      setTimeout(() => map.invalidateSize(), 150);
      window.secureLog(`âœ… Mapa ${containerId} creado`);
      
    } catch (error) {
      console.error(`âŒ Error creando mapa ${containerId}:`, error);
    }
  }, 250);
}

function inicializarMapaInteractivo() {
  window.secureLog('ðŸ—ºï¸ Inicializando mapa interactivo...');
  
  const modal = document.getElementById('mapModal');
  const container = document.getElementById('mapInteractive');

  if (appData.mapInteractive) {
    try {
      appData.mapInteractive.off();
      appData.mapInteractive.remove();
    } catch (error) {
      window.secureLog('âš ï¸ Error limpiando mapa:', error);
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
        attribution: 'Â© OpenStreetMap',
        maxZoom: 18
      }).addTo(appData.mapInteractive);

      appData.markerInteractive = L.marker([centerLat, centerLon], { 
        draggable: true 
      }).addTo(appData.mapInteractive);

      appData.mapInteractive.on('click', (e) => {
        appData.markerInteractive.setLatLng(e.latlng);
      });
      
      setTimeout(() => appData.mapInteractive.invalidateSize(), 200);
      window.secureLog('âœ… Mapa interactivo creado');
    } catch (error) {
      console.error('âŒ Error:', error);
      alert('Error al cargar el mapa. Intenta de nuevo.');
    }
  }, 250);
}

// ============================================
// GESTIÃ“N DE ENVÃOS
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
    container.innerHTML = '<div class="text-center py-12 text-gray-500"><p>No hay envÃ­os para mostrar</p></div>';
    return;
  }

  container.innerHTML = enviosFiltrados.map(envio => {
    const id = envio.id || envio.ID;
    const fecha = envio.fecha || envio['Fecha Solicitud'];
    const estado = envio.estado || envio.Estado || 'PENDIENTE_ASIGNACION';
    const tipoRegistro = envio.tipoRegistro || envio['Tipo Registro'] || 'ENVIO_NORMAL';
    const tipoServicio = envio.tipoServicio || envio['Tipo Servicio'] || 'SOLO_ENTREGA';
    const nombreDestinatario = envio.nombreDestinatario || envio['Nombre Destinatario'] || '-';
    const descripcion = envio.descripcionPaquete || envio['DescripciÃ³n Paquete'] || '-';
    
    const esEntrega = tipoRegistro === 'SOLICITUD_ENTREGA';
    const icono = esEntrega ? 'ðŸ””' : 'ðŸ“¦';
    const tipoLabel = esEntrega ? 'SOLICITUD DE ENTREGA' : 'ENVÃO';
    
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

// ============================================
// FUNCIÃ“N CORREGIDA PARA SUBIR FOTO A CLOUDINARY
// Reemplaza la secciÃ³n de subida en procesarEnvio()
// ============================================

async function subirFotoCloudinary(file) {
  try {
    console.log('ðŸ“¸ === SUBIENDO FOTO A CLOUDINARY ===');
    console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
    console.log('Upload Preset:', CLOUDINARY_UPLOAD_PRESET);
    console.log('TamaÃ±o archivo:', (file.size / 1024 / 1024).toFixed(2) + ' MB');
    
    // Validar tamaÃ±o (mÃ¡ximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('La imagen es muy grande. MÃ¡ximo 10MB');
    }
    
    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo JPG, PNG o WEBP');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'PAQUETES_COMERCIOS'); // Organizar en carpeta
    
    console.log('ðŸ“¤ Enviando a Cloudinary...');
    
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    
    // Obtener respuesta como texto primero para debugging
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    if (!response.ok) {
      console.error('âŒ Error de Cloudinary:', responseText);
      throw new Error(`Cloudinary error ${response.status}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (!data.secure_url) {
      throw new Error('No se recibiÃ³ URL de la imagen');
    }
    
    console.log('âœ… Foto subida exitosamente');
    console.log('URL:', data.secure_url);
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id
    };
    
  } catch (error) {
    console.error('âŒ ERROR subiendo foto:', error);
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

// ============================================
// FUNCIÃ“N procesarEnvio() CORREGIDA
// Reemplaza toda la funciÃ³n procesarEnvio en comercios-panel-script.js
// ============================================

async function procesarEnvio(e) {
  e.preventDefault();

  if (!appData.ubicacionRecogida) {
    alert('âš ï¸ Debes configurar la ubicaciÃ³n de recogida');
    return;
  }

  if (!appData.ubicacionEntrega) {
    alert('âš ï¸ Debes pegar la ubicaciÃ³n de entrega que te mandÃ³ tu cliente por WhatsApp');
    document.getElementById('ubicacionEntregaInput').focus();
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

  const submitBtn = document.querySelector('#nuevoEnvioForm button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;

  let fotoUrl = null;
  const fotoFile = document.getElementById('fotoPaquete').files[0];

  // Subir foto a Cloudinary si existe
  if (fotoFile) {
    console.log('ðŸ“¸ Detectada foto, iniciando subida...');
    submitBtn.textContent = 'Subiendo foto...';
    
    const resultadoSubida = await subirFotoCloudinary(fotoFile);
    
    if (resultadoSubida.success) {
      fotoUrl = resultadoSubida.url;
      console.log('âœ… Foto subida correctamente:', fotoUrl);
    } else {
      console.error('âŒ Error subiendo foto:', resultadoSubida.error);
      
      // Preguntar al usuario si quiere continuar sin foto
      const continuar = confirm(
        'âš ï¸ No se pudo subir la foto:\n' + 
        resultadoSubida.error + 
        '\n\nÂ¿Deseas continuar sin foto?'
      );
      
      if (!continuar) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
    }
  }

  submitBtn.textContent = 'Registrando envÃ­o...';

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
    console.log('ðŸ“ Enviando datos al backend...');
    console.log('Datos:', datos);
    
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registrarEnvioComercio',
        datos: datos
      })
    });

    console.log('âœ… EnvÃ­o registrado en backend');
    
    alert('âœ… EnvÃ­o registrado exitosamente' + (fotoUrl ? ' con foto' : ''));
    
    // Limpiar formulario
    document.getElementById('nuevoEnvioForm').reset();
    document.getElementById('tarifaResumen').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('ubicacionDetectada').classList.add('hidden');
    
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    appData.ubicacionEntrega = null;

    // Ir a "Mis EnvÃ­os"
    document.getElementById('tabMisEnvios').click();
    
  } catch (error) {
    console.error('âŒ Error al registrar envÃ­o:', error);
    alert('âš ï¸ Error al registrar envÃ­o: ' + error.message);
    submitBtn.textContent = originalText;
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
      alert('âš ï¸ Por favor completa todos los campos obligatorios');
      return;
    }

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
      alert('âš ï¸ Por favor completa todos los campos obligatorios');
      return;
    }

    let ubicacionEntrega = appData.comercio.ubicacionGPS;
    if (destinoPaquete === 'OTRA_DIRECCION') {
      ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete').value;
      if (!ubicacionEntrega) {
        alert('âš ï¸ Debes especificar la ubicaciÃ³n de entrega');
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
      alert('âš ï¸ Por favor completa todos los campos obligatorios');
      return;
    }

    let ubicacionEntrega = appData.comercio.ubicacionGPS;
    if (destinoCompra === 'OTRA_DIRECCION') {
      ubicacionEntrega = document.getElementById('ubicacionEntregaCompra').value;
      if (!ubicacionEntrega) {
        alert('âš ï¸ Debes especificar la ubicaciÃ³n de entrega');
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

    alert('âœ… Solicitud de entrega registrada exitosamente.\n\nUn delivery serÃ¡ asignado pronto.');
    document.getElementById('solicitarEntregaForm').reset();
    submitBtn.textContent = 'ðŸš€ Solicitar Servicio';
    submitBtn.disabled = false;

    document.getElementById('seccionTrasladoTiendas').classList.remove('hidden');
    document.getElementById('seccionRecogerPaquete').classList.add('hidden');
    document.getElementById('seccionRealizarCompra').classList.add('hidden');
    document.getElementById('tarifaResumenEntrega').classList.add('hidden');

    document.getElementById('tabMisEnvios').click();
  } catch (error) {
    console.error('Error:', error);
    alert('âš ï¸ Error al registrar solicitud');
    submitBtn.textContent = 'ðŸš€ Solicitar Servicio';
    submitBtn.disabled = false;
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  verificarSesion();

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
        () => alert('No se pudo obtener ubicaciÃ³n')
      );
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

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
    cargarMisEnviosCorregida();
  });

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
  document.getElementById('ubicacionEntregaInput').addEventListener('input', (e) => {
    clearTimeout(linkEntregaTimeout);
    
    const statusIndicator = document.getElementById('linkEntregaStatus');
    const input = e.target.value.trim();
    
    document.getElementById('ubicacionDetectada').classList.add('hidden');
    document.getElementById('ubicacionError').classList.add('hidden');
    
    if (input.length > 5) {
      statusIndicator.classList.remove('hidden');
      
      linkEntregaTimeout = setTimeout(async () => {
        window.secureLog('ðŸ” Procesando entrada:', input);
        const resultado = await extraerCoordenadasDeLink(input);
        statusIndicator.classList.add('hidden');
        
        if (resultado.exito) {
          window.secureLog('âœ… Coordenadas extraÃ­das:', resultado.lat, resultado.lon);
          appData.ubicacionEntrega = `${resultado.lat},${resultado.lon}`;
          
          document.getElementById('ubicacionDetectada').classList.remove('hidden');
          document.getElementById('coordenadasDetectadas').textContent = `Lat: ${resultado.lat.toFixed(6)}, Lon: ${resultado.lon.toFixed(6)}`;
          
          mostrarMapaPreview(resultado.lat, resultado.lon, 'mapPreviewEntrega');
          await calcularTarifa(appData.ubicacionRecogida, appData.ubicacionEntrega);
          
          e.target.classList.remove('border-red-500');
          e.target.classList.add('border-green-500');
          
        } else {
          window.secureLog('âŒ No se encontraron coordenadas');
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
      alert('âš ï¸ Error: No se ha seleccionado ubicaciÃ³n');
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
        alert('âš ï¸ Imagen muy grande. MÃ¡ximo 5MB');
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

  setTimeout(() => {
    if (appData.ubicacionesFrecuentes.length > 0) {
      configurarAutocomplete('ubicacionOrigenTraslado', async (ubicacion) => {
        window.secureLog('âœ… Origen traslado seleccionado:', ubicacion.nombre);
        const destino = document.getElementById('ubicacionDestinoTraslado').value.trim();
        if (destino) {
          await calcularTarifaEntrega(ubicacion.ubicacion, destino);
        }
      });
      
      configurarAutocomplete('ubicacionDestinoTraslado', async (ubicacion) => {
        window.secureLog('âœ… Destino traslado seleccionado:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionOrigenTraslado').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
      
      configurarAutocomplete('ubicacionRecogidaPaquete', async (ubicacion) => {
        window.secureLog('âœ… UbicaciÃ³n recogida seleccionada:', ubicacion.nombre);
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
        window.secureLog('âœ… UbicaciÃ³n entrega paquete seleccionada:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionRecogidaPaquete').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
      
      configurarAutocomplete('ubicacionComercioCompra', async (ubicacion) => {
        window.secureLog('âœ… Comercio compra seleccionado:', ubicacion.nombre);
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
        window.secureLog('âœ… UbicaciÃ³n entrega compra seleccionada:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionComercioCompra').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
    }
  }, 2000);

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


  // =============================================
// PARCHE PARA CORREGIR PROBLEMAS
// Agregar al FINAL del comercios-panel-script.js
// ANTES del cierre de DOMContentLoaded
// =============================================

// CORRECCIÃ“N 1: Reemplazar la funciÃ³n cargarUbicacionesFrecuentes
async function cargarUbicacionesFrecuentesCorregida() {
  try {
    console.log('ðŸ“ Cargando ubicaciones frecuentes...');
    
    const response = await fetch(`${SCRIPT_URL}?action=obtenerUbicacionesFrecuentes`);
    const result = await response.json();
    
    if (result.success) {
      appData.ubicacionesFrecuentes = result.ubicaciones;
      window.ubicacionesFrecuentes = result.ubicaciones; // Exponer globalmente para depuraciÃ³n
      console.log(`âœ… ${result.ubicaciones.length} ubicaciones cargadas`);
      
      // Configurar autocompletado inmediatamente
      configurarTodosLosAutocompletados();
    } else {
      console.log('âš ï¸ Error cargando ubicaciones:', result.error);
    }
  } catch (error) {
    console.error('âŒ Error cargando ubicaciones:', error);
  }
}

// CORRECCIÃ“N 2: Nueva funciÃ³n para configurar todos los autocompletados
function configurarTodosLosAutocompletados() {
  if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
    console.log('âš ï¸ No hay ubicaciones para configurar autocompletado');
    return;
  }
  
  console.log('ðŸ”§ Configurando autocompletados con', appData.ubicacionesFrecuentes.length, 'ubicaciones...');
  
  // Verificar que los inputs existan antes de configurar
  const inputsConfig = [
    {
      id: 'ubicacionOrigenTraslado',
      parejaid: 'ubicacionDestinoTraslado',
      esOrigen: true
    },
    {
      id: 'ubicacionDestinoTraslado',
      parejaid: 'ubicacionOrigenTraslado',
      esOrigen: false
    },
    {
      id: 'ubicacionRecogidaPaquete',
      callback: async (ubicacion) => {
        const destinoPaquete = document.querySelector('input[name="destinoPaquete"]:checked')?.value;
        let ubicacionEntrega = appData.comercio.ubicacionGPS;
        if (destinoPaquete === 'OTRA_DIRECCION') {
          ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete')?.value.trim();
        }
        if (ubicacionEntrega) {
          await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
        }
      }
    },
    {
      id: 'ubicacionEntregaPaquete',
      parejaid: 'ubicacionRecogidaPaquete',
      esOrigen: false
    },
    {
      id: 'ubicacionComercioCompra',
      callback: async (ubicacion) => {
        const destinoCompra = document.querySelector('input[name="destinoCompra"]:checked')?.value;
        let ubicacionEntrega = appData.comercio.ubicacionGPS;
        if (destinoCompra === 'OTRA_DIRECCION') {
          ubicacionEntrega = document.getElementById('ubicacionEntregaCompra')?.value.trim();
        }
        if (ubicacionEntrega) {
          await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
        }
      }
    },
    {
      id: 'ubicacionEntregaCompra',
      parejaid: 'ubicacionComercioCompra',
      esOrigen: false
    }
  ];
  
  let configurados = 0;
  
  inputsConfig.forEach(config => {
    const input = document.getElementById(config.id);
    
    if (input) {
      const callback = config.callback || (async (ubicacion) => {
        if (config.parejaid) {
          const pareja = document.getElementById(config.parejaid)?.value.trim();
          if (pareja) {
            if (config.esOrigen) {
              await calcularTarifaEntrega(ubicacion.ubicacion, pareja);
            } else {
              await calcularTarifaEntrega(pareja, ubicacion.ubicacion);
            }
          }
        }
      });
      
      
  // NUEVO ENVÍO - Ubicación Entrega (AGREGADO)
  configurarAutocomplete('ubicacionEntregaInput', async (ubi) => {
    appData.ubicacionEntrega = ubi.ubicacion;
    
    document.getElementById('ubicacionDetectada').classList.remove('hidden');
    document.getElementById('ubicacionError').classList.add('hidden');
    document.getElementById('coordenadasDetectadas').textContent = 
      `${ubi.nombre} - ${ubi.ubicacion}`;
    
    const [lat, lon] = ubi.ubicacion.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lon)) {
      mostrarMapaPreview(lat, lon, 'mapPreviewEntrega');
      
      if (appData.ubicacionRecogida) {
        await calcularTarifa(appData.ubicacionRecogida, appData.ubicacionEntrega);
      }
    }
  });
  
  configurarAutocomplete(config.id, callback);
      configurados++;
      console.log(`âœ… Autocompletado configurado para: ${config.id}`);
    } else {
      console.log(`âš ï¸ Input no encontrado: ${config.id}`);
    }
  });
  
  console.log(`âœ… Total autocompletados configurados: ${configurados}/${inputsConfig.length}`);
}

// CORRECCIÃ“N 3: Reemplazar cargarMisEnvios para agregar logs de depuraciÃ³n
async function cargarMisEnviosCorregida() {
  try {
    console.log('ðŸ“¦ === CARGANDO MIS ENVÃOS ===');
    console.log('Comercio ID:', appData.comercio?.id);
    console.log('URL:', `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`);
    
    const url = `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`;
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);

    if (result.success) {
      appData.envios = result.envios || [];
      console.log(`âœ… ${appData.envios.length} envÃ­os cargados`);
      renderizarEnvios();
    } else {
      console.error('âŒ Error del servidor:', result.error);
      const container = document.getElementById('listaEnvios');
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-red-500 font-bold mb-2">Error al cargar envÃ­os</div>
          <div class="text-sm text-gray-600">${result.error || 'Error desconocido'}</div>
          <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Reintentar
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('âŒ Error cargando envÃ­os:', error);
    const container = document.getElementById('listaEnvios');
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-red-500 font-bold mb-2">Error de conexiÃ³n</div>
        <div class="text-sm text-gray-600">${error.message}</div>
        <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Reintentar
        </button>
      </div>
    `;
  }
}

// CORRECCIÃ“N 4: Exponer funciones corregidas globalmente
window.cargarMisEnviosCorregida = cargarMisEnviosCorregida;
window.cargarUbicacionesFrecuentesCorregida = cargarUbicacionesFrecuentesCorregida;
window.configurarTodosLosAutocompletados = configurarTodosLosAutocompletados;

console.log('âœ… Parche de correcciones cargado');
console.log('ðŸ“ Para usar las funciones corregidas:');
console.log('   - cargarUbicacionesFrecuentesCorregida()');
console.log('   - cargarMisEnviosCorregida()');
console.log('   - configurarTodosLosAutocompletados()');

});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        window.secureLog('âœ… Service Worker registrado');
        setInterval(() => registration.update(), 5 * 60 * 1000);
      })
      .catch((error) => {
        window.secureLog('âŒ Error al registrar Service Worker:', error);
      });

// =============================================
// PARCHE PARA CORREGIR PROBLEMAS
// Agregar al FINAL del comercios-panel-script.js
// ANTES del cierre de DOMContentLoaded
// =============================================

// CORRECCIÃ“N 1: Reemplazar la funciÃ³n cargarUbicacionesFrecuentes
async function cargarUbicacionesFrecuentesCorregida() {
  try {
    console.log('ðŸ“ Cargando ubicaciones frecuentes...');
    
    const response = await fetch(`${SCRIPT_URL}?action=obtenerUbicacionesFrecuentes`);
    const result = await response.json();
    
    if (result.success) {
      appData.ubicacionesFrecuentes = result.ubicaciones;
      window.ubicacionesFrecuentes = result.ubicaciones; // Exponer globalmente para depuraciÃ³n
      console.log(`âœ… ${result.ubicaciones.length} ubicaciones cargadas`);
      
      // Configurar autocompletado inmediatamente
      configurarTodosLosAutocompletados();
    } else {
      console.log('âš ï¸ Error cargando ubicaciones:', result.error);
    }
  } catch (error) {
    console.error('âŒ Error cargando ubicaciones:', error);
  }
}

// CORRECCIÃ“N 2: Nueva funciÃ³n para configurar todos los autocompletados
function configurarTodosLosAutocompletados() {
  if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
    console.log('âš ï¸ No hay ubicaciones para configurar autocompletado');
    return;
  }
  
  console.log('ðŸ”§ Configurando autocompletados con', appData.ubicacionesFrecuentes.length, 'ubicaciones...');
  
  // Verificar que los inputs existan antes de configurar
  const inputsConfig = [
    {
      id: 'ubicacionOrigenTraslado',
      parejaid: 'ubicacionDestinoTraslado',
      esOrigen: true
    },
    {
      id: 'ubicacionDestinoTraslado',
      parejaid: 'ubicacionOrigenTraslado',
      esOrigen: false
    },
    {
      id: 'ubicacionRecogidaPaquete',
      callback: async (ubicacion) => {
        const destinoPaquete = document.querySelector('input[name="destinoPaquete"]:checked')?.value;
        let ubicacionEntrega = appData.comercio.ubicacionGPS;
        if (destinoPaquete === 'OTRA_DIRECCION') {
          ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete')?.value.trim();
        }
        if (ubicacionEntrega) {
          await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
        }
      }
    },
    {
      id: 'ubicacionEntregaPaquete',
      parejaid: 'ubicacionRecogidaPaquete',
      esOrigen: false
    },
    {
      id: 'ubicacionComercioCompra',
      callback: async (ubicacion) => {
        const destinoCompra = document.querySelector('input[name="destinoCompra"]:checked')?.value;
        let ubicacionEntrega = appData.comercio.ubicacionGPS;
        if (destinoCompra === 'OTRA_DIRECCION') {
          ubicacionEntrega = document.getElementById('ubicacionEntregaCompra')?.value.trim();
        }
        if (ubicacionEntrega) {
          await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
        }
      }
    },
    {
      id: 'ubicacionEntregaCompra',
      parejaid: 'ubicacionComercioCompra',
      esOrigen: false
    }
  ];
  
  let configurados = 0;
  
  inputsConfig.forEach(config => {
    const input = document.getElementById(config.id);
    
    if (input) {
      const callback = config.callback || (async (ubicacion) => {
        if (config.parejaid) {
          const pareja = document.getElementById(config.parejaid)?.value.trim();
          if (pareja) {
            if (config.esOrigen) {
              await calcularTarifaEntrega(ubicacion.ubicacion, pareja);
            } else {
              await calcularTarifaEntrega(pareja, ubicacion.ubicacion);
            }
          }
        }
      });
      
      configurarAutocomplete(config.id, callback);
      configurados++;
      console.log(`âœ… Autocompletado configurado para: ${config.id}`);
    } else {
      console.log(`âš ï¸ Input no encontrado: ${config.id}`);
    }
  });
  
  console.log(`âœ… Total autocompletados configurados: ${configurados}/${inputsConfig.length}`);
}

// CORRECCIÃ“N 3: Reemplazar cargarMisEnvios para agregar logs de depuraciÃ³n
async function cargarMisEnviosCorregida() {
  try {
    console.log('ðŸ“¦ === CARGANDO MIS ENVÃOS ===');
    console.log('Comercio ID:', appData.comercio?.id);
    console.log('URL:', `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`);
    
    const url = `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`;
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);

    if (result.success) {
      appData.envios = result.envios || [];
      console.log(`âœ… ${appData.envios.length} envÃ­os cargados`);
      renderizarEnvios();
    } else {
      console.error('âŒ Error del servidor:', result.error);
      const container = document.getElementById('listaEnvios');
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-red-500 font-bold mb-2">Error al cargar envÃ­os</div>
          <div class="text-sm text-gray-600">${result.error || 'Error desconocido'}</div>
          <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Reintentar
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('âŒ Error cargando envÃ­os:', error);
    const container = document.getElementById('listaEnvios');
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-red-500 font-bold mb-2">Error de conexiÃ³n</div>
        <div class="text-sm text-gray-600">${error.message}</div>
        <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Reintentar
        </button>
      </div>
    `;
  }
}

// CORRECCIÃ“N 4: Exponer funciones corregidas globalmente
window.cargarMisEnviosCorregida = cargarMisEnviosCorregida;
window.cargarUbicacionesFrecuentesCorregida = cargarUbicacionesFrecuentesCorregida;
window.configurarTodosLosAutocompletados = configurarTodosLosAutocompletados;

console.log('âœ… Parche de correcciones cargado');
console.log('ðŸ“ Para usar las funciones corregidas:');
console.log('   - cargarUbicacionesFrecuentesCorregida()');
console.log('   - cargarMisEnviosCorregida()');
console.log('   - configurarTodosLosAutocompletados()');

  });
}