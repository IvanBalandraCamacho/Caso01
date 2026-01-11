# Guía de Despliegue en Google Cloud Platform (GCP)

## TIVIT AI Hub - Deployment Guide

Esta guía describe el proceso completo para desplegar el proyecto TIVIT AI Hub en Google Cloud Platform.

---

## Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Arquitectura en GCP](#arquitectura-en-gcp)
3. [Configuración Inicial de GCP](#configuración-inicial-de-gcp)
4. [Obtener API Key de Gemini](#obtener-api-key-de-gemini)
5. [Configuración de Cloud SQL (MySQL)](#configuración-de-cloud-sql-mysql)
6. [Configuración de Memorystore (Redis)](#configuración-de-memorystore-redis)
7. [Configuración de Cloud Storage](#configuración-de-cloud-storage)
8. [Despliegue con Cloud Run](#despliegue-con-cloud-run)
9. [Configuración de Secret Manager](#configuración-de-secret-manager)
10. [Despliegue con GKE (Kubernetes)](#despliegue-con-gke-kubernetes)
11. [Configuración de CI/CD](#configuración-de-cicd)
12. [Monitoreo y Logging](#monitoreo-y-logging)
13. [Costos Estimados](#costos-estimados)

---

## Prerrequisitos

### Herramientas necesarias

```bash
# Google Cloud CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# Docker
# Instalar desde https://docs.docker.com/get-docker/

# kubectl (para GKE)
gcloud components install kubectl
```

### Autenticación

```bash
# Login en GCP
gcloud auth login

# Configurar proyecto
gcloud config set project YOUR_PROJECT_ID

# Habilitar APIs necesarias
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  container.googleapis.com \
  aiplatform.googleapis.com
```

---

## Arquitectura en GCP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Google Cloud Platform                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │ Cloud Run    │     │ Cloud Run    │     │ Cloud Run                │ │
│  │ (Frontend)   │────▶│ (Backend)    │────▶│ (RAG Service)            │ │
│  │ Next.js      │     │ FastAPI      │     │ FastAPI + Qdrant         │ │
│  │ Port: 3000   │     │ Port: 8000   │     │ Port: 8080               │ │
│  └──────────────┘     └──────┬───────┘     └──────────────────────────┘ │
│         │                    │                        │                  │
│         │                    │                        │                  │
│         │              ┌─────┴─────┐                  │                  │
│         │              │           │                  │                  │
│         ▼              ▼           ▼                  ▼                  │
│  ┌──────────────┐ ┌─────────┐ ┌─────────┐   ┌──────────────────────────┐│
│  │ Cloud        │ │Cloud SQL│ │Memory-  │   │ Qdrant Cloud /           ││
│  │ Load         │ │(MySQL)  │ │store    │   │ Cloud Run (Qdrant)       ││
│  │ Balancer     │ │         │ │(Redis)  │   │                          ││
│  └──────────────┘ └─────────┘ └─────────┘   └──────────────────────────┘│
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │                    Google AI / Gemini API                            ││
│  │                    gemini-2.0-flash-exp                              ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Configuración Inicial de GCP

### 1. Crear proyecto

```bash
# Crear nuevo proyecto
gcloud projects create tivit-ai-hub --name="TIVIT AI Hub"

# Establecer como proyecto activo
gcloud config set project tivit-ai-hub

# Vincular cuenta de facturación
gcloud billing projects link tivit-ai-hub --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 2. Crear Artifact Registry para imágenes Docker

```bash
# Crear repositorio de Docker
gcloud artifacts repositories create tivit-ai-hub \
  --repository-format=docker \
  --location=us-central1 \
  --description="TIVIT AI Hub Docker images"

# Configurar Docker para usar Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## Obtener API Key de Gemini

### Opción 1: Google AI Studio (Recomendado para desarrollo)

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Selecciona tu proyecto GCP
5. Copia la API key generada

### Opción 2: Vertex AI (Recomendado para producción)

```bash
# Habilitar Vertex AI
gcloud services enable aiplatform.googleapis.com

# Crear Service Account para Vertex AI
gcloud iam service-accounts create vertex-ai-sa \
  --display-name="Vertex AI Service Account"

# Dar permisos
gcloud projects add-iam-policy-binding tivit-ai-hub \
  --member="serviceAccount:vertex-ai-sa@tivit-ai-hub.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Guardar API Key en Secret Manager

```bash
# Crear secreto para GOOGLE_API_KEY
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create google-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Crear secreto para JWT
echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret-key \
  --data-file=- \
  --replication-policy="automatic"
```

---

## Configuración de Cloud SQL (MySQL)

### 1. Crear instancia

```bash
# Crear instancia Cloud SQL MySQL 8.0
gcloud sql instances create tivit-ai-mysql \
  --database-version=MYSQL_8_0 \
  --tier=db-custom-2-4096 \
  --region=us-central1 \
  --root-password=YOUR_ROOT_PASSWORD \
  --storage-size=20GB \
  --storage-auto-increase \
  --availability-type=zonal \
  --backup-start-time=03:00

# Crear base de datos
gcloud sql databases create caso01_db --instance=tivit-ai-mysql

# Crear usuario
gcloud sql users create admin \
  --instance=tivit-ai-mysql \
  --password=YOUR_DB_PASSWORD
```

### 2. Obtener connection string

```bash
# Para Cloud Run, usar Cloud SQL Proxy
# Connection name format: PROJECT:REGION:INSTANCE
gcloud sql instances describe tivit-ai-mysql --format="value(connectionName)"
# Output: tivit-ai-hub:us-central1:tivit-ai-mysql
```

La URL de conexión será:
```
mysql+pymysql://admin:YOUR_DB_PASSWORD@/caso01_db?unix_socket=/cloudsql/tivit-ai-hub:us-central1:tivit-ai-mysql
```

---

## Configuración de Memorystore (Redis)

```bash
# Crear instancia Redis
gcloud redis instances create tivit-ai-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic

# Obtener IP del Redis
gcloud redis instances describe tivit-ai-redis \
  --region=us-central1 \
  --format="value(host)"
```

> **Nota**: Memorystore requiere VPC Connector para Cloud Run.

### Crear VPC Connector

```bash
# Crear connector
gcloud compute networks vpc-access connectors create tivit-connector \
  --region=us-central1 \
  --range=10.8.0.0/28
```

---

## Configuración de Cloud Storage

```bash
# Crear bucket para documentos
gcloud storage buckets create gs://tivit-ai-documents \
  --location=us-central1 \
  --uniform-bucket-level-access

# Crear bucket para archivos temporales
gcloud storage buckets create gs://tivit-ai-temp \
  --location=us-central1 \
  --lifecycle-file=lifecycle.json
```

---

## Despliegue con Cloud Run

### 1. Construir imágenes Docker

```bash
# Desde la raíz del proyecto

# Backend
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/backend:latest

# Frontend
cd ../front-v2
gcloud builds submit --tag us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/frontend:latest

# RAG Service
cd ../rag-service
gcloud builds submit --tag us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/rag-service:latest
```

### 2. Desplegar Backend

```bash
gcloud run deploy tivit-backend \
  --image=us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --port=8000 \
  --vpc-connector=tivit-connector \
  --add-cloudsql-instances=tivit-ai-hub:us-central1:tivit-ai-mysql \
  --set-secrets="GOOGLE_API_KEY=google-api-key:latest,JWT_SECRET_KEY=jwt-secret-key:latest" \
  --set-env-vars="
DATABASE_URL=mysql+pymysql://admin:PASSWORD@/caso01_db?unix_socket=/cloudsql/tivit-ai-hub:us-central1:tivit-ai-mysql,
REDIS_URL=redis://REDIS_IP:6379,
RAG_SERVICE_URL=https://tivit-rag-XXXXX-uc.a.run.app,
GEMINI_MODEL=gemini-2.0-flash-exp,
LOG_LEVEL=INFO
"
```

### 3. Desplegar RAG Service

```bash
gcloud run deploy tivit-rag \
  --image=us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/rag-service:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=4Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=5 \
  --port=8080 \
  --set-env-vars="
QDRANT_URL=YOUR_QDRANT_URL,
QDRANT_API_KEY=YOUR_QDRANT_API_KEY
"
```

### 4. Desplegar Frontend

```bash
gcloud run deploy tivit-frontend \
  --image=us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/frontend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=10 \
  --port=3000 \
  --set-secrets="GOOGLE_API_KEY=google-api-key:latest" \
  --set-env-vars="
NEXT_PUBLIC_API_BASE_URL=https://tivit-backend-XXXXX-uc.a.run.app/api/v1,
BACKEND_INTERNAL_URL=https://tivit-backend-XXXXX-uc.a.run.app/api/v1,
NEXT_PUBLIC_COPILOT_ENABLED=true
"
```

---

## Configuración de Secret Manager

### Listar todos los secretos necesarios

```bash
# Crear todos los secretos
gcloud secrets create google-api-key --data-file=- <<< "YOUR_GEMINI_API_KEY"
gcloud secrets create jwt-secret-key --data-file=- <<< "YOUR_JWT_SECRET"
gcloud secrets create db-password --data-file=- <<< "YOUR_DB_PASSWORD"
gcloud secrets create qdrant-api-key --data-file=- <<< "YOUR_QDRANT_API_KEY"
```

### Dar permisos a Cloud Run

```bash
# Obtener el service account de Cloud Run
PROJECT_NUMBER=$(gcloud projects describe tivit-ai-hub --format="value(projectNumber)")

# Dar acceso a secretos
gcloud secrets add-iam-policy-binding google-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Despliegue con GKE (Kubernetes)

### 1. Crear cluster GKE

```bash
# Crear cluster Autopilot (recomendado)
gcloud container clusters create-auto tivit-ai-cluster \
  --region=us-central1 \
  --project=tivit-ai-hub

# Obtener credenciales
gcloud container clusters get-credentials tivit-ai-cluster \
  --region=us-central1
```

### 2. Crear namespace y secretos

```bash
# Crear namespace
kubectl create namespace tivit-ai

# Crear secretos
kubectl create secret generic tivit-secrets \
  --namespace=tivit-ai \
  --from-literal=google-api-key=YOUR_GEMINI_API_KEY \
  --from-literal=jwt-secret-key=YOUR_JWT_SECRET \
  --from-literal=db-password=YOUR_DB_PASSWORD
```

### 3. Aplicar manifiestos

Crear archivo `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tivit-backend
  namespace: tivit-ai
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tivit-backend
  template:
    metadata:
      labels:
        app: tivit-backend
    spec:
      containers:
      - name: backend
        image: us-central1-docker.pkg.dev/tivit-ai-hub/tivit-ai-hub/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: GOOGLE_API_KEY
          valueFrom:
            secretKeyRef:
              name: tivit-secrets
              key: google-api-key
        - name: GEMINI_MODEL
          value: "gemini-2.0-flash-exp"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: tivit-backend-service
  namespace: tivit-ai
spec:
  selector:
    app: tivit-backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

```bash
kubectl apply -f k8s/deployment.yaml
```

---

## Configuración de CI/CD

### Cloud Build (cloudbuild.yaml)

```yaml
steps:
  # Build Backend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/backend:$COMMIT_SHA', './backend']
  
  # Build Frontend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/frontend:$COMMIT_SHA', './front-v2']
  
  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/backend:$COMMIT_SHA']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/frontend:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'tivit-backend'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/backend:$COMMIT_SHA'
      - '--region=us-central1'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/backend:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/tivit-ai-hub/frontend:$COMMIT_SHA'
```

### Configurar trigger

```bash
gcloud builds triggers create github \
  --name="deploy-on-push" \
  --repo-name="tivit-ai-hub" \
  --repo-owner="your-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

---

## Monitoreo y Logging

### Cloud Monitoring

```bash
# Crear alertas para latencia
gcloud monitoring policies create \
  --display-name="High Latency Alert" \
  --conditions='{"displayName":"Latency > 2s","conditionThreshold":{"filter":"resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"","comparison":"COMPARISON_GT","thresholdValue":2000,"duration":"60s"}}'
```

### Cloud Logging

```bash
# Ver logs del backend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=tivit-backend" \
  --limit=100 \
  --format="table(timestamp, severity, textPayload)"
```

### Dashboards

1. Ve a [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Crea un dashboard con métricas:
   - Request count
   - Request latency (p50, p95, p99)
   - Error rate
   - CPU utilization
   - Memory utilization

---

## Costos Estimados

### Cloud Run (Pay-per-use)

| Servicio | Instancias | CPU | RAM | Costo/mes (estimado) |
|----------|------------|-----|-----|----------------------|
| Backend | 1-10 | 2 | 2GB | $50-200 |
| Frontend | 1-10 | 1 | 1GB | $30-100 |
| RAG Service | 1-5 | 2 | 4GB | $50-150 |

### Bases de datos

| Servicio | Tier | Costo/mes |
|----------|------|-----------|
| Cloud SQL (MySQL) | db-custom-2-4096 | ~$80 |
| Memorystore (Redis) | 1GB Basic | ~$35 |
| Qdrant Cloud | Starter | $25-100 |

### AI/ML

| Servicio | Uso estimado | Costo/mes |
|----------|--------------|-----------|
| Gemini API | 1M tokens/día | ~$50-150 |
| Document AI | 1000 páginas/mes | ~$15 |

### Total estimado: **$300-800/mes** (dependiendo del uso)

---

## Checklist de Despliegue

- [ ] Proyecto GCP creado y configurado
- [ ] APIs habilitadas (Cloud Run, SQL, Redis, Secret Manager, AI Platform)
- [ ] API Key de Gemini obtenida y guardada en Secret Manager
- [ ] Cloud SQL MySQL configurado
- [ ] Memorystore Redis configurado
- [ ] VPC Connector creado
- [ ] Imágenes Docker construidas y subidas
- [ ] Backend desplegado en Cloud Run
- [ ] RAG Service desplegado
- [ ] Frontend desplegado
- [ ] Variables de entorno configuradas
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL/TLS habilitado
- [ ] Monitoreo y alertas configurados
- [ ] CI/CD pipeline configurado

---

## Troubleshooting

### Error: "GOOGLE_API_KEY not configured"

```bash
# Verificar que el secreto existe
gcloud secrets versions access latest --secret=google-api-key

# Verificar permisos del service account
gcloud secrets get-iam-policy google-api-key
```

### Error: "Cannot connect to Cloud SQL"

```bash
# Verificar que Cloud SQL Auth Proxy está habilitado
gcloud sql instances describe tivit-ai-mysql

# Verificar connection name
gcloud sql instances describe tivit-ai-mysql --format="value(connectionName)"
```

### Error: "Cannot connect to Redis"

```bash
# Verificar VPC Connector
gcloud compute networks vpc-access connectors describe tivit-connector \
  --region=us-central1

# Verificar IP de Redis
gcloud redis instances describe tivit-ai-redis --region=us-central1
```

---

## Recursos Adicionales

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Cloud SQL for MySQL](https://cloud.google.com/sql/docs/mysql)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Build](https://cloud.google.com/build/docs)

---

*Documento generado para TIVIT AI Hub - Versión 1.0*
