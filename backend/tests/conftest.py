
import pytest
import os
from pathlib import Path

# Configurar variables de ambiente para tests
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"
os.environ["QDRANT_URL"] = "http://localhost:6333"
os.environ["GEMINI_API_KEY"] = "test-key"

@pytest.fixture(scope="session")
def test_files_dir():
    """Directorio con archivos de prueba"""
    return Path(__file__).parent / "fixtures" / "sample_files"

@pytest.fixture
def sample_pdf(test_files_dir):
    """Archivo PDF de prueba"""
    return test_files_dir / "sample.pdf"
