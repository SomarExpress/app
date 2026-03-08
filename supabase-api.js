// ========================================
// SUPABASE-API.JS — Somar Express v2.0
// Capa de datos: todas las operaciones
// con Supabase para el panel de comercios
// ========================================

(function () {
  'use strict';

  let _sb = null;           // Supabase client
  let _realtimeSub = null;  // Suscripción realtime activa

  // ── Lazy-init: se llama antes de cada operación.
  // Garantiza que el cliente se crea solo cuando window.supabase
  // (CDN) ya está disponible, sin depender del orden de eventos.
  function getClient() {
    if (_sb) return _sb;
    if (!window.supabase) {
      throw new Error('Supabase CDN no cargó. Verifica la conexión y el orden de scripts.');
    }
    if (!window.APP_CONFIG || !window.APP_CONFIG.supabase) {
      throw new Error('APP_CONFIG no disponible. config-seguro-comercios.js no cargó.');
    }
    const { url, key } = window.APP_CONFIG.supabase;
    _sb = window.supabase.createClient(url, key, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase client inicializado');
    return _sb;
  }

  // Alias público (para compatibilidad, ya no hace falta llamarlo manualmente)
  function init() { return getClient(); }

  // ── Utilidades internas ────────────────────────────────────
  function san(v) { return window.APP_SECURITY ? window.APP_SECURITY.sanitize(v) : String(v).trim(); }

  function generarOTP() {
    // 6 dígitos criptográficamente seguros
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(arr[0] % 900000 + 100000);
  }

  // ── 1. OTP / AUTENTICACIÓN ─────────────────────────────────

  /**
   * Genera y almacena un OTP en Supabase, luego envía el
   * WhatsApp a través del Apps Script (solo mensajería, no datos).
   */
  async function enviarOTP(numero) {
    if (!window.APP_SECURITY.validatePhone(numero)) {
      throw new Error('Número de teléfono inválido');
    }

    const celular = san(numero);
    const codigo = generarOTP();

    // Eliminar códigos anteriores del mismo número
    await getClient()
      .from('codigos_verificacion')
      .delete()
      .eq('celular', celular)
      .eq('tipo', 'COMERCIO');

    // Guardar nuevo código en Supabase (expira en 10 min por schema)
    const { error } = await getClient()
      .from('codigos_verificacion')
      .insert({ celular, codigo, tipo: 'COMERCIO' });

    if (error) throw new Error('Error al generar código: ' + error.message);

    // Enviar WhatsApp vía Apps Script (solo mensajería, sin almacenar datos)
    try {
      await fetch(window.APP_CONFIG.whatsappEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enviarCodigoVerificacionComercio',
          numero: celular,
          codigo   // Apps Script usa esto solo para armar el mensaje
        })
      });
    } catch (e) {
      // El código está en BD aunque falle el WhatsApp
      window.secureLog('⚠️ WhatsApp error (código guardado en BD):', e);
    }

    return { success: true };
  }

  /**
   * Verifica el código OTP contra Supabase.
   * Retorna { success, esNuevo, comercio? }
   */
  async function verificarOTP(numero, codigo) {
    const celular = san(numero);
    const codigoClean = san(codigo).trim();

    // Buscar código válido (no usado, no expirado)
    const { data: otpRows, error: otpErr } = await getClient()
      .from('codigos_verificacion')
      .select('*')
      .eq('celular', celular)
      .eq('codigo', codigoClean)
      .eq('tipo', 'COMERCIO')
      .eq('usado', false)
      .gt('expira_at', new Date().toISOString())
      .limit(1);

    if (otpErr) throw new Error('Error al verificar: ' + otpErr.message);
    if (!otpRows || otpRows.length === 0) {
      return { success: false, error: 'Código incorrecto o expirado' };
    }

    // Marcar como usado
    await getClient()
      .from('codigos_verificacion')
      .update({ usado: true })
      .eq('id', otpRows[0].id);

    // Buscar si ya existe un usuario de comercio con ese celular
    const { data: usuarioRows } = await getClient()
      .from('comercios_usuarios')
      .select(`
        id, celular, nombre, ubicacion_gps, direccion,
        comercio_id,
        comercios ( id, nombre, direccion, ubicacion_gps, whatsapp, abierto )
      `)
      .eq('celular', celular)
      .eq('activo', true)
      .limit(1);

    if (usuarioRows && usuarioRows.length > 0) {
      const u = usuarioRows[0];
      const comercioData = {
        usuarioId: u.id,
        id: u.comercio_id || null,         // id del comercio en catálogo (puede ser null)
        nombre: u.comercios?.nombre || u.nombre,
        direccion: u.comercios?.direccion || u.direccion,
        ubicacionGPS: u.comercios?.ubicacion_gps || u.ubicacion_gps,
        celular: celular,
        whatsapp: u.comercios?.whatsapp || celular,
        abierto: u.comercios?.abierto ?? true
      };
      return { success: true, esNuevo: false, comercio: comercioData };
    }

    // No existe → registro nuevo
    return { success: true, esNuevo: true };
  }

  /**
   * Registra un comercio nuevo en Supabase.
   */
  async function registrarComercio({ celular, nombre, direccion, ubicacionGPS }) {
    const cel = san(celular);
    const nom = san(nombre);
    const dir = san(direccion);
    const gps = san(ubicacionGPS || '');

    if (!nom || nom.length < 2) throw new Error('Nombre inválido');
    if (!dir) throw new Error('Dirección requerida');

    // Insertar en comercios_usuarios (perfil_id null por ahora, sin Supabase Auth)
    const { data: nuevoUsuario, error } = await getClient()
      .from('comercios_usuarios')
      .insert({
        celular: cel,
        nombre: nom,
        direccion: dir,
        ubicacion_gps: gps,
        activo: true
      })
      .select()
      .single();

    if (error) throw new Error('Error al registrar: ' + error.message);

    return {
      success: true,
      comercio: {
        usuarioId: nuevoUsuario.id,
        id: null,
        nombre: nom,
        direccion: dir,
        ubicacionGPS: gps,
        celular: cel,
        abierto: true
      }
    };
  }

  // ── 2. UBICACIONES FRECUENTES ──────────────────────────────

  /**
   * Carga todas las ubicaciones frecuentes.
   * (Globales por defecto; en fases futuras se filtra por comercio)
   */
  async function obtenerUbicacionesFrecuentes(comercioId = null) {
    let query = getClient()
      .from('ubicaciones_frecuentes')
      .select('id, nombre, direccion, ubicacion_gps, ciudad, colonia')
      .order('nombre', { ascending: true });

    if (comercioId) {
      query = query.eq('comercio_id', comercioId);
    }

    const { data, error } = await query;
    if (error) throw new Error('Error cargando ubicaciones: ' + error.message);

    // Normalizar para que el autocomplete funcione igual que antes
    return (data || []).map(u => ({
      id: u.id,
      nombre: u.nombre,
      direccion: u.direccion,
      ubicacion: u.ubicacion_gps,
      ciudad: u.ciudad || 'CHOLOMA',
      colonia: u.colonia || ''
    }));
  }

  /**
   * Guarda o actualiza una ubicación frecuente.
   */
  async function guardarUbicacionFrecuente({ nombre, direccion, ubicacionGPS, ciudad, colonia, clienteId }) {
    if (!nombre || !ubicacionGPS) return;

    const { error } = await getClient()
      .from('ubicaciones_frecuentes')
      .upsert({
        nombre: san(nombre),
        direccion: san(direccion || ''),
        ubicacion_gps: san(ubicacionGPS),
        ciudad: san(ciudad || 'CHOLOMA'),
        colonia: san(colonia || ''),
        cliente_id: clienteId || null
      }, { onConflict: 'nombre' });

    if (error) window.secureLog('⚠️ Error guardando ubicación:', error.message);
  }

  // ── 3. PEDIDOS ─────────────────────────────────────────────

  /**
   * Carga los pedidos del comercio desde Supabase.
   */
  async function obtenerPedidosComercio(comercioUsuarioId) {
    const { data, error } = await getClient()
      .from('pedidos')
      .select(`
        id, no_orden, created_at, estatus,
        canal, tipo,
        nombre_destinatario, telefono_destinatario,
        descripcion_paquete, foto_paquete_url, fotos_referencia,
        direccion_recogida, ciudad_origen,
        direccion_entrega, ciudad_destino,
        ubicacion_recogida_gps, ubicacion_entrega_gps,
        distancia_km, tarifa_envio, total,
        monto_cobrar, quien_paga, metodo_pago,
        notas, estatus_comercio
      `)
      .eq('comercio_usuario_id', comercioUsuarioId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error('Error cargando pedidos: ' + error.message);
    return data || [];
  }

  /**
   * Suscripción realtime — llama a `callback` cuando cambia un pedido del comercio.
   */
  function suscribirPedidos(comercioUsuarioId, callback) {
    // Limpiar suscripción anterior si existe
    if (_realtimeSub) {
      getClient().removeChannel(_realtimeSub);
      _realtimeSub = null;
    }

    _realtimeSub = getClient()
      .channel(`pedidos_comercio_${comercioUsuarioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `comercio_usuario_id=eq.${comercioUsuarioId}`
        },
        (payload) => {
          window.secureLog('🔔 Cambio en pedido:', payload.eventType, payload.new?.no_orden);
          callback(payload);
        }
      )
      .subscribe();

    window.secureLog('📡 Realtime suscrito para comercio:', comercioUsuarioId);
    return _realtimeSub;
  }

  function desuscribirPedidos() {
    if (_realtimeSub) {
      getClient().removeChannel(_realtimeSub);
      _realtimeSub = null;
      window.secureLog('📡 Realtime desuscrito');
    }
  }

  /**
   * Registra un pedido de tipo ENVIO_NORMAL (tab "Nuevo Envío").
   */
  async function registrarEnvio(datos, comercio) {
    // Calcular tarifa desde la BD si tenemos la distancia
    const distKm = parseFloat(datos.distanciaKm) || 0;
    let tarifaCalculada = parseFloat(datos.tarifaEstimada) || 0;

    // Intenta obtener tarifa del servidor (más confiable)
    if (distKm > 0) {
      try {
        const { data: tarifaData } = await getClient()
          .rpc('calcular_tarifa', { p_distancia_km: distKm });
        if (tarifaData?.tarifa_final) {
          tarifaCalculada = tarifaData.tarifa_final;
        }
      } catch (e) {
        window.secureLog('⚠️ RPC tarifa falló, usando tarifa del cliente:', e);
      }
    }

    const pedido = {
      canal: 'PANEL_COMERCIO',
      tipo: 'DELIVERY',
      estatus: 'PENDIENTE',

      // Comercio
      comercio_usuario_id: comercio.usuarioId,
      comercio_id: comercio.id || null,
      nombre_comercio: san(comercio.nombre),
      whatsapp_comercio: san(comercio.celular),
      ubicacion_comercio: san(comercio.ubicacionGPS || ''),

      // Recogida
      ubicacion_recogida_gps: san(datos.ubicacionRecogidaGPS || ''),
      direccion_recogida: san(datos.direccionRecogida || ''),
      ciudad_origen: san(datos.ciudadOrigen || 'CHOLOMA'),

      // Entrega
      ubicacion_entrega_gps: san(datos.ubicacionEntregaGPS || ''),
      direccion_entrega: san(datos.direccionEntrega || ''),
      ciudad_destino: san(datos.ciudadDestino || 'CHOLOMA'),
      nombre_destinatario: san(datos.nombreDestinatario || ''),
      telefono_destinatario: san(datos.telefonoDestinatario || ''),

      // Paquete
      descripcion_paquete: san(datos.descripcionPaquete || ''),
      foto_paquete_url: datos.fotoUrl || null,

      // Financiero
      tarifa_envio: tarifaCalculada,
      total: tarifaCalculada,
      monto_cobrar: parseFloat(datos.montoCobrar) || 0,
      quien_paga: _mapQuienPaga(datos.quienPaga),
      metodo_pago: _mapMetodoPago(datos.tipoPagoEnvio),

      // Logística
      distancia_km: distKm,

      // Extras
      notas: san(datos.notasAdicionales || ''),
      detalle_json: datos.tipoServicio
        ? { tipo_servicio: datos.tipoServicio }
        : null
    };

    const { data, error } = await getClient()
      .from('pedidos')
      .insert(pedido)
      .select('id, no_orden')
      .single();

    if (error) throw new Error('Error registrando envío: ' + error.message);

    // Guardar la ubicación de entrega como frecuente si tiene nombre
    if (datos.nombreDestinatario && datos.ubicacionEntregaGPS) {
      guardarUbicacionFrecuente({
        nombre: datos.nombreDestinatario,
        direccion: datos.direccionEntrega || '',
        ubicacionGPS: datos.ubicacionEntregaGPS,
        ciudad: datos.ciudadDestino
      });
    }

    return { success: true, noOrden: data.no_orden, id: data.id };
  }

  /**
   * Registra una solicitud de entrega (tab "Solicitar Entrega").
   */
  async function registrarSolicitudEntrega(datos, comercio) {
    const distKm = parseFloat(datos.distanciaKm) || 0;
    let tarifaCalculada = parseFloat(datos.tarifa) || 0;

    if (distKm > 0) {
      try {
        const { data: tarifaData } = await getClient()
          .rpc('calcular_tarifa', { p_distancia_km: distKm });
        if (tarifaData?.tarifa_final) tarifaCalculada = tarifaData.tarifa_final;
      } catch (e) { /* usa tarifa del cliente */ }
    }

    const pedido = {
      canal: 'PANEL_COMERCIO',
      tipo: 'DELIVERY',
      estatus: 'PENDIENTE',

      comercio_usuario_id: comercio.usuarioId,
      comercio_id: comercio.id || null,
      nombre_comercio: san(comercio.nombre),
      whatsapp_comercio: san(comercio.celular),
      ubicacion_comercio: san(comercio.ubicacionGPS || ''),

      ubicacion_recogida_gps: san(datos.ubicacionOrigen || ''),
      ciudad_origen: san(datos.ciudadOrigen || 'CHOLOMA'),

      ubicacion_entrega_gps: san(datos.ubicacionDestino || ''),
      ciudad_destino: san(datos.ciudadDestino || 'CHOLOMA'),

      descripcion_paquete: san(datos.descripcionContenido || ''),
      fotos_referencia: datos.fotosReferencia
        ? datos.fotosReferencia.split('||').filter(Boolean)
        : null,

      tarifa_envio: tarifaCalculada,
      total: tarifaCalculada,
      monto_cobrar: parseFloat(datos.montoCobrar) || 0,
      metodo_pago: _mapMetodoPago(datos.metodoPago),

      distancia_km: distKm,
      notas: san(datos.notasAdicionales || ''),

      // Datos adicionales según tipo de servicio
      detalle_json: {
        tipo_servicio: datos.tipoServicio,
        ...(datos.tiendaOrigen && { tienda_origen: san(datos.tiendaOrigen) }),
        ...(datos.tiendaDestino && { tienda_destino: san(datos.tiendaDestino) }),
        ...(datos.nombreContacto && { nombre_contacto: san(datos.nombreContacto) }),
        ...(datos.telefonoContacto && { telefono_contacto: san(datos.telefonoContacto) }),
        ...(datos.nombreComercioCompra && { comercio_compra: san(datos.nombreComercioCompra) }),
        ...(datos.listaProductos && { lista_productos: san(datos.listaProductos) }),
        ...(datos.presupuesto && { presupuesto: parseFloat(datos.presupuesto) }),
        ...(datos.comision && { comision: parseFloat(datos.comision) })
      }
    };

    const { data, error } = await getClient()
      .from('pedidos')
      .insert(pedido)
      .select('id, no_orden')
      .single();

    if (error) throw new Error('Error registrando solicitud: ' + error.message);
    return { success: true, noOrden: data.no_orden, id: data.id };
  }

  // ── Mapeos de enums ────────────────────────────────────────
  function _mapMetodoPago(v) {
    const map = {
      'EFECTIVO': 'EFECTIVO',
      'TRANSFERENCIA': 'TRANSFERENCIA',
      'TARJETA': 'TARJETA',
      'SALDO': 'SALDO_APP'
    };
    return map[String(v).toUpperCase()] || 'EFECTIVO';
  }

  function _mapQuienPaga(v) {
    const map = {
      'REMITENTE': 'REMITENTE',
      'DESTINATARIO': 'DESTINATARIO',
      'COMERCIO': 'COMERCIO'
    };
    return map[String(v).toUpperCase()] || 'DESTINATARIO';
  }

  // ── API pública ────────────────────────────────────────────
  window.SomarAPI = {
    init,
    // Auth
    enviarOTP,
    verificarOTP,
    registrarComercio,
    // Ubicaciones
    obtenerUbicacionesFrecuentes,
    guardarUbicacionFrecuente,
    // Pedidos
    obtenerPedidosComercio,
    suscribirPedidos,
    desuscribirPedidos,
    registrarEnvio,
    registrarSolicitudEntrega,
    // Acceso directo al cliente (para casos avanzados)
    get client() { return getClient(); }
  };

  // No se necesita init() explícito — getClient() hace lazy-init automático.
})();
