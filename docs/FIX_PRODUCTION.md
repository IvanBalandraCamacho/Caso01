# Plan de Corrección y Optimización para Producción

Este documento detalla los pasos necesarios para asegurar, optimizar y preparar el proyecto para su despliegue en producción.

## 1. Seguridad y Configuración del Backend (`backend/main.py`)

**Objetivo:** Eliminar vulnerabilidades críticas de CORS y evitar migraciones automáticas conflictivas.

### Instrucciones:
Edita el archivo `backend/main.py` y realiza los siguientes cambios:

1.  **Corregir CORS:**
    Busca la línea:
    ```python
    origins = ["*"]  # DEBUG: Allow all origins
    ```
    Reemplázala por:
    ```python
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if not origins:
        origins = ["*"] # Fallback controlado, idealmente vacío en prod
    ```

2.  **Desactivar creación automática de tablas:**
    Comenta la llamada a la función de creación de tablas, ya que en producción se debe usar Alembic:
    ```python
    # create_tables_with_retry()  # Comentado para producción, usar Alembic
    ```

## 2. Infraestructura Docker (`docker-compose.prod.yml`)

**Objetivo:** Hardening de contenedores y eliminación de puertos expuestos innecesarios.

### Instrucciones:

1.  **Crear `backend/Dockerfile.prod`:**
    Crea un nuevo archivo en `backend/Dockerfile.prod` con el siguiente contenido (optimizado para producción):
    ```dockerfile
    FROM python:3.11-slim

    WORKDIR /app
    
    ENV PYTHONDONTWRITEBYTECODE 1
    ENV PYTHONUNBUFFERED 1

    COPY requirements.txt .
    RUN pip install --no-cache-dir --upgrade pip && \
        pip install --no-cache-dir torch --index-url [https://download.pytorch.org/whl/cpu](https://download.pytorch.org/whl/cpu) && \
        pip install --no-cache-dir -r requirements.txt

    COPY . .
    
    # Crear usuario no-root por seguridad
    RUN adduser --disabled-password --gecos '' appuser
    USER appuser

    CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
    ```

2.  **Actualizar `docker-compose.prod.yml`:**
    Modifica el servicio `backend`:
    * Cambia `dockerfile: Dockerfile.dev` a `dockerfile: Dockerfile.prod`.
    * **ELIMINA** la sección `ports` completa (el mapeo `"8000:8000"`). El backend solo debe ser accesible a través de la red interna de Docker por Nginx.

## 3. Configuración del Servidor Web (`nginx/nginx.conf`)

**Objetivo:** Preparar Nginx para tráfico real y SSL.

### Instrucciones:
Edita `nginx/nginx.conf`:

1.  Cambia `server_name localhost;` por `server_name _;` (o tu dominio real si lo tienes).
2.  Asegúrate de que la configuración permita `client_max_body_size 50M;` dentro del bloque `http` o `server` para permitir la subida de archivos grandes (PDFs).

## 4. Implementación de Memoria de Bajo Costo (`backend/core/chat_service.py`)

**Objetivo:** Permitir que la IA recuerde el contexto usando la base de datos existente (MySQL) en lugar de pagar servicios externos.

### Instrucciones:
Edita `backend/core/chat_service.py` y agrega la siguiente función al final del archivo:

```python
def get_chat_history_for_llm(db: Session, conversation_id: str, limit: int = 20):
    """
    Recupera los últimos mensajes para dar contexto al LLM sin costo adicional.
    """
    from models.conversation import Message # Asegurar importación
    
    # 1. Obtener mensajes recientes
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.desc()).limit(limit).all()
    
    # 2. Reordenar cronológicamente
    messages.reverse()
    
    # 3. Formatear para el LLM
    history = []
    for msg in messages:
        # Filtrar mensajes vacíos o de sistema si es necesario
        if msg.content:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
            
    return history
5. Limpieza de Código Frontend
Objetivo: Eliminar deuda técnica y rutas muertas.

Instrucciones:
Elimina completamente el directorio front-v2/app/api/copilot y su contenido. El frontend ahora se comunica directamente con el backend (vía Nginx) y este proxy de Next.js es obsoleto.

Nota Final: Recuerda regenerar tus credenciales (API Keys y contraseñas de DB) y configurarlas en el entorno de despliegue, no en el código.