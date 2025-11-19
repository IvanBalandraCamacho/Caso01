# Caso01 — Sistema RAG con Generación de Documentos

Proyecto que implementa un pipeline RAG (Retrieval-Augmented Generation) para consulta y generación de documentos.

## Componentes principales
- Backend: FastAPI (Python), Celery, SQLAlchemy
- Frontend: Next.js + TypeScript
- Vector store: Qdrant
- LLM: Google Gemini (Generative API)

## Inicio rápido

1. Copiar variables de entorno: `cp backend/.env.example backend/.env` y ajustar claves.
2. Levantar todo con Docker Compose: `docker-compose up -d --build`.
3. Acceder a:
   - Frontend: http://localhost:3000
   - Backend (docs): http://localhost:8000/docs

## Estructura del proyecto

```
Caso01/
├── backend/    # FastAPI + core services (llm_service, processing, models)
├── frontend/   # Next.js app (hooks, components, pages)
├── docker-compose.yml
└── README.md
```

## Comandos útiles

```bash
# Iniciar (recomendado: usar start.sh)
./start.sh
# o manualmente
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Detener
docker-compose down
```

## Notas importantes
- Configure `backend/.env` con `GEMINI_API_KEY`, `DATABASE_URL`, `REDIS_URL` y `QDRANT_URL`.
- Para detalles de endpoints consulte `ENDPOINTS_API.md`.

---

**Última actualización**: Noviembre 19, 2025  
**Versión**: 2.0
