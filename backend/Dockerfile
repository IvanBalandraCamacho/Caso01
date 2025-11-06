# 1. Usar la imagen oficial de Python
FROM python:3.11-slim

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar el archivo de requerimientos
COPY requirements.txt .

# 4. Instalar las dependencias de Python en pasos separados
#    (Esto optimiza el caché de Docker)
RUN pip install --no-cache-dir --upgrade pip

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# --- ESTA ES LA LÍNEA QUE FALTABA ---
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar el código de la aplicación
COPY . .

# (El 'command' se proporciona en docker-compose.yml)