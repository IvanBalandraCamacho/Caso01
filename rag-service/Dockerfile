# ETAPA 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# ETAPA 2: Final
FROM python:3.11-slim

WORKDIR /app

# Instala las dependencias del builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/* && rm -rf /wheels

# Copia el código
COPY . .

# Variables de entorno
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Crea directorios temporales con permisos correctos
RUN mkdir -p /tmp && chmod 777 /tmp

# Comando de inicio con timeout más largo
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --timeout-keep-alive 300