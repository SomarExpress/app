// ========================================
// CONFIGURACIÓN SEGURA - COMERCIOS PANEL
// ========================================

// Este archivo debe estar en un directorio separado y NO en el repositorio público

// PASO 1: Ofuscar las URLs sensibles
const CONFIG = {
  // URL del backend ofuscada (usar Base64 como mínimo)
  apiEndpoint: atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4em1uQ01TR0pPbzVjamZCNDI0dlEtNmpOUlJCUUtXUzN3VkpsdzhVLWYzZV83dXRjWENnV2YzekRyRXRFRktQaEwtZy9leGVj'),
  
  // Cloudinary ofuscado
  cloudinary: {
    cloudName: atob('ZHJrYXhzeml1'),
    uploadPreset: atob('VFJBTVNGRVJFQ0lBUw==')
  },
  
  // Modo debug (cambiar a false en producción)
  debug: false,
  
  // Dominio permitido (validación básica)
  allowedDomain: window.location.hostname
};

// PASO 2: Función para logs seguros
window.secureLog = function(...args) {
  if (CONFIG.debug) {
    console.log(...args);
  }
};

// PASO 3: Funciones de seguridad adicionales
const Security = {
  // Validar origen de la app
  validateOrigin: function() {
    const validDomains = ['localhost', '127.0.0.1', 'tudominio.com']; // Actualizar con tu dominio
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
  
  // Guardar sesión encriptada
  saveSecureSession: function(key, data) {
    const encrypted = this.encryptData(data);
    if (encrypted) {
      localStorage.setItem(key, encrypted);
    }
  },
  
  // Recuperar sesión encriptada
  getSecureSession: function(key) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return this.decryptData(encrypted);
  }
};

// Exportar configuración
window.APP_CONFIG = CONFIG;
window.APP_SECURITY = Security;
