from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from core.config import settings

# Crear el motor de SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,           # Reducido un poco para Cloud Run (serverless prefiere muchas conexiones cortas o pocas largas)
    max_overflow=20,        # Permitir picos de tráfico
    pool_pre_ping=True,     # VITAL: Verifica si la conexión sigue viva antes de usarla
    pool_recycle=1800,      # Reciclar cada 30 min (evita timeouts de firewalls de GCP)
    pool_timeout=30         # No esperar más de 30s por una conexión
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()