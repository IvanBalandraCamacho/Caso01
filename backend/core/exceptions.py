
class BaseAPIException(Exception):
    """Excepción base para errores de la API"""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class WorkspaceNotFoundException(BaseAPIException):
    def __init__(self, workspace_id: str):
        super().__init__(
            message=f"Workspace {workspace_id} no encontrado",
            status_code=404,
            details={"workspace_id": workspace_id}
        )


class DocumentNotFoundException(BaseAPIException):
    def __init__(self, document_id: str):
        super().__init__(
            message=f"Documento {document_id} no encontrado",
            status_code=404,
            details={"document_id": document_id}
        )


class FileProcessingException(BaseAPIException):
    def __init__(self, file_name: str, error: str):
        super().__init__(
            message=f"Error procesando archivo {file_name}",
            status_code=422,
            details={"file_name": file_name, "error": error}
        )


class VectorStoreException(BaseAPIException):
    def __init__(self, operation: str, error: str):
        super().__init__(
            message=f"Error en operación de vector store: {operation}",
            status_code=500,
            details={"operation": operation, "error": error}
        )