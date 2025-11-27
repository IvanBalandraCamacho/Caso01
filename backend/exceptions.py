
class ServiceException(Exception):
    """Clase base para todas las excepciones del servicio."""
    def __init__(self, detail: str, status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)

class InvalidFileError(ServiceException):
    """Error de validación de archivos (ej. no es PDF, está vacío)."""
    def __init__(self, detail: str = "Archivo inválido o formato incorrecto."):
        super().__init__(detail, status_code=400)

class ExternalServiceError(ServiceException):
    """Error al comunicarse con un servicio externo (ej. LLM, base de datos)."""
    def __init__(self, detail: str = "Error en el servicio externo (IA)."):
        super().__init__(detail, status_code=500)