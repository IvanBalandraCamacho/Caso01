# Migración a React 18 para Habilitar CopilotKit

## 📋 Resumen
CopilotKit tiene problemas de compatibilidad con React 19. Esta guía detalla cómo hacer downgrade a React 18 para habilitar CopilotKit en el proyecto.

## ⚠️ Análisis de Riesgo
- **Complejidad**: BAJA
- **Riesgo de rotura**: MÍNIMO
- **Tiempo estimado**: 10-15 minutos
- **Reversible**: SÍ (con git reset)

## 🔍 Estado Actual

### Dependencias Actuales
```json
"react": "19.2.0",
"react-dom": "19.2.0",
"@types/react": "^19",
"@types/react-dom": "^19",
"next": "16.0.7"
```

### Dependencias Objetivo
```json
"react": "^18.3.1",
"react-dom": "^18.3.1",
"@types/react": "^18",
"@types/react-dom": "^18",
"next": "15.1.0"  // Opcional, puede quedarse 16.0.7
```

## 📝 Pasos de Migración

### 1. Hacer Backup (Recomendado)
```bash
# Crear branch de backup
git checkout -b backup-react19
git push origin backup-react19

# Volver a main/master
git checkout main
```

### 2. Actualizar package.json

Editar `front-v2/package.json`:

```json
{
  "dependencies": {
    "@copilotkit/react-core": "^1.3.15",
    "@copilotkit/react-ui": "^1.3.15",
    "@copilotkit/runtime": "^1.3.15",
    "openai": "^4.67.0",
    "@ant-design/cssinjs": "^1.21.1",
    // ... otras dependencias ...
    "next": "15.1.0",  // Cambiar de 16.0.7
    "react": "^18.3.1",  // Cambiar de 19.2.0
    "react-dom": "^18.3.1",  // Cambiar de 19.2.0
    // ... resto de dependencias ...
  },
  "devDependencies": {
    "@types/react": "^18",  // Cambiar de ^19
    "@types/react-dom": "^18",  // Cambiar de ^19
    "typescript": "^5.1.0"  // Actualizar de ^5
  }
}
```

### 3. Agregar Dependencia Shiki

Agregar en `dependencies`:
```json
"shiki": "^1.0.0"
```

### 4. Verificar Compatibilidad de Otras Dependencias

Estas dependencias tienen peer dependencies con React, verificar compatibilidad:

```bash
# Dentro del contenedor o localmente
docker exec ia_frontend_v2 pnpm list react react-dom
```

**Dependencias a verificar:**
- `antd` - Compatible con React 18 ✅
- `@radix-ui/*` - Compatible con React 18 ✅
- `@tanstack/react-query` - Compatible con React 18 ✅
- `react-hook-form` - Compatible con React 18 ✅

### 5. Eliminar Cache y Reconstruir

```bash
# Detener contenedores
docker-compose down

# Eliminar contenedor y volúmenes del frontend
docker rm -f ia_frontend_v2
docker volume rm caso01_node_modules 2>$null  # Si existe

# Reconstruir sin cache
docker-compose build --no-cache frontend

# Levantar servicios
docker-compose up -d
```

### 6. Habilitar CopilotKit

Editar `front-v2/.env.local`:
```env
NEXT_PUBLIC_COPILOT_ENABLED=true
```

Editar `docker-compose.yml` - sección frontend:
```yaml
environment:
  - NEXT_PUBLIC_COPILOT_ENABLED=true
```

### 7. Reiniciar Frontend

```bash
docker-compose restart frontend

# Verificar logs
docker logs ia_frontend_v2 --tail 50 -f
```

## 🧪 Verificación Post-Migración

### 1. Verificar Versiones Instaladas
```bash
docker exec ia_frontend_v2 npm list react react-dom next
```

Resultado esperado:
```
├── react@18.3.1
├── react-dom@18.3.1
└── next@15.1.0
```

### 2. Verificar que la App Carga
```bash
# Probar el endpoint de salud
curl http://localhost:3000

# Debería responder con status 200
```

### 3. Verificar CopilotKit
```bash
# Probar el endpoint de CopilotKit
curl http://localhost:3000/api/copilotkit -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola"}]}'
```

### 4. Probar en el Navegador
1. Abrir `http://localhost:3000`
2. Iniciar sesión
3. Verificar que NO hay errores en la consola del navegador (F12)
4. Verificar que CopilotKit se inicializa correctamente

## 🔧 Solución de Problemas

### Error: "Module not found: Can't resolve '@copilotkit/runtime'"
**Solución**: Las dependencias no se instalaron correctamente
```bash
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Error: "useAgent: Agent 'default' not found"
**Solución**: El runtime no está respondiendo correctamente
```bash
# Verificar que OPENAI_API_KEY está configurada
docker exec ia_frontend_v2 env | grep OPENAI

# Verificar logs del endpoint
docker logs ia_frontend_v2 --tail 100 | grep copilotkit
```

### Error: Warnings de "shiki can't be external"
**Solución**: Agregar shiki a las dependencias
```bash
docker exec ia_frontend_v2 pnpm add shiki
docker-compose restart frontend
```

### La página no carga / Timeout
**Solución**: Deshabilitar CopilotKit temporalmente
```env
# En .env.local y docker-compose.yml
NEXT_PUBLIC_COPILOT_ENABLED=false
```

## 📌 Cambios en el Código

### No se requieren cambios en el código
Los siguientes elementos son compatibles con React 18:
- ✅ `suppressHydrationWarning`
- ✅ Server Components (manejado por Next.js)
- ✅ `use client` directives
- ✅ Hooks personalizados
- ✅ Context API

### Archivos que NO necesitan modificación
- `app/**/*.tsx` - Server y Client Components
- `components/**/*.tsx` - Todos los componentes
- `context/**/*.tsx` - Context providers
- `hooks/**/*.tsx` - Custom hooks
- `providers/**/*.tsx` - Providers wrapper

## 🔄 Rollback (Si algo sale mal)

```bash
# Opción 1: Git reset
git reset --hard HEAD
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d

# Opción 2: Volver al branch de backup
git checkout backup-react19
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

## ✅ Checklist de Migración

- [ ] Backup creado (git branch)
- [ ] package.json actualizado (React 18)
- [ ] package.json actualizado (Next.js 15.1.0)
- [ ] package.json actualizado (TypeScript 5.1+)
- [ ] shiki agregado a dependencias
- [ ] Contenedores detenidos
- [ ] Cache limpiado
- [ ] Frontend reconstruido sin cache
- [ ] Contenedores iniciados
- [ ] Verificación de versiones exitosa
- [ ] App carga correctamente
- [ ] CopilotKit habilitado en .env.local
- [ ] CopilotKit habilitado en docker-compose.yml
- [ ] Frontend reiniciado
- [ ] Endpoint /api/copilotkit responde
- [ ] Prueba en navegador exitosa
- [ ] Sin errores en consola del navegador

## 📚 Referencias

- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 18 vs 19 Differences](https://react.dev/blog/2024/12/05/react-19)

## 🆘 Soporte

Si encuentras problemas:
1. Revisar logs: `docker logs ia_frontend_v2 --tail 100`
2. Verificar versiones: `docker exec ia_frontend_v2 npm list react`
3. Limpiar todo y reconstruir
4. Si persiste, hacer rollback y reportar el error

---

**Última actualización**: 2 de enero de 2026
**Estado**: Pendiente de ejecución
**Impacto estimado**: Bajo
