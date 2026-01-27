// ========================================
// CONFIGURACIÃ“N SEGURA - COMERCIOS PANEL
// ========================================

// Este archivo debe estar en un directorio separado y NO en el repositorio pÃºblico

// PASO 1: Ofuscar las URLs sensibles
const CONFIG = {
  // URL del backend ofuscada (usar Base64 como mÃ­nimo)
  apiEndpoint: atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4OU0wbE5jVzZxREE1WDBaa0NvZzVLYXpoblRDSkc0MmxscmlIdVcwSXQ1YTZRVzBpS3dXMzNlTjRqSjVkNGVaQkVkUS9leGVj'),
  
  // Cloudinary ofuscado
  cloudinary: {
    cloudName: atob('ZHJrYXhzeml1'),
    uploadPreset: atob('c29tYXJfcmlkZXJz')  // somar_riders
  },
  
  // Modo debug (cambiar a false en producciÃ³n)
  debug: true,
  
  // Dominio permitido (validaciÃ³n bÃ¡sica)
  allowedDomain: window.location.hostname
};

// PASO 2: FunciÃ³n para logs seguros
window.secureLog = function(...args) {
  if (CONFIG.debug) {
    console.log(...args);
  }
};

// PASO 3: Funciones de seguridad adicionales
const Security = {
  // Validar origen de la app
  validateOrigin: function() {
    const validDomains = [
      'localhost', 
      '127.0.0.1', 
      'somarexpress.github.io',  // Tu dominio de GitHub Pages
      'github.io',                // Cualquier subdominio de GitHub Pages
      'vercel.app',               // Por si usas Vercel
      'pages.dev'                 // Por si usas Cloudflare Pages
    ];
    return validDomains.some(domain => window.location.hostname.includes(domain));
  },
  
  // Encriptar datos para localStorage (simple)
  encryptData: function(data) {
    try {
      return btoa(JSON.stringify(data));
    } catch (e) {
      return null;
    }
  },
  
  // Desencriptar datos de localStorage
  decryptData: function(data) {
    try {
      return JSON.parse(atob(data));
    } catch (e) {
      return null;
    }
  },
  
  // Guardar sesiÃ³n encriptada
  saveSecureSession: function(key, data) {
    const encrypted = this.encryptData(data);
    if (encrypted) {
      localStorage.setItem(key, encrypted);
    }
  },
  
  // Recuperar sesiÃ³n encriptada
  getSecureSession: function(key) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return this.decryptData(encrypted);
  }
};

// Exportar configuraciÃ³n
window.APP_CONFIG = CONFIG;
window.APP_SECURITY = Security;

// Confirmar carga exitosa
console.log('âœ… ConfiguraciÃ³n de seguridad cargada correctamente');
console.log('ðŸŒ Dominio actual:', window.location.hostname);
console.log('ðŸ”’ Origen vÃ¡lido:', Security.validateOrigin());