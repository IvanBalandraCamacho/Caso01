"""
Utilidades de seguridad para el proyecto Caso01.

Este módulo proporciona funciones para:
- Validación de archivos subidos (tamaño, tipo, extensión)
- Sanitización de nombres de archivo
- Constantes de seguridad
"""

import os
import re
from fastapi import UploadFile, HTTPException
from typing import Set

# ============================================================================
# CONSTANTES DE SEGURIDAD
# ============================================================================

# Tamaño máximo de archivo: 50 MB
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB en bytes

# Tipos MIME permitidos
ALLOWED_MIME_TYPES: Set[str] = {
    "application/pdf",                                                          # PDF
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        # XLSX
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", # PPTX
    "text/plain",                                                               # TXT
    "text/csv",                                                                 # CSV
}

# Extensiones de archivo permitidas
ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv"}

# Longitud máxima de nombre de archivo
MAX_FILENAME_LENGTH = 255


# ============================================================================
# FUNCIONES DE VALIDACIÓN
# ============================================================================

def validate_file(file: UploadFile) -> None:
    """
    Valida un archivo subido por el usuario.
    
    Verifica:
    1. Extensión del archivo
    2. Tipo MIME
    3. Tamaño del archivo
    4. Sanitiza el nombre del archivo
    
    Args:
        file: Archivo subido por el usuario
        
    Raises:
        HTTPException: Si el archivo no cumple con los requisitos de seguridad
        
    Example:
        >>> from fastapi import UploadFile
        >>> validate_file(uploaded_file)  # Lanza excepción si no es válido
    """
    
    # 1. Validar que el archivo tenga nombre
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="El archivo debe tener un nombre válido."
        )
    
    # 2. Validar extensión
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Extensiones permitidas: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    
    # 3. Validar MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo MIME no permitido: {file.content_type}. "
                   f"Asegúrese de subir un archivo válido ({', '.join(sorted(ALLOWED_EXTENSIONS))})"
        )
    
    # 4. Validar tamaño del archivo
    # Nota: Necesitamos leer el tamaño del archivo sin cargarlo completamente en memoria
    file.file.seek(0, 2)  # Ir al final del archivo
    file_size = file.file.tell()  # Obtener posición actual (tamaño)
    file.file.seek(0)  # Volver al inicio para que pueda ser leído después
    
    if file_size > MAX_FILE_SIZE:
        max_size_mb = MAX_FILE_SIZE / 1024 / 1024
        actual_size_mb = file_size / 1024 / 1024
        raise HTTPException(
            status_code=413,  # Payload Too Large
            detail=f"Archivo demasiado grande ({actual_size_mb:.1f}MB). Tamaño máximo permitido: {max_size_mb:.0f}MB"
        )
    
    # 5. Sanitizar nombre de archivo
    file.filename = sanitize_filename(file.filename)


def sanitize_filename(filename: str) -> str:
    """
    Sanitiza el nombre de un archivo para prevenir ataques de path traversal.
    
    Elimina:
    - Caracteres especiales peligrosos
    - Secuencias de path traversal (../, ..\)
    - Caracteres de control
    
    Limita:
    - Longitud del nombre de archivo
    
    Args:
        filename: Nombre original del archivo
        
    Returns:
        Nombre de archivo sanitizado y seguro
        
    Example:
        >>> sanitize_filename("../../etc/passwd")
        'etcpasswd'
        >>> sanitize_filename("archivo con espacios.pdf")
        'archivo_con_espacios.pdf'
        >>> sanitize_filename("archivo@#$%.docx")
        'archivo.docx'
    """
    
    # 1. Remover path (solo quedarse con el nombre del archivo)
    filename = os.path.basename(filename)
    
    # 2. Reemplazar espacios por guiones bajos
    filename = filename.replace(" ", "_")
    
    # 3. Remover caracteres peligrosos (mantener solo alfanuméricos, guiones, puntos)
    # Permite: a-z, A-Z, 0-9, -, _, .
    filename = re.sub(r'[^\w\-\.]', '', filename)
    
    # 4. Prevenir nombres de archivo que empiecen con punto (archivos ocultos)
    if filename.startswith('.'):
        filename = filename[1:]
    
    # 5. Asegurar que haya una extensión
    if '.' not in filename:
        filename = filename + '.txt'  # Extensión por defecto
    
    # 6. Limitar longitud
    if len(filename) > MAX_FILENAME_LENGTH:
        # Mantener la extensión
        name, ext = os.path.splitext(filename)
        max_name_length = MAX_FILENAME_LENGTH - len(ext)
        filename = name[:max_name_length] + ext
    
    # 7. Prevenir nombres vacíos
    if not filename or filename == '.txt':
        filename = 'unnamed_file.txt'
    
    return filename


def get_file_info(file: UploadFile) -> dict:
    """
    Obtiene información sobre un archivo subido.
    
    Args:
        file: Archivo subido
        
    Returns:
        Diccionario con información del archivo
        
    Example:
        >>> info = get_file_info(uploaded_file)
        >>> print(info)
        {
            'filename': 'documento.pdf',
            'content_type': 'application/pdf',
            'size_bytes': 1024000,
            'size_mb': 1.0,
            'extension': '.pdf'
        }
    """
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    return {
        'filename': file.filename,
        'content_type': file.content_type,
        'size_bytes': file_size,
        'size_mb': round(file_size / 1024 / 1024, 2),
        'extension': os.path.splitext(file.filename)[1].lower()
    }
