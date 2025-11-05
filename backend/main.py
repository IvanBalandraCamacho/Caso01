from fastapi import FastAPI
from api.routes import health
from core.config import settings

app = FastAPI(
    title="Sistema de IA Empresarial (Multi-LLM)",
    description="Backend para RAG, gestión de documentos y análisis de propuestas.",
    version="0.1.0"
)

# Incluir routers
app.include_router(health.router, prefix="/api/v1", tags=["Health Check"])


@app.get("/")
def read_root():
    return {
        "message": "Bienvenido al API del Sistema de IA",
        "active_llm": settings.ACTIVE_LLM_SERVICE
    }