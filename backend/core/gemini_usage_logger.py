"""
Gemini Usage Logger - Logs detallados de uso de tokens y costos.

Este módulo proporciona funciones para loggear el uso de tokens de Gemini
y calcular costos aproximados basados en la tabla de precios.
"""

import logging
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# ============================================================================
# PRECIOS DE GEMINI (USD por 1M tokens) - Enero 2026
# Fuente: https://ai.google.dev/pricing
# ============================================================================

GEMINI_PRICING = {
    # Gemini 3 Pro (Thinking Mode)
    "gemini-3-pro-preview": {
        "input": 1.25,      # $1.25 / 1M tokens entrada
        "output": 5.00,     # $5.00 / 1M tokens salida
        "thinking": 3.50,   # $3.50 / 1M tokens thinking (estimado)
    },
    # Gemini 3 Flash (Thinking Mode)
    "gemini-3-flash-preview": {
        "input": 0.075,     # $0.075 / 1M tokens entrada
        "output": 0.30,     # $0.30 / 1M tokens salida
        "thinking": 0.15,   # $0.15 / 1M tokens thinking (estimado)
    },
    # Gemini 2.0 Flash (Legacy)
    "gemini-2.0-flash-exp": {
        "input": 0.075,
        "output": 0.30,
        "thinking": 0.0,
    },
    # Default fallback
    "default": {
        "input": 0.10,
        "output": 0.40,
        "thinking": 0.20,
    }
}


@dataclass
class GeminiUsageStats:
    """Estadísticas de uso de una llamada a Gemini."""
    model: str
    operation: str
    input_tokens: int
    output_tokens: int
    thinking_tokens: int
    total_tokens: int
    input_cost: float
    output_cost: float
    thinking_cost: float
    total_cost: float
    duration_ms: Optional[int] = None
    prompt_preview: Optional[str] = None


def calculate_cost(model: str, input_tokens: int, output_tokens: int, thinking_tokens: int = 0) -> dict:
    """
    Calcula el costo aproximado de una llamada a Gemini.
    
    Args:
        model: Nombre del modelo
        input_tokens: Tokens de entrada
        output_tokens: Tokens de salida
        thinking_tokens: Tokens de thinking (si aplica)
        
    Returns:
        Dict con costos desglosados
    """
    pricing = GEMINI_PRICING.get(model, GEMINI_PRICING["default"])
    
    # Calcular costos (precio por 1M tokens)
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    thinking_cost = (thinking_tokens / 1_000_000) * pricing["thinking"]
    total_cost = input_cost + output_cost + thinking_cost
    
    return {
        "input_cost": input_cost,
        "output_cost": output_cost,
        "thinking_cost": thinking_cost,
        "total_cost": total_cost
    }


def log_gemini_usage(
    model: str,
    operation: str,
    response,
    prompt: str = None,
    duration_ms: int = None
) -> GeminiUsageStats:
    """
    Loggea el uso de una llamada a Gemini con detalles de tokens y costos.
    
    Args:
        model: Nombre del modelo usado
        operation: Tipo de operación (chat, analysis, workspace_name, etc.)
        response: Respuesta de Gemini (con usage_metadata)
        prompt: Prompt enviado (opcional, para preview)
        duration_ms: Duración de la llamada en ms
        
    Returns:
        GeminiUsageStats con las estadísticas
    """
    # Extraer metadata de uso
    input_tokens = 0
    output_tokens = 0
    thinking_tokens = 0
    
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        metadata = response.usage_metadata
        input_tokens = getattr(metadata, 'prompt_token_count', 0) or 0
        output_tokens = getattr(metadata, 'candidates_token_count', 0) or 0
        # Thinking tokens pueden estar en diferentes atributos
        thinking_tokens = getattr(metadata, 'thoughts_token_count', 0) or 0
        if not thinking_tokens:
            thinking_tokens = getattr(metadata, 'thinking_token_count', 0) or 0
    
    total_tokens = input_tokens + output_tokens + thinking_tokens
    
    # Calcular costos
    costs = calculate_cost(model, input_tokens, output_tokens, thinking_tokens)
    
    # Crear objeto de estadísticas
    stats = GeminiUsageStats(
        model=model,
        operation=operation,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        thinking_tokens=thinking_tokens,
        total_tokens=total_tokens,
        input_cost=costs["input_cost"],
        output_cost=costs["output_cost"],
        thinking_cost=costs["thinking_cost"],
        total_cost=costs["total_cost"],
        duration_ms=duration_ms,
        prompt_preview=prompt[:100] + "..." if prompt and len(prompt) > 100 else prompt
    )
    
    # Formatear el log
    is_pro = "pro" in model.lower()
    model_emoji = "🔷" if is_pro else "⚡"
    model_label = "PRO" if is_pro else "FLASH"
    
    log_message = f"""
{'='*70}
{model_emoji} GEMINI {model_label} - {operation.upper()}
{'='*70}
📊 Modelo: {model}
⏱️  Duración: {duration_ms}ms
{'─'*70}
📥 INPUT:    {input_tokens:>10,} tokens  →  ${stats.input_cost:.6f}
📤 OUTPUT:   {output_tokens:>10,} tokens  →  ${stats.output_cost:.6f}
🧠 THINKING: {thinking_tokens:>10,} tokens  →  ${stats.thinking_cost:.6f}
{'─'*70}
📊 TOTAL:    {total_tokens:>10,} tokens  →  ${stats.total_cost:.6f}
{'='*70}"""
    
    # Loggear según el costo (WARNING si es caro)
    if stats.total_cost > 0.01:  # Más de 1 centavo
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    return stats


def log_gemini_stream_start(model: str, operation: str, prompt: str = None):
    """Log al inicio de una llamada streaming."""
    is_pro = "pro" in model.lower()
    model_emoji = "🔷" if is_pro else "⚡"
    model_label = "PRO" if is_pro else "FLASH"
    
    logger.info(f"{model_emoji} GEMINI {model_label} [{operation}] - Iniciando streaming...")
    if prompt:
        preview = prompt[:150] + "..." if len(prompt) > 150 else prompt
        logger.debug(f"   Prompt preview: {preview}")


def log_gemini_stream_end(
    model: str, 
    operation: str, 
    input_tokens: int = 0,
    output_tokens: int = 0,
    thinking_tokens: int = 0,
    duration_ms: int = None
):
    """Log al final de una llamada streaming con totales."""
    total_tokens = input_tokens + output_tokens + thinking_tokens
    costs = calculate_cost(model, input_tokens, output_tokens, thinking_tokens)
    
    is_pro = "pro" in model.lower()
    model_emoji = "🔷" if is_pro else "⚡"
    model_label = "PRO" if is_pro else "FLASH"
    
    log_message = f"""
{model_emoji} GEMINI {model_label} [{operation}] - Stream completado
   📥 Input: {input_tokens:,} | 📤 Output: {output_tokens:,} | 🧠 Think: {thinking_tokens:,}
   💰 Costo: ${costs['total_cost']:.6f} | ⏱️ {duration_ms}ms"""
    
    if costs['total_cost'] > 0.01:
        logger.warning(log_message)
    else:
        logger.info(log_message)


def log_gemini_error(model: str, operation: str, error: Exception):
    """Log de error en llamada a Gemini."""
    is_pro = "pro" in model.lower()
    model_emoji = "🔷" if is_pro else "⚡"
    model_label = "PRO" if is_pro else "FLASH"
    
    logger.error(f"{model_emoji} GEMINI {model_label} [{operation}] - ❌ Error: {str(error)}")
