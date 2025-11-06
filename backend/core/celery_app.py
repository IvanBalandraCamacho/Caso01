from celery import Celery
from .config import settings

celery_app = Celery(
    "ia_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Le dice a Celery que busque tareas en el módulo 'backend.processing.tasks'
celery_app.autodiscover_tasks(['processing'])