
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.database import Base, get_db
from main import app

# Base de datos de prueba en memoria
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(scope="function")
def test_db():
    """Crea DB de prueba limpia para cada test"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(test_db):
    """Cliente de prueba con DB mockeada"""
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

class TestWorkspaceEndpoints:
    """Tests de integración para endpoints de workspace"""
    
    def test_create_workspace(self, client):
        """Test: POST /workspaces"""
        response = client.post(
            "/api/v1/workspaces",
            json={"name": "Test Workspace", "description": "Test"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Workspace"
        assert "id" in data
    
    def test_get_workspace_not_found(self, client):
        """Test: GET /workspaces/{id} con ID inválido"""
        response = client.get("/api/v1/workspaces/invalid-id")
        
        assert response.status_code == 404
        assert "error" in response.json()
    
    def test_upload_document_success(self, client):
        """Test: POST /workspaces/{id}/upload"""
        # Primero crear workspace
        workspace_response = client.post(
            "/api/v1/workspaces",
            json={"name": "Upload Test"}
        )
        workspace_id = workspace_response.json()["id"]
        
        # Crear archivo de prueba
        files = {"file": ("test.txt", b"Test content", "text/plain")}
        
        # Subir archivo
        response = client.post(
            f"/api/v1/workspaces/{workspace_id}/upload",
            files=files
        )
        
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "PENDING"
