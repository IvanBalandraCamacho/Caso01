"""
Configuración de logging estructurado para el proyecto Caso01.

Este módulo configura el sistema de logging con:
- Formato estructurado y consistente
- Niveles de log apropiados
- Rotación automática de archivos
- Logging a consola y archivo
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

# Crear directorio de logs si no existe
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Formato de logs
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(log_level: str = "INFO"):
    """
    Configura el sistema de logging para la aplicación.
    
    Args:
        log_level: Nivel de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        
    Example:
        >>> from core.logging_config import setup_logging
        >>> setup_logging("INFO")
        >>> import logging
        >>> logger = logging.getLogger(__name__)
        >>> logger.info("Aplicación iniciada")
    """
    
    # Convertir string a nivel de logging
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Configurar logger raíz
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Limpiar handlers existentes
    root_logger.handlers.clear()
    
    # --- Handler 1: Consola (stdout) ---
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # --- Handler 2: Archivo con rotación ---
    log_file = LOGS_DIR / f"app_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,  # Mantener 5 archivos de backup
        encoding='utf-8'
    )
    file_handler.setLevel(numeric_level)
    file_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # --- Handler 3: Archivo de errores (solo ERROR y CRITICAL) ---
    error_log_file = LOGS_DIR / f"errors_{datetime.now().strftime('%Y%m%d')}.log"
    error_handler = RotatingFileHandler(
        error_log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    root_logger.addHandler(error_handler)
    
    # Configurar niveles para librerías externas (reducir ruido)
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.INFO)
    
    # Log inicial
    logger = logging.getLogger(__name__)
    logger.info(f"Sistema de logging configurado - Nivel: {log_level}")
    logger.info(f"Logs guardados en: {LOGS_DIR.absolute()}")


def get_logger(name: str) -> logging.Logger:
    """
    Obtiene un logger configurado para un módulo específico.
    
    Args:
        name: Nombre del módulo (usar __name__)
        
    Returns:
        Logger configurado
        
    Example:
        >>> from core.logging_config import get_logger
        >>> logger = get_logger(__name__)
        >>> logger.info("Mensaje de información")
        >>> logger.error("Mensaje de error")
    """
    return logging.getLogger(name)
