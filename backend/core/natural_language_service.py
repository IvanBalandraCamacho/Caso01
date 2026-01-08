"""
Servicio para análisis semántico con Natural Language API.
"""

from typing import List, Dict
from google.cloud import language_v1
from core.gcp_service import gcp_service
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class NaturalLanguageService:
    """Servicio de Natural Language API."""
    
    def __init__(self):
        self.client = gcp_service.natural_language
        self.enabled = settings.ENABLE_NATURAL_LANGUAGE
    
    def extract_entities(self, text: str, limit: int = 10) -> List[Dict]:
        """Extrae entidades del texto."""
        if not self.enabled or not self.client:
            return []
        
        try:
            document = language_v1.Document(
                content=text[:10000],  # Límite de 10k chars
                type_=language_v1.Document.Type.PLAIN_TEXT,
            )
            
            response = self.client.analyze_entities(
                request={"document": document, "encoding_type": language_v1.EncodingType.UTF8}
            )
            
            entities = []
            for entity in response.entities[:limit]:
                entities.append({
                    "name": entity.name,
                    "type": language_v1.Entity.Type(entity.type_).name,
                    "salience": round(entity.salience, 3),
                    "mentions": len(entity.mentions),
                })
            
            return entities
            
        except Exception as e:
            logger.error(f"Error extrayendo entidades: {e}")
            return []
    
    def analyze_sentiment(self, text: str) -> Dict:
        """Analiza el sentimiento del texto."""
        if not self.enabled or not self.client:
            return {"score": 0, "magnitude": 0, "label": "neutral"}
        
        try:
            document = language_v1.Document(
                content=text[:5000],
                type_=language_v1.Document.Type.PLAIN_TEXT,
            )
            
            sentiment = self.client.analyze_sentiment(
                request={"document": document}
            ).document_sentiment
            
            if sentiment.score > 0.25:
                label = "positive"
            elif sentiment.score < -0.25:
                label = "negative"
            else:
                label = "neutral"
            
            return {
                "score": round(sentiment.score, 2),
                "magnitude": round(sentiment.magnitude, 2),
                "label": label,
            }
            
        except Exception as e:
            logger.error(f"Error analizando sentimiento: {e}")
            return {"score": 0, "magnitude": 0, "label": "error"}


# Instancia global
nlp_service = NaturalLanguageService()
