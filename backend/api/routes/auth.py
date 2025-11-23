"""
Endpoints de autenticación y gestión de usuarios.

Este módulo proporciona endpoints para:
- Registro de nuevos usuarios
- Login con JWT
- Obtener información del usuario actual
- Refresh de tokens
- Logout (opcional)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from models import database, schemas
from models.user import User
from core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_active_user
)
from core.config import settings
import logging

# Configurar logger
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/auth/register",
    response_model=schemas.UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario"
)
def register(
    user_in: schemas.UserCreate,
    db: Session = Depends(database.get_db)
):
    """
    Registra un nuevo usuario en el sistema.
    
    Proceso:
    1. Verifica que el email no esté registrado
    2. Valida la contraseña (mínimo 8 caracteres)
    3. Hash de la contraseña con bcrypt
    4. Crea el usuario en la base de datos
    5. Retorna el usuario creado (sin la contraseña)
    
    Args:
        user_in: Datos del usuario (email, password, full_name)
        db: Sesión de base de datos
        
    Returns:
        Usuario creado
        
    Raises:
        HTTPException 400: Si el email ya está registrado o la contraseña es inválida
    """
    # Verificar si el email ya existe
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        logger.warning(f"Intento de registro con email existente: {user_in.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Validar longitud de contraseña
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 8 caracteres"
        )
    
    # Hash de la contraseña
    hashed_password = get_password_hash(user_in.password)
    
    # Crear usuario
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=True,
        is_superuser=False
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"Usuario registrado exitosamente: {db_user.email}")
    return db_user


@router.post(
    "/auth/login",
    response_model=schemas.Token,
    summary="Login de usuario"
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    """
    Autentica un usuario y retorna un JWT token.
    
    Proceso:
    1. Busca el usuario por email
    2. Verifica la contraseña
    3. Verifica que el usuario esté activo
    4. Genera un JWT token
    5. Retorna el token
    
    Args:
        form_data: Formulario OAuth2 (username=email, password)
        db: Sesión de base de datos
        
    Returns:
        Token de acceso JWT
        
    Raises:
        HTTPException 401: Si las credenciales son incorrectas
        HTTPException 400: Si el usuario está inactivo
        
    Note:
        El campo 'username' del formulario OAuth2 se usa para el email
    """
    # Buscar usuario por email (OAuth2 usa 'username' pero nosotros usamos email)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Verificar usuario y contraseña
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Intento de login fallido para: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verificar que el usuario esté activo
    if not user.is_active:
        logger.warning(f"Intento de login de usuario inactivo: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    
    # Crear token de acceso
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    logger.info(f"Login exitoso para: {user.email}")
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get(
    "/auth/me",
    response_model=schemas.UserPublic,
    summary="Obtener usuario actual"
)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Obtiene la información del usuario autenticado.
    
    Este endpoint requiere autenticación (token JWT en header).
    
    Args:
        current_user: Usuario obtenido del token JWT
        
    Returns:
        Información del usuario actual
        
    Example:
        GET /api/v1/auth/me
        Headers: Authorization: Bearer <token>
    """
    logger.info(f"Usuario consultó su información: {current_user.email}")
    return current_user


@router.post(
    "/auth/refresh",
    response_model=schemas.Token,
    summary="Refrescar token de acceso"
)
def refresh_token(
    current_user: User = Depends(get_current_active_user)
):
    """
    Genera un nuevo token de acceso para el usuario autenticado.
    
    Útil para renovar el token antes de que expire sin requerir
    que el usuario vuelva a ingresar sus credenciales.
    
    Args:
        current_user: Usuario obtenido del token JWT actual
        
    Returns:
        Nuevo token de acceso
        
    Example:
        POST /api/v1/auth/refresh
        Headers: Authorization: Bearer <old_token>
    """
    # Crear nuevo token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": current_user.id},
        expires_delta=access_token_expires
    )
    
    logger.info(f"Token refrescado para: {current_user.email}")
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post(
    "/auth/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout de usuario"
)
def logout(
    current_user: User = Depends(get_current_active_user)
):
    """
    Logout del usuario actual.
    
    Nota: Con JWT stateless, el logout real se hace en el cliente
    eliminando el token. Este endpoint es opcional y principalmente
    para logging/auditoría.
    
    Args:
        current_user: Usuario obtenido del token JWT
        
    Returns:
        Mensaje de confirmación
    """
    logger.info(f"Usuario hizo logout: {current_user.email}")
    return {"message": "Logout exitoso"}
