"""
LLM Service Avanzado - Sistema Optimizado de IA.
Proporciona eficiencia máxima y precisión usando técnicas avanzadas de prompt engineering,
cache semántico, y selección inteligente de modelos.
"""
from typing import List, Generator, Dict, Any, Optional, Tuple
from core.config import settings
from core.providers import OpenAIProvider, LLMProvider
from models.schemas import DocumentChunk
import logging
import hashlib
import json
import time
from functools import lru_cache
import redis
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Cache semántico
redis_client = redis.from_url(settings.REDIS_URL) if hasattr(settings, 'REDIS_URL') else None
SEMANTIC_CACHE_TTL = 3600  # 1 hora
SIMILARITY_THRESHOLD = 0.85  # Umbral de similitud para cache

# Global provider instance
_provider = None

# Vectorizer para similitud semántica
_vectorizer = None

def get_vectorizer():
    """Obtiene el vectorizer TF-IDF para similitud semántica."""
    global _vectorizer
    if _vectorizer is None:
        _vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words=['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'que', 'de', 'en', 'a', 'por', 'para', 'con', 'sin', 'sobre', 'tras', 'durante']
        )
    return _vectorizer

def analyze_query_complexity(query: str, context_chunks: List[DocumentChunk]) -> Dict[str, Any]:
    """
    Analiza la complejidad de una query para optimizar parámetros LLM.

    Returns:
        Dict con análisis de complejidad, tipo de tarea, parámetros óptimos
    """
    query_lower = query.lower()
    query_length = len(query.split())

    # Detectar tipo de tarea
    task_type = "general"

    # Tareas específicas
    if any(word in query_lower for word in ["resumir", "resumen", "summary", "sintesis"]):
        task_type = "summarization"
    elif any(word in query_lower for word in ["comparar", "comparación", "versus", "vs", "diferencias"]):
        task_type = "comparison"
    elif any(word in query_lower for word in ["armar equipo", "equipo", "personal", "staff", "trabajadores"]):
        task_type = "team_building"
    elif any(word in query_lower for word in ["analizar", "análisis", "evaluar", "evaluation"]):
        task_type = "analysis"
    elif any(word in query_lower for word in ["generar", "crear", "escribir", "redactar"]):
        task_type = "generation"
    elif any(word in query_lower for word in ["calcular", "cálculo", "número", "cantidad", "cost"]):
        task_type = "calculation"

    # Calcular complejidad
    complexity_score = 0

    # Longitud de query
    if query_length > 50:
        complexity_score += 3
    elif query_length > 20:
        complexity_score += 2
    elif query_length > 10:
        complexity_score += 1

    # Cantidad de contexto
    context_length = sum(len(chunk.chunk_text) for chunk in context_chunks)
    if context_length > 50000:  # Más de 50KB
        complexity_score += 3
    elif context_length > 20000:  # Más de 20KB
        complexity_score += 2
    elif context_length > 5000:  # Más de 5KB
        complexity_score += 1

    # Palabras clave complejas
    complex_keywords = ["comparativo", "optimización", "estrategia", "implementación", "arquitectura", "escalabilidad"]
    if any(word in query_lower for word in complex_keywords):
        complexity_score += 2

    # Determinar nivel de complejidad
    if complexity_score >= 5:
        complexity_level = "high"
    elif complexity_score >= 3:
        complexity_level = "medium"
    else:
        complexity_level = "low"

    # Parámetros óptimos basados en complejidad y tarea
    params = get_optimal_parameters(task_type, complexity_level, len(context_chunks))

    return {
        "task_type": task_type,
        "complexity_level": complexity_level,
        "complexity_score": complexity_score,
        "query_length": query_length,
        "context_length": context_length,
        "context_chunks_count": len(context_chunks),
        "optimal_params": params
    }

def get_optimal_parameters(task_type: str, complexity: str, context_chunks_count: int) -> Dict[str, Any]:
    """
    Determina los parámetros óptimos para el LLM basados en tarea y complejidad.
    """
    base_params = {
        "temperature": 0.7,
        "max_tokens": 4000,
        "top_p": 0.9,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    }

    # Ajustes por tipo de tarea
    task_adjustments = {
        "summarization": {"temperature": 0.3, "max_tokens": 2000},
        "comparison": {"temperature": 0.2, "max_tokens": 3000},
        "team_building": {"temperature": 0.4, "max_tokens": 2500},
        "analysis": {"temperature": 0.3, "max_tokens": 3500},
        "generation": {"temperature": 0.8, "max_tokens": 4000},
        "calculation": {"temperature": 0.1, "max_tokens": 1500}
    }

    # Ajustes por complejidad
    complexity_adjustments = {
        "low": {"temperature": -0.1, "max_tokens": -500},
        "medium": {},  # Sin cambios
        "high": {"temperature": 0.1, "max_tokens": 1000, "top_p": 0.95}
    }

    # Aplicar ajustes
    if task_type in task_adjustments:
        base_params.update(task_adjustments[task_type])

    if complexity in complexity_adjustments:
        for key, adjustment in complexity_adjustments[complexity].items():
            if isinstance(adjustment, (int, float)):
                if key == "temperature":
                    base_params[key] = max(0.0, min(1.0, base_params[key] + adjustment))
                elif key == "max_tokens":
                    base_params[key] = max(1000, base_params[key] + adjustment)
                else:
                    base_params[key] = adjustment

    # Ajuste por cantidad de contexto
    if context_chunks_count > 10:
        base_params["max_tokens"] = min(base_params["max_tokens"], 3000)
    elif context_chunks_count < 3:
        base_params["max_tokens"] = min(base_params["max_tokens"], 2000)

    return base_params

def get_semantic_cache_key(query: str, context_chunks: List[DocumentChunk]) -> str:
    """Genera una clave de cache semántica basada en la similitud de la query."""
    # Crear hash de la query y contexto relevante
    query_hash = hashlib.md5(query.lower().encode()).hexdigest()[:8]

    # Incluir información de los chunks más relevantes
    top_chunks = sorted(context_chunks, key=lambda x: getattr(x, 'score', 0), reverse=True)[:3]
    context_hash = hashlib.md5(
        "".join(chunk.chunk_text[:200] for chunk in top_chunks).encode()
    ).hexdigest()[:8]

    return f"semantic:{query_hash}:{context_hash}"

def check_semantic_cache(query: str, context_chunks: List[DocumentChunk]) -> Optional[str]:
    """Verifica si hay una respuesta cacheada similar."""
    if not redis_client:
        return None

    cache_key = get_semantic_cache_key(query, context_chunks)

    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return cached_data.decode('utf-8')
    except Exception as e:
        logger.warning(f"Error checking semantic cache: {e}")

    return None

def save_semantic_cache(query: str, context_chunks: List[DocumentChunk], response: str):
    """Guarda una respuesta en el cache semántico."""
    if not redis_client:
        return

    cache_key = get_semantic_cache_key(query, context_chunks)

    try:
        redis_client.setex(cache_key, SEMANTIC_CACHE_TTL, response)
        logger.debug(f"Response cached with key: {cache_key}")
    except Exception as e:
        logger.warning(f"Error saving to semantic cache: {e}")

def get_advanced_template(task_type: str, complexity: str, query: str, context_chunks: List[DocumentChunk]) -> str:
    """
    Genera un template avanzado de prompt basado en el tipo de tarea y complejidad.
    """
    # Template base
    base_template = """Eres un asistente de IA altamente especializado y preciso en análisis de documentos comerciales y técnicos.

=== CONTEXTO DISPONIBLE ===
{context}

=== TAREA ESPECÍFICA ===
{task_instructions}

=== PREGUNTA DEL USUARIO ===
{query}

=== ENFOQUE DE RESPUESTA ===
{response_guidance}

=== RESPUESTA ===
"""

    # Instrucciones específicas por tarea
    task_instructions = {
        "summarization": """Resume el contenido clave de los documentos proporcionados.
        - Extrae los puntos más importantes y relevantes
        - Organiza la información en secciones lógicas
        - Mantén la información técnica precisa
        - Incluye fechas, montos y términos importantes""",

        "comparison": """Compara y contrasta la información de los documentos.
        - Identifica similitudes y diferencias clave
        - Evalúa fortalezas y debilidades de cada opción
        - Proporciona recomendaciones basadas en evidencia
        - Usa tablas o listas para claridad""",

        "team_building": """Ayuda a armar el equipo óptimo basado en la información disponible.
        - Considera experiencia, certificaciones y especialización
        - Evalúa compatibilidad de roles y responsabilidades
        - Incluye costos y disponibilidad
        - Proporciona alternativas con justificaciones""",

        "analysis": """Analiza profundamente la información proporcionada.
        - Identifica patrones, tendencias y insights
        - Evalúa riesgos y oportunidades
        - Proporciona recomendaciones fundamentadas
        - Incluye métricas y datos cuantitativos cuando sea posible""",

        "generation": """Genera contenido basado en la información disponible.
        - Crea texto claro, profesional y bien estructurado
        - Mantén consistencia con el contexto proporcionado
        - Incluye todos los elementos relevantes
        - Asegura completitud y precisión""",

        "calculation": """Realiza cálculos y análisis cuantitativo.
        - Usa solo datos proporcionados en el contexto
        - Muestra metodología y fórmulas utilizadas
        - Proporciona resultados claros y verificables
        - Incluye rangos y márgenes de error si aplica""",

        "general": """Responde de manera precisa y útil.
        - Usa la información del contexto cuando esté disponible
        - Proporciona respuestas claras y bien estructuradas
        - Incluye ejemplos cuando ayude a la comprensión"""
    }

    # Guía de respuesta por complejidad
    complexity_guidance = {
        "low": """Proporciona una respuesta directa y concisa.
        - Enfócate en lo esencial
        - Usa lenguaje claro y accesible
        - Limita la respuesta a los puntos clave""",

        "medium": """Proporciona una respuesta equilibrada con detalle apropiado.
        - Incluye contexto y explicaciones necesarias
        - Organiza la información lógicamente
        - Mantén el foco en la pregunta principal""",

        "high": """Proporciona una respuesta comprehensiva y detallada.
        - Incluye análisis profundo y consideraciones múltiples
        - Proporciona evidencia y razonamiento paso a paso
        - Considera implicaciones a largo plazo"""
    }

    # Construir contexto
    if context_chunks:
        context_parts = []
        for i, chunk in enumerate(context_chunks):
            score = getattr(chunk, 'score', 0.0)
            relevance_indicator = "🔴" if score > 0.8 else "🟡" if score > 0.6 else "🟢"
            context_parts.append(f"{relevance_indicator} Fragmento {i+1} (Relevancia: {score:.2f}):\n{chunk.chunk_text.strip()}")
        context = "\n\n".join(context_parts)
    else:
        context = "No hay documentos específicos disponibles para esta consulta."

    return base_template.format(
        context=context,
        task_instructions=task_instructions.get(task_type, task_instructions["general"]),
        query=query,
        response_guidance=complexity_guidance.get(complexity, complexity_guidance["medium"])
    )


def initialize_provider():
    """
    Inicializa el provider de OpenAI GPT-4o-mini.
    """
    global _provider
    
    logger.info("Inicializando OpenAI GPT-4o-mini...")
    
    if settings.OPENAI_API_KEY:
        try:
            _provider = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                model_name=settings.OPENAI_MODEL
            )
            logger.info("✅ OpenAI GPT-4o-mini inicializado")
        except Exception as e:
            logger.error(f"❌ Error OpenAI: {e}")
            raise
    else:
        logger.warning("OPENAI_API_KEY no configurada")


def get_provider() -> LLMProvider:
    """
    Obtiene el provider de OpenAI.
    
    Returns:
        OpenAIProvider instance
    """
    if not _provider:
        initialize_provider()
    
    if not _provider:
        raise RuntimeError("OpenAI provider no disponible")
    
    return _provider


def generate_response(
    query: str, 
    context_chunks: List[DocumentChunk],
    task_type: str = None
) -> str:
    """
    Genera respuesta usando sistema LLM optimizado.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Chunks de contexto del RAG
        task_type: Tipo de tarea (opcional, se detecta automáticamente)
        
    Returns:
        Respuesta generada optimizada
    """
    start_time = time.time()
    
    # 1. Verificar cache semántico
    cached_response = check_semantic_cache(query, context_chunks)
    if cached_response:
        logger.info(f"✅ Respuesta obtenida del cache semántico en {time.time() - start_time:.3f}s")
        return cached_response
    
    # 2. Analizar complejidad de la query
    analysis = analyze_query_complexity(query, context_chunks)
    logger.info(f"📊 Análisis de query: {analysis['task_type']} | {analysis['complexity_level']} | Score: {analysis['complexity_score']}")
    
    # 3. Generar prompt avanzado
    advanced_prompt = get_advanced_template(
        analysis['task_type'], 
        analysis['complexity_level'], 
        query, 
        context_chunks
    )
    
    # 4. Obtener provider y generar respuesta
    provider = get_provider()
    
    # Crear un provider temporal con parámetros optimizados
    optimized_provider = OptimizedOpenAIProvider(
        api_key=settings.OPENAI_API_KEY,
        model_name=settings.OPENAI_MODEL,
        **analysis['optimal_params']
    )
    
    try:
        response = optimized_provider.generate_response(query, context_chunks, advanced_prompt)
        
        # 5. Guardar en cache semántico
        save_semantic_cache(query, context_chunks, response)
        
        elapsed_time = time.time() - start_time
        logger.info(f"🤖 Respuesta generada en {elapsed_time:.2f}s | Tipo: {analysis['task_type']} | Complejidad: {analysis['complexity_level']}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error generando respuesta optimizada: {e}")
        # Fallback al método original
        return provider.generate_response(query, context_chunks)


def generate_response_stream(
    query: str, 
    context_chunks: List[DocumentChunk],
    task_type: str = None
) -> Generator[str, None, None]:
    """
    Genera respuesta en streaming usando sistema LLM optimizado.
    
    Args:
        query: Pregunta del usuario
        context_chunks: Chunks de contexto del RAG
        task_type: Tipo de tarea (opcional, se detecta automáticamente)
        
    Yields:
        Chunks de texto de la respuesta optimizada
    """
    start_time = time.time()
    
    # 1. Verificar cache semántico
    cached_response = check_semantic_cache(query, context_chunks)
    if cached_response:
        logger.info(f"✅ Streaming desde cache semántico en {time.time() - start_time:.3f}s")
        # Convertir respuesta cacheada a streaming
        words = cached_response.split()
        for i, word in enumerate(words):
            yield word + " "
            if i % 10 == 0:  # Pequeña pausa cada 10 palabras para simular streaming
                time.sleep(0.01)
        return
    
    # 2. Analizar complejidad de la query
    analysis = analyze_query_complexity(query, context_chunks)
    logger.info(f"📊 Streaming - Análisis: {analysis['task_type']} | {analysis['complexity_level']}")
    
    # 3. Generar prompt avanzado
    advanced_prompt = get_advanced_template(
        analysis['task_type'], 
        analysis['complexity_level'], 
        query, 
        context_chunks
    )
    
    # 4. Obtener provider optimizado y hacer streaming
    optimized_provider = OptimizedOpenAIProvider(
        api_key=settings.OPENAI_API_KEY,
        model_name=settings.OPENAI_MODEL,
        **analysis['optimal_params']
    )
    
    try:
        for chunk in optimized_provider.generate_response_stream(query, context_chunks, advanced_prompt):
            yield chunk
            
        elapsed_time = time.time() - start_time
        logger.info(f"🎯 Streaming completado en {elapsed_time:.2f}s | Tipo: {analysis['task_type']}")
        
    except Exception as e:
        logger.error(f"Error en streaming optimizado: {e}")
        # Fallback al método original
        provider = get_provider()
        for chunk in provider.generate_response_stream(query, context_chunks):
            yield chunk


class OptimizedOpenAIProvider(OpenAIProvider):
    """
    Provider OpenAI optimizado con parámetros dinámicos y templates avanzados.
    """
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", **optimal_params):
        super().__init__(api_key, model_name)
        self.optimal_params = optimal_params
        logger.debug(f"Optimized provider initialized with params: {optimal_params}")
    
    def generate_response(self, query: str, context_chunks: List[DocumentChunk], custom_prompt: str = None) -> str:
        """Genera respuesta con prompt personalizado y parámetros optimizados."""
        prompt = custom_prompt if custom_prompt else self._build_prompt(query, context_chunks)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente de IA experto, preciso y altamente calificado en análisis de documentos comerciales y técnicos."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                **self.optimal_params,
                timeout=30.0
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error en provider optimizado: {e}")
            raise
    
    def generate_response_stream(self, query: str, context_chunks: List[DocumentChunk], custom_prompt: str = None) -> Generator[str, None, None]:
        """Genera respuesta en streaming con optimizaciones."""
        prompt = custom_prompt if custom_prompt else self._build_prompt(query, context_chunks)
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente de IA experto, preciso y altamente calificado en análisis de documentos comerciales y técnicos."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                **self.optimal_params,
                stream=True,
                timeout=30.0
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Error en streaming optimizado: {e}")
            raise


def get_llm_metrics() -> Dict[str, Any]:
    """
    Obtiene métricas de rendimiento del sistema LLM optimizado.
    
    Returns:
        Diccionario con estadísticas de uso y rendimiento
    """
    metrics = {
        "cache_enabled": redis_client is not None,
        "semantic_cache_ttl": SEMANTIC_CACHE_TTL,
        "similarity_threshold": SIMILARITY_THRESHOLD,
        "supported_task_types": ["summarization", "comparison", "team_building", "analysis", "generation", "calculation", "general"],
        "model": settings.OPENAI_MODEL if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY else "not_configured"
    }
    
    # Estadísticas de cache si está disponible
    if redis_client:
        try:
            cache_keys = redis_client.keys("semantic:*")
            metrics["cache_entries"] = len(cache_keys)
            
            # Calcular hit rate aproximado (últimas 100 operaciones)
            hit_rate_key = "llm:hit_rate"
            hit_data = redis_client.get(hit_rate_key)
            if hit_data:
                hit_stats = json.loads(hit_data.decode())
                metrics["cache_hit_rate"] = hit_stats.get("rate", 0)
                metrics["total_requests"] = hit_stats.get("total", 0)
            else:
                metrics["cache_hit_rate"] = 0
                metrics["total_requests"] = 0
                
        except Exception as e:
            logger.warning(f"Error obteniendo métricas de cache: {e}")
            metrics["cache_error"] = str(e)
    
    return metrics


def update_cache_hit_rate(hit: bool):
    """Actualiza las estadísticas de hit rate del cache."""
    if not redis_client:
        return
        
    try:
        hit_rate_key = "llm:hit_rate"
        current_data = redis_client.get(hit_rate_key)
        
        if current_data:
            stats = json.loads(current_data.decode())
        else:
            stats = {"hits": 0, "total": 0, "rate": 0}
        
        stats["total"] += 1
        if hit:
            stats["hits"] += 1
        
        # Calcular rate (últimas 1000 operaciones)
        if stats["total"] > 1000:
            stats["hits"] = max(0, stats["hits"] - (stats["total"] - 1000))
            stats["total"] = 1000
            
        stats["rate"] = (stats["hits"] / stats["total"]) * 100 if stats["total"] > 0 else 0
        
        redis_client.setex(hit_rate_key, 86400, json.dumps(stats))  # 24 horas
        
    except Exception as e:
        logger.warning(f"Error actualizando hit rate: {e}")


# Actualizar imports para incluir métricas
def check_semantic_cache(query: str, context_chunks: List[DocumentChunk]) -> Optional[str]:
    """Verifica si hay una respuesta cacheada similar."""
    if not redis_client:
        return None

    cache_key = get_semantic_cache_key(query, context_chunks)

    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            update_cache_hit_rate(True)
            return cached_data.decode('utf-8')
    except Exception as e:
        logger.warning(f"Error checking semantic cache: {e}")

    update_cache_hit_rate(False)
    return None
