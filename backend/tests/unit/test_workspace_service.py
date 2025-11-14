
import pytest
from unittest.mock import Mock, patch
from services.workspace_service import WorkspaceService
from models.schemas import WorkspaceCreate, WorkspaceUpdate
from core.exceptions import WorkspaceNotFoundException

class TestWorkspaceService:
    """Tests unitarios para WorkspaceService"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock de sesión de base de datos"""
        return Mock()
    
    @pytest.fixture
    def service(self, mock_db):
        """Instancia del servicio con DB mockeada"""
        return WorkspaceService(mock_db)
    
    def test_create_workspace_success(self, service, mock_db):
        """Test: Crear workspace exitosamente"""
        # Arrange
        workspace_in = WorkspaceCreate(
            name="Test Workspace",
            description="Test Description"
        )
        
        # Act
        result = service.create_workspace(workspace_in)
        
        # Assert
        assert result is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    
    def test_get_workspace_not_found(self, service, mock_db):
        """Test: Workspace no encontrado lanza excepción"""
        # Arrange
        mock_db.query().filter().first.return_value = None
        
        # Act & Assert
        with pytest.raises(WorkspaceNotFoundException):
            service.get_workspace("nonexistent-id")
    
    def test_update_workspace_success(self, service, mock_db):
        """Test: Actualizar workspace"""
        # Arrange
        workspace_id = "test-id"
        mock_workspace = Mock()
        mock_db.query().filter().first.return_value = mock_workspace
        
        update_data = WorkspaceUpdate(name="Updated Name")
        
        # Act
        service.update_workspace(workspace_id, update_data)
        
        # Assert
        mock_db.commit.assert_called()
