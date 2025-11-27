import json
from typing import Dict, Any
from fastapi import UploadFile, HTTPException, status
from api.service.proposals_service import ProposalsService
from prompts.proposals.analyze_prompts import AnalyzePrompts
from utils.file_util import FileUtil
from core.llm_service import get_provider
import logging

logger = logging.getLogger(__name__)
class ProposalsServiceImpl(ProposalsService):

    async def analyze(  self,  file: UploadFile) -> Dict[str, Any]:
        FileUtil.is_pdf(file)
        try:
            pdf_text = await FileUtil.extract_text_from_pdf(file)
            prompt = AnalyzePrompts.create_analysis_prompt(pdf_text, 8000)
            return await self._analyze_with_ia(prompt)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error al analizar RFP: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al analizar el documento: {str(e)}"
            )

    async def _analyze_with_ia(self, prompt: str) -> Dict[str, Any]: 
        """Método auxiliar y privado para la lógica del LLM y el parseo."""
        try:
            llm_provider = get_provider(model_name="gpt4o_mini")
            if not llm_provider:
                llm_provider = get_provider(task_type="analyze")
            
            response =  llm_provider.generate_response(query=prompt, context_chunks=[]) 
            response_text = self._clean_llm_response(response)
            return json.loads(response_text)
                
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al procesar la respuesta del análisis (JSON inválido)."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en la comunicación con la IA: {e.__class__.__name__}"
            )
        
    def _clean_llm_response(self, response: str) -> str:
        """Helper para remover envoltorios de Markdown (`json)"""
        response_text = response.strip()
        # Simplificando la limpieza:
        if response_text.startswith(("```json", "```")):
            response_text = response_text.replace("```json", "", 1).replace("```", "", 1)
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        return response_text.strip()