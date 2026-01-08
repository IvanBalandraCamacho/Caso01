# 🚀 Setup Local con Servicios GCP

Esta guía te permite ejecutar el backend localmente usando servicios reales de Google Cloud Platform.

## 📋 Prerrequisitos

1. **Docker & Docker Compose** instalados
2. **Python 3.11+** instalado
3. **Archivo `backend/credentials.json`** con credenciales de GCP
4. **Bucket GCS** `caso01-documents` ya creado en GCP

## ⚙️ Configuración

### 1. Crear archivo de configuración

```bash
cp .env.example .env
```

### 2. Verificar credenciales GCP

Asegúrate de que `backend/credentials.json` existe y tiene los permisos:
- Secret Manager Secret Accessor
- Storage Object Admin
- Logging Admin
- Vertex AI User

### 3. Levantar servicios de base de datos

```bash
# Levantar MySQL y Redis en Docker
docker-compose up -d mysql redis qdrant
```

Espera unos segundos a que MySQL esté listo.

### 4. Instalar dependencias Python

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 5. Inicializar base de datos

```bash
cd backend
# Ejecutar migraciones si es necesario
python -m alembic upgrade head
cd ..
```

## 🎯 Ejecutar el Backend

### Opción 1: Directamente con Python

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Opción 2: Con Docker Compose completo

```bash
docker-compose up backend
```

El backend estará disponible en: **http://localhost:8000**

## ✅ Verificar Integración GCP

Ejecuta el script de validación:

```bash
python3 validate_gcp.py
```

Esto verificará:
- ✅ Conexión a Cloud Storage
- ✅ Conexión a Vertex AI (Gemini)
- ✅ Configuración de Cloud Logging

## 🧪 Probar el Sistema

1. **Acceder a la documentación:** http://localhost:8000/docs
2. **Crear un usuario** (endpoint `/api/v1/auth/register`)
3. **Login** (endpoint `/api/v1/auth/login`)
4. **Crear workspace**
5. **Subir documento** → Se guardará en GCS `caso01-documents`

## 🔄 Servicios Activos

| Servicio | Local/GCP | URL/Endpoint |
|----------|-----------|--------------|
| MySQL | 🐳 Local | localhost:3306 |
| Redis | 🐳 Local | localhost:6379 |
| Qdrant | 🐳 Local | localhost:6333 |
| Cloud Storage | ☁️ GCP | caso01-documents |
| Vertex AI | ☁️ GCP | Gemini API |
| Cloud Logging | ☁️ GCP | Cloud Console |

## 🔧 Troubleshooting

### Error: "No module named 'backend'"
```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Error: "Can't connect to MySQL"
```bash
# Verificar que MySQL está corriendo
docker-compose ps mysql

# Ver logs
docker-compose logs mysql
```

### Error: GCP Authentication
```bash
# Verificar que las credenciales están en el lugar correcto
ls -la backend/credentials.json

# Probar autenticación
gcloud auth activate-service-account --key-file=backend/credentials.json
```

## 🌐 Ejecutar el Frontend

```bash
cd front-v2
npm install
npm run dev
```

Frontend disponible en: **http://localhost:3000**

## 📝 Notas Importantes

- **Cloud Tasks** está comentado en `.env` porque requiere una URL pública. En local, usa Celery (Redis).
- Para usar **Vertex AI**, cambia `LLM_PROVIDER=vertex` en `.env`.
- Los logs se envían automáticamente a **Cloud Logging** si las credenciales son válidas.
