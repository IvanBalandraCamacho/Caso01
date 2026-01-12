"""
Endpoints de autenticación y gestión de usuarios.

Este módulo proporciona endpoints para:
- Registro de nuevos usuarios
- Login con JWT
- Obtener información del usuario actual
- Refresh de tokens
- Logout (opcional)
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
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

# --- AGREGAR ESTOS IMPORTS ---
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import Body
from typing import Any
import os
# -----------------------------
import logging
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "TU_CLIENT_ID_DE_GCP_CONSOLE")
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
    
    # Log para debug
    logger.info(f"Intentando registrar: {user_in.email}, password length: {len(user_in.password)} bytes, password length (UTF-8): {len(user_in.password.encode('utf-8'))} bytes")
    
    # Validar longitud de contraseña
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 8 caracteres"
        )
    
    # Bcrypt tiene un límite de 72 bytes, truncar si es necesario
    password_to_hash = user_in.password
    if len(password_to_hash.encode('utf-8')) > 72:
        logger.warning(f"Contraseña muy larga ({len(password_to_hash.encode('utf-8'))} bytes), truncando a 72 bytes")
        # Truncar a 72 bytes de forma segura (evitando cortar en medio de caracteres UTF-8)
        password_bytes = password_to_hash.encode('utf-8')[:72]
        password_to_hash = password_bytes.decode('utf-8', errors='ignore')
    
    # Hash de la contraseña
    hashed_password = get_password_hash(password_to_hash)
    
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
        data={
            "sub": user.email, 
            "user_id": user.id,
            "first_name": user.full_name.split()[0] if user.full_name else "Usuario"
        },
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


@router.put(
    "/auth/me",
    response_model=schemas.UserPublic,
    summary="Actualizar perfil del usuario"
)
def update_profile(
    user_update: schemas.UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Actualiza la información del perfil del usuario autenticado.
    
    Args:
        user_update: Datos a actualizar (full_name, email)
        current_user: Usuario obtenido del token JWT
        db: Sesión de base de datos
        
    Returns:
        Usuario actualizado
        
    Raises:
        HTTPException 400: Si el email ya está en uso por otro usuario
    """
    # Si se está actualizando el email, verificar que no exista
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está en uso"
            )
        current_user.email = user_update.email
    
    # Actualizar campos
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Perfil actualizado para: {current_user.email}")
    return current_user


@router.post(
    "/auth/upload-profile-picture",
    response_model=schemas.UserPublic,
    summary="Subir foto de perfil"
)
async def upload_profile_picture(
    file: UploadFile,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Sube una foto de perfil para el usuario autenticado.
    
    Args:
        file: Archivo de imagen
        current_user: Usuario obtenido del token JWT
        db: Sesión de base de datos
        
    Returns:
        Usuario actualizado con la URL de la foto
        
    Raises:
        HTTPException 400: Si el archivo no es válido
    """
    import os
    import shutil
    from pathlib import Path
    
    # Validar tipo de archivo
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen"
        )
    
    # Validar tamaño (max 5MB)
    file.file.seek(0, 2)  # Ir al final del archivo
    file_size = file.file.tell()
    file.file.seek(0)  # Volver al inicio
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no debe superar 5MB"
        )
    
    # Crear directorio si no existe
    profile_pictures_dir = Path("uploaded_files/profile_pictures")
    profile_pictures_dir.mkdir(parents=True, exist_ok=True)
    
    # Generar nombre único para el archivo
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{current_user.id}{file_extension}"
    file_path = profile_pictures_dir / unique_filename
    
    # Guardar archivo
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error guardando foto de perfil: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar la imagen"
        )
    
    # Actualizar URL en base de datos
    profile_picture_url = f"/uploaded_files/profile_pictures/{unique_filename}"
    current_user.profile_picture = profile_picture_url
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Foto de perfil actualizada para: {current_user.email}")
    return current_user

@router.post(
    "/auth/login/google",
    response_model=schemas.Token,
    summary="Login con Google"
)
def google_login(
    token_data: dict = Body(...), 
    db: Session = Depends(database.get_db)
):
    """
    Autentica un usuario usando un token de Google ID.
    Si el usuario no existe, lo registra automáticamente.
    """
    token = token_data.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Token no proporcionado"
        )

    try:
        # 1. Validar el token con Google
        # Si tienes problemas con el Audience, puedes poner None en lugar de GOOGLE_CLIENT_ID temporalmente para probar
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            audience=GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID != "TU_CLIENT_ID_DE_GCP_CONSOLE" else None
        )

        # 2. Extraer info
        email = idinfo.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="El token de Google no contiene email")
            
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')

        # 3. Buscar usuario en BD
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # === REGISTRO AUTOMÁTICO ===
            logger.info(f"Registrando nuevo usuario vía Google: {email}")
            user = User(
                email=email,
                full_name=name,
                profile_picture=picture,
                hashed_password=None,  # Clave: Sin contraseña
                auth_provider="google", # Clave: Identificar origen
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Actualizar datos si ya existe (Opcional, útil para mantener foto actualizada)
            updated = False
            if picture and user.profile_picture != picture and user.auth_provider == "google":
                user.profile_picture = picture
                updated = True
            
            # Si el usuario se registró por email antes, podemos linkearlo o dar error.
            # Aquí asumimos que permitimos el login.
            if updated:
                db.commit()
                db.refresh(user)

        # 4. Generar Token JWT propio
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user.email, 
                "user_id": user.id,
                "first_name": user.full_name.split()[0] if user.full_name else "Usuario"
            },
            expires_delta=access_token_expires
        )
        
        logger.info(f"Login Google exitoso para: {user.email}")
        
        # Retornamos estructura compatible con schemas.Token
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except ValueError as e:
        logger.error(f"Error validando token Google: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token de Google inválido o expirado"
        )
    except Exception as e:
        logger.error(f"Error general login google: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Error procesando login con Google"
        )