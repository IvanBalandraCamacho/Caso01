"""
Gestor centralizado de servicios GCP.
Inicializa y proporciona acceso a todos los servicios de Google Cloud.
"""

import os
from typing import Optional
from google.cloud import documentai_v1 as documentai
from google.cloud import language_v1
import google.generativeai as genai
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class GCPServiceManager:
    """Gestor único para todos los servicios de GCP."""
    
    _instance: Optional['GCPServiceManager'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._document_ai_client: Optional[documentai.DocumentProcessorServiceClient] = None
        self._nlp_client: Optional[language_v1.LanguageServiceClient] = None
        self._gemini_configured = False
        
        self._initialize_services()
    
    def _initialize_services(self):
        """Inicializa todos los servicios GCP."""
        try:
            # 1. Configurar Gemini
            if settings.GOOGLE_API_KEY:
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                self._gemini_configured = True
                logger.info("✅ Gemini API configurada")
            else:
                logger.warning("⚠️ GOOGLE_API_KEY no configurada")
            
            # 2. Document AI Client
            if settings.DOCUMENT_AI_PROCESSOR_ID:
                self._document_ai_client = documentai.DocumentProcessorServiceClient()
                logger.info("✅ Document AI client inicializado")
            else:
                logger.warning("⚠️ Document AI no configurado (falta PROCESSOR_ID)")
            
            # 3. Natural Language Client
            if settings.ENABLE_NATURAL_LANGUAGE:
                self._nlp_client = language_v1.LanguageServiceClient()
                logger.info("✅ Natural Language API inicializada")
            
        except Exception as e:
            logger.error(f"❌ Error inicializando GCP services: {e}")
    
    # ========================================================================
    # GETTERS
    # ========================================================================
    
    @property
    def document_ai(self) -> Optional[documentai.DocumentProcessorServiceClient]:
        """Retorna cliente de Document AI."""
        return self._document_ai_client
    
    @property
    def natural_language(self) -> Optional[language_v1.LanguageServiceClient]:
        """Retorna cliente de Natural Language API."""
        return self._nlp_client
    
    @property
    def gemini_available(self) -> bool:
        """Verifica si Gemini está disponible."""
        return self._gemini_configured
    
    def get_gemini_model(self, model_name: str = None):
        """
        Obtiene un modelo de Gemini.
        
        Args:
            model_name: Nombre del modelo (default: desde settings)
        
        Returns:
            Modelo de Gemini configurado
        """
        if not self._gemini_configured:
            raise RuntimeError("Gemini no está configurado")
        
        model = model_name or settings.GEMINI_MODEL
        return genai.GenerativeModel(model)
    
    def get_document_processor_name(self) -> str:
        """Retorna el nombre completo del processor de Document AI."""
        return (
            f"projects/{settings.GOOGLE_CLOUD_PROJECT}/"
            f"locations/{settings.DOCUMENT_AI_LOCATION}/"
            f"processors/{settings.DOCUMENT_AI_PROCESSOR_ID}"
        )


# Instancia global (singleton)
gcp_service = GCPServiceManager()
