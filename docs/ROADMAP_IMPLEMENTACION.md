# Hoja de Ruta - Implementacion de Cambios Solicitados

**Proyecto:** TIVIT AI Hub  
**Fecha:** Enero 2026  
**Version:** 1.0

---

## Resumen de Cambios

Este documento detalla la hoja de ruta para implementar las mejoras solicitadas al sistema TIVIT AI Hub, organizadas por prioridad y complejidad.

---

## Fase 1: Gestion de Estado de Propuestas (Alta Prioridad)

> **Problema a resolver:** Los BDM se demoran demasiado en enviar propuestas, perdiendo oportunidades ante la competencia.

### 1.1 Botones de Estado de Propuesta Comercial

**Ubicacion:** Debajo de "Objetivo de Proyecto" en Quick Analysis

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Crear componente `ProposalStatusButtons` | `front-v2/components/quick-analysis/` | Media |
| Agregar campos `proposal_sent` y `proposal_status` al modelo | `backend/models/workspace.py` | Baja |
| Crear migracion Alembic para nuevos campos | `backend/alembic/versions/` | Baja |
| Endpoint PUT para actualizar estado | `backend/api/routes/workspaces.py` | Baja |
| UI con estados: Pendiente, Enviado, Rechazado, Ganado, Perdido | Frontend | Media |

**Estados de Propuesta:**
```
PENDING -> SENT -> ACCEPTED | REJECTED | WON | LOST
```

### 1.2 Campo TVT (ID de Propuesta Comercial)

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Agregar campo `tvt_id` editable manualmente | `backend/models/workspace.py` | Baja |
| Input en UI para ingresar TVT | `front-v2/components/quick-analysis/` | Baja |
| Validacion de formato TVT | Backend + Frontend | Baja |

---

## Fase 2: Dashboard e Indicadores (Alta Prioridad)

### 2.1 Nuevos Indicadores por Tipo de RFP

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Agregar campo `rfp_type` al modelo Workspace | `backend/models/workspace.py` | Baja |
| Crear endpoint `/api/v1/analytics/rfp-by-type` | `backend/api/routes/analytics.py` (nuevo) | Media |
| Componente de graficos por tipo (Seguridad, Tecnologia, etc.) | `front-v2/components/dashboard/` | Media |
| Query para estadisticas de propuestas enviadas | `backend/core/analytics_service.py` (nuevo) | Media |

**Tipos de RFP sugeridos:**
- Seguridad
- Tecnologia
- Infraestructura
- Desarrollo
- Consultoria
- Otro

---

## Fase 3: Modificaciones al Chat (Media Prioridad)

### 3.1 Remover Generacion de Propuesta del Chat

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Remover logica `has_proposal` de deteccion automatica | `backend/api/routes/chat.py` | Baja |
| Eliminar boton "Generar Propuesta" del chat | `front-v2/components/chat/` | Baja |
| Agregar mensaje: "Para generar propuestas, use Analisis Rapido RFP" | `backend/prompts/` | Baja |
| Actualizar endpoint `/workspace/{id}/chat/{id}` | `backend/api/routes/conversations.py` | Baja |

### 3.2 Arreglar Visualizacion de Graficos

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Diagnosticar problema de renderizado de graficos | `front-v2/components/chat/MessageContent.tsx` | Media |
| Implementar parser de bloques de codigo para graficos | Frontend | Media |
| Agregar soporte para Chart.js o similar en mensajes | Frontend | Alta |

### 3.3 Control de Nivel de Pensamiento (Thinking Budget)

**Ubicacion:** Selector junto al modelo en `/workspace/{id}/chat/{id}`

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Crear selector de thinking level (LOW, MEDIUM, HIGH) | `front-v2/components/chat/` | Baja |
| Agregar parametro `thinking_budget` al request | `backend/api/routes/chat.py` | Baja |
| Mapear niveles a configuracion Gemini | `backend/core/llm_service.py` | Media |
| Persistir preferencia del usuario | `backend/models/user.py` o localStorage | Baja |

**Mapeo sugerido:**
```python
THINKING_LEVELS = {
    "LOW"      # Respuestas rapidas
    "MEDIUM" # Balance
    "HIGH"   # Analisis profundo (default)
}
```

---

## Fase 4: Renombrado de Modelos (Baja Prioridad)

### 4.1 Cambio de Nombres en UI

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Renombrar "Gemini 3 Flash" a "Velbet 14b, y decirle a gemini que se identifique con ese nombre" | `front-v2/components/chat/ModelSelector.tsx` | Baja |
| Mantener "Gemini 3 Pro" sin cambios | - | - |
| Actualizar constantes de modelos | `front-v2/lib/constants.ts` | Baja |

---

## Fase 5: Generacion de Documentos Mejorada (Alta Prioridad)

### 5.1 Nuevo System Prompt para Analisis RFP

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Crear archivo de prompt `rfp_analysis_prompt.py` | `backend/prompts/` | Baja |
| Integrar prompt en flujo de Quick Analysis | `backend/core/llm_service.py` | Media |
| Validar output JSON del LLM | `backend/core/document_generator.py` | Media |

**Estructura JSON de salida:**
```json
{
  "texto_entendimiento_problema": "...",
  "texto_resumen_ejecutivo": "...",
  "texto_analisis_requerimientos": "...",
  "texto_propuesta_equipo": "...",
  "texto_sla": "...",
  "texto_duracion": "..."
}
```

### 5.2 Generacion y Previsualizacion de Documentos

| Tarea | Archivo(s) a Modificar | Complejidad |
|-------|------------------------|-------------|
| Template DOCX con placeholders | `backend/templates/propuesta_template.docx` | Media |
| Servicio de generacion DOCX (python-docx) | `backend/core/document_generator.py` | Media |
| Conversion DOCX a PDF (LibreOffice headless o weasyprint) | `backend/core/document_generator.py` | Alta |
| Componente de previsualizacion PDF/DOCX en Quick Analysis | `front-v2/components/quick-analysis/DocumentPreview.tsx` | Alta |
| Endpoint `/api/v1/documents/preview/{id}` | `backend/api/routes/documents.py` | Media |

**Opciones de previsualizacion:**
1. **PDF.js** - Para preview de PDF en navegador
2. **react-doc-viewer** - Soporta multiples formatos
3. **iframe con Google Docs Viewer** - Alternativa simple

---

## Fase 6: Diferenciacion Competitiva (Media-Alta Prioridad)

> **Objetivo:** Diferenciarse de ChatGPT y Gemini en funcionalidad, no en diseno.

### 6.1 Funcionalidades Diferenciadoras Propuestas

| Funcionalidad | Descripcion | Complejidad | Valor |
|---------------|-------------|-------------|-------|
| **Analisis Comparativo de RFPs** | Comparar multiples RFPs para detectar patrones | Alta | Alto |
| **Biblioteca de Propuestas Ganadoras** | Reutilizar secciones de propuestas exitosas | Media | Alto |
| **Alertas de Deadline** | Notificaciones automaticas de vencimientos | Media | Alto |
| **Score de Probabilidad de Exito** | IA predice chances basado en historico | Alta | Muy Alto |
| **Modo Colaborativo** | Multiples BDM trabajando en misma propuesta | Alta | Alto |
| **Integracion con CRM** | Sync con Salesforce/HubSpot | Alta | Alto |
| **Templates por Industria** | Propuestas pre-armadas por sector | Media | Medio |
| **Analisis de Competencia** | Detectar menciones de competidores en RFP | Media | Alto |
| **Checklist Automatico** | Verificar que propuesta cumpla todos los requisitos | Media | Alto |

### 6.2 Quick Wins Recomendados

1. **Checklist de Cumplimiento Automatico** - La IA verifica que la propuesta responda todos los puntos del RFP
2. **Historial de Versiones** - Control de cambios en propuestas
3. **Export a Multiples Formatos** - PDF, DOCX, PPTX
4. **Resumen Ejecutivo en 1 Click** - Generar pitch de 30 segundos

---

## Cronograma Sugerido

```
Semana 1-2:  Fase 1 (Estado de Propuestas) + Fase 4 (Renombrado)
Semana 3-4:  Fase 2 (Dashboard) + Fase 3.1-3.2 (Chat fixes)
Semana 5-6:  Fase 5 (Generacion de Documentos)
Semana 7-8:  Fase 3.3 (Thinking Level) + Fase 6 (Quick Wins)
Semana 9+:   Fase 6 (Funcionalidades avanzadas de diferenciacion)
```

---

## Dependencias Tecnicas

### Nuevas Librerias Requeridas

**Backend:**
```
python-docx>=0.8.11     # Generacion DOCX
weasyprint>=60.0        # Conversion a PDF (alternativa)
pydantic>=2.0           # Validacion JSON
```

**Frontend:**
```
@react-pdf-viewer/core  # Preview PDF
react-doc-viewer        # Preview multiformato (opcional)
chart.js + react-chartjs-2  # Graficos en dashboard
```

---

## Migraciones de Base de Datos

### Nueva tabla: `proposal_tracking`
```sql
CREATE TABLE proposal_tracking (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    tvt_id VARCHAR(50),
    rfp_type ENUM('security', 'technology', 'infrastructure', 'development', 'consulting', 'other'),
    status ENUM('pending', 'sent', 'accepted', 'rejected', 'won', 'lost') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

### Modificar tabla `workspaces`
```sql
ALTER TABLE workspaces 
ADD COLUMN rfp_type VARCHAR(50) DEFAULT 'other',
ADD COLUMN tvt_id VARCHAR(50) NULL;
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Complejidad en preview DOCX | Media | Medio | Usar PDF como formato principal de preview |
| Output JSON inconsistente del LLM | Media | Alto | Validacion estricta + retry con correccion |
| Performance en graficos del chat | Baja | Medio | Lazy loading + virtualizacion |
| Cambios en API de Gemini | Baja | Alto | Abstraccion en LLM service |

---

## Metricas de Exito

- [ ] Tiempo promedio de envio de propuesta reducido en 40%
- [ ] 100% de propuestas con estado trackeado
- [ ] Dashboard muestra metricas en tiempo real
- [ ] Previsualizacion de documentos funcional en <3 segundos
- [ ] Al menos 3 funcionalidades diferenciadoras implementadas

---

## Notas de Implementacion

1. **Priorizar MVP:** Implementar primero el flujo basico de estado de propuestas antes de features avanzados.

2. **Testing:** Cada fase debe incluir tests unitarios y de integracion.

3. **Retrocompatibilidad:** Los cambios en modelos no deben romper datos existentes.

4. **Feedback Loop:** Validar con BDMs reales antes de cerrar cada fase.

---

*Documento generado para equipo de desarrollo TIVIT AI Hub*
