#!/bin/bash

# Script de Testing Rápido - Sistema RAG
# ========================================

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🧪 SISTEMA RAG - GUÍA DE TESTING                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📍 URLs de Acceso:${NC}"
echo "   • Backend API:     http://localhost:8000"
echo "   • API Docs:        http://localhost:8000/docs"
echo "   • Frontend Web:    http://localhost:3000"
echo "   • Qdrant UI:       http://localhost:6333/dashboard"
echo ""

echo -e "${BLUE}🔧 Estado de Servicios:${NC}"
docker-compose ps | grep -E "(backend|frontend|mysql|redis|qdrant|celery)" | while read line; do
    name=$(echo $line | awk '{print $1}')
    status=$(echo $line | awk '{print $4}')
    if [ "$status" = "Up" ]; then
        echo -e "   ${GREEN}✓${NC} $name"
    else
        echo -e "   ${RED}✗${NC} $name - $status"
    fi
done
echo ""

# Test rápido de conectividad
echo -e "${BLUE}🌐 Test de Conectividad:${NC}"

# Backend
if curl -s http://localhost:8000/ | grep -q "Velvet"; then
    echo -e "   ${GREEN}✓${NC} Backend API respondiendo"
else
    echo -e "   ${RED}✗${NC} Backend API no responde"
fi

# Frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "   ${GREEN}✓${NC} Frontend respondiendo"
else
    echo -e "   ${RED}✗${NC} Frontend no responde"
fi

# Qdrant
if curl -s http://localhost:6333/ | grep -q "title"; then
    echo -e "   ${GREEN}✓${NC} Qdrant respondiendo"
else
    echo -e "   ${RED}✗${NC} Qdrant no responde"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 PRUEBAS DISPONIBLES:${NC}"
echo ""
echo "1️⃣  REGISTRO Y LOGIN"
echo "   curl -X POST http://localhost:8000/api/v1/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"testuser\",\"password\":\"Pass123\"}'"
echo ""
echo "   curl -X POST http://localhost:8000/api/v1/auth/token \\"
echo "     -d 'username=testuser&password=Pass123'"
echo ""

echo "2️⃣  CREAR WORKSPACE"
echo "   curl -X POST http://localhost:8000/api/v1/workspaces \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\":\"Mi Workspace\",\"description\":\"Test\"}'"
echo ""

echo "3️⃣  SUBIR DOCUMENTO"
echo "   curl -X POST http://localhost:8000/api/v1/workspaces/WORKSPACE_ID/upload \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI' \\"
echo "     -F 'file=@documento.pdf'"
echo ""

echo "4️⃣  CHAT CON RAG"
echo "   curl -X POST http://localhost:8000/api/v1/workspaces/WORKSPACE_ID/chat \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\":\"¿De qué trata el documento?\"}'"
echo ""

echo "5️⃣  HISTORIAL DE CHAT"
echo "   curl http://localhost:8000/api/v1/workspaces/WORKSPACE_ID/chat/history \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI'"
echo ""

echo "6️⃣  BÚSQUEDA AVANZADA"
echo "   curl 'http://localhost:8000/api/v1/workspaces/WORKSPACE_ID/documents/search?file_type=pdf' \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI'"
echo ""

echo "7️⃣  EXPORTAR DOCUMENTOS A CSV"
echo "   curl http://localhost:8000/api/v1/workspaces/WORKSPACE_ID/documents/export-csv \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI' -o documentos.csv"
echo ""

echo "8️⃣  BÚSQUEDA FULLTEXT (Cross-Workspace)"
echo "   curl 'http://localhost:8000/api/v1/workspaces/fulltext-search?query=inteligencia' \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI'"
echo ""

echo "9️⃣  LOGOUT"
echo "   curl -X POST http://localhost:8000/api/v1/auth/logout \\"
echo "     -H 'Authorization: Bearer TOKEN_AQUI'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}🚀 PRUEBA RÁPIDA AUTOMATIZADA:${NC}"
echo ""
read -p "¿Ejecutar prueba automatizada? (s/n): " respuesta

if [ "$respuesta" = "s" ] || [ "$respuesta" = "S" ]; then
    echo ""
    echo -e "${GREEN}Ejecutando prueba automatizada...${NC}"
    echo ""
    
    # 1. Registro
    echo "1. Creando usuario..."
    USERNAME="autotest_$(date +%s)"
    curl -s -X POST http://localhost:8000/api/v1/auth/register \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"$USERNAME\",\"password\":\"Pass123\"}" | jq .
    
    # 2. Login
    echo ""
    echo "2. Obteniendo token..."
    TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/token \
        -d "username=$USERNAME&password=Pass123" | jq -r '.access_token')
    echo "Token: ${TOKEN:0:30}..."
    
    # 3. Crear workspace
    echo ""
    echo "3. Creando workspace..."
    WS=$(curl -s -X POST http://localhost:8000/api/v1/workspaces \
        -H "Authorization: Bearer $TOKEN" \
        -H 'Content-Type: application/json' \
        -d '{"name":"Test Workspace","description":"Prueba automática"}')
    WS_ID=$(echo $WS | jq -r '.id')
    echo "Workspace ID: $WS_ID"
    
    # 4. Crear archivo de prueba
    echo ""
    echo "4. Subiendo documento de prueba..."
    echo "Este es un documento de prueba sobre inteligencia artificial y machine learning." > /tmp/test_doc.txt
    UPLOAD=$(curl -s -X POST "http://localhost:8000/api/v1/workspaces/$WS_ID/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@/tmp/test_doc.txt")
    echo $UPLOAD | jq '{id, file_name, status}'
    
    # 5. Esperar procesamiento
    echo ""
    echo "5. Esperando procesamiento del documento (10s)..."
    sleep 10
    
    # 6. Chat
    echo ""
    echo "6. Probando chat con RAG..."
    CHAT=$(curl -s -X POST "http://localhost:8000/api/v1/workspaces/$WS_ID/chat" \
        -H "Authorization: Bearer $TOKEN" \
        -H 'Content-Type: application/json' \
        -d '{"query":"¿De qué trata este documento?"}')
    echo $CHAT | jq '{query, answer: .llm_response}'
    
    # 7. Historial
    echo ""
    echo "7. Guardando en historial..."
    curl -s -X POST "http://localhost:8000/api/v1/workspaces/$WS_ID/chat/save" \
        -H "Authorization: Bearer $TOKEN" \
        -H 'Content-Type: application/json' \
        -d "{\"workspace_id\":\"$WS_ID\",\"role\":\"user\",\"content\":\"¿De qué trata?\",\"sources\":\"[]\"}" | jq .
    
    echo ""
    echo "8. Recuperando historial..."
    curl -s "http://localhost:8000/api/v1/workspaces/$WS_ID/chat/history" \
        -H "Authorization: Bearer $TOKEN" | jq 'length'
    
    # 8. Búsqueda
    echo ""
    echo "9. Búsqueda fulltext..."
    curl -s "http://localhost:8000/api/v1/workspaces/fulltext-search?query=inteligencia" \
        -H "Authorization: Bearer $TOKEN" | jq '{total_workspaces_searched, workspaces_with_results}'
    
    # 9. Logout
    echo ""
    echo "10. Logout..."
    curl -s -X POST http://localhost:8000/api/v1/auth/logout \
        -H "Authorization: Bearer $TOKEN" | jq .
    
    # Cleanup
    rm -f /tmp/test_doc.txt
    
    echo ""
    echo -e "${GREEN}✅ Prueba automatizada completada${NC}"
else
    echo ""
    echo -e "${BLUE}ℹ️  Usa la documentación interactiva en http://localhost:8000/docs${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📚 DOCUMENTACIÓN:${NC}"
echo "   • README.md                    - Descripción del proyecto"
echo "   • NUEVAS_FUNCIONALIDADES.md    - Guía completa de features"
echo "   • VALIDACION_CORRECCIONES.md   - Reporte de correcciones"
echo ""
echo -e "${YELLOW}🔍 LOGS:${NC}"
echo "   docker-compose logs -f backend      # Ver logs del backend"
echo "   docker-compose logs -f celery_worker  # Ver logs del worker"
echo "   docker-compose logs -f frontend     # Ver logs del frontend"
echo ""
echo -e "${GREEN}✨ Sistema listo para usar!${NC}"
echo ""
