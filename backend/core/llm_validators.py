"""
Validaciones y métricas para el servicio LLM.
Monitorea calidad de respuestas y detecta problemas.
"""
import logging
import time
from typing import List, Dict, Optional
from models.schemas import DocumentChunk
import re

logger = logging.getLogger(__name__)


class LLMMetrics:
    """Recolector de métricas de LLM."""
    
    def __init__(self):
        self.requests_count = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.total_tokens = 0
        self.total_cost = 0.0
        self.average_response_time = 0.0
        self._response_times = []
    
    def record_request(
        self, 
        query: str,
        response: str,
        context_chunks: List[DocumentChunk],
        response_time: float,
        was_cached: bool,
        tokens_used: Optional[int] = None
    ):
        """Registra una petición LLM."""
        self.requests_count += 1
        
        if was_cached:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        
        self._response_times.append(response_time)
        self.average_response_time = sum(self._response_times) / len(self._response_times)
        
        if tokens_used:
            self.total_tokens += tokens_used
            # Costo estimado GPT-4o-mini: $0.15 input + $0.60 output por 1M tokens
            estimated_cost = (tokens_used / 1_000_000) * 0.375  # Promedio
            self.total_cost += estimated_cost
    
    def get_stats(self) -> Dict:
        """Obtiene estadísticas acumuladas."""
        cache_rate = (self.cache_hits / self.requests_count * 100) if self.requests_count > 0 else 0
        
        return {
            "total_requests": self.requests_count,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": round(cache_rate, 2),
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": round(self.total_cost, 4),
            "avg_response_time_sec": round(self.average_response_time, 2)
        }
    
    def log_stats(self):
        """Loguea estadísticas actuales."""
        stats = self.get_stats()
        logger.info(f"📊 LLM Metrics: {stats}")


class ResponseValidator:
    """Valida calidad de respuestas LLM."""
    
    @staticmethod
    def validate_response(
        query: str,
        response: str,
        context_chunks: List[DocumentChunk]
    ) -> Dict[str, any]:
        """
        Valida una respuesta LLM y retorna métricas de calidad.
        
        Returns:
            {
                'is_valid': bool,
                'issues': List[str],
                'quality_score': float (0-1),
                'has_context': bool,
                'is_complete': bool
            }
        """
        issues = []
        quality_score = 1.0
        
        # 1. Verificar que no esté vacía
        if not response or len(response.strip()) < 10:
            issues.append("Respuesta vacía o muy corta")
            quality_score -= 0.5
        
        # 2. Detectar respuestas genéricas/evasivas
        evasive_phrases = [
            "no tengo información",
            "no puedo ayudarte",
            "no está disponible",
            "no hay datos",
            "como modelo de lenguaje"
        ]
        
        response_lower = response.lower()
        if any(phrase in response_lower for phrase in evasive_phrases):
            # Es válido no tener info, pero debemos marcarlo
            issues.append("Respuesta indica falta de información")
            # No penalizar score si es honesto sobre falta de info
        
        # 3. Verificar uso de contexto (si hay chunks disponibles)
        has_context = False
        if context_chunks:
            # Buscar evidencia de que usó el contexto
            for chunk in context_chunks[:3]:  # Revisar primeros 3 chunks
                chunk_words = set(chunk.chunk_text.lower().split())
                response_words = set(response_lower.split())
                
                # Si hay overlap significativo (>10 palabras), usó el contexto
                overlap = len(chunk_words.intersection(response_words))
                if overlap > 10:
                    has_context = True
                    break
            
            if not has_context and len(context_chunks) > 0:
                issues.append("Respuesta no parece usar el contexto proporcionado")
                quality_score -= 0.2
        
        # 4. Detectar alucinaciones obvias (números inventados, fechas raras)
        suspicious_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # Fechas específicas
            r'\$[\d,]+\.\d{2}',     # Montos específicos
            r'\d+\.\d+%'            # Porcentajes específicos
        ]
        
        if context_chunks:
            for pattern in suspicious_patterns:
                response_matches = re.findall(pattern, response)
                
                if response_matches:
                    # Verificar si los números están en el contexto
                    context_text = " ".join([c.chunk_text for c in context_chunks])
                    
                    for match in response_matches:
                        if match not in context_text:
                            issues.append(f"Posible alucinación: '{match}' no está en contexto")
                            quality_score -= 0.1
        
        # 5. Verificar completitud (no cortada a la mitad)
        is_complete = not response.endswith(('...', '…')) and len(response) > 20
        if not is_complete:
            issues.append("Respuesta parece incompleta")
            quality_score -= 0.1
        
        # 6. Detectar formato markdown roto
        if response.count('```') % 2 != 0:
            issues.append("Bloques de código markdown incompletos")
            quality_score -= 0.1
        
        # Asegurar que score esté en rango [0, 1]
        quality_score = max(0.0, min(1.0, quality_score))
        
        return {
            'is_valid': quality_score > 0.5,
            'issues': issues,
            'quality_score': round(quality_score, 2),
            'has_context': has_context,
            'is_complete': is_complete
        }
    
    @staticmethod
    def should_retry(validation_result: Dict) -> bool:
        """Determina si se debe reintentar la petición."""
        # Reintentar solo si hay problemas técnicos, no si simplemente no hay info
        technical_issues = [
            "Respuesta vacía o muy corta",
            "Respuesta parece incompleta",
            "Bloques de código markdown incompletos"
        ]
        
        for issue in validation_result['issues']:
            if any(tech in issue for tech in technical_issues):
                return True
        
        return False


# Instancia global de métricas
_metrics = LLMMetrics()


def get_metrics() -> LLMMetrics:
    """Obtiene instancia global de métricas."""
    return _metrics


def log_llm_stats():
    """Helper para loguear stats actuales."""
    _metrics.log_stats()
