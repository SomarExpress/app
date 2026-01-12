# GUÍA DE IMPLEMENTACIÓN - SISTEMA DE TARIFAS EN CLIENTES.HTML

## 📋 Resumen de Funcionalidades

✅ Cálculo automático de tarifa de envío basado en distancia
✅ Detección de ciudades (Choloma, San Pedro Sula, Tegucigalpa, etc.)
✅ Tarifas diferenciadas: Choloma vs Otras Ciudades
✅ **MODO NOCTURNO** (7pm - 6am): +L.15 con mínimo L.75
✅ Tiempo de entrega: OSRM + 10min margen + 20min preparación
✅ Visualización detallada en checkout con badge nocturno
✅ Integración con WhatsApp incluyendo desglose completo

---

## 🎯 MODO NOCTURNO - Reglas Específicas

### Horario Activo
- **Inicio:** 7:00 PM (19:00)
- **Fin:** 5:59 AM (05:59)

### Cálculo de Recargo
```javascript
Ejemplo 1: Tarifa base L.50
  → L.50 + L.15 = L.65
  → Mínimo L.75 aplica
  → TARIFA FINAL: L.75

Ejemplo 2: Tarifa base L.75
  → L.75 + L.15 = L.90
  → No hay mínimo que aplicar
  → TARIFA FINAL: L.90

Ejemplo 3: Tarifa base L.120
  → L.120 + L.15 = L.135
  → No hay mínimo que aplicar
  → TARIFA FINAL: L.135
```

---

## 📦 ARCHIVOS ENTREGADOS

1. **clientes-tarifa-funciones.js**
   - Todas las funciones de cálculo de tarifa
   - Listo para insertar en clientes.html

2. **clientes-tarifa-html.html**
   - Fragmento HTML para la sección de tarifa en checkout
   - Incluye estados: calculando, calculada, error

3. **clientes-tarifa-integracion.js**
   - Guía detallada de modificaciones necesarias
   - Incluye todos los puntos de integración

4. **Este archivo (GUIA-IMPLEMENTACION.md)**
   - Instrucciones paso a paso
   - Lista de verificación

---

## 🔧 PASOS DE IMPLEMENTACIÓN

### PASO 1: Agregar Funciones de Tarifa

**Ubicación:** Después de `calcularDistanciasComercios()` (línea ~700)

**Acción:** Copiar TODO el contenido de `clientes-tarifa-funciones.js`

**Funciones agregadas:**
- `obtenerCiudad(lat, lon)`
- `calcularTarifaCholoma(km)`
- `calcularTarifaOtrasCiudades(km)`
- `esModoNocturno()`
- `aplicarRecargoNocturno(tarifaBase)`
- `calcularTarifaEnvio(comercioGPS, usuarioGPS)`
- `calcularTiempoEntrega(duracionOSRM)`

---

### PASO 2: Agregar Variable Global

**Ubicación:** Después de `appData` (línea ~560)

```javascript
let tarifaEnvioActual = {
  monto: 0,
  ciudadOrigen: '',
  ciudadDestino: '',
  distancia: 0,
  tiempo: 0,
  esModoNocturno: false
};
```

---

### PASO 3: Modificar Cálculo de Duración

**Ubicación 1:** En `calcularDistanciasComercios()` (línea ~667)

**ANTES:**
```javascript
const duracionMinutos = Math.round(distanciaKm * 3);
```

**DESPUÉS:**
```javascript
const duracionMinutosBase = Math.round(distanciaKm * 3);
const duracionMinutos = calcularTiempoEntrega(duracionMinutosBase);
```

**Ubicación 2:** En `calcularDistanciaCarretera()` (línea ~621)

**ANTES:**
```javascript
const duracionMinutos = Math.round(data.routes[0].duration / 60);
```

**DESPUÉS:**
```javascript
const duracionMinutosOSRM = Math.round(data.routes[0].duration / 60);
const duracionMinutos = calcularTiempoEntrega(duracionMinutosOSRM);
```

---

### PASO 4: Agregar Funciones de Checkout

**Ubicación:** Después de las funciones de tarifa

**Acción:** Copiar las funciones desde `clientes-tarifa-integracion.js`:
- `calcularYMostrarTarifaEnCheckout()`
- `mostrarErrorTarifa()`
- Reemplazar `actualizarTotalesCheckout()`

---

### PASO 5: Modificar HTML del Checkout

**Ubicación:** ANTES de "Resumen Total" (línea ~483)

**Acción:** 
1. Buscar esta línea:
   ```html
   <!-- Resumen Total -->
   ```
2. INSERTAR ANTES todo el contenido de `clientes-tarifa-html.html`

---

### PASO 6: Modificar Evento checkoutBtn

**Ubicación:** Event listener de `checkoutBtn` (línea ~1510)

**ANTES:**
```javascript
document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (appData.cart.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }
  document.getElementById('cartModal').classList.add('hidden');
  document.getElementById('checkoutModal').classList.remove('hidden');
  
  actualizarTotalesCheckout();
```

**DESPUÉS:**
```javascript
document.getElementById('checkoutBtn').addEventListener('click', async () => {
  if (appData.cart.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }
  document.getElementById('cartModal').classList.add('hidden');
  document.getElementById('checkoutModal').classList.remove('hidden');
  
  // AGREGAR ESTA LÍNEA:
  await calcularYMostrarTarifaEnCheckout();
  
  actualizarTotalesCheckout();
```

---

### PASO 7: Modificar procesarPedido()

**Ubicación:** Función `procesarPedido()` (línea ~1670)

**Cambios necesarios:**

1. **Calcular subtotal y total correctamente:**
```javascript
const subtotalProductos = appData.cart.reduce((sum, item) => sum + (parseFloat(item.PRECIO || 0) * item.cantidad), 0);
const tarifaEnvio = tarifaEnvioActual.monto || 0;
const total = subtotalProductos + tarifaEnvio + propina;
```

2. **Agregar campos al objeto datos:**
```javascript
const datos = {
  // ... campos existentes
  subtotal: subtotalProductos,
  tarifaEnvio: tarifaEnvio,
  tarifaInfo: {
    origen: tarifaEnvioActual.ciudadOrigen,
    destino: tarifaEnvioActual.ciudadDestino,
    distancia: tarifaEnvioActual.distancia,
    tiempoEstimado: tarifaEnvioActual.tiempo,
    modoNocturno: tarifaEnvioActual.esModoNocturno
  },
  propina,
  total,
  // ... resto de campos
};
```

---

### PASO 8: Actualizar Mensaje WhatsApp

**Ubicación:** Función `finalizarPedido()` (línea ~1735)

**REEMPLAZAR la sección "💵 *DESGLOSE:*" con:**

```javascript
mensajeCompleto += `\n💰 *DESGLOSE:*\n` +
  `Subtotal Productos: L.${datos.subtotal.toFixed(2)}\n` +
  `Tarifa de Envío: L.${datos.tarifaEnvio.toFixed(2)}\n`;

if (datos.tarifaInfo.modoNocturno) {
  mensajeCompleto += `  🌙 (Incluye recargo nocturno)\n`;
}

mensajeCompleto += `  📏 ${datos.tarifaInfo.distancia}km • ⏱️ ${datos.tarifaInfo.tiempoEstimado}min estimado\n`;

if (datos.propina > 0) {
  mensajeCompleto += `Propina: L.${datos.propina.toFixed(2)}\n`;
}

mensajeCompleto += `*TOTAL: L.${datos.total.toFixed(2)}*\n\n`;
```

---

## ✅ LISTA DE VERIFICACIÓN

### Antes de Implementar
- [ ] Hacer backup de clientes.html
- [ ] Tener los 3 archivos descargados
- [ ] Editor de código abierto

### Durante Implementación
- [ ] Paso 1: Funciones de tarifa agregadas ✅
- [ ] Paso 2: Variable global tarifaEnvioActual ✅
- [ ] Paso 3: Cálculo de duración modificado (2 ubicaciones) ✅
- [ ] Paso 4: Funciones de checkout agregadas ✅
- [ ] Paso 5: HTML de tarifa insertado ✅
- [ ] Paso 6: Evento checkoutBtn modificado (async/await) ✅
- [ ] Paso 7: procesarPedido() actualizado ✅
- [ ] Paso 8: Mensaje WhatsApp actualizado ✅

### Después de Implementar
- [ ] Probar en modo diurno (antes de 7pm)
- [ ] Probar en modo nocturno (después de 7pm)
- [ ] Verificar cálculo Choloma (tarifa < L.135)
- [ ] Verificar cálculo otras ciudades (tarifa > L.125)
- [ ] Verificar tiempo = OSRM + 30min
- [ ] Verificar checkout muestra tarifa
- [ ] Verificar WhatsApp incluye desglose

---

## 🧪 CASOS DE PRUEBA

### Prueba 1: Envío en Choloma - Día
- Distancia: 2.5 km
- Hora: 2:00 PM
- **Esperado:** L.50 (sin recargo)

### Prueba 2: Envío en Choloma - Noche
- Distancia: 2.5 km
- Hora: 9:00 PM
- **Esperado:** L.75 (L.50 + L.15 = L.65 → mínimo L.75)

### Prueba 3: Envío en Choloma - Noche (tarifa alta)
- Distancia: 10 km
- Hora: 9:00 PM
- **Esperado:** L.120 (L.105 + L.15, no aplica mínimo)

### Prueba 4: Envío Otras Ciudades - Día
- Distancia: 8 km
- Hora: 3:00 PM
- **Esperado:** L.125

### Prueba 5: Envío Otras Ciudades - Noche
- Distancia: 8 km
- Hora: 8:00 PM
- **Esperado:** L.140 (L.125 + L.15)

### Prueba 6: Tiempo de Entrega
- Tiempo OSRM: 15 min
- **Esperado:** 45 min (15 + 10 margen + 20 preparación)

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: No se muestra la tarifa
**Solución:** Verificar que:
- La función `calcularYMostrarTarifaEnCheckout()` está siendo llamada
- El comercio tiene coordenadas GPS
- El usuario tiene ubicación GPS

### Problema: Tarifa siempre en 0
**Solución:** Abrir DevTools → Console y revisar mensajes
- Buscar errores de coordenadas
- Verificar que OSRM responda

### Problema: Modo nocturno no funciona
**Solución:** 
- Verificar la hora del sistema
- Revisar función `esModoNocturno()` en console
- Confirmar que se llama `aplicarRecargoNocturno()`

### Problema: Tiempo incorrecto
**Solución:**
- Verificar que se usa `calcularTiempoEntrega()` en ambas ubicaciones
- Confirmar margen de 10 + preparación de 20 = 30 min adicionales

---

## 📱 EJEMPLO DE MENSAJE WHATSAPP FINAL

```
🛵 *CONFIRMACIÓN DE PEDIDO SOMAR EXPRESS*

*Pedido #1705123456*
*Comercio:* Restaurante El Buen Sabor

📦 *TUS PRODUCTOS:*
• 2x Pizza Grande - L.280.00
• 1x Refresco 2L - L.35.00

💰 *DESGLOSE:*
Subtotal Productos: L.315.00
Tarifa de Envío: L.75.00
  🌙 (Incluye recargo nocturno)
  📏 3.2km • ⏱️ 45min estimado
Propina: L.20.00
*TOTAL: L.410.00*

💳 *MÉTODO DE PAGO:* Efectivo
Pagarás con: L.500.00
Tu cambio: L.90.00

📍 *DIRECCIÓN DE ENTREGA:*
Col. Las Flores, Calle Principal, Casa #123

✅ *Tu pedido ha sido recibido y será procesado en breve.*

_Gracias por usar Somar Express_ 🚀
```

---

## 📞 SOPORTE

Si encuentras problemas durante la implementación:
1. Revisar console.log en DevTools
2. Verificar cada paso de la lista de verificación
3. Comparar tu código con los fragmentos proporcionados

¡Éxito con la implementación! 🚀
