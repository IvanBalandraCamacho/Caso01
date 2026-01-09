# Migración a Gemini 3 Pro y Flash

**Fecha:** Enero 2026  
**Proyecto:** TIVIT AI Hub  
**Versión:** 2.0

---

## Resumen Ejecutivo

Se migró el sistema LLM de Gemini 2.0 Flash a **dos modelos especializados de Gemini 3**:

| Modelo | Uso | Thinking | Temperature | RAG |
|--------|-----|----------|-------------|-----|
| **Gemini 3 Pro** | SOLO quick-analysis y propuestas | HIGH | 0 | NO |
| **Gemini 3 Flash** | Todo lo demás | MEDIUM/OFF | 1.5 | SÍ |

---

## ⚠️ CONTROL DE COSTOS - REGLAS CRÍTICAS

### Cuándo se usa Gemini 3 Pro (COSTOSO)

**SOLO** en estos 3 casos:

1. **`/task/analyze`** (Quick Analysis)
   - Archivo: `proposals_service_impl.py`
   - Método: `_analyze_with_ia()` con `use_pro=True`

2. **Regeneración de propuesta comercial**
   - Archivo: `proposals_service_impl.py`
   - Método: `_analyze_with_ia_stream()` con `use_pro=True`

3. **Intent `GENERATE_PROPOSAL` en chat de workspace**
   - Archivo: `workspaces.py` → `intention_task.get_analyze_stream()`
   - Solo cuando el intent detector clasifica como `GENERATE_PROPOSAL`

### Cuándo se usa Gemini 3 Flash (ECONÓMICO)

**TODO lo demás**, incluyendo:
- Chat común
- CopilotKit
- Nombres de workspace (SIN thinking)
- Resúmenes de workspace (SIN thinking)
- Cualquier intent que NO sea `GENERATE_PROPOSAL`

---

## Arquitectura LLM

```
┌─────────────────────────────────────────────────────────────────┐
│                     SISTEMA LLM - Routing                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │   GEMINI 3 PRO          │    │   GEMINI 3 FLASH            │ │
│  │   gemini-3-pro-preview  │    │   gemini-3-flash-preview    │ │
│  ├─────────────────────────┤    ├─────────────────────────────┤ │
│  │ • Thinking: HIGH        │    │ • Thinking: MEDIUM (chat)   │ │
│  │ • Temperature: 0        │    │ • Thinking: OFF (nombres)   │ │
│  │ • NO usa RAG            │    │ • Temperature: 1.5          │ │
│  │ • Recibe docs crudos    │    │ • SÍ usa RAG                │ │
│  │ • SIN reintentos        │    │ • Con reintentos            │ │
│  ├─────────────────────────┤    ├─────────────────────────────┤ │
│  │ USO:                    │    │ USO:                        │ │
│  │ • quick-analysis        │    │ • Chat común                │ │
│  │ • Propuestas comerciales│    │ • CopilotKit                │ │
│  │ • Generación de docs    │    │ • Nombres workspace (no TH) │ │
│  │                         │    │ • Resúmenes (no TH)         │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
│                                                                  │
│  ⚠️ CONTROL DE COSTOS:                                          │
│  • Gemini 3 Pro NUNCA reintenta (una sola llamada)             │
│  • Cache solo para Flash                                        │
│  • Nombres/resúmenes SIN thinking (thinking_budget=0)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cambios Realizados

### 1. Backend - requirements.txt

```diff
- google-generativeai==0.8.3
+ google-genai>=1.0.0  # Nuevo SDK con soporte para Gemini 3 y Thinking Mode
```

**Motivo:** El nuevo SDK `google-genai` soporta thinking mode y los modelos Gemini 3.

---

### 2. Backend - core/config.py

Se agregaron nuevas variables de configuración:

```python
# Gemini 3 Pro - Para generación de documentos y propuestas comerciales
GEMINI_PRO_MODEL: str = "gemini-3-pro-preview"
GEMINI_PRO_THINKING_LEVEL: str = "HIGH"  # OFF, LOW, MEDIUM, HIGH
GEMINI_PRO_TEMPERATURE: float = 0.0
GEMINI_PRO_MAX_TOKENS: int = 65536

# Gemini 3 Flash - Para chat, CopilotKit, nombres de workspace, etc.
GEMINI_FLASH_MODEL: str = "gemini-3-flash-preview"
GEMINI_FLASH_THINKING_LEVEL: str = "MEDIUM"  # OFF, LOW, MEDIUM, HIGH
GEMINI_FLASH_TEMPERATURE: float = 1.5
GEMINI_FLASH_MAX_TOKENS: int = 16384
```

---

### 3. Backend - core/providers/gemini_pro_provider.py (NUEVO)

Provider especializado para Gemini 3 Pro:

```python
class Gemini3ProProvider(LLMProvider):
    """
    Provider para Gemini 3 Pro con thinking mode HIGH.
    
    Uso:
    - quick-analysis
    - Propuestas comerciales detectadas en chat
    - Análisis profundo de RFPs
    
    NO usa RAG - recibe documentos crudos directamente.
    """
```

**Métodos principales:**
- `generate_response()` - Genera respuesta con documento crudo
- `generate_response_stream()` - Streaming con documento crudo
- `generate_document()` - Genera documentos estructurados

---

### 4. Backend - core/providers/gemini_flash_provider.py (REESCRITO)

Provider especializado para Gemini 3 Flash:

```python
class Gemini3FlashProvider(LLMProvider):
    """
    Provider para Gemini 3 Flash.
    
    Uso:
    - Chat común (thinking MEDIUM)
    - CopilotKit (thinking MEDIUM)
    - Nombres workspace (thinking OFF - budget=0)
    - Resúmenes (thinking OFF - budget=0)
    """
```

**Optimizaciones de costo:**
- `generate_workspace_name()` → `thinking_budget=0`
- `generate_workspace_summary()` → `thinking_budget=0`

---

### 5. Backend - core/providers/__init__.py

Se actualizó para exportar los nuevos providers:

```python
from .gemini_pro_provider import Gemini3ProProvider
from .gemini_flash_provider import Gemini3FlashProvider, GeminiFlashProvider

__all__ = [
    "LLMProvider",
    "OpenAIProvider",
    "Gemini3ProProvider",
    "Gemini3FlashProvider",
    "GeminiFlashProvider",  # Alias para compatibilidad
]
```

---

### 6. Backend - core/llm_service.py (REESCRITO)

Servicio central con routing inteligente:

#### Detección automática de intención

```python
PROPOSAL_PATTERNS = [
    r"genera(?:r|me)?\s+(?:una\s+)?propuesta",
    r"crea(?:r|me)?\s+(?:una\s+)?propuesta",
    r"propuesta\s+comercial",
    r"propuesta\s+t[eé]cnica",
    r"quick[- ]?analysis",
    r"generar?\s+(?:un\s+)?(?:informe|reporte)",
    # ... más patrones
]
```

#### Routing de modelos

```python
def generate_response(...):
    # Determinar qué modelo usar
    use_pro = False
    if raw_document:
        use_pro = True  # Documento crudo → Pro
    elif detect_proposal_intent(query):
        use_pro = True  # Propuesta detectada → Pro
    
    # CONTROL DE COSTOS: Pro NUNCA reintenta
    if not validation['is_valid'] and not use_pro:
        # Solo Flash puede reintentar
        response = provider.generate_response(...)
```

#### Funciones de conveniencia

```python
def generate_document(document_type, raw_document, ...) -> str:
    """Usa Gemini 3 Pro (una sola llamada)"""
    
def generate_workspace_name(document_content) -> str:
    """Usa Gemini 3 Flash SIN thinking"""
    
def generate_workspace_summary(document_content) -> str:
    """Usa Gemini 3 Flash SIN thinking"""
```

---

### 7. Frontend - app/api/copilotkit/route.ts

Actualizado para usar Gemini 3 Flash:

```typescript
geminiAdapter = new GoogleGenerativeAIAdapter({
  model: process.env.GEMINI_FLASH_MODEL || "gemini-3-flash-preview",
});
```

---

### 8. Archivos .env.example

#### Backend (.env.example)

```env
# ===== GEMINI 3 PRO - Generación de Documentos y Propuestas =====
GEMINI_PRO_MODEL=gemini-3-pro-preview
GEMINI_PRO_THINKING_LEVEL=HIGH
GEMINI_PRO_TEMPERATURE=0.0
GEMINI_PRO_MAX_TOKENS=65536

# ===== GEMINI 3 FLASH - Chat, CopilotKit, Tareas Generales =====
GEMINI_FLASH_MODEL=gemini-3-flash-preview
GEMINI_FLASH_THINKING_LEVEL=MEDIUM
GEMINI_FLASH_TEMPERATURE=1.5
GEMINI_FLASH_MAX_TOKENS=16384
```

#### Frontend (.env.example)

```env
GEMINI_FLASH_MODEL=gemini-3-flash-preview
```

---

## Control de Costos

### Reglas implementadas

| Regla | Implementación |
|-------|----------------|
| **Pro solo una vez** | `if not use_pro:` antes de retry |
| **Sin thinking para nombres** | `thinking_budget=0` en `generate_workspace_name()` |
| **Sin thinking para resúmenes** | `thinking_budget=0` en `generate_workspace_summary()` |
| **Cache solo para Flash** | `if not use_pro:` antes de cache set |
| **Pro no usa RAG** | `context_chunks=None` cuando use_pro |

### Estimación de costos

| Operación | Modelo | Thinking | Tokens aprox | Frecuencia |
|-----------|--------|----------|--------------|------------|
| Quick Analysis | Pro | HIGH | ~30,000 | Baja |
| Propuesta comercial | Pro | HIGH | ~50,000 | Baja |
| Chat común | Flash | MEDIUM | ~2,000 | Alta |
| CopilotKit | Flash | MEDIUM | ~2,000 | Alta |
| Nombre workspace | Flash | OFF | ~100 | Media |
| Resumen workspace | Flash | OFF | ~150 | Media |

---

## Archivos Modificados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `backend/requirements.txt` | Modificado | SDK actualizado |
| `backend/core/config.py` | Modificado | Nuevas variables Gemini 3 |
| `backend/core/providers/__init__.py` | Modificado | Exports actualizados |
| `backend/core/providers/gemini_pro_provider.py` | **Nuevo** | Provider Pro |
| `backend/core/providers/gemini_flash_provider.py` | Reescrito | Provider Flash |
| `backend/core/llm_service.py` | Reescrito | Routing inteligente |
| `backend/.env.example` | Modificado | Variables Gemini 3 |
| `front-v2/app/api/copilotkit/route.ts` | Modificado | Modelo actualizado |
| `front-v2/.env.example` | Modificado | Variable GEMINI_FLASH_MODEL |

---

## Despliegue

### 1. Actualizar .env

```bash
# Backend
cp backend/.env.example backend/.env
# Agregar GOOGLE_API_KEY

# Frontend
cp front-v2/.env.example front-v2/.env.local
# Agregar GOOGLE_API_KEY
```

### 2. Reconstruir contenedores

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 3. Verificar logs

```bash
docker-compose logs -f backend
# Esperado:
# ✅ Gemini 3 Flash inicializado: gemini-3-flash-preview
# ✅ Gemini 3 Pro inicializado: gemini-3-pro-preview
```

---

## Rollback

Si es necesario volver a Gemini 2.0:

1. Revertir `requirements.txt`:
   ```
   google-generativeai==0.8.3
   ```

2. En `.env`:
   ```
   GEMINI_MODEL=gemini-2.0-flash-exp
   ```

3. Usar el `llm_service.py` anterior (disponible en git history)

---

## Testing

### Verificar routing Pro

```python
# Debe detectar intención de propuesta → usar Pro
query = "Genera una propuesta comercial basada en el RFP"
assert detect_proposal_intent(query) == True
```

### Verificar control de costos

```python
# Nombre de workspace debe usar thinking_budget=0
# Verificar en logs: no debe aparecer "thinking" para estas operaciones
```

### Verificar que Pro no reintenta

```python
# Verificar en logs cuando use Pro:
# "💰 Gemini Pro: aceptando respuesta sin retry (control de costos)"
```

---

## Soporte

Para problemas con la migración:

1. Verificar `GOOGLE_API_KEY` en ambos `.env`
2. Verificar que el nuevo SDK esté instalado: `pip show google-genai`
3. Revisar logs del backend para errores de inicialización
4. Verificar que los modelos `gemini-3-pro-preview` y `gemini-3-flash-preview` estén disponibles en tu cuenta de Google AI Studio

---

*Documentación generada automáticamente durante la migración.*

---

## Mejoras en Visibilidad de Propuestas

**Fecha:** Enero 2026 (Update)
**Objetivo:** Garantizar que el botón de descarga de propuesta comercial esté siempre accesible, incluso después de continuar la conversación.

### Problema Identificado
Anteriormente, cuando se generaba una propuesta y el usuario continuaba chateando, el widget de descarga se perdía o desaparecía debido a que el estado `proposalGenerated` se reiniciaba a `false` con cada nuevo mensaje (`handleSendMessage`).

### Solución Implementada

#### 1. Persistencia de Estado (`front-v2/app/workspace/[id]/chat/[chatId]/page.tsx`)
Se eliminó la línea que reiniciaba el estado al enviar un mensaje:
```diff
- setProposalGenerated(false)
+ // setProposalGenerated(false) // MANTENER VISIBLE
```
Esto asegura que una vez que se detecta o genera una propuesta en la conversación, la UI "sabe" que existe durante toda la sesión.

#### 2. Botón Persistente en Header
Se agregó un botón dedicado en el encabezado del chat (junto al botón de archivos) que aparece cuando `proposalGenerated` es `true`.
- **Icono:** `FileText` (rojo TIVIT)
- **Texto:** "Propuesta"
- **Acción:** `handleDownloadProposal` (misma lógica que el widget original)

```tsx
{proposalGenerated && (
  <Button
    type="text"
    icon={<FileText size={18} className="text-[#E31837]" />}
    loading={isDownloadingProposal}
    onClick={handleDownloadProposal}
    className="..."
    title="Descargar Propuesta Comercial"
  >
    <span className="hidden sm:inline">Propuesta</span>
  </Button>
)}
```

Esto garantiza que el usuario siempre pueda acceder a la propuesta generada sin importar cuánto scrollee o cuántos mensajes nuevos envíe.

