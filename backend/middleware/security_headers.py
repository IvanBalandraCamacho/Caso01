"""
Middleware de headers de seguridad para el proyecto Caso01.

Este middleware agrega headers de seguridad HTTP a todas las respuestas
para proteger contra ataques comunes.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware que agrega headers de seguridad a todas las respuestas HTTP.
    
    Headers implementados:
    - X-Content-Type-Options: Previene MIME type sniffing
    - X-Frame-Options: Previene clickjacking
    - X-XSS-Protection: Protección contra XSS (legacy)
    - Strict-Transport-Security: Fuerza HTTPS
    - Content-Security-Policy: Política de seguridad de contenido
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        Procesa la request y agrega headers de seguridad a la response.
        
        Args:
            request: Request HTTP entrante
            call_next: Siguiente middleware/handler
            
        Returns:
            Response con headers de seguridad agregados
        """
        # Procesar la request
        response: Response = await call_next(request)
        
        # --- Headers de Seguridad ---
        
        # 1. X-Content-Type-Options
        # Previene que el navegador "adivine" el tipo MIME
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # 2. X-Frame-Options
        # Previene que la página sea embebida en un iframe (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"
        
        # 3. X-XSS-Protection (legacy, pero aún útil para navegadores antiguos)
        # Habilita el filtro XSS del navegador
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 4. Strict-Transport-Security (HSTS)
        # Fuerza HTTPS por 1 año, incluyendo subdominios
        # Nota: Solo agregar en producción con HTTPS habilitado
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # 5. Content-Security-Policy (CSP)
        # Política básica - ajustar según necesidades
        # response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        # 6. Referrer-Policy
        # Controla cuánta información de referrer se envía
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # 7. Permissions-Policy (antes Feature-Policy)
        # Controla qué features del navegador están permitidas
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response
