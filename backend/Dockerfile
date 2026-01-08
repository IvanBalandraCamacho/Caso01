# ETAPA 1: Builder (Compilación)
FROM python:3.11-slim as builder

WORKDIR /app

# Instalar dependencias de sistema necesarias para compilar (gcc, libpq, etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Crear wheels (paquetes pre-compilados)
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# ETAPA 2: Final (Ejecución)
FROM python:3.11-slim

WORKDIR /app

# Instalar solo librerías runtime necesarias (libpq para postgres)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar los wheels de la etapa anterior e instalarlos
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copiar el código fuente
COPY . .

# Variables de entorno por defecto para producción
ENV PORT=8080
ENV WORKERS=2 
# Ajusta workers según CPU disponible (Cloud Run suele dar 1 vCPU al inicio)

# Comando de arranque optimizado con Gunicorn
CMD exec gunicorn --bind :$PORT --workers $WORKERS --worker-class uvicorn.workers.UvicornWorker --timeout 120 main:app