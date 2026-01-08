"""Script para validar configuración de GCP."""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from core.gcp_service import gcp_service
from core.config import settings


def test_config():
    print("\n🔍 CONFIGURACIÓN\n")
    print(f"  Project: {settings.GOOGLE_CLOUD_PROJECT}")
    print(f"  Gemini API Key: {'✅' if settings.GOOGLE_API_KEY else '❌'}")
    creds_exist = settings.GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(settings.GOOGLE_APPLICATION_CREDENTIALS or "")
    print(f"  JSON Credentials: {'✅' if creds_exist else '❌'}")
    print(f"  Processor ID: {settings.DOCUMENT_AI_PROCESSOR_ID or '❌'}")
    print()


def test_gemini():
    print("🧪 TESTING GEMINI\n")
    try:
        if gcp_service.gemini_available:
            model = gcp_service.get_gemini_model()
            response = model.generate_content("Di 'OK' en una palabra")
            print(f"  ✅ Respuesta: {response.text}")
        else:
            print("  ❌ Gemini no disponible")
    except Exception as e:
        print(f"  ❌ Error: {e}")
    print()


def test_document_ai():
    print("🧪 TESTING DOCUMENT AI\n")
    if gcp_service.document_ai:
        print(f"  ✅ Cliente inicializado")
        print(f"  Processor: .../{settings.DOCUMENT_AI_PROCESSOR_ID}")
    else:
        print("  ❌ No disponible")
    print()


def test_nlp():
    print("🧪 TESTING NATURAL LANGUAGE\n")
    if gcp_service.natural_language:
        try:
            from google.cloud import language_v1
            doc = language_v1.Document(
                content="Google Cloud es excelente.",
                type_=language_v1.Document.Type.PLAIN_TEXT,
            )
            sentiment = gcp_service.natural_language.analyze_sentiment(
                request={"document": doc}
            ).document_sentiment
            print(f"  ✅ Score: {sentiment.score:.2f}")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    else:
        print("  ❌ No disponible")
    print()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  VALIDACIÓN GCP")
    print("="*60)
    
    test_config()
    test_gemini()
    test_document_ai()
    test_nlp()
    
    print("="*60 + "\n")
