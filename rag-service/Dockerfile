# ETAPA 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# ETAPA 2: Final
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

COPY . .

ENV PORT=8080

# Uvicorn directo está bien aquí si es un microservicio simple, 
# pero Gunicorn es más robusto si manejas concurrencia.
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT