import os
import time
from fastapi import FastAPI, Request
# from starlette.middleware.gzip import GZIPMiddleware
from api.routes import health, workspaces, conversations, document_generation
# from api.routes import users  # Comentado: módulo no existe aún
from core.config import settings
from models import database
from sqlalchemy.exc import OperationalError
from starlette.middleware.cors import CORSMiddleware

# --- Definir orígenes permitidos ---
raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000",
)
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

# Crear las tablas en la base de datos con reintentos
def create_tables_with_retry(max_retries=5, delay=3):
    """Intenta crear las tablas, esperando a que MySQL esté listo."""
    for attempt in range(max_retries):
        try:
            print(f"Intento {attempt + 1}/{max_retries} de crear tablas en la base de datos...")
            database.Base.metadata.create_all(bind=database.engine)
            print("✅ Tablas creadas exitosamente.")
            return
        # --- CORRECCIÓN ---
        except OperationalError: # Se quitó 'as e'
            if attempt < max_retries - 1:
                print(f"⚠️  MySQL no está listo aún. Reintentando en {delay} segundos...")
                time.sleep(delay)
            else:
                print(f"❌ No se pudo conectar a MySQL después de {max_retries} intentos.")
                raise

# Ejecutar la creación de tablas con reintentos
create_tables_with_retry()

app = FastAPI(
    title="Sistema de IA Empresarial (Multi-LLM)",
    description="Backend para RAG, gestión de documentos y análisis de propuestas.",
    version="0.1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permitir todos los métodos (GET, POST, etc.)
    allow_headers=["*"], # Permitir todos los headers
)

# Configurar GZIP para compresión de respuestas (60-70% reducción de tamaño)
# app.add_middleware(GZIPMiddleware, minimum_size=1000)

# --- Registrar Routers ---
app.include_router(health.router, prefix="/api/v1", tags=["Health Check"])
# app.include_router(users.router, prefix="/api/v1/auth", tags=["Authentication & Users"])  # Comentado
app.include_router(workspaces.router, prefix="/api/v1", tags=["Workspaces"])
app.include_router(conversations.router, prefix="/api/v1", tags=["Conversations"])
app.include_router(document_generation.router, prefix="/api/v1", tags=["Document Generation"])

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido al API del Sistema de IA",
        "active_llm": settings.ACTIVE_LLM_SERVICE
    }