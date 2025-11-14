"""
Gestor de conexiones WebSocket para notificaciones en tiempo real
"""
from fastapi import WebSocket
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Gestiona las conexiones WebSocket de los clientes"""
    
    def __init__(self):
        # workspace_id -> lista de websockets conectados
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, workspace_id: str):
        """Acepta una nueva conexión WebSocket"""
        await websocket.accept()
        
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = []
        
        self.active_connections[workspace_id].append(websocket)
        logger.info(f"WebSocket conectado a workspace {workspace_id}. Total: {len(self.active_connections[workspace_id])}")
    
    def disconnect(self, websocket: WebSocket, workspace_id: str):
        """Desconecta un WebSocket"""
        if workspace_id in self.active_connections:
            if websocket in self.active_connections[workspace_id]:
                self.active_connections[workspace_id].remove(websocket)
                logger.info(f"WebSocket desconectado de workspace {workspace_id}")
            
            # Limpiar si no hay más conexiones
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Envía un mensaje a un websocket específico"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error enviando mensaje personal: {e}")
    
    async def broadcast_to_workspace(self, workspace_id: str, message: dict):
        """Envía un mensaje a todos los clientes conectados a un workspace"""
        if workspace_id not in self.active_connections:
            logger.warning(f"No hay conexiones para workspace {workspace_id}")
            return
        
        message_str = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections[workspace_id]:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                logger.error(f"Error enviando broadcast: {e}")
                disconnected.append(connection)
        
        # Limpiar conexiones muertas
        for conn in disconnected:
            self.disconnect(conn, workspace_id)
    
    async def notify_document_status(self, workspace_id: str, document_id: str, status: str, filename: str = None):
        """Notifica cambio de estado de un documento"""
        message = {
            "type": "document_status",
            "workspace_id": workspace_id,
            "document_id": document_id,
            "status": status,
            "filename": filename,
            "timestamp": None  # Se puede agregar timestamp si se necesita
        }
        await self.broadcast_to_workspace(workspace_id, message)

# Instancia global del manager
ws_manager = ConnectionManager()
