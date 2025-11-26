"""
Router Inteligente de LLMs (Solo OpenAI).

Selecciona el mejor modelo según la tarea:
- ANALIZAR: GPT-4o-mini (Económico y potente para lectura masiva)
- CREAR: GPT-4o-mini (Mayor calidad de escritura y razonamiento)
- RESPONDER/GENERAL: GPT-4o-mini (Rápido y eficiente para chat)
"""

from enum import Enum
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


class TaskType(Enum):
    """Tipos de tareas que el sistema puede realizar."""
    ANALYZE = "analyze"      # Analizar documentos, extraer datos -> GPT-4o-mini
    CREATE = "create"        # Generar documentos, propuestas -> GPT-4o-mini
    RESPOND = "respond"      # Chat general, Q&A simple -> GPT-4o-mini
    GENERAL = "general"      # Default -> GPT-4o-mini


class LLMRouter:
    """
    Router inteligente refinado.
    """
    
    def __init__(self):
        """Inicializa el router."""
        self.model_mapping = {
            TaskType.ANALYZE: "gpt4o_mini",       # Solicitado explícitamente para análisis
            TaskType.CREATE: "gpt4o_mini",      # Mejor modelo para generación
            TaskType.RESPOND: "gpt4o_mini",   # Rápido para chat
            TaskType.GENERAL: "gpt4o_mini",
        }
        logger.info("LLM Router inicializado: GPT-4o-mini para todas las tareas")
    
    def route(
        self, 
        query: str, 
        num_documents: int = 0,
        expected_output_length: int = 500
    ) -> Tuple[str, TaskType, str]:
        """
        Selecciona el mejor modelo para la tarea.
        """
        query_lower = query.lower()
        
        # 1. CREAR documentos (Propuestas, Informes)
        if self._is_creation_task(query_lower, expected_output_length):
            task_type = TaskType.CREATE
            reason = "Generación de documento - GPT-4o-mini (Mayor calidad)"
            
        # 2. ANALIZAR documentos (Lectura, Extracción)
        elif self._is_analysis_task(query_lower, num_documents):
            task_type = TaskType.ANALYZE
            reason = "Análisis de documentos - GPT-4o-mini (Especializado en análisis)"
            
        # 3. RESPONDER / GENERAL
        else:
            task_type = TaskType.RESPOND
            reason = "Chat General - GPT-4o-mini (Velocidad y eficiencia)"
        
        model_name = self.model_mapping[task_type]
        logger.info(f"Router: {task_type.value} → {model_name}")
        
        return model_name, task_type, reason

    def _is_creation_task(self, query_lower: str, expected_length: int) -> bool:
        keywords = ["genera", "crea", "redacta", "propuesta", "informe", "documento", "escribe"]
        return any(k in query_lower for k in keywords) or expected_length > 1000

    def _is_analysis_task(self, query_lower: str, num_documents: int) -> bool:
        keywords = ["analiza", "extrae", "busca", "revisa", "compara", "resume"]
        return any(k in query_lower for k in keywords) or num_documents > 0
    
    def _is_creation_task(self, query_lower: str, expected_length: int) -> bool:
        """
        Determina si la tarea es de creación de documentos.
        """
        creation_keywords = [
            "genera", "crea", "escribe", "redacta",
            "documento", "informe", "reporte", "propuesta",
            "10 páginas", "15 páginas", "20 páginas",
            "extenso", "completo", "detallado"
        ]
        
        # Si menciona generación o longitud esperada es alta
        if any(keyword in query_lower for keyword in creation_keywords):
            return True
        
        if expected_length > 2000:  # Más de 2000 palabras (~4 páginas)
            return True
        
        return False
    
    def _is_analysis_task(self, query_lower: str, num_documents: int) -> bool:
        """
        Determina si la tarea es de análisis de documentos.
        """
        analysis_keywords = [
            "analiza", "compara", "examina", "revisa",
            "diferencias", "similitudes", "evalúa",
            "extrae", "busca", "encuentra",
            "resume", "sintetiza"
        ]
        
        # Si menciona análisis
        if any(keyword in query_lower for keyword in analysis_keywords):
            return True
        
        # Si hay múltiples documentos (probablemente quiere compararlos)
        if num_documents > 3:
            return True
        
        return False
    
    def get_model_info(self, model_name: str) -> dict:
        model_info = {
            "gpt4o_mini": {
                "name": "GPT-4o-mini",
                "cost": "Bajo costo",
                "best_for": "Todas las tareas: análisis, generación, chat"
            }
        }
        return model_info.get(model_name, {})
