from fastapi import FastAPI
from api.routes import health, workspaces  # <-- Importar 'workspaces'
from core.config import settings
from models import database

# Crear las tablas en la base de datos (si no existen)
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Sistema de IA Empresarial (Multi-LLM)",
    description="Backend para RAG, gestión de documentos y análisis de propuestas.",
    version="0.1.0"
)

# --- Registrar Routers ---
app.include_router(health.router, prefix="/api/v1", tags=["Health Check"])
app.include_router(workspaces.router, prefix="/api/v1", tags=["Workspaces"]) # <-- AÑADIR ESTA LÍNEA

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido al API del Sistema de IA",
        "active_llm": settings.ACTIVE_LLM_SERVICE
    }