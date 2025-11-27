from abc import ABC, abstractmethod
from typing import Dict, Any
from fastapi import  UploadFile
class ProposalsService(ABC):

    @abstractmethod
    async def analyze(  self,  file: UploadFile) -> Dict[str, Any]:
        """Método abstracto para analizar un RFP. """
        pass
