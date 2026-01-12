# init_db_cloud.py
import os
from backend.models.database import engine, Base

# Importar TODOS los modelos para que SQLAlchemy los reconozca
from backend.models.user import User
from backend.models.workspace import Workspace
from backend.models.conversation import Conversation
# Importa otros modelos si los tienes (ej. Document, Proposal)

print(f"Conectando a: {os.environ.get('DATABASE_URL').split('@')[1]}") # Muestra solo la IP por seguridad

print("Creando tablas en Cloud SQL...")
try:
    Base.metadata.create_all(bind=engine)
    print("✅ ¡Éxito! Tablas creadas correctamente.")
    print("Ahora la tabla 'users' ya existe y acepta contraseñas nulas.")
except Exception as e:
    print(f"❌ Error creando tablas: {e}")