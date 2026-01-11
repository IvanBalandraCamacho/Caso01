from typing import Dict, Any, Optional
import json
from prompts.chat_prompts import (
    RFP_ANALYSIS_JSON_PROMPT_TEMPLATE, 
    PROPOSAL_GENERATION_MARKDOWN_PROMPT,
    PROPOSAL_GENERATION_SYSTEM_PROMPT
)

class AnalyzePrompts:
    
    @staticmethod
    def create_analysis_JSON_prompt(document_text: str, max_length: int = 8000) -> str:
        document_text = document_text[:max_length]
        prompt = RFP_ANALYSIS_JSON_PROMPT_TEMPLATE.format(document_text=document_text)
        return prompt

    @staticmethod
    def create_markdown_analysis_prompt() -> str:
        """Legacy: Retorna el prompt de generacion Markdown (deprecado)"""
        prompt = PROPOSAL_GENERATION_MARKDOWN_PROMPT
        return prompt
    
    @staticmethod
    def get_proposal_system_prompt() -> str:
        """
        Retorna el System Prompt para generacion de propuestas.
        Este prompt se usa como 'system role' para el LLM.
        Genera JSON estructurado con las secciones de la propuesta.
        """
        return PROPOSAL_GENERATION_SYSTEM_PROMPT
    
    @staticmethod
    def create_proposal_user_prompt(document_text: str, max_length: int = 15000) -> str:
        """
        Crea el user prompt con el contenido del documento RFP.
        Se usa junto con get_proposal_system_prompt().
        """
        document_text = document_text[:max_length]
        return f"""
Analiza el siguiente documento RFP/TDR y genera la propuesta tecnica en formato JSON:

=== DOCUMENTO RFP ===
{document_text}

=== INSTRUCCIONES ===
Genera el JSON con las 6 secciones requeridas segun las instrucciones del system prompt.
Responde SOLO con el JSON, sin texto adicional.
"""
