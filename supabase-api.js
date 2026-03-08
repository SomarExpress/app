// ========================================
// SUPABASE-API.JS — Somar Express v3.0
//
// Arquitectura simplificada:
//   LECTURAS  → cliente anon directo (RLS abierto para anon)
//   ESCRITURAS → Edge Functions con service_role
//   SEGURIDAD → el OTP ya garantizó la identidad del usuario
// ========================================

(function () {
  'use strict';

  let _sb = null;
  let _realtimeSub = null;

  // ── Cliente Supabase (anon) ────────────────────────────────
  function getClient() {
    if (_sb) return _sb;
    if (!window.supabase)
      throw new Error('Supabase CDN no cargó.');
    if (!window.APP_CONFIG?.supabase)
      throw new Error('APP_CONFIG no disponible.');
    const { url, key } = window.APP_CONFIG.supabase;
    _sb = window.supabase.createClient(url, key, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase client inicializado');
    return _sb;
  }

  function san(v) {
    return window.APP_SECURITY ? window.APP_SECURITY.sanitize(v) : String(v ?? '').trim();
  }

  // ── Llamar Edge Function ───────────────────────────────────
  async function callEdge(name, body) {
    const { url, key } = window.APP_CONFIG.supabase;
    const resp = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    return data;
  }

  // ══════════════════════════════════════════════════════════
  // 1. AUTENTICACIÓN (OTP vía Edge Functions)
  // ══════════════════════════════════════════════════════════

  async function enviarOTP(numero) {
    if (!window.APP_SECURITY.validatePhone(numero))
      throw new Error('Número de teléfono inválido');
    const result = await callEdge('enviar-otp', {
      numero: san(numero),
      tipo: 'COMERCIO'
    });
    if (!result.success) throw new Error(result.error || 'Error al enviar código');
    return { success: true };
  }

  async function verificarOTP(numero, codigo) {
    return callEdge('verificar-otp', {
      numero: san(numero),
      codigo: san(codigo).trim(),
      tipo: 'COMERCIO'
    });
  }

  async function registrarComercio({ celular, nombre, nombreNegocio, direccion, ubicacionGPS }) {
    const result = await callEdge('registrar-comercio', {
      celular:        san(celular),
      nombre:         san(nombre),
      nombreNegocio:  san(nombreNegocio || nombre),
      direccion:      san(direccion),
      ubicacionGPS:   san(ubicacionGPS || '')
    });
    if (!result.success) throw new Error(result.error || 'Error al registrar');
    return result;
  }

  // ══════════════════════════════════════════════════════════
  // 2. UBICACIONES FRECUENTES (lectura anon directa)
  // ══════════════════════════════════════════════════════════

  async function obtenerUbicacionesFrecuentes(comercioUsuarioId = null) {
    // Traer zonas globales del sistema + las del comercio específico
    let query = getClient()
      .from('ubicaciones_frecuentes')
      .select('id, nombre, descripcion, ubicacion_gps, ciudad, tipo, referencia_id')
      .eq('activa', true)
      .order('orden', { ascending: true });

    if (comercioUsuarioId) {
      query = query.or(`tipo.in.(ZONA,COMERCIO),referencia_id.eq.${comercioUsuarioId}`);
    } else {
      query = query.in('tipo', ['ZONA', 'COMERCIO']);
    }

    const { data, error } = await query;
    if (error) throw new Error('Error cargando ubicaciones: ' + error.message);

    return (data || []).map(u => ({
      id:        u.id,
      nombre:    u.nombre,
      direccion: u.descripcion || '',
      ubicacion: u.ubicacion_gps,
      ciudad:    u.ciudad || 'CHOLOMA',
      colonia:   '',
      tipo:      u.tipo
    }));
  }

  async function guardarUbicacionFrecuente({ nombre, descripcion, ubicacionGPS, ciudad, tipo = 'PERSONALIZADO', referenciaId = null }) {
    if (!nombre || !ubicacionGPS) return;
    // Verificar si ya existe
    const { data: existing } = await getClient()
      .from('ubicaciones_frecuentes')
      .select('id')
      .eq('nombre', san(nombre))
      .eq('referencia_id', referenciaId ?? '')
      .limit(1);

    if (existing && existing.length > 0) {
      await getClient()
        .from('ubicaciones_frecuentes')
        .update({ descripcion: san(descripcion || ''), ubicacion_gps: san(ubicacionGPS), ciudad: san(ciudad || 'CHOLOMA') })
        .eq('id', existing[0].id);
    } else {
      await getClient()
        .from('ubicaciones_frecuentes')
        .insert({ nombre: san(nombre), descripcion: san(descripcion || ''), ubicacion_gps: san(ubicacionGPS), ciudad: san(ciudad || 'CHOLOMA'), tipo, referencia_id: referenciaId ?? null, activa: true });
    }
  }

  // ══════════════════════════════════════════════════════════
  // 3. PEDIDOS
  //    Lectura: anon directo (filtra por comercio_usuario_id)
  //    Escritura: Edge Function (service_role)
  // ══════════════════════════════════════════════════════════

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
        detalle_json, estatus_comercio
      `)
      .eq('comercio_usuario_id', comercioUsuarioId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error('Error cargando pedidos: ' + error.message);
    return data || [];
  }

  function suscribirPedidos(comercioUsuarioId, callback) {
    if (_realtimeSub) {
      getClient().removeChannel(_realtimeSub);
      _realtimeSub = null;
    }
    _realtimeSub = getClient()
      .channel(`pedidos_comercio_${comercioUsuarioId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pedidos',
        filter: `comercio_usuario_id=eq.${comercioUsuarioId}`
      }, (payload) => {
        window.secureLog('🔔 Pedido actualizado:', payload.new?.no_orden);
        callback(payload);
      })
      .subscribe();
    return _realtimeSub;
  }

  function desuscribirPedidos() {
    if (_realtimeSub) {
      getClient().removeChannel(_realtimeSub);
      _realtimeSub = null;
    }
  }

  // Registrar envío — insert directo con anon key (RLS abierto para anon)
  async function registrarEnvio(datos, comercio) {
    const pedido = {
      canal:                  'PANEL_COMERCIO',
      tipo:                   'DELIVERY',
      estatus:                'PENDIENTE',
      comercio_usuario_id:    comercio.usuarioId,
      comercio_id:            comercio.id || null,
      nombre_comercio:        san(comercio.nombre),
      whatsapp_comercio:      san(comercio.celular),
      ubicacion_comercio:     san(comercio.ubicacionGPS || ''),
      ubicacion_recogida_gps: san(datos.ubicacionRecogidaGPS || ''),
      direccion_recogida:     san(datos.direccionRecogida || ''),
      ciudad_origen:          san(datos.ciudadOrigen || 'CHOLOMA'),
      ubicacion_entrega_gps:  san(datos.ubicacionEntregaGPS || ''),
      direccion_entrega:      san(datos.direccionEntrega || ''),
      ciudad_destino:         san(datos.ciudadDestino || 'CHOLOMA'),
      nombre_destinatario:    san(datos.nombreDestinatario || ''),
      telefono_destinatario:  san(datos.telefonoDestinatario || ''),
      descripcion_paquete:    san(datos.descripcionPaquete || ''),
      foto_paquete_url:       datos.fotoUrl || null,
      tarifa_envio:           parseFloat(datos.tarifaEstimada) || 0,
      total:                  parseFloat(datos.tarifaEstimada) || 0,
      monto_cobrar:           parseFloat(datos.montoCobrar) || 0,
      quien_paga:             _mapQuienPaga(datos.quienPaga),
      metodo_pago:            _mapMetodoPago(datos.tipoPagoEnvio),
      distancia_km:           parseFloat(datos.distanciaKm) || 0,
      detalle_json:           { tipo_servicio: datos.tipoServicio || 'SOLO_ENTREGA', notas: san(datos.notasAdicionales || '') || undefined }
    };
    const { data, error } = await getClient()
      .from('pedidos').insert(pedido).select('id, no_orden').single();
    if (error) throw new Error('Error registrando envío: ' + error.message);
    return { success: true, noOrden: data.no_orden, id: data.id };
  }

  async function registrarSolicitudEntrega(datos, comercio) {
    const pedido = {
      canal:                  'PANEL_COMERCIO',
      tipo:                   'DELIVERY',
      estatus:                'PENDIENTE',
      comercio_usuario_id:    comercio.usuarioId,
      comercio_id:            comercio.id || null,
      nombre_comercio:        san(comercio.nombre),
      whatsapp_comercio:      san(comercio.celular),
      ubicacion_comercio:     san(comercio.ubicacionGPS || ''),
      ubicacion_recogida_gps: san(datos.ubicacionOrigen || ''),
      ciudad_origen:          san(datos.ciudadOrigen || 'CHOLOMA'),
      ubicacion_entrega_gps:  san(datos.ubicacionDestino || ''),
      ciudad_destino:         san(datos.ciudadDestino || 'CHOLOMA'),
      descripcion_paquete:    san(datos.descripcionContenido || ''),
      fotos_referencia:       datos.fotosReferencia ? datos.fotosReferencia.split('||').filter(Boolean) : null,
      tarifa_envio:           parseFloat(datos.tarifa) || 0,
      total:                  parseFloat(datos.tarifa) || 0,
      monto_cobrar:           parseFloat(datos.montoCobrar) || 0,
      metodo_pago:            _mapMetodoPago(datos.metodoPago),
      distancia_km:           parseFloat(datos.distanciaKm) || 0,
      detalle_json: {
        tipo_servicio:    datos.tipoServicio,
        ...(datos.tiendaOrigen         && { tienda_origen:     san(datos.tiendaOrigen) }),
        ...(datos.tiendaDestino        && { tienda_destino:    san(datos.tiendaDestino) }),
        ...(datos.nombreContacto       && { nombre_contacto:   san(datos.nombreContacto) }),
        ...(datos.telefonoContacto     && { telefono_contacto: san(datos.telefonoContacto) }),
        ...(datos.nombreComercioCompra && { comercio_compra:   san(datos.nombreComercioCompra) }),
        ...(datos.listaProductos       && { lista_productos:   san(datos.listaProductos) }),
        ...(datos.presupuesto          && { presupuesto:       parseFloat(datos.presupuesto) }),
        ...(datos.comision             && { comision:          parseFloat(datos.comision) })
      }
    };
    const { data, error } = await getClient()
      .from('pedidos').insert(pedido).select('id, no_orden').single();
    if (error) throw new Error('Error registrando solicitud: ' + error.message);
    return { success: true, noOrden: data.no_orden, id: data.id };
  }

  // ══════════════════════════════════════════════════════════
  // 4. GESTIÓN DE USUARIOS (solo dueño, vía Edge Function)
  // ══════════════════════════════════════════════════════════

  async function listarUsuarios(duenoCelular) {
    return callEdge('gestionar-usuarios', { action: 'listar', duenoCelular });
  }

  async function agregarUsuario(duenoCelular, nombre, celular) {
    if (!nombre || nombre.length < 2) throw new Error('Nombre requerido');
    return callEdge('gestionar-usuarios', { action: 'agregar', duenoCelular, nombre: san(nombre), celular });
  }

  async function eliminarUsuario(duenoCelular, usuarioId) {
    return callEdge('gestionar-usuarios', { action: 'eliminar', duenoCelular, usuarioId });
  }

  // ── Mapeos de enums ────────────────────────────────────────
  function _mapMetodoPago(v) {
    const map = { 'EFECTIVO': 'EFECTIVO', 'TRANSFERENCIA': 'TRANSFERENCIA', 'TARJETA': 'TARJETA', 'SALDO': 'SALDO_APP' };
    return map[String(v ?? '').toUpperCase()] || 'EFECTIVO';
  }
  function _mapQuienPaga(v) {
    const map = { 'REMITENTE': 'REMITENTE', 'DESTINATARIO': 'DESTINATARIO', 'COMERCIO': 'COMERCIO' };
    return map[String(v ?? '').toUpperCase()] || 'DESTINATARIO';
  }

  // ── API pública ────────────────────────────────────────────
  window.SomarAPI = {
    init: () => getClient(),
    enviarOTP,
    verificarOTP,
    registrarComercio,
    obtenerUbicacionesFrecuentes,
    guardarUbicacionFrecuente,
    obtenerPedidosComercio,
    suscribirPedidos,
    desuscribirPedidos,
    registrarEnvio,
    registrarSolicitudEntrega,
    listarUsuarios,
    agregarUsuario,
    eliminarUsuario,
    get client() { return getClient(); }
  };

})();
