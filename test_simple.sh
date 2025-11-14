#!/bin/bash

# Script simple para probar las nuevas funcionalidades

BASE_URL="http://localhost:8000/api/v1"
echo "🧪 Test RAG System - Nuevas Funcionalidades"
echo "=========================================="
echo ""

# 1. Registro
echo "1. Registro..."
REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user_$(date +%s)\",\"password\":\"Pass123\"}")
echo "✅ $REGISTER"
echo ""

# 2. Login
USERNAME=$(echo $REGISTER | grep -o '"username":"[^"]*' | cut -d'"' -f4)
echo "2. Login con usuario: $USERNAME..."
LOGIN=$(curl -s -X POST "$BASE_URL/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$USERNAME&password=Pass123")
TOKEN=$(echo $LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "✅ Token obtenido: ${TOKEN:0:30}..."
echo ""

# 3. Crear Workspace
echo "3. Crear Workspace..."
WS=$(curl -s -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test WS","description":"Test"}')
WS_ID=$(echo $WS | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "✅ Workspace ID: $WS_ID"
echo ""

# 4. Crear archivo RTF de prueba
echo "4. Crear y subir documento RTF..."
cat > /tmp/test.rtf << 'EOF'
{\rtf1\ansi
{\fonttbl{\f0 Times;}}
\f0 Este es un documento de prueba sobre inteligencia artificial.
\par Machine Learning es una rama de la IA.
}
EOF

UPLOAD=$(curl -s -X POST "$BASE_URL/workspaces/$WS_ID/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test.rtf")
DOC_ID=$(echo $UPLOAD | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "✅ Documento ID: $DOC_ID"
echo ""

# 5. Esperar procesamiento
echo "5. Esperando procesamiento (10s)..."
sleep 10
DOC_STATUS=$(curl -s -X GET "$BASE_URL/workspaces/$WS_ID/documents" \
    -H "Authorization: Bearer $TOKEN" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Estado: $DOC_STATUS"
echo ""

# 6. Probar Chat
echo "6. Probar Chat con RAG..."
CHAT=$(curl -s -X POST "$BASE_URL/workspaces/$WS_ID/chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"¿Qué es machine learning?"}')
ANSWER=$(echo $CHAT | grep -o '"llm_response":"[^"]*' | cut -d'"' -f4 | head -c 100)
echo "✅ Respuesta: $ANSWER..."
echo ""

# 7. Guardar mensaje en historial
echo "7. Guardar mensaje en historial..."
SAVE=$(curl -s -X POST "$BASE_URL/workspaces/$WS_ID/chat/save" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"workspace_id\":\"$WS_ID\",\"role\":\"user\",\"content\":\"¿Qué es machine learning?\",\"sources\":\"[]\"}")
echo "✅ Guardado: $(echo $SAVE | grep -o '"id":"[^"]*' | cut -d'"' -f4)"
echo ""

# 8. Recuperar historial
echo "8. Recuperar historial..."
HISTORY=$(curl -s -X GET "$BASE_URL/workspaces/$WS_ID/chat/history" \
    -H "Authorization: Bearer $TOKEN")
MSG_COUNT=$(echo $HISTORY | grep -o '"id":"[^"]*' | wc -l)
echo "✅ Mensajes en historial: $MSG_COUNT"
echo ""

# 9. Exportar a TXT
echo "9. Exportar chat a TXT..."
curl -s -X GET "$BASE_URL/workspaces/$WS_ID/chat/export/txt" \
    -H "Authorization: Bearer $TOKEN" \
    -o /tmp/chat.txt
if [ -s /tmp/chat.txt ]; then
    echo "✅ Exportado: $(wc -l /tmp/chat.txt | cut -d' ' -f1) líneas"
else
    echo "❌ Error en exportación"
fi
echo ""

# 10. Búsqueda con filtros
echo "10. Búsqueda avanzada (filtro RTF)..."
SEARCH=$(curl -s -X GET "$BASE_URL/workspaces/$WS_ID/documents/search?file_type=rtf" \
    -H "Authorization: Bearer $TOKEN")
FOUND=$(echo $SEARCH | grep -o '"file_name":"[^"]*' | wc -l)
echo "✅ Documentos encontrados: $FOUND"
echo ""

# 11. Exportar documentos a CSV
echo "11. Exportar lista de documentos a CSV..."
curl -s -X GET "$BASE_URL/workspaces/$WS_ID/documents/export-csv" \
    -H "Authorization: Bearer $TOKEN" \
    -o /tmp/docs.csv
if [ -s /tmp/docs.csv ]; then
    echo "✅ CSV generado: $(wc -l /tmp/docs.csv | cut -d' ' -f1) líneas"
else
    echo "❌ Error en exportación CSV"
fi
echo ""

# 12. Búsqueda semántica cross-workspace
echo "12. Búsqueda semántica en todos los workspaces..."
FULLTEXT=$(curl -s -X GET "$BASE_URL/workspaces/fulltext-search?query=machine+learning" \
    -H "Authorization: Bearer $TOKEN")
RESULTS=$(echo $FULLTEXT | grep -o '"workspace_id":"[^"]*' | wc -l)
echo "✅ Resultados encontrados: $RESULTS"
echo ""

# 13. Logout
echo "13. Cerrar sesión (logout)..."
LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $TOKEN")
echo "✅ $LOGOUT"
echo ""

# 14. Verificar token bloqueado
echo "14. Verificar que el token está revocado..."
AFTER=$(curl -s -X GET "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $TOKEN")
if echo "$AFTER" | grep -q "revoked"; then
    echo "✅ Token correctamente bloqueado"
else
    echo "⚠️  Respuesta: $AFTER"
fi
echo ""

echo "=========================================="
echo "✅ Pruebas completadas"
echo "=========================================="

# Limpieza
rm -f /tmp/test.rtf /tmp/chat.txt /tmp/docs.csv
