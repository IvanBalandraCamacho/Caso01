from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from fastapi import  UploadFile
from sqlalchemy.orm import Session
from models.user import User

class ProposalsService(ABC):

    @abstractmethod
    async def analyze(  
        self,  
        file: UploadFile,
        db: Session,
        user: User
    ) -> Dict[str, Any]:
        """Método abstracto para analizar un RFP. """
        pass
    
    @abstractmethod
    def analyze_stream(
        self,
        relevant_chunks: Dict[str, Any],
        query : str,
        workspace_instructions : str) -> Dict[str, Any]:
        """Método abstracto para analizar un chunks RFP en stream. """
        pass
