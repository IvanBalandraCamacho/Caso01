from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from core.config import settings

# Crear el motor de SQLAlchemy usando la URL de la config con CONNECTION POOL
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,           # Conexiones permanentes en el pool
    max_overflow=10,        # Conexiones adicionales permitidas
    pool_pre_ping=True,     # Verificar conexiones antes de usarlas
    pool_recycle=3600       # Reciclar conexiones cada 1 hora
)

# Crear una fábrica de sesiones (SessionLocal)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Crear una clase Base de la que heredarán nuestros modelos
Base = declarative_base()

# Función de dependencia para obtener una sesión en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()