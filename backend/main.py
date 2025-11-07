from fastapi import FastAPI
from api.routes import health, workspaces
from core.config import settings
from models import database
import time
from sqlalchemy.exc import OperationalError
from starlette.middleware.cors import CORSMiddleware

# --- Definir orígenes permitidos ---
origins = [
    "http://localhost:3000", # La URL de tu frontend en desarrollo
]

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
# --- Registrar Routers ---
app.include_router(health.router, prefix="/api/v1", tags=["Health Check"])
app.include_router(workspaces.router, prefix="/api/v1", tags=["Workspaces"])

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido al API del Sistema de IA",
        "active_llm": settings.ACTIVE_LLM_SERVICE
    }