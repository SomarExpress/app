// ========================================
// CONFIGURACIÓN — SOMAR EXPRESS COMERCIOS
// ========================================
// La anon/public key de Supabase es segura en el frontend —
// es una clave JWT de solo lectura pública por diseño.
// La service_role key NUNCA va aquí, solo en Edge Functions.

window.APP_CONFIG = {
  // Google Apps Script (legacy)
  apiEndpoint: atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4OU0wbE5jVzZxREE1WDBaa0NvZzVLYXpoblRDSkc0MmxscmlIdVcwSXQ1YTZRVzBpS3dXMzNlTjRqSjVkNGVaQkVkUS9leGVj'),

  // ── Supabase ─────────────────────────────────────────────
  supabase: {
    url: 'https://jjrmzouigcmeztkybrvp.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqcm16b3VpZ2NtZXp0a3licnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzExNDgsImV4cCI6MjA4ODUwNzE0OH0.tNUHxGWMWh7Q6v4mH3y5gOxpczpEJHwNqwH2TehL61I'
  },

  // ── Cloudinary ───────────────────────────────────────────
  cloudinary: {
    cloudName:    'drkaxsziu',
    uploadPreset: 'PAQUETES_COMERCIOS'
  },

  debug: true,
  allowedDomain: window.location.hostname
};

// ── Logs seguros ─────────────────────────────────────────
window.secureLog = function(...args) {
  if (window.APP_CONFIG.debug) console.log(...args);
};

// ── Funciones de seguridad y sesiones ────────────────────
window.APP_SECURITY = {
  validateOrigin: function() {
    const valid = ['localhost', '127.0.0.1', 'somarexpress.github.io', 'github.io', 'vercel.app', 'pages.dev'];
    return valid.some(d => window.location.hostname.includes(d));
  },

  validatePhone: function(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 11;
  },

  sanitize: function(v) {
    return String(v ?? '').trim().replace(/<[^>]*>/g, '');
  },

  encryptData: function(data) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
    catch(e) { return null; }
  },

  decryptData: function(data) {
    try { return JSON.parse(decodeURIComponent(escape(atob(data)))); }
    catch(e) { return null; }
  },

  saveSecureSession: function(key, data) {
    const enc = this.encryptData(data);
    if (enc) localStorage.setItem(key, enc);
  },

  getSecureSession: function(key) {
    const enc = localStorage.getItem(key);
    if (!enc) return null;
    return this.decryptData(enc);
  },

  clearSession: function(key) {
    localStorage.removeItem(key);
  }
};

// ── Verificación en consola ───────────────────────────────
console.log('✅ Config cargada | Supabase URL:', window.APP_CONFIG.supabase.url);
console.log('🔑 Anon key OK:', window.APP_CONFIG.supabase.key.startsWith('eyJ'));
