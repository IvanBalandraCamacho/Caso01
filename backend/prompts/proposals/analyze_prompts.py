from typing import Dict, Any, Optional
import json
from prompts.chat_prompts import RFP_ANALYSIS_JSON_PROMPT_TEMPLATE, PROPOSAL_GENERATION_MARKDOWN_PROMPT

class AnalyzePrompts:
    
    @staticmethod
    def create_analysis_JSON_prompt(document_text: str, max_length: int = 8000) -> str:
        document_text = document_text[:max_length]
        prompt = RFP_ANALYSIS_JSON_PROMPT_TEMPLATE.format(document_text=document_text)
        return prompt

    @staticmethod
    def create_markdown_analysis_prompt() -> str:

        prompt = PROPOSAL_GENERATION_MARKDOWN_PROMPT

        return prompt

    

