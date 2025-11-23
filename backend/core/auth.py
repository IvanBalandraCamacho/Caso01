"""
Utilidades de autenticación y autorización.

Este módulo proporciona funciones para:
- Hash y verificación de contraseñas con bcrypt
- Creación y verificación de JWT tokens
- Dependencias de FastAPI para autenticación
- Obtención del usuario actual desde el token
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from core.config import settings
from models import database
from models.user import User
import logging

# Configurar logger
logger = logging.getLogger(__name__)

# Configuración de bcrypt para hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de OAuth2 para JWT
# tokenUrl es la ruta donde el cliente obtiene el token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ============================================================================
# FUNCIONES DE PASSWORD
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña en texto plano contra su hash.
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash de la contraseña (bcrypt)
        
    Returns:
        True si la contraseña es correcta, False si no
        
    Example:
        >>> hashed = get_password_hash("mypassword")
        >>> verify_password("mypassword", hashed)
        True
        >>> verify_password("wrongpassword", hashed)
        False
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Genera un hash bcrypt de una contraseña.
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        Hash bcrypt de la contraseña
        
    Example:
        >>> hash = get_password_hash("mypassword")
        >>> len(hash) > 50  # Hash es largo
        True
    """
    return pwd_context.hash(password)


# ============================================================================
# FUNCIONES DE JWT
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT access token.
    
    Args:
        data: Datos a incluir en el token (ej: {"sub": email, "user_id": id})
        expires_delta: Tiempo de expiración personalizado (opcional)
        
    Returns:
        JWT token codificado
        
    Example:
        >>> token = create_access_token({"sub": "user@example.com", "user_id": "123"})
        >>> len(token) > 100  # Token es largo
        True
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    logger.info(f"Token creado para: {data.get('sub')}")
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodifica y verifica un JWT token.
    
    Args:
        token: JWT token a decodificar
        
    Returns:
        Payload del token si es válido, None si no es válido
        
    Example:
        >>> token = create_access_token({"sub": "user@example.com"})
        >>> payload = decode_access_token(token)
        >>> payload["sub"]
        'user@example.com'
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"Error decodificando token: {e}")
        return None


# ============================================================================
# DEPENDENCIAS DE FASTAPI
# ============================================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> User:
    """
    Obtiene el usuario actual desde el JWT token.
    
    Esta función se usa como dependencia en endpoints protegidos.
    Verifica el token, extrae el email, busca el usuario en la DB.
    
    Args:
        token: JWT token del header Authorization
        db: Sesión de base de datos
        
    Returns:
        Usuario autenticado
        
    Raises:
        HTTPException 401: Si el token es inválido o el usuario no existe
        
    Example:
        @router.get("/protected")
        def protected_endpoint(current_user: User = Depends(get_current_user)):
            return {"user": current_user.email}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decodificar token
    payload = decode_access_token(token)
    if payload is None:
        logger.warning("Token inválido o expirado")
        raise credentials_exception
    
    # Extraer email del token
    email: str = payload.get("sub")
    if email is None:
        logger.warning("Token sin email (sub)")
        raise credentials_exception
    
    # Buscar usuario en la base de datos
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"Usuario no encontrado: {email}")
        raise credentials_exception
    
    logger.info(f"Usuario autenticado: {user.email}")
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Verifica que el usuario actual esté activo.
    
    Esta función se usa como dependencia en endpoints que requieren
    que el usuario esté activo (no deshabilitado).
    
    Args:
        current_user: Usuario obtenido de get_current_user
        
    Returns:
        Usuario activo
        
    Raises:
        HTTPException 400: Si el usuario está inactivo
        
    Example:
        @router.get("/protected")
        def protected_endpoint(current_user: User = Depends(get_current_active_user)):
            return {"user": current_user.email}
    """
    if not current_user.is_active:
        logger.warning(f"Usuario inactivo intentó acceder: {current_user.email}")
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    
    return current_user


def get_current_superuser(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Verifica que el usuario actual sea superusuario.
    
    Esta función se usa como dependencia en endpoints de administración.
    
    Args:
        current_user: Usuario obtenido de get_current_active_user
        
    Returns:
        Usuario superusuario
        
    Raises:
        HTTPException 403: Si el usuario no es superusuario
        
    Example:
        @router.delete("/admin/users/{user_id}")
        def delete_user(
            user_id: str,
            current_user: User = Depends(get_current_superuser)
        ):
            # Solo superusers pueden eliminar usuarios
            ...
    """
    if not current_user.is_superuser:
        logger.warning(f"Usuario no-superuser intentó acceder a admin: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes"
        )
    
    return current_user
