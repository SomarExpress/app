// ========================================
// CONFIGURACIÓN SEGURA - COMERCIOS PANEL
// Somar Express v2.0 — Supabase Edition
// ========================================

(function () {
  'use strict';

  // ── Credenciales Supabase (anon key es segura en el frontend,
  //    la protección real viene de las políticas RLS en la BD) ──
  // Ofuscadas con atob para evitar scrapers automáticos
  const _sb = {
    u: atob('aHR0cHM6Ly9qanJtem91aWdjbWV6dGt5YnJ2cC5zdXBhYmFzZS5jbw=='),
    k: atob('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SWlwcWFuSm1lbTkxYVdkallXMWxlblJyZVdKeWRuQWlMQ0p5YjJ4bElqb2lZVzV2YmlJc0ltbGhkQ0k2TVRjM01qa3pNVEUwT0N3aVpYQWlPakl3T0RnMU1EY3hORGg5LnROVUh4R1dNV2g3UTZ2NG1IMnk1Z094cGN6cEVKSHdOcXdIMlRlaEw2MUk=')
  };

  // Apps Script ya no se usa para OTP — todo pasa por Supabase Edge Functions

  // ── Cloudinary ──
  const _cl = {
    n: atob('ZHJrYXhzeml1'),
    p: atob('UEFRVUVURV9DT01FUkNJT1M=')
  };

  // ── Dominios permitidos ──
  const ALLOWED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'somarexpress.github.io',
    'github.io',
    'vercel.app',
    'pages.dev'
  ];

  // ── Seguridad ──
  const Security = {
    validateOrigin() {
      return ALLOWED_DOMAINS.some(d => window.location.hostname.includes(d));
    },
    _key: 'SomarX_2025',
    encryptData(data) {
      try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
      catch { return null; }
    },
    decryptData(data) {
      try { return JSON.parse(decodeURIComponent(escape(atob(data)))); }
      catch { return null; }
    },
    saveSecureSession(key, data) {
      const enc = this.encryptData(data);
      if (enc) sessionStorage.setItem(key, enc);   // sessionStorage > localStorage (expira al cerrar tab)
    },
    getSecureSession(key) {
      const enc = sessionStorage.getItem(key);
      if (!enc) return null;
      return this.decryptData(enc);
    },
    clearSession(key) {
      sessionStorage.removeItem(key);
    },
    // Sanitizar inputs antes de enviar a la BD
    sanitize(str) {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[<>]/g, '');
    },
    // Validar número de teléfono hondureño
    validatePhone(num) {
      const clean = num.replace(/\D/g, '');
      return clean.length >= 8 && clean.length <= 15;
    }
  };

  // ── Logs seguros (off en producción) ──
  const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  window.secureLog = function (...args) {
    if (DEBUG) console.log(...args);
  };

  // ── Exportar configuración ──
  window.APP_CONFIG = {
    supabase: { url: _sb.u, key: _sb.k },
    // whatsappEndpoint eliminado — OTP va por Edge Functions
    cloudinary: { cloudName: _cl.n, uploadPreset: _cl.p },
    debug: DEBUG
  };
  window.APP_SECURITY = Security;

  if (DEBUG) {
    console.log('✅ Config Somar Express cargada');
    console.log('🌐 Dominio:', window.location.hostname);
    console.log('🔒 Origen válido:', Security.validateOrigin());
  }
})();
