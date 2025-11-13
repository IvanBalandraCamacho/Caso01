"""
Script para inicializar la base de datos con datos de demostración.
Crea usuarios y workspaces de ejemplo para testing.
"""

from sqlalchemy.orm import Session
from models import database, user as user_model, workspace as workspace_model
from api.routes.auth import get_password_hash
import time

def create_demo_users(db: Session):
    """Crea usuarios de demostración."""
    demo_users = [
        {"username": "admin", "password": "admin"},
        {"username": "user1", "password": "password123"},
    ]
    
    for user_data in demo_users:
        existing = db.query(user_model.User).filter(
            user_model.User.username == user_data["username"]
        ).first()
        
        if not existing:
            hashed_password = get_password_hash(user_data["password"])
            new_user = user_model.User(
                username=user_data["username"],
                hashed_password=hashed_password,
                is_active=True
            )
            db.add(new_user)
            print(f"✅ Usuario '{user_data['username']}' creado exitosamente.")
        else:
            print(f"⏭️  Usuario '{user_data['username']}' ya existe.")
    
    db.commit()

def create_demo_workspaces(db: Session):
    """Crea workspaces de demostración."""
    demo_workspaces = [
        {"name": "Propuestas Comerciales", "description": "Análisis de propuestas comerciales de clientes"},
        {"name": "Documentos Técnicos", "description": "Especificaciones y documentación técnica"},
        {"name": "Políticas Internas", "description": "Políticas y procedimientos internos"},
    ]
    
    for ws_data in demo_workspaces:
        existing = db.query(workspace_model.Workspace).filter(
            workspace_model.Workspace.name == ws_data["name"]
        ).first()
        
        if not existing:
            new_ws = workspace_model.Workspace(
                name=ws_data["name"],
                description=ws_data["description"]
            )
            db.add(new_ws)
            print(f"✅ Workspace '{ws_data['name']}' creado exitosamente.")
        else:
            print(f"⏭️  Workspace '{ws_data['name']}' ya existe.")
    
    db.commit()

def init_db():
    """Inicializa la base de datos con datos de demostración."""
    # Intentar crear tablas
    max_retries = 5
    for attempt in range(max_retries):
        try:
            print(f"Intento {attempt + 1}/{max_retries} de crear tablas...")
            database.Base.metadata.create_all(bind=database.engine)
            print("✅ Tablas creadas exitosamente.")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️  Reintentando en 3 segundos...")
                time.sleep(3)
            else:
                print(f"❌ No se pudo crear las tablas: {e}")
                return
    
    # Crear sesión
    db = next(database.get_db())
    
    try:
        print("\n--- Inicializando datos de demostración ---")
        create_demo_users(db)
        create_demo_workspaces(db)
        print("\n✅ Base de datos inicializada correctamente.\n")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
