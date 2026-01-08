import json
import asyncio
import redis
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Cliente Redis (en modo Pub/Sub)
redis_client = None
try:
    if hasattr(settings, "REDIS_URL"):
        redis_client = redis.from_url(settings.REDIS_URL)
        # Test connection
        redis_client.ping()
        logger.info("✅ Redis conectado para WebSocket notifications")
except Exception as e:
    logger.error(f"❌ Error conectando a Redis para WebSocket: {e}")
    redis_client = None

@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket):
    await websocket.accept()
    
    # Verificar si Redis está disponible
    if redis_client is None:
        logger.warning("⚠️ Redis no disponible. Cerrando WebSocket con código 1011")
        await websocket.close(code=1011, reason="Redis service unavailable")
        return

    pubsub = None
    try:
        # Crear cliente Redis (en modo Pub/Sub)
        pubsub = redis_client.pubsub()
        # SUSCRIBIR al canal "documents" para recibir notificaciones de REDIS
        pubsub.subscribe("documents")  # Canal donde publica Celery
        logger.info("📡 WebSocket conectado y suscrito al canal 'documents'")

        while True:
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message and message.get("data"):
                try:
                    data = json.loads(message["data"].decode())
                    await websocket.send_json(data)
                    logger.debug(f"📤 Notificación enviada: {data}")
                except json.JSONDecodeError as e:
                    logger.error(f"❌ Error decodificando mensaje de Redis: {e}")
                except Exception as e:
                    logger.error(f"❌ Error enviando mensaje WebSocket: {e}")

            await asyncio.sleep(0.2)  # evita usar CPU al 100%
            
    except WebSocketDisconnect:
        logger.info("🔌 Cliente WebSocket desconectado")
    except redis.ConnectionError as e:
        logger.error(f"❌ Error de conexión Redis: {e}")
        await websocket.close(code=1011, reason="Redis connection lost")
    except Exception as e:
        logger.error(f"❌ Error inesperado en WebSocket: {e}")
        await websocket.close(code=1011, reason="Internal server error")
    finally:
        if pubsub:
            try:
                pubsub.close()
                logger.info("🔌 PubSub de Redis cerrado")
            except Exception as e:
                logger.error(f"❌ Error cerrando pubsub: {e}")