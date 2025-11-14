# Multi-stage build para optimizar tamaño de imagen
FROM python:3.11-slim

# Establecer variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar solo requirements primero para aprovechar cache de Docker
COPY requirements.txt .

# Instalar dependencias del sistema si son necesarias
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
RUN pip install --upgrade pip && \
    pip install torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Crear directorio para uploads temporales
RUN mkdir -p temp_uploads

# Exponer puerto
EXPOSE 8000

# El comando se proporciona en docker-compose.yml