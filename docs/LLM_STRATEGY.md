# Estrategia LLM - GPT-4o-mini con RAG

## 🎯 Arquitectura Actual

El sistema utiliza **GPT-4o-mini** de OpenAI como modelo único para todas las tareas, con **RAG activado** para recuperación de información contextual de documentos y bases de datos estructuradas.

### GPT-4o-mini (OpenAI)
- **Rol**: MODELO ÚNICO PARA TODO
- **Por qué**: Modelo balanceado, económico y versátil para chat, análisis y generación de documentos.
- **Uso**: Todas las tareas del sistema (chat interactivo, análisis de documentos, generación de propuestas, armado de equipos).
- **Costo**: Bajo costo por token.

### Sistema RAG Integrado
- **Recuperación**: Búsqueda semántica en documentos indexados
- **Contexto Estructurado**: Integración con APIs de servicios y trabajadores de TIVIT
- **Enriquecimiento**: Contexto automático cuando se detectan consultas sobre "armar equipo"

---

## 💰 Comparativa de Costos

| Modelo | Input | Output | Calidad |
|--------|-------|--------|---------|
| **GPT-4o-mini** | $0.15 / 1M tokens | $0.60 / 1M tokens | ⭐⭐⭐⭐ |

**Ventajas:**
- Simplicidad de mantenimiento
- Consistencia en respuestas
- Costo predecible
- Contexto enriquecido con RAG

---

## 🔧 Integración con TIVIT

### APIs Disponibles
- **Servicios**: Catálogo completo de servicios (ciberseguridad, cloud, transformación digital, IA)
- **Trabajadores**: Base de datos de profesionales con skills, certificaciones y disponibilidad
- **Armado de Equipos**: Sistema inteligente para sugerir equipos basado en requerimientos

### Triggers Automáticos
Cuando el usuario solicita "armar equipo", el sistema automáticamente:
1. Detecta la intención
2. Consulta APIs de servicios y trabajadores
3. Enriquecer el contexto del LLM
4. Genera recomendaciones personalizadas

---

## 🔮 Próximos Pasos

### 1. Servicio RAG Externo
- Implementar servicio RAG completo con embeddings
- Indexación automática de documentos
- API de búsqueda semántica

### 2. Mejoras de Contexto
- Análisis más sofisticado de intenciones
- Integración con más fuentes de datos
- Cache inteligente de contextos comunes

### 3. Optimización
- Fine-tuning del modelo para casos de uso específicos
- Implementación de agentes especializados
- Monitoreo de calidad y costos
