# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Monorepo for an AI-powered document analysis platform \"Caso01\" with:
- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS, shadcn/ui with Radix UI primitives, TanStack Query for data fetching).
- **Backend API**: FastAPI (Python 3.10+), SQLAlchemy ORM with MySQL for relational data, JWT auth, rate limiting.
- **Async Processing**: Celery workers with Redis broker for background tasks.
- **RAG Service**: Dedicated FastAPI service for document processing, embeddings (Sentence Transformers), vector storage integration (Qdrant).
- **External Services** (via Docker Compose): MySQL (metadata), Redis (cache/broker), Qdrant (vectors).

Key data flow: Frontend → Backend API → Celery tasks → RAG Service (document chunking/embeddings) → OpenAI GPT-4o-mini (analysis/generation). LLM routing in `backend/core/llm_router.py`.

## Directory Structure
```
.
├── backend/          # FastAPI API: api/routes/, core/providers/llm_service.py, models/, processing/ (Celery tasks), main.py
├── frontend/         # Next.js: src/app/ (pages), src/components/ (shadcn/ui), src/lib/ (utils, queries)
├── rag-service/      # RAG FastAPI: document ingestion, text splitting (LangChain), embeddings
├── docker-compose.yml # Orchestrates all services + MySQL/Redis/Qdrant
└── README.md         # Backend-focused setup guide
```

## Development Commands

### Full Stack (Recommended)
```bash
# Install & Run (sets up all services)
docker compose up -d  # Backend:8000, Frontend:3000, RAG:8080, MySQL:3307, Redis:6379, Qdrant:6333

# Backend API Docs
http://localhost:8000/docs
```

### Backend (Standalone)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Celery (separate terminal)
celery -A core.celery_app worker --loglevel=info
```

### Frontend (Standalone)
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm run start
```

### RAG Service (Standalone)
```bash
cd rag-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

No dedicated test runners found; use pytest (if added) or individual service tests.
