from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from models import database, user as user_model, schemas
from core.config import settings
from core.rate_limit import limiter
from core.token_manager import token_manager
import secrets

# Use a backend without the 72-byte bcrypt limit for simplicity in this demo
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

router = APIRouter()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que la contraseña coincida con el hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera un hash seguro de la contraseña"""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """Crea un token JWT con expiración"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(username: str) -> str:
    """Crea un refresh token único"""
    refresh_token = secrets.token_urlsafe(32)
    token_manager.store_refresh_token(username, refresh_token)
    return refresh_token


def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(database.get_db)
) -> user_model.User:
    """Dependency para obtener el usuario actual desde el token JWT"""
    # Verificar si el token está en blacklist
    if token_manager.is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(user_model.User).filter(user_model.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_user_for_logout(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(database.get_db)
) -> user_model.User:
    """
    Dependency especial para logout que NO verifica blacklist
    (porque estamos a punto de agregar el token a la blacklist)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(user_model.User).filter(user_model.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/auth/register", response_model=schemas.UserPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")  # Límite estricto para registro
def register(request: Request, user_in: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """Registra un nuevo usuario"""
    # Validar que el username no exista
    existing = db.query(user_model.User).filter(
        user_model.User.username == user_in.username
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username already registered"
        )
    
    # Crear usuario con contraseña hasheada
    hashed_password = get_password_hash(user_in.password)
    new_user = user_model.User(
        username=user_in.username, 
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/auth/token", response_model=schemas.Token)
@limiter.limit("10/minute")  # Protección contra brute force
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    """Endpoint de login que retorna un token JWT y un refresh token"""
    user = db.query(user_model.User).filter(
        user_model.User.username == form_data.username
    ).first()
    
    # Verificar credenciales
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Crear tokens
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(user.username)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/auth/me", response_model=schemas.UserPublic)
def read_current_user(current_user: user_model.User = Depends(get_current_user)):
    """Retorna información del usuario autenticado"""
    return current_user


@router.post("/auth/refresh", response_model=schemas.Token)
@limiter.limit("10/minute")
def refresh_access_token(
    request: Request,
    refresh_request: schemas.RefreshTokenRequest,
    db: Session = Depends(database.get_db)
):
    """Obtiene un nuevo access token usando un refresh token válido"""
    # El refresh token debe estar en el formato: username:token
    # Buscar todos los usuarios y verificar el refresh token
    users = db.query(user_model.User).all()
    
    for user in users:
        stored_token = token_manager.get_refresh_token(user.username)
        if stored_token == refresh_request.refresh_token:
            # Token válido, crear nuevo access token
            access_token = create_access_token(data={"sub": user.username})
            return {
                "access_token": access_token,
                "refresh_token": stored_token,  # Mantener el mismo refresh token
                "token_type": "bearer"
            }
    
    # Si no se encuentra el token, es inválido
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token"
    )


@router.post("/auth/logout")
def logout(
    current_user: user_model.User = Depends(get_current_user_for_logout),
    token: str = Depends(oauth2_scheme)
):
    """Cierra sesión revocando el token actual y el refresh token"""
    # Añadir token a blacklist
    token_manager.blacklist_token(token, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Revocar refresh token
    token_manager.revoke_refresh_token(current_user.username)
    
    return {"message": "Successfully logged out"}
