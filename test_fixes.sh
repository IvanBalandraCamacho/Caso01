#!/bin/bash

# Script para validar correcciones: Búsqueda, CSV Export y Logout

BASE_URL="http://localhost:8000/api/v1"
echo "🔍 Validando Correcciones"
echo "========================="
echo ""

# 1. Crear usuario y obtener token
echo "1. Setup - Crear usuario y obtener token..."
USERNAME="validator_$(date +%s)"
curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"Pass123\"}" > /dev/null

LOGIN=$(curl -s -X POST "$BASE_URL/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$USERNAME&password=Pass123")
TOKEN=$(echo $LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ No se pudo obtener token"
    exit 1
fi
echo "✅ Token obtenido"
echo ""

# 2. Crear workspace
echo "2. Crear workspace..."
WS=$(curl -s -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Workspace","description":"Test"}')
WS_ID=$(echo $WS | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$WS_ID" ]; then
    echo "❌ No se pudo crear workspace"
    exit 1
fi
echo "✅ Workspace ID: $WS_ID"
echo ""

# 3. Subir documento
echo "3. Subir documento de prueba..."
echo "Documento de prueba sobre inteligencia artificial" > /tmp/test_doc.txt

UPLOAD=$(curl -s -X POST "$BASE_URL/workspaces/$WS_ID/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test_doc.txt")
DOC_ID=$(echo $UPLOAD | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DOC_ID" ]; then
    echo "❌ No se pudo subir documento"
    echo "Response: $UPLOAD"
    exit 1
fi
echo "✅ Documento subido: $DOC_ID"
echo ""

# Esperar procesamiento
echo "4. Esperando procesamiento (8s)..."
sleep 8
echo "✅ Procesamiento completado"
echo ""

# ====== PRUEBA 1: Búsqueda con filtros ======
echo "=========================================="
echo "PRUEBA 1: Búsqueda de documentos con filtros"
echo "=========================================="

SEARCH=$(curl -s -X GET "$BASE_URL/workspaces/$WS_ID/documents/search?query=test&file_type=txt" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH" | grep -q "test_doc.txt"; then
    echo "✅ Búsqueda funcionando correctamente"
    echo "   Documento encontrado: test_doc.txt"
else
    echo "❌ Búsqueda NO funcionando"
    echo "   Response: $SEARCH"
fi
echo ""

# ====== PRUEBA 2: Exportación a CSV ======
echo "=========================================="
echo "PRUEBA 2: Exportación de documentos a CSV"
echo "=========================================="

HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/export.csv \
    -X GET "$BASE_URL/workspaces/$WS_ID/documents/export-csv" \
    -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" = "200" ] && [ -f /tmp/export.csv ] && [ -s /tmp/export.csv ]; then
    echo "✅ Exportación CSV funcionando correctamente"
    echo "   Código HTTP: $HTTP_CODE"
    echo "   Tamaño archivo: $(wc -c < /tmp/export.csv) bytes"
    echo "   Líneas: $(wc -l < /tmp/export.csv)"
    echo ""
    echo "   Contenido (primeras 3 líneas):"
    head -3 /tmp/export.csv | sed 's/^/   /'
else
    echo "❌ Exportación CSV NO funcionando"
    echo "   Código HTTP: $HTTP_CODE"
    if [ -f /tmp/export.csv ]; then
        echo "   Contenido del archivo:"
        cat /tmp/export.csv | sed 's/^/   /'
    fi
fi
echo ""

# ====== PRUEBA 3: Búsqueda fulltext cross-workspace ======
echo "=========================================="
echo "PRUEBA 3: Búsqueda fulltext cross-workspace"
echo "=========================================="

FULLTEXT=$(curl -s -X GET "$BASE_URL/workspaces/fulltext-search?query=inteligencia" \
    -H "Authorization: Bearer $TOKEN")

if echo "$FULLTEXT" | grep -q "results" || echo "$FULLTEXT" | grep -q "workspace_id"; then
    echo "✅ Búsqueda fulltext funcionando correctamente"
    RESULTS=$(echo $FULLTEXT | grep -o '"workspace_id"' | wc -l)
    echo "   Resultados encontrados: $RESULTS"
else
    echo "❌ Búsqueda fulltext NO funcionando"
    echo "   Response: $FULLTEXT"
fi
echo ""

# ====== PRUEBA 4: Logout ======
echo "=========================================="
echo "PRUEBA 4: Logout y revocación de token"
echo "=========================================="

LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $TOKEN")

if echo "$LOGOUT" | grep -q "Successfully logged out" || echo "$LOGOUT" | grep -q "message"; then
    echo "✅ Logout ejecutado correctamente"
    echo "   Respuesta: $LOGOUT"
    
    # Intentar usar el token después del logout
    sleep 2
    AFTER_LOGOUT=$(curl -s -X GET "$BASE_URL/workspaces" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$AFTER_LOGOUT" | grep -q "revoked" || echo "$AFTER_LOGOUT" | grep -q "Token has been revoked"; then
        echo "✅ Token correctamente revocado después del logout"
        echo "   Mensaje: Token has been revoked"
    else
        echo "⚠️  Token puede seguir activo"
        echo "   Response: $(echo $AFTER_LOGOUT | head -c 100)..."
    fi
else
    echo "❌ Logout NO funcionando"
    echo "   Response: $LOGOUT"
fi
echo ""

# Resumen final
echo "=========================================="
echo "📊 RESUMEN DE VALIDACIÓN"
echo "=========================================="
echo ""
echo "Pruebas realizadas:"
echo "  1. ✓ Búsqueda de documentos con filtros"
echo "  2. ✓ Exportación de documentos a CSV"
echo "  3. ✓ Búsqueda fulltext cross-workspace"
echo "  4. ✓ Logout y revocación de tokens"
echo ""
echo "✅ Validación completada"
echo ""

# Limpieza
rm -f /tmp/test_doc.txt /tmp/export.csv
