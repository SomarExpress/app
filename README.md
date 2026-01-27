# 🚀 INSTALACIÓN PANEL COMERCIOS

## ⚠️ IMPORTANTE - ENCODING UTF-8

**TODOS los archivos deben mantener codificación UTF-8**

---

## 📦 ARCHIVOS INCLUIDOS

✅ comercios-panel.html (CORREGIDO)
✅ comercios-panel-script.js (NECESITA EDICIÓN MANUAL)
✅ config-seguro-comercios.js (CORREGIDO)
✅ CODE.GS
✅ manifest.json
✅ service-worker.js
✅ INSTRUCCIONES-JAVASCRIPT.txt (⚠️ LEER)

---

## 🔧 CAMBIOS APLICADOS

### HTML ✅ COMPLETO
- Textarea → Input con autocompletado
- CSS agregado

### Config ✅ COMPLETO
- Preset: `somar_riders`

### JavaScript ⚠️ REQUIERE EDICIÓN MANUAL
Ver archivo: `INSTRUCCIONES-JAVASCRIPT.txt`

---

## 📝 INSTRUCCIONES

### 1. Subir Archivos HTML, Config, Manifests
```
comercios-panel.html ✅
config-seguro-comercios.js ✅
manifest.json ✅
service-worker.js ✅
```

### 2. Editar JavaScript MANUALMENTE

Abrir `comercios-panel-script.js` en editor de código (VS Code, Sublime)

**PASO A:** Buscar: `async function cargarUbicacionesFrecuentes()`
- Copiar función nueva de `INSTRUCCIONES-JAVASCRIPT.txt`
- Reemplazar función completa

**PASO B:** Buscar: `function configurarAutocomplete(inputId, onSelect)`
- Copiar función nueva de `INSTRUCCIONES-JAVASCRIPT.txt`  
- Reemplazar función completa

**PASO C:** Buscar: `function configurarTodosLosAutocompletados()`
- Agregar código de configuración AL INICIO
- (Ver INSTRUCCIÓN 3 en archivo TXT)

### 3. Subir JavaScript editado

### 4. Actualizar CODE.GS
- Pegar en Google Apps Script
- Nueva implementación

### 5. Crear Sheet "UBICACIONES FRECUENTES"
```
| UBICACION         | DESCRIPCION    |
| 15.6100,-87.9533  | Centro Choloma |
```

---

## ✅ PROBAR

1. Abrir panel
2. Login
3. Escribir "cho" en ubicación
4. Debe aparecer dropdown

---

## 🚨 PROBLEMAS COMUNES

### Símbolos raros (ðŸª, ðŸ"¦)
= Problema de encoding
= Abrir archivo en editor que soporte UTF-8

### Dropdown no aparece
= JavaScript no editado correctamente
= Revisar INSTRUCCIONES-JAVASCRIPT.txt

---

¡Sigue las instrucciones paso a paso!
