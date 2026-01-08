# 🚀 CopilotKit - Guía Rápida de Resolución del Error

## ⚠️ Error Resuelto

```
useAgent: Agent 'default' not found after runtime sync
```

## ✅ Solución Implementada

Se han realizado los siguientes cambios para resolver el problema:

### 1. Backend - Endpoint `/info` Corregido

**Archivo**: `backend/api/routes/copilot.py`

✅ El endpoint `/info` ahora devuelve la estructura correcta:

```python
@router.get("/info")
async def copilot_info():
    return {
        "runtime": "fastapi-copilotkit",
        "version": "1.0.0",
        "agents": [
            {
                "name": "default",
                "description": "Asistente de Análisis RFP (TIVIT)",
                "model": "gemini-2.0-flash-exp"
            }
        ],
        "actions": []
    }
```

### 2. **API Proxy en Next.js** (SOLUCIÓN CLAVE)

**Archivo creado**: `front-v2/app/api/copilot/[[...slug]]/route.ts`

✅ Se creó un proxy en Next.js para manejar las llamadas servidor/cliente:

```typescript
// URL del backend desde dentro de Docker
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000/api/v1/copilot';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const params = await context.params;
  const slug = params.slug || [];
  const path = slug.join('/');
  const url = `${BACKEND_URL}/${path}${request.nextUrl.search}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

**¿Por qué se necesita el proxy?**
- CopilotKit hace llamadas desde el servidor Next.js (SSR)
- En Docker, `localhost:8000` no funciona desde un contenedor hacia otro
- El proxy usa el nombre del servicio Docker (`backend:8000`) internamente
- Desde el navegador, usa la ruta relativa `/api/copilot`

### 3. Frontend - CopilotProvider Actualizado

**Archivo**: `front-v2/providers/CopilotProvider.tsx`

✅ Se usa la ruta relativa del proxy:

```tsx
export function CopilotProvider({ children }: CopilotProviderProps) {
  // Usar el proxy interno de Next.js
  const runtimeUrl = "/api/copilot";

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      agent="default"
      showDevConsole={process.env.NODE_ENV === "development"}
    >
      {children}
    </CopilotKit>
  );
}
```

### 4. Docker Compose - Variable de Entorno

**Archivo**: `docker-compose.yml`

✅ Se agregó la variable de entorno para el proxy:

```yaml
frontend:
  environment:
    - NODE_ENV=development
    - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
    - BACKEND_INTERNAL_URL=http://backend:8000/api/v1/copilot
```

---

## 🧪 Verificación

### 1. Verificar el Backend

```bash
# Reiniciar el backend
docker-compose restart backend

# O si estás en desarrollo local:
cd backend
uvicorn main:app --reload --port 8000
```

### 2. Probar el Endpoint `/info`

```bash
curl http://localhost:8000/api/v1/copilot/info
```

**Respuesta esperada**:
```json
{
  "runtime": "fastapi-copilotkit",
  "version": "1.0.0",
  "agents": [
    {
      "name": "default",
      "description": "Asistente de Análisis RFP (TIVIT)",
      "model": "gemini-2.0-flash-exp"
    }
  ],
  "actions": []
}
```

### 3. Verificar el Frontend

```bash
cd front-v2
pnpm dev
```

Abre http://localhost:3000 y verifica que no hay errores en la consola.

---

## 🔍 Checklist de Diagnóstico

Si el error persiste, verifica:

- [ ] El backend está corriendo en `http://localhost:8000`
- [ ] El endpoint `/api/v1/copilot/info` responde correctamente
- [ ] La variable de entorno `NEXT_PUBLIC_API_BASE_URL` está configurada
- [ ] No hay errores de CORS en la consola del navegador
- [ ] El router de copilot está registrado en `main.py`
- [ ] Las dependencias de CopilotKit están instaladas en el frontend

---

## 📦 Dependencias Requeridas

### Frontend
```bash
cd front-v2
pnpm add @copilotkit/react-core @copilotkit/react-ui @copilotkit/react-textarea
```

### Backend
```bash
cd backend
pip install copilotkit  # Opcional, solo si usas funciones específicas
```

---

## 🎯 Próximos Pasos

Una vez que el error esté resuelto, puedes continuar con:

1. ✅ Probar el chat básico del copiloto
2. ⬜ Implementar acciones personalizadas
3. ⬜ Agregar contexto de documentos (RAG)
4. ⬜ Crear la página de análisis rápido

Consulta [COPILOTKIT_IMPLEMENTATION_ROADMAP.md](./COPILOTKIT_IMPLEMENTATION_ROADMAP.md) para la guía completa de implementación.

---

## 💡 Notas Importantes

- **Desarrollo vs Producción**: `showDevConsole` solo se activa en desarrollo
- **Agente por defecto**: Siempre debe especificarse `agent="default"` en el provider
- **Streaming**: El backend usa Server-Sent Events (SSE) para respuestas en tiempo real
- **RAG**: La integración con el servicio RAG existente permite respuestas basadas en documentos

---

*Última actualización: Enero 2, 2026*
