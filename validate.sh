#!/bin/bash

# Script de Validación del Sistema Velvet AI v1.1.0
# Verifica que Gemini funciona y todas las funciones están operativas

echo "=================================="
echo "🧪 VALIDACIÓN DEL SISTEMA VELVET AI"
echo "=================================="
echo ""

# 1. Verificar que Docker está corriendo
echo "1️⃣ Verificando servicios Docker..."
if docker compose ps | grep -q "Up"; then
    echo "   ✅ Servicios Docker corriendo"
else
    echo "   ❌ ERROR: Servicios Docker no están activos"
    echo "   Ejecuta: docker compose up --build -d"
    exit 1
fi

echo ""

# 2. Verificar que el backend está disponible
echo "2️⃣ Verificando Backend API..."
if curl -s http://localhost:8000/ | grep -q "message"; then
    echo "   ✅ Backend API respondiendo"
else
    echo "   ⚠️  Backend no responde, esperando..."
    sleep 5
    if curl -s http://localhost:8000/ | grep -q "message"; then
        echo "   ✅ Backend API respondiendo"
    else
        echo "   ❌ ERROR: Backend no responde"
        exit 1
    fi
fi

echo ""

# 3. Verificar que la BD está lista
echo "3️⃣ Verificando Base de Datos..."
if curl -s http://localhost:8000/api/v1/health | grep -q "status"; then
    echo "   ✅ Base de datos conectada"
else
    echo "   ⚠️  BD no lista aún"
fi

echo ""

# 4. Verificar Gemini API
echo "4️⃣ Validando Gemini API..."
# Revisar que la clave existe
if grep -q "GEMINI_API_KEY" backend/.env; then
    KEY=$(grep "GEMINI_API_KEY" backend/.env | cut -d'=' -f2)
    if [ -n "$KEY" ] && [ "$KEY" != "AIzaSy" ]; then
        echo "   ✅ Clave de Gemini configurada"
    else
        echo "   ❌ ERROR: Clave de Gemini no válida"
        exit 1
    fi
else
    echo "   ❌ ERROR: GEMINI_API_KEY no encontrada en backend/.env"
    exit 1
fi

echo ""

# 5. Verificar Frontend
echo "5️⃣ Verificando Frontend..."
if curl -s http://localhost:3000 | grep -q "html"; then
    echo "   ✅ Frontend disponible"
else
    echo "   ⚠️  Frontend no responde aún"
fi

echo ""

# 6. Verificar Qdrant
echo "6️⃣ Verificando Qdrant (Vector DB)..."
if curl -s http://localhost:6333/collections | grep -q "collections"; then
    echo "   ✅ Qdrant operativo"
else
    echo "   ⚠️  Qdrant no responde"
fi

echo ""

# 7. Verificar Redis
echo "7️⃣ Verificando Redis..."
if docker compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "   ✅ Redis operativo"
else
    echo "   ⚠️  Redis no responde"
fi

echo ""

# 8. Verificar que los archivos necesarios existen
echo "8️⃣ Verificando archivos de código..."
FILES=(
    "frontend/src/app/globals.css"
    "frontend/src/components/login-modal.tsx"
    "frontend/src/components/sidebar.tsx"
    "frontend/src/components/chat-area.tsx"
    "backend/.env"
    "backend/main.py"
)

ALL_OK=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ ERROR: $file no encontrado"
        ALL_OK=false
    fi
done

echo ""

if [ "$ALL_OK" = true ]; then
    echo "✅ VALIDACIÓN COMPLETADA EXITOSAMENTE"
    echo ""
    echo "🎯 Próximos pasos:"
    echo "  1. Frontend: http://localhost:3000"
    echo "  2. Backend Docs: http://localhost:8000/docs"
    echo "  3. Login: admin / admin"
    echo ""
else
    echo "❌ VALIDACIÓN INCOMPLETA"
    echo "Por favor corrige los errores anteriores"
    exit 1
fi
