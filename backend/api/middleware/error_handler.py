
from fastapi import Request, status
from fastapi.responses import JSONResponse
from core.exceptions import BaseAPIException
import logging

logger = logging.getLogger(__name__)

async def error_handler_middleware(request: Request, call_next):
    """Middleware para capturar y formatear errores"""
    try:
        return await call_next(request)
    except BaseAPIException as exc:
        logger.error(f"API Exception: {exc.message}", extra={"details": exc.details})
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.message,
                "details": exc.details,
                "status_code": exc.status_code
            }
        )
    except Exception as exc:
        logger.exception(f"Unhandled exception: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Error interno del servidor",
                "details": {"message": str(exc)},
                "status_code": 500
            }
        )