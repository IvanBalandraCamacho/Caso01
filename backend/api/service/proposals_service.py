from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from fastapi import  UploadFile
class ProposalsService(ABC):

    @abstractmethod
    def analyze(  
        self,  
        file: UploadFile) -> Dict[str, Any]:
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
