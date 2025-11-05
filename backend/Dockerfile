# 1. Usar la imagen oficial de Python
FROM python:3.11-slim

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Instalar dependencias del sistema operativo
#    (Para mysqlclient)
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    default-mysql-client \
 && rm -rf /var/lib/apt/lists/*

# 4. Copiar el archivo de requerimientos
COPY requirements.txt .

# 5. Instalar PyTorch (CPU-only) primero
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 6. Instalar el resto de los requerimientos
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copiar el código de la aplicación
COPY . .

# (El 'command' se proporciona en docker-compose.yml)