
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from models.workspace import Workspace
from models.document import Document
from models import schemas
from repositories.base import BaseRepository
from core.exceptions import WorkspaceNotFoundException
from processing.vector_store import delete_collection

logger = logging.getLogger(__name__)

class WorkspaceService:
    """Servicio para lógica de negocio de Workspaces"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = BaseRepository(Workspace, db)
        self.document_repo = BaseRepository(Document, db)
    
    def create_workspace(self, workspace_in: schemas.WorkspaceCreate) -> Workspace:
        """Crea un nuevo workspace con validaciones"""
        logger.info(f"Creando workspace: {workspace_in.name}")
        
        # Validar nombre único (opcional)
        existing = self.db.query(Workspace).filter(
            Workspace.name == workspace_in.name
        ).first()
        
        if existing:
            logger.warning(f"Workspace con nombre '{workspace_in.name}' ya existe")
            # Opción: lanzar excepción o permitir duplicados
        
        workspace = self.repo.create(workspace_in.model_dump())
        logger.info(f"Workspace creado: {workspace.id}")
        return workspace
    
    def get_workspace(self, workspace_id: str) -> Workspace:
        """Obtiene un workspace o lanza excepción"""
        workspace = self.repo.get(workspace_id)
        if not workspace:
            logger.error(f"Workspace {workspace_id} no encontrado")
            raise WorkspaceNotFoundException(workspace_id)
        return workspace
    
    def update_workspace(
        self, 
        workspace_id: str, 
        workspace_in: schemas.WorkspaceUpdate
    ) -> Workspace:
        """Actualiza un workspace"""
        workspace = self.get_workspace(workspace_id)
        
        update_data = workspace_in.model_dump(exclude_unset=True)
        if not update_data:
            return workspace
        
        logger.info(f"Actualizando workspace {workspace_id}: {update_data}")
        return self.repo.update(workspace_id, update_data)
    
    def delete_workspace(self, workspace_id: str) -> None:
        """Elimina un workspace y sus recursos"""
        workspace = self.get_workspace(workspace_id)
        
        logger.info(f"Eliminando workspace {workspace_id}")
        
        # 1. Eliminar documentos asociados
        documents = self.db.query(Document).filter(
            Document.workspace_id == workspace_id
        ).all()
        
        for doc in documents:
            logger.debug(f"Eliminando documento {doc.id}")
            self.db.delete(doc)
        
        # 2. Eliminar colección de vectores
        try:
            delete_collection(f"workspace_{workspace_id}")
            logger.info(f"Colección de vectores eliminada para workspace {workspace_id}")
        except Exception as e:
            logger.warning(f"Error al eliminar colección de vectores: {e}")
        
        # 3. Eliminar workspace
        self.repo.delete(workspace_id)
        logger.info(f"Workspace {workspace_id} eliminado completamente")
    
    def get_workspace_stats(self, workspace_id: str) -> dict:
        """Obtiene estadísticas del workspace"""
        workspace = self.get_workspace(workspace_id)
        
        total_docs = self.db.query(func.count(Document.id)).filter(
            Document.workspace_id == workspace_id
        ).scalar()
        
        completed_docs = self.db.query(func.count(Document.id)).filter(
            Document.workspace_id == workspace_id,
            Document.status == "COMPLETED"
        ).scalar()
        
        total_chunks = self.db.query(func.sum(Document.chunk_count)).filter(
            Document.workspace_id == workspace_id
        ).scalar() or 0
        
        return {
            "workspace_id": workspace_id,
            "workspace_name": workspace.name,
            "total_documents": total_docs,
            "completed_documents": completed_docs,
            "total_chunks": total_chunks,
            "created_at": workspace.created_at
        }

