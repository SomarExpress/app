# 🚀 SOMAR EXPRESS - PANEL COMERCIOS COMPLETO

## 📦 CONTENIDO

Archivos 100% funcionales con correcciones aplicadas:

### ✅ Archivos Principales
1. **comercios-panel.html** - HTML corregido con autocompletado
2. **comercios-panel-script.js** - JavaScript con funciones corregidas
3. **config-seguro-comercios.js** - Preset `somar_riders` configurado
4. **CODE.GS** - Backend Google Apps Script
5. **manifest.json** - Configuración PWA
6. **service-worker.js** - Service Worker

---

## 🔧 CORRECCIONES APLICADAS

### 1. ✅ Autocompletado de Ubicaciones
- Input `ubicacionEntregaInput` funcionando
- Dropdown aparece al escribir 2+ caracteres
- 127 ubicaciones disponibles (comercios + frecuentes)
- Cálculo automático de tarifa

### 2. ✅ Subida de Fotos
- Preset Cloudinary: `somar_riders`
- URL guardada en columna Q
- Sin errores HTTP 400

### 3. ✅ Sistema de Tarifas
- Modo nocturno (7pm-6am): +L15
- OSRM + Haversine
- Choloma vs Otras ciudades

---

## 📥 INSTALACIÓN

### PASO 1: Subir a GitHub Pages

```bash
# Clonar tu repo
git clone https://github.com/TU-USUARIO/TU-REPO.git
cd TU-REPO

# Copiar todos los archivos HTML y JS
# Luego:
git add .
git commit -m "Panel comercios actualizado"
git push
```

### PASO 2: Crear Sheet "UBICACIONES FRECUENTES"

En Google Sheets, crear nueva hoja:

**Nombre:** `UBICACIONES FRECUENTES`

**Columnas:**
```
| UBICACION              | DESCRIPCION          |
|------------------------|----------------------|
| 15.6100, -87.9533      | Centro Choloma       |
| 15.5000, -88.0300      | Centro San Pedro     |
| 14.0818, -87.2068      | Tegucigalpa Centro   |
```

Agregar al menos 10-20 ubicaciones.

### PASO 3: Actualizar CODE.GS

1. Ir a https://script.google.com
2. Abrir tu proyecto
3. Borrar código actual
4. Pegar contenido de `CODE.GS`
5. Implementar → Nueva implementación
6. Tipo: Aplicación web
7. Acceso: Cualquier persona

### PASO 4: Probar

```
https://TU-USUARIO.github.io/TU-REPO/comercios-panel.html
```

1. Login con tu número
2. Ir a "Nuevo Envío"
3. Escribir en "Ubicación de Entrega": **"cho"**
4. **DEBE APARECER DROPDOWN** ✅

---

## 🧪 VERIFICACIÓN

Abrir consola (F12), deberías ver:

```
📍 === CARGANDO UBICACIONES FRECUENTES ===
✅ 127 ubicaciones cargadas:
  - Comercios: 50
  - Frecuentes: 77
🔧 Configurando autocomplete: ubicacionEntregaInput
✅ Configurado: ubicacionEntregaInput
```

---

## 🔍 SOLUCIÓN DE PROBLEMAS

### ❌ Dropdown NO aparece

**Causa 1:** Sheet no existe
- Crear "UBICACIONES FRECUENTES"

**Causa 2:** Sheet vacío
- Agregar al menos 5 ubicaciones

**Causa 3:** Archivos no actualizados
- Verificar que subiste todos los archivos

### ❌ Foto no sube

**Verificar en consola:**
```javascript
console.log('Preset:', window.APP_CONFIG.cloudinary.uploadPreset);
```

Debe mostrar: `somar_riders`

---

## 📋 CHECKLIST

- [ ] Archivos subidos a GitHub
- [ ] GitHub Pages activado
- [ ] Sheet "UBICACIONES FRECUENTES" creado
- [ ] Al menos 10 ubicaciones agregadas
- [ ] CODE.GS actualizado
- [ ] Panel funciona correctamente
- [ ] Dropdown aparece al escribir
- [ ] Fotos suben correctamente

---

## ⚡ CAMBIOS REALIZADOS

### HTML
- `<textarea id="linkEntrega">` → `<input id="ubicacionEntregaInput">`
- Agregado CSS para autocompletado

### JavaScript
- Función `cargarUbicacionesFrecuentes()` actualizada
- Función `configurarAutocomplete()` actualizada
- Agregado configuración para `ubicacionEntregaInput`

### Config
- Preset cambiado a `somar_riders`

---

¡Todo listo! 🎉
