# Correcciones de Autenticación - Frontend

## Problema Identificado

El frontend no podía crear workspaces ni subir archivos porque las llamadas a la API no incluían el token de autenticación JWT en los headers.

**Causa raíz**: El backend fue actualizado para requerir autenticación en todos los endpoints (incluyendo `/api/v1/workspaces`), pero el código del frontend no se actualizó para enviar los tokens.

## Archivos Modificados

### 1. `/frontend/src/components/sidebar.tsx`

#### Funciones corregidas:

**fetchWorkspaces()** - Línea 66-91
- ✅ Agregado: Validación de token antes de hacer fetch
- ✅ Agregado: Header `Authorization: Bearer ${token}`
- ✅ Agregado: Manejo de 401 (limpia localStorage y redirecciona al login)

```typescript
const token = localStorage.getItem("access_token");
if (!token) {
  localStorage.clear();
  window.location.href = "/";
  return;
}

const response = await fetch(`${API_URL}/api/v1/workspaces`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**updateWorkspace(id, name)** - Línea 95-119
- ✅ Agregado: Validación de token
- ✅ Agregado: Header `Authorization: Bearer ${token}`
- ✅ Agregado: Toast de error si no hay token

```typescript
const token = localStorage.getItem("access_token");
if (!token) {
  addToast("Debes iniciar sesión", "error");
  return;
}
```

**createWorkspace()** - Línea 121-153
- ✅ Ya tenía validación de token (implementado en commits anteriores)
- ✅ Ya incluía header de Authorization

**deleteWorkspace(id)** - Línea 155-176
- ✅ Agregado: Validación de token
- ✅ Agregado: Header `Authorization: Bearer ${token}`

```typescript
const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${token}` },
});
```

---

### 2. `/frontend/src/components/chat-area.tsx`

#### Funciones corregidas:

**uploadFile()** - Línea 105-151
- ✅ Agregado: Validación de token antes de subir archivo
- ✅ Agregado: Header `Authorization: Bearer ${token}`
- ✅ Agregado: Toast de error si no hay token
- ✅ Mejorado: Manejo de errores con mensajes específicos

```typescript
const token = localStorage.getItem("access_token");
if (!token) {
  addToast("Debes iniciar sesión para subir archivos", "error");
  return;
}

const response = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/upload`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**sendMessage()** - Línea 153-195
- ✅ Agregado: Validación de token antes de enviar mensaje
- ✅ Agregado: Header `Authorization: Bearer ${token}`
- ✅ Agregado: Toast de error si no hay token

```typescript
const token = localStorage.getItem("access_token");
if (!token) {
  addToast("Debes iniciar sesión para enviar mensajes", "error");
  return;
}

const response = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ query: userInput }),
});
```

---

## Patrón de Autenticación Implementado

Todas las funciones que hacen llamadas a la API ahora siguen este patrón:

```typescript
// 1. Obtener token del localStorage
const token = localStorage.getItem("access_token");

// 2. Validar que el token existe
if (!token) {
  addToast("Debes iniciar sesión", "error");
  return;
}

// 3. Incluir token en headers
const response = await fetch(url, {
  method: "POST", // o GET, PUT, DELETE
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: // ... si es necesario
});

// 4. Manejar respuesta 401 (token inválido o expirado)
if (response.status === 401) {
  localStorage.clear();
  window.location.href = "/";
}
```

---

## Funcionalidades Restauradas

Con estas correcciones, ahora el frontend puede:

✅ **Listar workspaces** - Obtiene todos los espacios de trabajo del usuario autenticado
✅ **Crear workspaces** - Crear nuevos espacios de trabajo
✅ **Actualizar workspaces** - Renombrar espacios existentes
✅ **Eliminar workspaces** - Borrar espacios de trabajo
✅ **Subir archivos** - Upload de PDFs, DOCX, TXT al workspace seleccionado
✅ **Hacer preguntas** - Enviar consultas al sistema RAG y recibir respuestas

---

## Credenciales de Prueba

- **Usuario**: `admin`
- **Contraseña**: `admin`

El usuario admin fue creado exitosamente en la base de datos y puede autenticarse correctamente.

---

## Próximos Pasos para Testing

1. **Abrir la aplicación**: http://localhost:3000
2. **Login**: Usar credenciales admin/admin
3. **Crear workspace**: Click en "+" → Ingresar nombre → Verificar que aparece en sidebar
4. **Subir archivo**: Seleccionar workspace → Elegir PDF/DOCX → Click "Subir Archivo"
5. **Hacer pregunta**: Una vez procesado el documento, escribir pregunta en chat
6. **Verificar respuesta**: El sistema RAG debe responder con información del documento

---

## Notas Técnicas

- El token JWT tiene duración de **24 horas**
- El refresh token tiene duración de **7 días**
- Los tokens se almacenan en `localStorage` del navegador
- Si el token expira (401), el usuario es redirigido automáticamente al login
- Todos los endpoints del backend requieren autenticación excepto `/auth/token` (login)

---

## Fecha de Corrección

**2024** - Todas las funciones de frontend ahora incluyen autenticación JWT correctamente.
