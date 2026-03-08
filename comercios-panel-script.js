// ========================================
// COMERCIOS-PANEL.JS - VERSIN COMPLETA
// Con Autocompletado y Clculo de Tarifas
// ========================================

// Supabase API inicializado vía supabase-api.js
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
    window.secureLog('=== CARGANDO UBICACIONES FRECUENTES ===');
    const ubicaciones = await window.SomarAPI.obtenerUbicacionesFrecuentes(
      appData.comercio?.id || null
    );
    appData.ubicacionesFrecuentes = ubicaciones;
    window.secureLog(`✅ ${ubicaciones.length} ubicaciones cargadas`);
    if (!document.getElementById('contentSolicitarEntrega').classList.contains('hidden')) {
      configurarAutocompletadosFormularioEntrega();
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
  if (!input) {
    console.log(`ï Input no encontrado: ${inputId}`);
    return;
  }
  
  console.log(` Configurando autocomplete para: ${inputId}`);
  
  // Crear contenedor si no existe
  let container = input.parentElement.querySelector('.autocomplete-container');
  if (container) {
    container.remove(); // Eliminar si ya existe
  }
  
  container = document.createElement('div');
  container.className = 'autocomplete-container hidden';
  
  // Asegurar que el parent tenga position relative
  if (input.parentElement.style.position !== 'relative') {
    input.parentElement.style.position = 'relative';
  }
  
  input.parentElement.appendChild(container);
  
  // Event listener para input
  input.addEventListener('input', (e) => {
    const valor = e.target.value.toLowerCase().trim();
    
    if (valor.length < 2) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    
    // Verificar que tengamos ubicaciones cargadas
    if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
      console.log('ï No hay ubicaciones frecuentes cargadas');
      return;
    }
    
    // Filtrar coincidencias
    const coincidencias = appData.ubicacionesFrecuentes.filter(ubicacion => 
      ubicacion.nombre.toLowerCase().includes(valor) ||
      ubicacion.descripcion.toLowerCase().includes(valor) ||
      ubicacion.ubicacion.toLowerCase().includes(valor)
    );
    
    if (coincidencias.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    
    // Renderizar resultados
    container.innerHTML = coincidencias.slice(0, 10).map(ubicacion => `
      <div class="autocomplete-item" data-ubicacion='${JSON.stringify(ubicacion).replace(/'/g, "&apos;")}'>
        <div class="flex items-start gap-2">
          <span class="text-xl">${ubicacion.tipo === 'COMERCIO' ? '' : ''}</span>
          <div class="flex-1">
            <p class="autocomplete-item-title">${ubicacion.nombre}</p>
            ${ubicacion.descripcion ? `<p class="autocomplete-item-description">${ubicacion.descripcion}</p>` : ''}
            <p class="autocomplete-item-coords"> ${ubicacion.ubicacion}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded ${ubicacion.tipo === 'COMERCIO' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">${ubicacion.tipo}</span>
        </div>
      </div>
    `).join('');
    
    container.classList.remove('hidden');
    
    // Event listeners para cada item
    container.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const ubicacion = JSON.parse(item.dataset.ubicacion.replace(/&apos;/g, "'"));
        input.value = ubicacion.ubicacion;
        container.classList.add('hidden');
        container.innerHTML = '';
        
        console.log(' Ubicacin seleccionada:', ubicacion.nombre, ubicacion.ubicacion);
        
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
  
  console.log(` Autocomplete configurado para: ${inputId}`);
}

function configurarAutocompletadosFormularioEntrega() {
  console.log(' === CONFIGURANDO AUTOCOMPLETADOS FORMULARIO ENTREGA ===');
  
  if (!appData.ubicacionesFrecuentes || appData.ubicacionesFrecuentes.length === 0) {
    console.log('ï No hay ubicaciones frecuentes disponibles');
    setTimeout(configurarAutocompletadosFormularioEntrega, 2000); // Reintentar en 2 segundos
    return;
  }
  
  console.log(` ${appData.ubicacionesFrecuentes.length} ubicaciones disponibles`);
  
  // 1. TRASLADO ENTRE TIENDAS
  configurarAutocomplete('ubicacionOrigenTraslado', async (ubicacion) => {
  console.log(' Origen traslado seleccionado:', ubicacion.nombre);
  
  //  RELLENAR NOMBRE DE TIENDA ORIGEN
  const tiendaOrigenInput = document.getElementById('tiendaOrigen');
  if (tiendaOrigenInput) {
    tiendaOrigenInput.value = ubicacion.nombre;
    console.log(' Tienda origen rellenada:', ubicacion.nombre);
  }
  
  const destino = document.getElementById('ubicacionDestinoTraslado').value.trim();
  if (destino && destino.includes(',')) {
    await calcularTarifaEntrega(ubicacion.ubicacion, destino);
  }
});
  
  configurarAutocomplete('ubicacionDestinoTraslado', async (ubicacion) => {
  console.log(' Destino traslado seleccionado:', ubicacion.nombre);
  
  //  RELLENAR NOMBRE DE TIENDA DESTINO
  const tiendaDestinoInput = document.getElementById('tiendaDestino');
  if (tiendaDestinoInput) {
    tiendaDestinoInput.value = ubicacion.nombre;
    console.log(' Tienda destino rellenada:', ubicacion.nombre);
  }
  
  const origen = document.getElementById('ubicacionOrigenTraslado').value.trim();
  if (origen && origen.includes(',')) {
    await calcularTarifaEntrega(origen, ubicacion.ubicacion);
  }
});
  
// 2. RECOGER PAQUETE
configurarAutocomplete('ubicacionRecogidaPaquete', async (ubicacion) => {
  console.log(' Ubicacin recogida seleccionada:', ubicacion.nombre);
  
  //  RELLENAR NOMBRE DEL CONTACTO (CON RETRY SI ES NECESARIO)
  setTimeout(() => {
    const nombreContactoInput = document.getElementById('nombreContacto');
    if (nombreContactoInput) {
      nombreContactoInput.value = ubicacion.nombre;
      console.log(' Nombre de contacto rellenado:', ubicacion.nombre);
    } else {
      console.warn('ï Input nombreContacto no encontrado an');
    }
  }, 100);
  
  const destinoPaquete = document.querySelector('input[name="destinoPaquete"]:checked')?.value;
  let ubicacionEntrega = appData.comercio.ubicacionGPS;
  if (destinoPaquete === 'OTRA_DIRECCION') {
    ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete').value.trim();
  }
  if (ubicacionEntrega && ubicacionEntrega.includes(',')) {
    await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
  }
});
  
  configurarAutocomplete('ubicacionEntregaPaquete', async (ubicacion) => {
    console.log(' Ubicacin entrega paquete seleccionada:', ubicacion.nombre);
    const origen = document.getElementById('ubicacionRecogidaPaquete').value.trim();
    if (origen && origen.includes(',')) {
      await calcularTarifaEntrega(origen, ubicacion.ubicacion);
    }
  });
  
  // 3. REALIZAR COMPRA
  configurarAutocomplete('ubicacionComercioCompra', async (ubicacion) => {
  console.log(' Comercio compra seleccionado:', ubicacion.nombre);
  
  //  RELLENAR NOMBRE DEL COMERCIO
  const nombreComercioCompraInput = document.getElementById('nombreComercioCompra');
  if (nombreComercioCompraInput) {
    nombreComercioCompraInput.value = ubicacion.nombre;
    console.log(' Nombre comercio compra rellenado:', ubicacion.nombre);
  }
  
  const destinoCompra = document.querySelector('input[name="destinoCompra"]:checked')?.value;
  let ubicacionEntrega = appData.comercio.ubicacionGPS;
  if (destinoCompra === 'OTRA_DIRECCION') {
    ubicacionEntrega = document.getElementById('ubicacionEntregaCompra').value.trim();
  }
  if (ubicacionEntrega && ubicacionEntrega.includes(',')) {
    await calcularTarifaEntrega(ubicacion.ubicacion, ubicacionEntrega);
  }
});
  
  configurarAutocomplete('ubicacionEntregaCompra', async (ubicacion) => {
    console.log(' Ubicacin entrega compra seleccionada:', ubicacion.nombre);
    const origen = document.getElementById('ubicacionComercioCompra').value.trim();
    if (origen && origen.includes(',')) {
      await calcularTarifaEntrega(origen, ubicacion.ubicacion);
    }
  });
  
  console.log(' Todos los autocompletados configurados');
}

// ============================================
// AUTENTICACIN
// ============================================

function verificarSesion() {
  const comercioGuardado = window.APP_SECURITY.getSecureSession('somarComercioUser');
  if (comercioGuardado) {
    try {
      appData.comercio = comercioGuardado;

      // Refrescar esDueno desde Supabase (puede haber cambiado o ser sesión vieja)
      if (appData.comercio.usuarioId) {
        window.SomarAPI.client
          .from('comercios_usuarios')
          .select('es_dueno, activo')
          .eq('id', appData.comercio.usuarioId)
          .single()
          .then(({ data }) => {
            if (data) {
              appData.comercio.esDueno = data.es_dueno ?? false;
              window.APP_SECURITY.saveSecureSession('somarComercioUser', appData.comercio);
              if (appData.comercio.esDueno) {
                document.getElementById('menuMiEquipo')?.classList.remove('hidden');
              }
            }
          })
          .catch(() => {});
      }

      document.getElementById('authModal').classList.add('hidden');
      document.getElementById('mainContent').classList.remove('hidden');
      document.getElementById('comercioName').textContent = appData.comercio.nombre;

      document.getElementById('menuComercioNombre').textContent = appData.comercio.nombre;
      document.getElementById('menuComercioTelefono').textContent = appData.comercio.celular || '';
      const inicial = appData.comercio.nombre ? appData.comercio.nombre.charAt(0).toUpperCase() : 'C';
      document.getElementById('menuComercioInitial').textContent = inicial;

      // Mostrar Mi Equipo si ya sabemos que es dueño
      if (appData.comercio.esDueno) {
        document.getElementById('menuMiEquipo')?.classList.remove('hidden');
      }

      document.getElementById('direccionRecogidaDisplay').textContent = appData.comercio.direccion;
      appData.ubicacionRecogida = appData.comercio.ubicacionGPS;

      cargarUbicacionesFrecuentes();
      return true;
    } catch (error) {
      localStorage.removeItem('somarComercioUser');
    }
  }
  return false;
}

async function enviarCodigoVerificacion(numero) {
  const submitBtn = document.querySelector('#authPhoneForm button[type="submit"]');
  try {
    submitBtn.textContent = 'Enviando...';
    submitBtn.disabled = true;

    await window.SomarAPI.enviarOTP(numero);

    appData.numeroTemporal = numero;
    document.getElementById('phoneDisplay').textContent = numero;
    document.getElementById('authStep1').classList.add('hidden');
    document.getElementById('authStep2').classList.remove('hidden');
    submitBtn.textContent = 'Continuar';
    submitBtn.disabled = false;
    alert('✅ Código enviado por WhatsApp');
  } catch (error) {
    console.error('Error enviando OTP:', error);
    alert('❌ Error al enviar código: ' + error.message);
    submitBtn.textContent = 'Continuar';
    submitBtn.disabled = false;
  }
}

async function verificarCodigoIngresado(codigo) {
  const submitBtn = document.querySelector('#authCodeForm button[type="submit"]');
  try {
    submitBtn.textContent = 'Verificando...';
    submitBtn.disabled = true;

    const result = await window.SomarAPI.verificarOTP(appData.numeroTemporal, codigo);

    if (result.success) {
      if (!result.esNuevo) {
        appData.comercio = result.comercio;
        window.APP_SECURITY.saveSecureSession('somarComercioUser', appData.comercio);
        document.getElementById('authModal').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('comercioName').textContent = appData.comercio.nombre;
        document.getElementById('direccionRecogidaDisplay').textContent = appData.comercio.direccion;
        appData.ubicacionRecogida = appData.comercio.ubicacionGPS;
        // Mostrar tab Mi Equipo solo al dueño
        if (appData.comercio.esDueno) {
          document.getElementById('menuMiEquipo')?.classList.remove('hidden');
        }
        await cargarUbicacionesFrecuentes();
        // Activar realtime para pedidos
        window.SomarAPI.suscribirPedidos(appData.comercio.usuarioId, () => cargarMisEnvios());
        alert(`✅ Bienvenido ${appData.comercio.nombre}!`);
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
    console.error('Error verificando OTP:', error);
    alert('❌ Error al verificar código: ' + error.message);
    submitBtn.textContent = 'Verificar';
    submitBtn.disabled = false;
  }
}

async function completarRegistroComercio(nombreNegocio, nombrePersona, direccion, ubicacionGPS) {
  const submitBtn = document.querySelector('#authRegisterForm button[type="submit"]');
  try {
    submitBtn.textContent = 'Registrando...';
    submitBtn.disabled = true;

    const result = await window.SomarAPI.registrarComercio({
      celular:       appData.numeroTemporal,
      nombre:        nombrePersona,
      nombreNegocio: nombreNegocio,
      direccion,
      ubicacionGPS:  ubicacionGPS || ''
    });

    appData.comercio = result.comercio;
    window.APP_SECURITY.saveSecureSession('somarComercioUser', appData.comercio);
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('comercioName').textContent = appData.comercio.nombre;
    document.getElementById('direccionRecogidaDisplay').textContent = appData.comercio.direccion;
    appData.ubicacionRecogida = appData.comercio.ubicacionGPS;
    // Dueño recién registrado → mostrar tab Mi Equipo
    document.getElementById('menuMiEquipo')?.classList.remove('hidden');
    await cargarUbicacionesFrecuentes();
    window.SomarAPI.suscribirPedidos(appData.comercio.usuarioId, () => cargarMisEnvios());
    alert('✅ ¡Comercio registrado exitosamente!');
  } catch (error) {
    console.error('Error registrando comercio:', error);
    alert('❌ Error al registrar: ' + error.message);
    submitBtn.textContent = 'Registrar Comercio';
    submitBtn.disabled = false;
  }
}

function cerrarSesion() {
  if (confirm('Cerrar sesin?')) {
    localStorage.removeItem('somarComercioUser');
    location.reload();
  }
}

// ============================================
// EXTRACCIN DE COORDENADAS
// ============================================

async function extraerCoordenadasDeLink(input) {
  try {
    input = input.trim();
    window.secureLog(' Procesando entrada:', input);

    const soloCoordMatch = input.match(/^\s*([0-9]{1,2}\.[0-9]+)\s*,\s*(-?[0-9]{1,3}\.[0-9]+)\s*$/);
    if (soloCoordMatch) {
      const lat = parseFloat(soloCoordMatch[1]);
      const lon = parseFloat(soloCoordMatch[2]);
      
      if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
        window.secureLog(' Coordenadas directas detectadas');
        return { lat, lon, exito: true };
      }
    }

    if (input.includes('goo.gl') || input.includes('maps.app.goo.gl')) {
      window.secureLog('ï Link acortado detectado');
      return { 
        exito: false, 
        error: 'LINK_ACORTADO',
        mensaje: 'Link acortado detectado.\n\nPor favor:\n1. Abre el link en Google Maps\n2. Espera que cargue\n3. Toca y mantn sobre la ubicacin\n4. Aparecern las coordenadas abajo\n5. Cpialas y pgalas aqu\n\nO usa el mapa interactivo ï'
      };
    }

    return await extraerCoordenadasDeURL(input);

  } catch (error) {
    console.error(' Error:', error);
    return { exito: false, error: error.toString() };
  }
}

async function extraerCoordenadasDeURL(url) {
  const qMatch = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/);
  if (qMatch) {
    window.secureLog(' Coordenadas encontradas (q)');
    return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]), exito: true };
  }

  const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
  if (atMatch) {
    window.secureLog(' Coordenadas encontradas (@)');
    return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]), exito: true };
  }

  const placeMatch = url.match(/\/place\/.*?@([0-9.-]+),([0-9.-]+)/);
  if (placeMatch) {
    window.secureLog(' Coordenadas encontradas (place)');
    return { lat: parseFloat(placeMatch[1]), lon: parseFloat(placeMatch[2]), exito: true };
  }

  const coordMatch = url.match(/([0-9]{1,2}\.[0-9]{4,})[,\s]+(-?[0-9]{1,3}\.[0-9]{4,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    
    if (lat >= 13 && lat <= 16 && lon >= -90 && lon <= -83) {
      window.secureLog(' Coordenadas encontradas (patrn general)');
      return { lat, lon, exito: true };
    }
  }

  window.secureLog(' No se encontraron coordenadas en la URL');
  return { exito: false, error: 'No se detectaron coordenadas vlidas' };
}

// ============================================
// CLCULO DE TARIFAS
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
  // ── Valle de Sula: SPS vs Choloma ────────────────────────────
  // Separación clave: Choloma está al NORESTE de SPS
  //   SPS:     centro 15.503°N, -88.025°W  (más al SUR y al OESTE)
  //   Choloma: centro 15.613°N, -87.948°W  (más al NORTE y al ESTE)
  //
  // Regla: si lon > -87.97 (más al este) Y lat > 15.55 → Choloma
  //        si lon < -87.97 (más al oeste) Y lat 15.40-15.60 → SPS
  //        zona central (overlap): prioridad por distancia al centro

  const distSPS     = Math.sqrt(Math.pow(lat-15.503,2) + Math.pow(lon+88.025,2));
  const distCholoma = Math.sqrt(Math.pow(lat-15.613,2) + Math.pow(lon+87.948,2));

  if (lat >= 15.40 && lat <= 15.70 && lon >= -88.25 && lon <= -87.75) {
    // Estamos en el Valle de Sula — decidir por distancia al centro
    if (distCholoma < distSPS) {
      window.secureLog('Ciudad detectada: Choloma');
      return 'CHOLOMA';
    } else {
      window.secureLog('Ciudad detectada: San Pedro Sula');
      return 'SAN_PEDRO_SULA';
    }
  }

  // VILLANUEVA
  if (lat >= 15.28 && lat <= 15.42 && lon >= -88.12 && lon <= -87.92) {
    window.secureLog('Ciudad detectada: Villanueva');
    return 'VILLANUEVA';
  }
  // LA LIMA
  if (lat >= 15.38 && lat <= 15.50 && lon >= -87.96 && lon <= -87.82) {
    window.secureLog('Ciudad detectada: La Lima');
    return 'LA_LIMA';
  }

  // Otras ciudades: distancia euclidiana
  const ciudades = [
    { nombre: 'TEGUCIGALPA',      lat: 14.083, lon: -87.207, radio: 0.15 },
    { nombre: 'LA_CEIBA',         lat: 15.783, lon: -86.800, radio: 0.10 },
    { nombre: 'EL_PROGRESO',      lat: 15.400, lon: -87.800, radio: 0.08 },
    { nombre: 'COMAYAGUA',        lat: 14.450, lon: -87.640, radio: 0.10 },
    { nombre: 'PUERTO_CORTES',    lat: 15.850, lon: -87.940, radio: 0.08 },
    { nombre: 'CHOLUTECA',        lat: 13.300, lon: -87.190, radio: 0.10 },
    { nombre: 'DANLI',            lat: 14.033, lon: -86.583, radio: 0.08 },
    { nombre: 'JUTICALPA',        lat: 14.660, lon: -86.220, radio: 0.08 },
    { nombre: 'SANTA_ROSA_COPAN', lat: 14.770, lon: -88.780, radio: 0.08 },
    { nombre: 'SIGUATEPEQUE',     lat: 14.600, lon: -87.840, radio: 0.08 },
    { nombre: 'TELA',             lat: 15.783, lon: -87.460, radio: 0.08 },
    { nombre: 'TOCOA',            lat: 15.660, lon: -86.000, radio: 0.08 },
  ];

  for (const ciudad of ciudades) {
    const d = Math.sqrt(Math.pow(lat-ciudad.lat,2) + Math.pow(lon-ciudad.lon,2));
    if (d < ciudad.radio) {
      window.secureLog(`Ciudad detectada: ${ciudad.nombre}`);
      return ciudad.nombre;
    }
  }

  return 'CHOLOMA'; // default para el área de operación
}

async function calcularDistanciaOSRM(lat1, lon1, lat2, lon2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    window.secureLog(' Consultando OSRM...');
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM failed');
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) throw new Error('No route');
    const distanciaKm = data.routes[0].distance / 1000;
    window.secureLog(` OSRM: ${distanciaKm.toFixed(2)} km por carretera`);
    return distanciaKm;
  } catch (error) {
    console.error(' OSRM error:', error);
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
      window.secureLog(` Choloma ${r.min}-${r.max}km: L.${r.tarifa}`);
      return r.tarifa;
    }
  }
  const calc = 30 + (km * 6.8);
  const redondeado = Math.round(calc / 5) * 5;
  window.secureLog(` Choloma fuera de tabla: ${calc.toFixed(2)}  L.${redondeado}`);
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
      window.secureLog(` Otras ${r.min}-${r.max}km: L.${r.tarifa}`);
      return r.tarifa;
    }
  }
  const calc = 40 + (km * 7.5);
  const redondeado = Math.round(calc / 5) * 5;
  window.secureLog(` Otras fuera de tabla: ${calc.toFixed(2)}  L.${redondeado}`);
  return redondeado;
}

async function calcularTarifa(ubicacionRecogida, ubicacionEntrega) {
  if (!ubicacionRecogida || !ubicacionEntrega) {
    window.secureLog('ï Faltan ubicaciones');
    return;
  }

  try {
    const [lat1, lon1] = ubicacionRecogida.split(',').map(Number);
    const [lat2, lon2] = ubicacionEntrega.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error(' Coordenadas invlidas');
      return;
    }

    const ciudadOrigen = obtenerCiudad(lat1, lon1);
    const ciudadDestino = obtenerCiudad(lat2, lon2);

    window.secureLog(` Origen: ${ciudadOrigen}, Destino: ${ciudadDestino}`);

    let distanciaKm;
    try {
      distanciaKm = await calcularDistanciaOSRM(lat1, lon1, lat2, lon2);
    } catch (error) {
      console.warn('ï OSRM fallback a Haversine');
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

    window.secureLog(` Tarifa: L.${tarifaTotal.toFixed(2)}`);
    
    return {
      ciudadOrigen,
      ciudadDestino,
      distanciaKm: distanciaKm.toFixed(2),
      tarifaTotal: tarifaTotal.toFixed(2)
    };
  } catch (error) {
    console.error(' Error:', error);
    return null;
  }
}

// NUEVO: Calcular tarifa para formulario de Solicitar Entrega
async function calcularTarifaEntrega(ubicacionOrigen, ubicacionDestino) {
  if (!ubicacionOrigen || !ubicacionDestino) {
    window.secureLog('ï Faltan ubicaciones');
    return;
  }

  try {
    const [lat1, lon1] = ubicacionOrigen.split(',').map(Number);
    const [lat2, lon2] = ubicacionDestino.split(',').map(Number);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error(' Coordenadas invlidas');
      return;
    }

    let distanciaKm;
    try {
      distanciaKm = await calcularDistanciaOSRM(lat1, lon1, lat2, lon2);
    } catch (error) {
      console.warn('ï OSRM fallback a Haversine');
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

    window.secureLog(` Tarifa Entrega: L.${tarifaTotal.toFixed(2)}`);
    
    return {
      ciudadOrigen,
      ciudadDestino,
      distanciaKm: distanciaKm.toFixed(2),
      tarifaTotal: tarifaTotal.toFixed(2)
    };
  } catch (error) {
    console.error(' Error:', error);
    return null;
  }
}

// (Contina en siguiente mensaje por lmite de caracteres...)

// ============================================
// MAPAS
// ============================================

function mostrarMapaPreview(lat, lon, containerId) {
  window.secureLog(`ï Mostrando mapa preview en ${containerId}:`, lat, lon);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(' Contenedor no encontrado:', containerId);
    return;
  }

  if (containerId === 'mapPreviewRecogida' && appData.mapRecogida) {
    try {
      appData.mapRecogida.off();
      appData.mapRecogida.remove();
    } catch (error) {
      window.secureLog('ï Error limpiando mapa recogida:', error);
    }
    appData.mapRecogida = null;
  }
  
  if (containerId === 'mapPreviewEntrega' && appData.mapEntrega) {
    try {
      appData.mapEntrega.off();
      appData.mapEntrega.remove();
    } catch (error) {
      window.secureLog('ï Error limpiando mapa entrega:', error);
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
        attribution: ' OpenStreetMap',
        maxZoom: 18
      }).addTo(map);
      
      L.marker([lat, lon]).addTo(map);
      
      if (containerId === 'mapPreviewRecogida') {
        appData.mapRecogida = map;
      } else if (containerId === 'mapPreviewEntrega') {
        appData.mapEntrega = map;
      }
      
      setTimeout(() => map.invalidateSize(), 150);
      window.secureLog(` Mapa ${containerId} creado`);
      
    } catch (error) {
      console.error(` Error creando mapa ${containerId}:`, error);
    }
  }, 250);
}

function inicializarMapaInteractivo() {
  window.secureLog('ï Inicializando mapa interactivo...');
  
  const modal = document.getElementById('mapModal');
  const container = document.getElementById('mapInteractive');

  if (appData.mapInteractive) {
    try {
      appData.mapInteractive.off();
      appData.mapInteractive.remove();
    } catch (error) {
      window.secureLog('ï Error limpiando mapa:', error);
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
        attribution: ' OpenStreetMap',
        maxZoom: 18
      }).addTo(appData.mapInteractive);

      appData.markerInteractive = L.marker([centerLat, centerLon], { 
        draggable: true 
      }).addTo(appData.mapInteractive);

      appData.mapInteractive.on('click', (e) => {
        appData.markerInteractive.setLatLng(e.latlng);
      });
      
      setTimeout(() => appData.mapInteractive.invalidateSize(), 200);
      window.secureLog(' Mapa interactivo creado');
    } catch (error) {
      console.error(' Error:', error);
      alert('Error al cargar el mapa. Intenta de nuevo.');
    }
  }, 250);
}

// ============================================
// GESTIN DE ENVOS
// ============================================

async function cargarMisEnvios() {
  try {
    if (!appData.comercio?.usuarioId) return;
    const pedidos = await window.SomarAPI.obtenerPedidosComercio(appData.comercio.usuarioId);
    // Normalizar al formato que espera renderizarEnvios()
    appData.envios = pedidos.map(p => ({
      id: p.no_orden || p.id,
      fecha: p.created_at,
      estado: p.estatus,
      tipoRegistro: p.canal === 'PANEL_COMERCIO' ? 'ENVIO_NORMAL' : 'SOLICITUD_ENTREGA',
      tipoServicio: p.detalle_json?.tipo_servicio || 'SOLO_ENTREGA',
      nombreDestinatario: p.nombre_destinatario || '-',
      descripcionPaquete: p.descripcion_paquete || '-',
      distanciaKm: p.distancia_km,
      tarifa: p.tarifa_envio
    }));
    renderizarEnvios();
  } catch (error) {
    console.error('Error cargando envíos:', error);
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
    container.innerHTML = '<div class="text-center py-12 text-gray-500"><p>No hay envios para mostrar</p></div>';
    return;
  }

  container.innerHTML = enviosFiltrados.map(envio => {
    const id = envio.id || envio.ID;
    const fecha = envio.fecha || envio['Fecha Solicitud'];
    const estado = envio.estado || envio.Estado || 'PENDIENTE_ASIGNACION';
    const tipoRegistro = envio.tipoRegistro || envio['Tipo Registro'] || 'ENVIO_NORMAL';
    const tipoServicio = envio.tipoServicio || envio['Tipo Servicio'] || 'SOLO_ENTREGA';
    const nombreDestinatario = envio.nombreDestinatario || envio['Nombre Destinatario'] || '-';
    const descripcion = envio.descripcionPaquete || envio['Descripcin Paquete'] || '-';
    
    const esEntrega = tipoRegistro === 'SOLICITUD_ENTREGA';
    const icono = esEntrega ? '' : '';
    const tipoLabel = esEntrega ? 'SOLICITUD DE ENTREGA' : 'ENVIO';
    
    return `
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-bold text-lg">${id}</p>
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
// FUNCIN CORREGIDA PARA SUBIR FOTO A CLOUDINARY
// Reemplaza la seccin de subida en procesarEnvio()
// ============================================

async function subirFotoCloudinary(file) {
  try {
    console.log(' === SUBIENDO FOTO A CLOUDINARY ===');
    console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
    console.log('Upload Preset:', CLOUDINARY_UPLOAD_PRESET);
    console.log('Tamao archivo:', (file.size / 1024 / 1024).toFixed(2) + ' MB');
    
    // Validar tamao (mximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('La imagen es muy grande. Mximo 10MB');
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
    
    console.log(' Enviando a Cloudinary...');
    
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
      console.error(' Error de Cloudinary:', responseText);
      throw new Error(`Cloudinary error ${response.status}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (!data.secure_url) {
      throw new Error('No se recibi URL de la imagen');
    }
    
    console.log(' Foto subida exitosamente');
    console.log('URL:', data.secure_url);
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id
    };
    
  } catch (error) {
    console.error(' ERROR subiendo foto:', error);
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

// ============================================
// FUNCIN procesarEnvio() CORREGIDA
// Reemplaza toda la funcin procesarEnvio en comercios-panel-script.js
// ============================================

async function procesarEnvio(e) {
  e.preventDefault();

  if (!appData.ubicacionRecogida) {
    alert('ï Debes configurar la ubicacin de recogida');
    return;
  }

  if (!appData.ubicacionEntrega) {
    alert('ï Debes pegar la ubicacin de entrega que te mand tu cliente por WhatsApp');
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

  const submitBtn = document.querySelector('#nuevoEnvioForm button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;

  let fotoUrl = null;
  const fotoFile = document.getElementById('fotoPaquete').files[0];

  // Subir foto a Cloudinary si existe
  if (fotoFile) {
    console.log(' Detectada foto, iniciando subida...');
    submitBtn.textContent = 'Subiendo foto...';
    
    const resultadoSubida = await subirFotoCloudinary(fotoFile);
    
    if (resultadoSubida.success) {
      fotoUrl = resultadoSubida.url;
      console.log(' Foto subida correctamente:', fotoUrl);
    } else {
      console.error(' Error subiendo foto:', resultadoSubida.error);
      
      // Preguntar al usuario si quiere continuar sin foto
      const continuar = confirm(
        'ï No se pudo subir la foto:\n' + 
        resultadoSubida.error + 
        '\n\nDeseas continuar sin foto?'
      );
      
      if (!continuar) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
    }
  }

  submitBtn.textContent = 'Registrando envio...';

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
    // Diagnóstico — verificar que usuarioId esté presente
    if (!appData.comercio.usuarioId) {
      console.error('❌ appData.comercio.usuarioId es null. Sesión desactualizada. Cerrando sesión...');
      window.APP_SECURITY.clearSession('somarComercioUser');
      alert('⚠️ Tu sesión expiró. Por favor vuelve a iniciar sesión.');
      location.reload();
      return;
    }
    window.secureLog('Registrando envío en Supabase...', datos);

    const result = await window.SomarAPI.registrarEnvio(datos, appData.comercio);

    window.secureLog('✅ Envío registrado:', result.noOrden);
    alert('✅ Envío registrado: ' + result.noOrden + (fotoUrl ? ' (con foto)' : ''));

    document.getElementById('nuevoEnvioForm').reset();
    document.getElementById('tarifaResumen').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('ubicacionDetectada').classList.add('hidden');

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    appData.ubicacionEntrega = null;
    document.getElementById('tabMisEnvios').click();

  } catch (error) {
    console.error('Error registrando envío:', error);
    alert('❌ Error al registrar envío: ' + error.message);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

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
      alert('ï Por favor completa todos los campos obligatorios');
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

    if (!nombreContacto || !ubicacionRecogida || !descripcion) {
      alert('ï Por favor completa todos los campos obligatorios');
      return;
    }

    let ubicacionEntrega = appData.comercio.ubicacionGPS;
    if (destinoPaquete === 'OTRA_DIRECCION') {
      ubicacionEntrega = document.getElementById('ubicacionEntregaPaquete').value;
      if (!ubicacionEntrega) {
        alert('ï Debes especificar la ubicacin de entrega');
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
      alert('ï Por favor completa todos los campos obligatorios');
      return;
    }

    let ubicacionEntrega = appData.comercio.ubicacionGPS;
    if (destinoCompra === 'OTRA_DIRECCION') {
      ubicacionEntrega = document.getElementById('ubicacionEntregaCompra').value;
      if (!ubicacionEntrega) {
        alert('ï Debes especificar la ubicacin de entrega');
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
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;

  // ========================================
  // SUBIR FOTOS A CLOUDINARY
  // ========================================
  let fotosUrls = [];
  if (fotosReferencia.length > 0) {
    console.log(` Subiendo ${fotosReferencia.length} fotos...`);
    
    for (let i = 0; i < fotosReferencia.length; i++) {
      submitBtn.textContent = `Subiendo fotos (${i + 1}/${fotosReferencia.length})...`;
      
      try {
        const resultado = await subirFotoCloudinary(fotosReferencia[i].file);
        
        if (resultado.success) {
          fotosUrls.push(resultado.url);
          console.log(` Foto ${i + 1} subida: ${resultado.url}`);
        } else {
          console.error(` Error subiendo foto ${i + 1}:`, resultado.error);
        }
      } catch (error) {
        console.error(` Error subiendo foto ${i + 1}:`, error);
      }
    }
    
    console.log(` Total: ${fotosUrls.length}/${fotosReferencia.length} fotos subidas correctamente`);
  }

  // Agregar fotos a los datos
  datos.fotosReferencia = fotosUrls.join('||'); // URLs separadas por ||
  datos.cantidadFotos = fotosUrls.length;

  submitBtn.textContent = 'Registrando solicitud...';

  try {
    const result = await window.SomarAPI.registrarSolicitudEntrega(datos, appData.comercio);

    window.secureLog('✅ Solicitud registrada:', result.noOrden);
    alert(`✅ Solicitud ${result.noOrden} registrada${fotosUrls.length > 0 ? ` con ${fotosUrls.length} foto(s)` : ''}.\n\nUn delivery será asignado pronto.`);

    document.getElementById('solicitarEntregaForm').reset();
    limpiarFotosReferencia();
    
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    document.getElementById('seccionTrasladoTiendas').classList.remove('hidden');
    document.getElementById('seccionRecogerPaquete').classList.add('hidden');
    document.getElementById('seccionRealizarCompra').classList.add('hidden');
    document.getElementById('tarifaResumenEntrega').classList.add('hidden');

    document.getElementById('tabMisEnvios').click();
  } catch (error) {
    console.error('Error:', error);
    alert('ï Error al registrar solicitud');
    submitBtn.textContent = originalText;
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
    const nombrePersona = document.getElementById('authNombrePersona')?.value.trim() || '';
    const nombreNegocio = document.getElementById('authNombreComercio').value.trim();
    const direccion     = document.getElementById('authDireccionComercio').value.trim();
    const ubicacionGPS  = document.getElementById('authUbicacionGPS').value.trim();
    if (!nombrePersona) { alert('Por favor ingresa tu nombre'); return; }
    if (!nombreNegocio || !direccion) { alert('Por favor completa nombre del negocio y dirección'); return; }
    completarRegistroComercio(nombreNegocio, nombrePersona, direccion, ubicacionGPS);
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
        () => alert('No se pudo obtener ubicacin')
      );
    }
  });

  // Men Lateral - Abrir
document.getElementById('menuBtn').addEventListener('click', () => {
  const menu = document.getElementById('sideMenu');
  const drawer = document.getElementById('sideMenuDrawer');
  
  menu.classList.remove('hidden');
  document.body.classList.add('menu-open');
  
  setTimeout(() => {
    drawer.style.transform = 'translateX(0)';
  }, 10);
});

// Men Lateral - Cerrar
document.getElementById('closeSideMenu').addEventListener('click', () => {
  const drawer = document.getElementById('sideMenuDrawer');
  drawer.style.transform = 'translateX(-100%)';
  
  setTimeout(() => {
    document.getElementById('sideMenu').classList.add('hidden');
    document.body.classList.remove('menu-open');
  }, 300);
});

// Men Lateral - Cerrar al hacer click fuera
document.getElementById('sideMenu').addEventListener('click', (e) => {
  if (e.target.id === 'sideMenu') {
    const drawer = document.getElementById('sideMenuDrawer');
    drawer.style.transform = 'translateX(-100%)';
    
    setTimeout(() => {
      document.getElementById('sideMenu').classList.add('hidden');
      document.body.classList.remove('menu-open');
    }, 300);
  }
});

// Men Lateral - Cerrar Sesin
document.getElementById('menuLogoutBtn').addEventListener('click', () => {
  const drawer = document.getElementById('sideMenuDrawer');
  drawer.style.transform = 'translateX(-100%)';
  
  setTimeout(() => {
    document.getElementById('sideMenu').classList.add('hidden');
    document.body.classList.remove('menu-open');
    cerrarSesion();
  }, 300);
});

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
    document.getElementById('contentMiEquipo')?.classList.add('hidden');
  });

  document.getElementById('tabSolicitarEntrega').addEventListener('click', () => {
  // Cambiar estilos de tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-brand-orange', 'brand-orange');
    btn.classList.add('border-transparent', 'text-gray-500');
  });
  
  document.getElementById('tabSolicitarEntrega').classList.add('border-brand-orange', 'brand-orange');
  document.getElementById('tabSolicitarEntrega').classList.remove('border-transparent', 'text-gray-500');
  
  // Mostrar/ocultar contenido
  document.getElementById('contentNuevoEnvio').classList.add('hidden');
  document.getElementById('contentSolicitarEntrega').classList.remove('hidden');
  document.getElementById('contentMisEnvios').classList.add('hidden');
  document.getElementById('contentMiEquipo')?.classList.add('hidden');
  
  // Configurar autocompletados
  configurarAutocompletadosFormularioEntrega();
  
  // Configurar event listener de fotos
  configurarEventListenerFotos();
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
    document.getElementById('contentMiEquipo')?.classList.add('hidden');
    cargarMisEnvios();
  });

  // ── Tab Mi Equipo ────────────────────────────────────────
  document.getElementById('menuMiEquipo')?.addEventListener('click', () => {
    // Cerrar menú lateral
    document.body.classList.remove('menu-open');
    // Quitar resaltado de tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('border-brand-orange', 'brand-orange');
      btn.classList.add('border-transparent', 'text-gray-500');
    });
    // Mostrar Mi Equipo
    document.getElementById('contentNuevoEnvio').classList.add('hidden');
    document.getElementById('contentSolicitarEntrega').classList.add('hidden');
    document.getElementById('contentMisEnvios').classList.add('hidden');
    document.getElementById('contentMiEquipo').classList.remove('hidden');
    cargarEquipo();
  });

  // ── Formulario agregar usuario ────────────────────────────
  document.getElementById('formAgregarUsuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!appData.comercio?.esDueno) {
      alert('Solo el dueño puede agregar usuarios');
      return;
    }
    const btn    = document.getElementById('btnAgregarUsuario');
    const nombre = document.getElementById('nuevoUsuarioNombre').value.trim();
    const cel    = document.getElementById('nuevoUsuarioCelular').value.trim();
    btn.textContent = 'Agregando...';
    btn.disabled = true;
    try {
      const res = await window.SomarAPI.agregarUsuario(appData.comercio.celular, nombre, cel);
      if (res.success) {
        alert(res.mensaje);
        document.getElementById('formAgregarUsuario').reset();
        cargarEquipo();
      } else {
        alert('❌ ' + res.error);
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      btn.textContent = '➕ Agregar al Equipo';
      btn.disabled = false;
    }
  });

  document.getElementById('btnRefrescarEquipo')?.addEventListener('click', cargarEquipo);

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
        window.secureLog(' Procesando entrada:', input);
        const resultado = await extraerCoordenadasDeLink(input);
        statusIndicator.classList.add('hidden');
        
        if (resultado.exito) {
          window.secureLog(' Coordenadas extradas:', resultado.lat, resultado.lon);
          appData.ubicacionEntrega = `${resultado.lat},${resultado.lon}`;
          
          document.getElementById('ubicacionDetectada').classList.remove('hidden');
          document.getElementById('coordenadasDetectadas').textContent = `Lat: ${resultado.lat.toFixed(6)}, Lon: ${resultado.lon.toFixed(6)}`;
          
          mostrarMapaPreview(resultado.lat, resultado.lon, 'mapPreviewEntrega');
          await calcularTarifa(appData.ubicacionRecogida, appData.ubicacionEntrega);
          
          e.target.classList.remove('border-red-500');
          e.target.classList.add('border-green-500');
          
        } else {
          window.secureLog(' No se encontraron coordenadas');
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
      alert('ï Error: No se ha seleccionado ubicacin');
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
        alert('ï Imagen muy grande. Mximo 5MB');
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
        window.secureLog(' Origen traslado seleccionado:', ubicacion.nombre);
        const destino = document.getElementById('ubicacionDestinoTraslado').value.trim();
        if (destino) {
          await calcularTarifaEntrega(ubicacion.ubicacion, destino);
        }
      });
      
      configurarAutocomplete('ubicacionDestinoTraslado', async (ubicacion) => {
        window.secureLog(' Destino traslado seleccionado:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionOrigenTraslado').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
      
      configurarAutocomplete('ubicacionRecogidaPaquete', async (ubicacion) => {
        window.secureLog(' Ubicacin recogida seleccionada:', ubicacion.nombre);
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
        window.secureLog(' Ubicacin entrega paquete seleccionada:', ubicacion.nombre);
        const origen = document.getElementById('ubicacionRecogidaPaquete').value.trim();
        if (origen) {
          await calcularTarifaEntrega(origen, ubicacion.ubicacion);
        }
      });
      
      configurarAutocomplete('ubicacionComercioCompra', async (ubicacion) => {
        window.secureLog(' Comercio compra seleccionado:', ubicacion.nombre);
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
        window.secureLog(' Ubicacin entrega compra seleccionada:', ubicacion.nombre);
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


  // ========================================
// MLTIPLES FOTOS DE REFERENCIA
// ========================================

let fotosReferencia = [];
const MAX_FOTOS = 10;
const MAX_SIZE_MB = 5;

// Configurar event listener cuando se abre el tab de Solicitar Entrega
function configurarEventListenerFotos() {
  const inputFotos = document.getElementById('fotosReferencia');
  
  if (!inputFotos) {
    console.error(' Input fotosReferencia no encontrado');
    return;
  }
  
  console.log(' Configurando event listener de fotos');
  
  // Remover listener previo si existe
  inputFotos.removeEventListener('change', manejarSeleccionFotos);
  
  // Agregar nuevo listener
  inputFotos.addEventListener('change', manejarSeleccionFotos);
}

async function manejarSeleccionFotos(e) {
  console.log(' Fotos seleccionadas:', e.target.files.length);
  
  const files = Array.from(e.target.files);
  const errorDiv = document.getElementById('fotosError');
  
  if (!errorDiv) {
    console.error(' Div de error no encontrado');
    return;
  }
  
  // Limpiar errores previos
  errorDiv.classList.add('hidden');
  errorDiv.textContent = '';
  
  // Validar cantidad total
  if (fotosReferencia.length + files.length > MAX_FOTOS) {
    errorDiv.textContent = `ï Solo puedes agregar ${MAX_FOTOS} fotos en total. Ya tienes ${fotosReferencia.length} fotos.`;
    errorDiv.classList.remove('hidden');
    e.target.value = '';
    return;
  }
  
  // Validar y procesar cada archivo
  const nuevasFotos = [];
  for (const file of files) {
    console.log(' Procesando:', file.name, file.size / 1024 / 1024, 'MB');
    
    // Validar tamao
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      errorDiv.textContent = `ï La imagen "${file.name}" es muy grande. Mximo ${MAX_SIZE_MB}MB por foto.`;
      errorDiv.classList.remove('hidden');
      continue;
    }
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      errorDiv.textContent = `ï El archivo "${file.name}" no es una imagen vlida.`;
      errorDiv.classList.remove('hidden');
      continue;
    }
    
    // Leer como base64 para preview
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
      reader.onload = (event) => resolve(event.target.result);
      reader.readAsDataURL(file);
    });
    
    const base64 = await base64Promise;
    
    nuevasFotos.push({
      file: file,
      base64: base64,
      nombre: file.name
    });
  }
  
  console.log(' Fotos procesadas:', nuevasFotos.length);
  
  // Agregar nuevas fotos al array
  fotosReferencia.push(...nuevasFotos);
  
  console.log(' Total fotos en array:', fotosReferencia.length);
  
  // Actualizar UI
  actualizarPreviewFotos();
  
  // Limpiar input para permitir agregar ms fotos
  e.target.value = '';
}

function actualizarPreviewFotos() {
  console.log(' Actualizando preview, fotos:', fotosReferencia.length);
  
  const container = document.getElementById('fotosPreviewContainer');
  const grid = document.getElementById('fotosPreviewGrid');
  const counter = document.getElementById('fotoCounter');
  const counterNumber = document.getElementById('fotoCountNumber');
  
  if (!container || !grid || !counter || !counterNumber) {
    console.error(' Elementos de preview no encontrados');
    return;
  }
  
  if (fotosReferencia.length === 0) {
    container.classList.add('hidden');
    counter.classList.add('hidden');
    return;
  }
  
  // Mostrar contador
  counter.classList.remove('hidden');
  counterNumber.textContent = fotosReferencia.length;
  
  // Mostrar container
  container.classList.remove('hidden');
  
  console.log(' Mostrando', fotosReferencia.length, 'fotos');
  
  // Generar previews
  grid.innerHTML = fotosReferencia.map((foto, index) => `
    <div class="relative group">
      <img src="${foto.base64}" alt="Foto ${index + 1}" class="w-full h-32 object-cover rounded-lg border-2 border-gray-200">
      <button type="button" class="remove-foto absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-lg" data-index="${index}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg truncate">
        ${foto.nombre}
      </div>
    </div>
  `).join('');
  
  // Event listeners para eliminar fotos
  document.querySelectorAll('.remove-foto').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      eliminarFoto(index);
    });
  });
}

function eliminarFoto(index) {
  console.log('Eliminando foto:', index);
  fotosReferencia.splice(index, 1);
  actualizarPreviewFotos();
  
  var errorDiv = document.getElementById('fotosError');
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }
}

function limpiarFotosReferencia() {
  console.log('Limpiando fotos');
  fotosReferencia = [];
  actualizarPreviewFotos();
  var inputFotos = document.getElementById('fotosReferencia');
  if (inputFotos) {
    inputFotos.value = '';
  }
  var errorDiv2 = document.getElementById('fotosError');
  if (errorDiv2) {
    errorDiv2.classList.add('hidden');
  }
}

// Exponer globalmente
window.limpiarFotosReferencia = limpiarFotosReferencia;


  document.getElementById('solicitarEntregaForm').addEventListener('submit', procesarSolicitudEntrega);

  document.getElementById('filtroEstado').addEventListener('change', renderizarEnvios);
  document.getElementById('refrescarEnvios').addEventListener('click', cargarMisEnvios);



  // ── Inicialización de equipo ──────────────────────────────
  document.getElementById('menuMiEquipo')?.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('border-brand-orange', 'brand-orange');
      btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById('contentNuevoEnvio').classList.add('hidden');
    document.getElementById('contentSolicitarEntrega').classList.add('hidden');
    document.getElementById('contentMisEnvios').classList.add('hidden');
    document.getElementById('contentMiEquipo').classList.remove('hidden');
    cargarEquipo();
  });

});

// ══════════════════════════════════════════════════════════════
// FUNCIONES GLOBALES
// ══════════════════════════════════════════════════════════════

async function cargarEquipo() {
  const container = document.getElementById('listaEquipo');
  if (!container || !appData.comercio?.esDueno) return;
  container.innerHTML = '<p class="text-center text-gray-400 py-6">Cargando...</p>';
  try {
    const res = await window.SomarAPI.listarUsuarios(appData.comercio.celular);
    if (!res.success) throw new Error(res.error);
    renderizarEquipo(res.usuarios || []);
  } catch (err) {
    container.innerHTML = `<p class="text-center text-red-500 py-4">Error: ${err.message}</p>`;
  }
}

function renderizarEquipo(usuarios) {
  const container = document.getElementById('listaEquipo');
  if (!container) return;
  if (usuarios.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 py-6">No hay usuarios en el equipo aún.</p>';
    return;
  }
  container.innerHTML = usuarios.map(u => {
    const celMostrar = u.celular.startsWith('504') ? u.celular.slice(3) : u.celular;
    const badge = u.es_dueno
      ? '<span class="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded-full">Dueño</span>'
      : '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Usuario</span>';
    const activadoBadge = u.activado_at ? ''
      : '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full ml-1">Pendiente primer login</span>';
    const activoIcon = u.activo ? '🟢' : '🔴';
    const btnEliminar = !u.es_dueno && u.activo
      ? `<button onclick="eliminarUsuarioEquipo('${u.id}', '${u.nombre}')" class="text-xs text-red-500 hover:text-red-700 font-semibold ml-2">Eliminar</button>`
      : '';
    return `
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${activoIcon}</span>
          <div>
            <p class="font-semibold text-gray-800">${u.nombre}</p>
            <p class="text-sm text-gray-500">${celMostrar}</p>
            <div class="flex gap-1 mt-1">${badge}${activadoBadge}</div>
          </div>
        </div>
        ${btnEliminar}
      </div>`;
  }).join('');
}

async function eliminarUsuarioEquipo(usuarioId, nombre) {
  if (!confirm(`¿Eliminar a ${nombre} del equipo?`)) return;
  try {
    const res = await window.SomarAPI.eliminarUsuario(appData.comercio.celular, usuarioId);
    if (res.success) { alert('✅ ' + res.mensaje); cargarEquipo(); }
    else alert('❌ ' + res.error);
  } catch (err) { alert('❌ Error: ' + err.message); }
}
window.eliminarUsuarioEquipo = eliminarUsuarioEquipo;
