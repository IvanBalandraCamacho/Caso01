import json
import asyncio
import redis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.config import settings

router = APIRouter()

# Cliente Redis (en modo Pub/Sub)
redis_client = (
    redis.from_url(settings.REDIS_URL) if hasattr(settings, "REDIS_URL") else None
)

@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket):
    await websocket.accept()

    # Crear cliente Redis (en modo Pub/Sub)
    pubsub = redis_client.pubsub()
    # SUSCRIBIR al canal "documents" para recibir notificaciones dE REDIS
    pubsub.subscribe("documents")  # Canal donde publica Celery

    try:
        while True:
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                data = json.loads(message["data"].decode())
                await websocket.send_json(data)

            await asyncio.sleep(0.2)  # evita usar CPU al 100%
    except WebSocketDisconnect:
        pubsub.close()