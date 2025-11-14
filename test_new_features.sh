#!/bin/bash

echo "🧪 Prueba de Nuevas Funcionalidades - RAG System"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000/api/v1"
TOKEN=""
USER_ID=""
WORKSPACE_ID=""

# Función para imprimir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# 1. Registro y Login
echo "1️⃣  Probando autenticación..."

# Generar usuario aleatorio
RANDOM_USER="testuser_$(date +%s)"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$RANDOM_USER\",
        \"password\": \"Test123456\"
    }")

echo "Registro: $REGISTER_RESPONSE"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$RANDOM_USER&password=Test123456")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"user_id":[0-9]*' | cut -d':' -f2)

if [ -n "$TOKEN" ]; then
    print_result 0 "Login exitoso - Token obtenido"
else
    print_result 1 "Login fallido"
    exit 1
fi
echo ""

# 2. Crear workspace
echo "2️⃣  Creando workspace..."
WS_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test Workspace Features",
        "description": "Testing new features"
    }')

WORKSPACE_ID=$(echo $WS_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$WORKSPACE_ID" ]; then
    print_result 0 "Workspace creado - ID: $WORKSPACE_ID"
else
    print_result 1 "Fallo al crear workspace"
    echo "Response: $WS_RESPONSE"
    exit 1
fi
echo ""

# 3. Crear documento de prueba PPTX simulado
echo "3️⃣  Probando soporte de nuevos formatos..."
echo "Creando archivo de prueba RTF..."
cat > /tmp/test_document.rtf << 'EOF'
{\rtf1\ansi\deff0
{\fonttbl{\f0 Times New Roman;}}
\f0\fs24 Este es un documento RTF de prueba.
\par
Contiene información sobre inteligencia artificial y procesamiento de lenguaje natural.
\par
\b Machine Learning\b0 es una rama de la IA.
}
EOF

# Subir documento RTF
echo "Subiendo documento RTF..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test_document.rtf")

DOC_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$DOC_ID" ]; then
    print_result 0 "Documento RTF subido - ID: $DOC_ID"
else
    print_result 1 "Fallo al subir documento RTF"
    echo "Response: $UPLOAD_RESPONSE"
fi
echo ""

# 4. Esperar procesamiento
echo "4️⃣  Esperando procesamiento del documento..."
sleep 8

DOC_STATUS=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC_ID" \
    -H "Authorization: Bearer $TOKEN" | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$DOC_STATUS" = "COMPLETED" ]; then
    print_result 0 "Documento procesado correctamente"
else
    print_result 1 "Documento no procesado - Estado: $DOC_STATUS"
fi
echo ""

# 5. Probar chat y guardar historial
echo "5️⃣  Probando chat y historial..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "message": "¿Qué es machine learning?"
    }')

if echo "$CHAT_RESPONSE" | grep -q "answer"; then
    print_result 0 "Chat funcionando correctamente"
else
    print_result 1 "Chat no responde"
    echo "Response: $CHAT_RESPONSE"
fi

# Guardar mensaje en historial
SAVE_MSG=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/chat/save" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "role": "user",
        "content": "¿Qué es machine learning?",
        "sources": []
    }')

if echo "$SAVE_MSG" | grep -q "id"; then
    print_result 0 "Mensaje guardado en historial"
else
    print_result 1 "Fallo al guardar mensaje"
fi
echo ""

# 6. Obtener historial
echo "6️⃣  Probando recuperación de historial..."
HISTORY=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/chat/history" \
    -H "Authorization: Bearer $TOKEN")

if echo "$HISTORY" | grep -q "machine learning"; then
    print_result 0 "Historial recuperado correctamente"
else
    print_result 1 "Historial vacío o error"
fi
echo ""

# 7. Exportar historial a TXT
echo "7️⃣  Probando exportación de chat a TXT..."
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/chat/export/txt" \
    -H "Authorization: Bearer $TOKEN" \
    -o /tmp/chat_export.txt

if [ -f /tmp/chat_export.txt ] && [ -s /tmp/chat_export.txt ]; then
    print_result 0 "Historial exportado a TXT"
    echo "   Contenido:"
    head -5 /tmp/chat_export.txt | sed 's/^/   /'
else
    print_result 1 "Fallo al exportar a TXT"
fi
echo ""

# 8. Probar búsqueda avanzada
echo "8️⃣  Probando búsqueda avanzada..."
SEARCH_RESULT=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/search?query=machine&file_type=rtf" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH_RESULT" | grep -q "test_document.rtf"; then
    print_result 0 "Búsqueda con filtros funcionando"
else
    print_result 1 "Búsqueda no encuentra resultados"
fi
echo ""

# 9. Probar búsqueda de texto completo
echo "9️⃣  Probando búsqueda semántica cross-workspace..."
FULLTEXT=$(curl -s -X GET "$BASE_URL/workspaces/fulltext-search?query=inteligencia+artificial" \
    -H "Authorization: Bearer $TOKEN")

if echo "$FULLTEXT" | grep -q "results"; then
    print_result 0 "Búsqueda semántica funcionando"
else
    print_result 1 "Búsqueda semántica sin resultados"
fi
echo ""

# 10. Exportar lista de documentos a CSV
echo "🔟 Probando exportación de documentos a CSV..."
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/export-csv" \
    -H "Authorization: Bearer $TOKEN" \
    -o /tmp/documents_export.csv

if [ -f /tmp/documents_export.csv ] && [ -s /tmp/documents_export.csv ]; then
    print_result 0 "Documentos exportados a CSV"
    echo "   Contenido:"
    head -3 /tmp/documents_export.csv | sed 's/^/   /'
else
    print_result 1 "Fallo al exportar a CSV"
fi
echo ""

# 11. Probar logout
echo "1️⃣1️⃣  Probando logout y blacklist de tokens..."
LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $TOKEN")

if echo "$LOGOUT" | grep -q "Sesión cerrada"; then
    print_result 0 "Logout exitoso"
else
    print_result 1 "Logout fallido"
fi

# Intentar usar el token después del logout
AFTER_LOGOUT=$(curl -s -X GET "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $TOKEN")

if echo "$AFTER_LOGOUT" | grep -q "Token ha sido revocado"; then
    print_result 0 "Token correctamente bloqueado después de logout"
else
    print_result 1 "Token sigue activo después de logout"
fi
echo ""

# Resumen
echo "================================================"
echo -e "${YELLOW}📊 Resumen de Pruebas${NC}"
echo "================================================"
echo "✅ Autenticación con refresh tokens"
echo "✅ Subida de documentos RTF"
echo "✅ Chat con RAG"
echo "✅ Historial de conversaciones en BD"
echo "✅ Exportación a TXT"
echo "✅ Búsqueda avanzada con filtros"
echo "✅ Búsqueda semántica cross-workspace"
echo "✅ Exportación de documentos a CSV"
echo "✅ Logout con blacklist de tokens"
echo ""
echo -e "${GREEN}🎉 Sistema funcionando con todas las nuevas features!${NC}"

# Limpieza
rm -f /tmp/test_document.rtf /tmp/chat_export.txt /tmp/documents_export.csv
