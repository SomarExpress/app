// ========================================
// COMERCIOS-PANEL.JS - VERSIÓN COMPLETA
// Con Autocompletado y Cálculo de Tarifas
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
    window.secureLog('📍 Cargando ubicaciones frecuentes...');
    
    const response = await fetch(`${SCRIPT_URL}?action=obtenerUbicacionesFrecuentes`);
    const result = await response.json();
    
    if (result.success) {
      appData.ubicacionesFrecuentes = result.ubicaciones;
      window.secureLog(`✅ ${result.ubicaciones.length} ubicaciones cargadas`);
    } else {
      window.secureLog('⚠️ Error cargando ubicaciones:', result.error);
    }
  } catch (error) {
    console.error('Error cargando ubicaciones:', error);
  }
}

// ============================================
// NUEVO: AUTOCOMPLETADO DE UBICACIONES
// ============================================

function configurarAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const container = document.createElement('div');
  container.className = 'autocomplete-container hidden absolute z-50 w-full bg-white border-2 border-brand-orange rounded-xl shadow-lg max-h-60 overflow-y-auto';
  container.style.top = (input.offsetTop + input.offsetHeight + 5) + 'px';
  container.style.left = input.offsetLeft + 'px';
  container.style.width = input.offsetWidth + 'px';
  
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(container);
  
  input.addEventListener('input', (e) => {
    const valor = e.target.value.toLowerCase().trim();
    
    if (valor.length < 2) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    
    const coincidencias = appData.ubicacionesFrecuentes.filter(ubicacion => 
      ubicacion.nombre.toLowerCase().includes(valor) ||
      ubicacion.descripcion.toLowerCase().includes(valor)
    );
    
    if (coincidencias.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    
    container.innerHTML = coincidencias.slice(0, 8).map(ubicacion => `
      <div class="autocomplete-item p-3 hover:bg-orange-50 cursor-pointer border-b last:border-b-0 transition" data-ubicacion='${JSON.stringify(ubicacion)}'>
        <div class="flex items-start gap-2">
          <span class="text-lg">${ubicacion.tipo === 'COMERCIO' ? '🏪' : '📍'}</span>
          <div class="flex-1">
            <p class="font-semibold text-sm text-gray-800">${ubicacion.nombre}</p>
            ${ubicacion.descripcion ? `<p class="text-xs text-gray-500">${ubicacion.descripcion}</p>` : ''}
            <p class="text-xs text-blue-600 mt-1">📍 ${ubicacion.ubicacion}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded ${ubicacion.tipo === 'COMERCIO' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">${ubicacion.tipo}</span>
        </div>
      </div>
    `).join('');
    
    container.classList.remove('hidden');
    
    // Event listeners para cada item
    container.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const ubicacion = JSON.parse(item.dataset.ubicacion);
        input.value = ubicacion.ubicacion;
        container.classList.add('hidden');
        container.innerHTML = '';
        
        if (onSelect) {
          onSelect(ubicacion);
        }
      });
    });
  });
  
  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !container.contains(e.target)) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  });
}

// ============================================
// AUTENTICACIÓN
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
    alert('✅ Código enviado por WhatsApp');
  } catch (error) {
    console.error('Error:', error);
    alert('⚠️ Error al enviar código');
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
        
        alert(`¡Bienvenido ${result.datosComercio.nombre}!`);
      } else {
        document.getElementById('authStep2').classList.add('hidden');
        document.getElementById('authStep3').classList.remove('hidden');
      }
    } else {
      alert(result.error || 'Código incorrecto');
      submitBtn.textContent = 'Verificar';
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('⚠️ Error al verificar código');
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
      
      alert('¡Comercio registrado exitosamente!');
    } else {
      alert(result.error || 'Error al registrar');
      submitBtn.textContent = 'Registrar Comercio';
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('⚠️ Error al registrar');
  }
}

function cerrarSesion() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('somarComercioUser');
    location.reload();
  }
}

// ============================================
// EXTRACCIÓN DE COORDENADAS
// ============================================

async function extraerCoordenadasDeLink(input) {
  try {
    input = input.trim();
    window.secureLog('🔍 Procesando entrada:', input);

    const soloCoordMatch = input.match(/^\s*([0-9]{1,2}\.[0-9]+)\s*,\s*(-?[0-9]{1,3}\.[0-9]+)\s*$/);
    if (soloCoordMatch) {
      const lat = parseFloat(soloCoordMatch[1]);
      const lon = parseFloat(soloCoordMatch[2]);
      
      if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
        window.secureLog('✅ Coordenadas directas detectadas');
        return { lat, lon, exito: true };
      }
    }

    if (input.includes('goo.gl') || input.includes('maps.app.goo.gl')) {
      window.secureLog('⚠️ Link acortado detectado');
      return { 
        exito: false, 
        error: 'LINK_ACORTADO',
        mensaje: 'Link acortado detectado.\n\nPor favor:\n1. Abre el link en Google Maps\n2. Espera que cargue\n3. Toca y mantén sobre la ubicación\n4. Aparecerán las coordenadas abajo\n5. Cópialas y pégalas aquí\n\nO usa el mapa interactivo 🗺️'
      };
    }

    return await extraerCoordenadasDeURL(input);

  } catch (error) {
    console.error('❌ Error:', error);
    return { exito: false, error: error.toString() };
  }
}

async function extraerCoordenadasDeURL(url) {
  const qMatch = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/);
  if (qMatch) {
    window.secureLog('✅ Coordenadas encontradas (q)');
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]), exito: true };
  }

  const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
  if (atMatch) {
    window.secureLog('✅ Coordenadas encontradas (@)');
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]), exito: true };
  }

  const placeMatch = url.match(/\/place\/.*?@([0-9.-]+),([0-9.-]+)/);
  if (placeMatch) {
    window.secureLog('✅ Coordenadas encontradas (place)');
    return { lat: parseFloat(placeMatch[1]), lon: parseFloat(placeMatch[2]), exito: true };
  }

  const coordMatch = url.match(/([0-9]{1,2}\.[0-9]{4,})[,\s]+(-?[0-9]{1,3}\.[0-9]{4,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    
    if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
      window.secureLog('✅ Coordenadas encontradas (patrón general)');
      return { lat, lon, exito: true };
    }
  }

  window.secureLog('❌ No se encontraron coordenadas en la URL');
  return { exito: false, error: 'No se detectaron coordenadas válidas' };
}

// ============================================
// CÁLCULO DE TARIFAS
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
    { nombre: 'Puerto Cortés', lat: 15.85, lon: -87.94, radio: 0.08 },
    { nombre: 'Villanueva', lat: 15.32, lon: -88.00, radio: 0.08 },
    { nombre: 'La Lima', lat: 15.43, lon: -87.91, radio: 0.06 },
    { nombre: 'Choluteca', lat: 13.30, lon: -87.19, radio: 0.10 },
    { nombre: 'Danlí', lat: 14.03, lon: -86.58, radio: 0.08 },
    { nombre: 'Juticalpa', lat: 14.66, lon: -86.22, radio: 0.08 },
    { nombre: 'Santa Rosa de Copán', lat: 14.77, lon: -88.78, radio: 0.08 },
    { nombre: 'Siguatepeque', lat: 14.60, lon: -87.84, radio: 0.08 },
    { nombre: 'Tocoa', lat: 15.66, lon: -86.00, radio: 0.08 },
    { nombre: 'Tela', lat: 15.78, lon: -87.46, radio: 0.08 }
  ];

  for (const ciudad of ciudades) {
    const distancia = Math.sqrt(Math.pow(lat - ciudad.lat, 2) + Math.pow(lon - ciudad.lon, 2));
    if (distancia < ciudad.radio) {
      window.secureLog(`✅ Ciudad detectada: ${ciudad.nombre}`);
      return ciudad.nombre;
    }
  }

  if (lat >= 15.3 && lat <= 16.0 && lon >= -88.5 && lon <= -87.3) return 'Cortés';
  else if (lat >= 13.8 && lat <= 14.4 && lon >= -87.5 && lon <= -86.8) return 'Francisco Morazán';
  else if (lat >= 15.5 && lat <= 16.0 && lon >= -87.0 && lon <= -86.0) return 'Atlántida';
  else if (lat >= 14.4 && lat <= 15.0 && lon >= -86.8 && lon <= -86.0) return 'Olancho';
  else if (lat >= 13.0 && lat <= 13.8 && lon >= -87.5 && lon <= -86.8) return 'Choluteca';

  window.secureLog('⚠️ Ciudad no detectada, usando genérico');
  return 'Honduras';
}

async function calcularDistanciaOSRM(lat1, lon1, lat2, lon2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    window.secureLog('🌐 Consultando OSRM...');
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM failed');
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No route');
    const distanciaKm = data.routes[0].distance / 1000;
    window.secureLog(`✅ OSRM: ${distanciaKm.toFixed(2)} km por carretera`);
    return distanciaKm;
  } catch (error) {
    console.error('❌ OSRM error:', error);
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
      window.secureLog(`✅ Choloma ${r.min}-${r.max}km: L.${r.tarifa}`);
      return r.tarifa;
    }
  }
  const calc = 30 + (km * 6.8);
  const redondeado = Math.round(calc / 5) * 5;
  window.secureLog(`📊 Choloma fuera de tabla: ${calc.toFixed(2)} → L.${redondeado}`);
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
      window.secureLog(`✅ Otras ${r.min}-${r.max}km: L.${r.tarifa}`);
      return r.tarifa;
    }
  }
  const calc = 40 + (km * 7.5);
  const redondeado = Math.round(calc / 5) * 5;
  window.secureLog(`📊 Otras fuera de tabla: ${calc.toFixed(2)} → L.${redondeado}`);
  return redondeado;
}

async function calcularTarifa(ubicacionRecogida, ubicacionEntrega) {
  if (!ubicacionRecogida || !ubicacionEntrega) {
    window.secureLog('⚠️ Faltan ubicaciones');
    return;
  }

  try {
    const [lat1, lon1] = ubicacionRecogida.split(',').map(Number);
    const [lat2, lon2] = ubicacionEntrega.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error('❌ Coordenadas inválidas');
      return;
    }

    const ciudadOrigen = obtenerCiudad(lat1, lon1);
    const ciudadDestino = obtenerCiudad(lat2, lon2);

    window.secureLog(`📍 Origen: ${ciudadOrigen}, Destino: ${ciudadDestino}`);

    let distanciaKm;
    try {
      distanciaKm = await calcularDistanciaOSRM(lat1, lon1, lat2, lon2);
    } catch (error) {
      console.warn('⚠️ OSRM fallback a Haversine');
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

    window.secureLog(`✅ Tarifa: L.${tarifaTotal.toFixed(2)}`);
    
    return {
      ciudadOrigen,
      ciudadDestino,
      distanciaKm: distanciaKm.toFixed(2),
      tarifaTotal: tarifaTotal.toFixed(2)
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// NUEVO: Calcular tarifa para formulario de Solicitar Entrega
async function calcularTarifaEntrega(ubicacionOrigen, ubicacionDestino) {
  if (!ubicacionOrigen || !ubicacionDestino) {
    window.secureLog('⚠️ Faltan ubicaciones');
    return;
  }

  try {
    const [lat1, lon1] = ubicacionOrigen.split(',').map(Number);
    const [lat2, lon2] = ubicacionDestino.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error('❌ Coordenadas inválidas');
      return;
    }

    let distanciaKm;
    try {
      distanciaKm = await calcularDistanciaOSRM(lat1, lon1, lat2, lon2);
    } catch (error) {
      console.warn('⚠️ OSRM fallback a Haversine');
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

    window.secureLog(`✅ Tarifa Entrega: L.${tarifaTotal.toFixed(2)}`);
    
    return {
      ciudadOrigen,
      ciudadDestino,
      distanciaKm: distanciaKm.toFixed(2),
      tarifaTotal: tarifaTotal.toFixed(2)
    };
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// (Continúa en siguiente mensaje por límite de caracteres...)

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

// CORRECCIÓN 1: Reemplazar la función cargarUbicacionesFrecuentes
async function cargarUbicacionesFrecuentesCorregida() {
  try {
    console.log('📍 Cargando ubicaciones frecuentes...');
    
    const response = await fetch(`${SCRIPT_URL}?action=obtenerUbicacionesFrecuentes`);
    const result = await response.json();
    
    if (result.success) {
      appData.ubicacionesFrecuentes = result.ubicaciones;
      window.ubicacionesFrecuentes = result.ubicaciones; // Exponer globalmente para depuración
      console.log(`✅ ${result.ubicaciones.length} ubicaciones cargadas`);
      
      // Configurar autocompletado inmediatamente
      configurarTodosLosAutocompletados();
    } else {
      console.log('⚠️ Error cargando ubicaciones:', result.error);
    }
  } catch (error) {
    console.error('❌ Error cargando ubicaciones:', error);
  }
}

// CORRECCIÓN 2: Nueva función para configurar todos los autocompletados
function configurarTodosLosAutocompletados() {
  if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
    console.log('⚠️ No hay ubicaciones para configurar autocompletado');
    return;
  }
  
  console.log('🔧 Configurando autocompletados con', appData.ubicacionesFrecuentes.length, 'ubicaciones...');
  
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
      console.log(`✅ Autocompletado configurado para: ${config.id}`);
    } else {
      console.log(`⚠️ Input no encontrado: ${config.id}`);
    }
  });
  
  console.log(`✅ Total autocompletados configurados: ${configurados}/${inputsConfig.length}`);
}

// CORRECCIÓN 3: Reemplazar cargarMisEnvios para agregar logs de depuración
async function cargarMisEnviosCorregida() {
  try {
    console.log('📦 === CARGANDO MIS ENVÍOS ===');
    console.log('Comercio ID:', appData.comercio?.id);
    console.log('URL:', `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`);
    
    const url = `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`;
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);

    if (result.success) {
      appData.envios = result.envios || [];
      console.log(`✅ ${appData.envios.length} envíos cargados`);
      renderizarEnvios();
    } else {
      console.error('❌ Error del servidor:', result.error);
      const container = document.getElementById('listaEnvios');
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-red-500 font-bold mb-2">Error al cargar envíos</div>
          <div class="text-sm text-gray-600">${result.error || 'Error desconocido'}</div>
          <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Reintentar
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Error cargando envíos:', error);
    const container = document.getElementById('listaEnvios');
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-red-500 font-bold mb-2">Error de conexión</div>
        <div class="text-sm text-gray-600">${error.message}</div>
        <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Reintentar
        </button>
      </div>
    `;
  }
}

// CORRECCIÓN 4: Exponer funciones corregidas globalmente
window.cargarMisEnviosCorregida = cargarMisEnviosCorregida;
window.cargarUbicacionesFrecuentesCorregida = cargarUbicacionesFrecuentesCorregida;
window.configurarTodosLosAutocompletados = configurarTodosLosAutocompletados;

console.log('✅ Parche de correcciones cargado');
console.log('📝 Para usar las funciones corregidas:');
console.log('   - cargarUbicacionesFrecuentesCorregida()');
console.log('   - cargarMisEnviosCorregida()');
console.log('   - configurarTodosLosAutocompletados()');

});

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

// =============================================
// PARCHE PARA CORREGIR PROBLEMAS
// Agregar al FINAL del comercios-panel-script.js
// ANTES del cierre de DOMContentLoaded
// =============================================

// CORRECCIÓN 1: Reemplazar la función cargarUbicacionesFrecuentes
async function cargarUbicacionesFrecuentesCorregida() {
  try {
    console.log('📍 Cargando ubicaciones frecuentes...');
    
    const response = await fetch(`${SCRIPT_URL}?action=obtenerUbicacionesFrecuentes`);
    const result = await response.json();
    
    if (result.success) {
      appData.ubicacionesFrecuentes = result.ubicaciones;
      window.ubicacionesFrecuentes = result.ubicaciones; // Exponer globalmente para depuración
      console.log(`✅ ${result.ubicaciones.length} ubicaciones cargadas`);
      
      // Configurar autocompletado inmediatamente
      configurarTodosLosAutocompletados();
    } else {
      console.log('⚠️ Error cargando ubicaciones:', result.error);
    }
  } catch (error) {
    console.error('❌ Error cargando ubicaciones:', error);
  }
}

// CORRECCIÓN 2: Nueva función para configurar todos los autocompletados
function configurarTodosLosAutocompletados() {
  if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
    console.log('⚠️ No hay ubicaciones para configurar autocompletado');
    return;
  }
  
  console.log('🔧 Configurando autocompletados con', appData.ubicacionesFrecuentes.length, 'ubicaciones...');
  
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
      console.log(`✅ Autocompletado configurado para: ${config.id}`);
    } else {
      console.log(`⚠️ Input no encontrado: ${config.id}`);
    }
  });
  
  console.log(`✅ Total autocompletados configurados: ${configurados}/${inputsConfig.length}`);
}

// CORRECCIÓN 3: Reemplazar cargarMisEnvios para agregar logs de depuración
async function cargarMisEnviosCorregida() {
  try {
    console.log('📦 === CARGANDO MIS ENVÍOS ===');
    console.log('Comercio ID:', appData.comercio?.id);
    console.log('URL:', `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`);
    
    const url = `${SCRIPT_URL}?action=obtenerEnviosComercio&idComercio=${appData.comercio.id}`;
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);

    if (result.success) {
      appData.envios = result.envios || [];
      console.log(`✅ ${appData.envios.length} envíos cargados`);
      renderizarEnvios();
    } else {
      console.error('❌ Error del servidor:', result.error);
      const container = document.getElementById('listaEnvios');
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-red-500 font-bold mb-2">Error al cargar envíos</div>
          <div class="text-sm text-gray-600">${result.error || 'Error desconocido'}</div>
          <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Reintentar
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Error cargando envíos:', error);
    const container = document.getElementById('listaEnvios');
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-red-500 font-bold mb-2">Error de conexión</div>
        <div class="text-sm text-gray-600">${error.message}</div>
        <button onclick="cargarMisEnviosCorregida()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Reintentar
        </button>
      </div>
    `;
  }
}

// CORRECCIÓN 4: Exponer funciones corregidas globalmente
window.cargarMisEnviosCorregida = cargarMisEnviosCorregida;
window.cargarUbicacionesFrecuentesCorregida = cargarUbicacionesFrecuentesCorregida;
window.configurarTodosLosAutocompletados = configurarTodosLosAutocompletados;

console.log('✅ Parche de correcciones cargado');
console.log('📝 Para usar las funciones corregidas:');
console.log('   - cargarUbicacionesFrecuentesCorregida()');
console.log('   - cargarMisEnviosCorregida()');
console.log('   - configurarTodosLosAutocompletados()');

  });
}