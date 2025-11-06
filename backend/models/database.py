from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# Crear el motor de SQLAlchemy usando la URL de la config
engine = create_engine(settings.DATABASE_URL)

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