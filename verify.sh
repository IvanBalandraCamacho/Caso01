#!/bin/bash

# Script de Verificación Pre-Despliegue
# Sistema RAG "Velvet" - Caso 01

echo "🔍 Verificando configuración del proyecto..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores
ERRORS=0

# 1. Verificar archivos .env
echo "📋 Verificando archivos de configuración..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env (raíz) encontrado"
else
    echo -e "${RED}✗${NC} .env (raíz) NO encontrado"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓${NC} backend/.env encontrado"
    # Verificar que la API key no sea el placeholder
    if grep -q "AIzaSyDRJicX77mQD4QVkOGHbL0rmheSqjsZDjs" backend/.env; then
        echo -e "${GREEN}✓${NC} GEMINI_API_KEY configurada"
    else
        echo -e "${YELLOW}⚠${NC} GEMINI_API_KEY parece ser un placeholder"
    fi
else
    echo -e "${RED}✗${NC} backend/.env NO encontrado"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 2. Verificar archivos críticos del Backend
echo "🐍 Verificando archivos del Backend..."
BACKEND_FILES=(
    "backend/main.py"
    "backend/Dockerfile"
    "backend/requirements.txt"
    "backend/core/config.py"
    "backend/core/llm_service.py"
    "backend/core/celery_app.py"
    "backend/models/database.py"
    "backend/models/workspace.py"
    "backend/models/document.py"
    "backend/models/schemas.py"
    "backend/api/routes/health.py"
    "backend/api/routes/workspaces.py"
    "backend/processing/parser.py"
    "backend/processing/vector_store.py"
    "backend/processing/tasks.py"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file NO encontrado"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# 3. Verificar archivos críticos del Frontend
echo "⚛️  Verificando archivos del Frontend..."
FRONTEND_FILES=(
    "frontend/package.json"
    "frontend/tsconfig.json"
    "frontend/next.config.mjs"
    "frontend/tailwind.config.ts"
    "frontend/postcss.config.js"
    "frontend/Dockerfile"
    "frontend/.gitignore"
    "frontend/.dockerignore"
    "frontend/src/app/layout.tsx"
    "frontend/src/app/page.tsx"
    "frontend/src/app/globals.css"
    "frontend/src/components/sidebar.tsx"
    "frontend/src/components/chat-area.tsx"
    "frontend/src/lib/utils.ts"
)

for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file NO encontrado"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# 4. Verificar Docker
echo "🐳 Verificando Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker instalado"
    docker --version
else
    echo -e "${RED}✗${NC} Docker NO instalado"
    ERRORS=$((ERRORS + 1))
fi

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose instalado"
    docker-compose --version
elif docker compose version &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose (v2 integrado) instalado"
    docker compose version
else
    echo -e "${RED}✗${NC} Docker Compose NO instalado"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 5. Verificar docker-compose.yml
echo "📦 Verificando docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.yml encontrado"
    
    # Verificar servicios
    SERVICES=("backend" "frontend" "mysql" "qdrant" "redis" "celery_worker")
    for service in "${SERVICES[@]}"; do
        if grep -q "^  $service:" docker-compose.yml; then
            echo -e "${GREEN}✓${NC} Servicio '$service' configurado"
        else
            echo -e "${RED}✗${NC} Servicio '$service' NO encontrado"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${RED}✗${NC} docker-compose.yml NO encontrado"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Verificación completada: TODO LISTO PARA DESPLEGAR${NC}"
    echo ""
    echo "Para iniciar el proyecto, ejecuta:"
    echo -e "${YELLOW}docker-compose up --build${NC}"
    echo ""
    echo "Luego accede a:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:8000/docs"
    echo "  • Qdrant Dashboard: http://localhost:6333/dashboard"
    exit 0
else
    echo -e "${RED}❌ Verificación completada: $ERRORS errores encontrados${NC}"
    echo ""
    echo "Por favor, corrige los errores antes de desplegar."
    exit 1
fi
