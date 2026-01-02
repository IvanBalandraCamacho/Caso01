#!/bin/bash

# Script para probar los endpoints del backend

API_URL="http://localhost:8000/api/v1"

echo "==================================="
echo "Testing Backend Endpoints"
echo "==================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para hacer login y obtener token
get_token() {
    echo -e "${YELLOW}1. Testing Login...${NC}"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=manuel.aliaga@tivit.com&password=123456789")
    
    TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}✗ Login failed${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${TOKEN:0:20}..."
    echo ""
}

# Función para verificar usuario actual
check_user() {
    echo -e "${YELLOW}2. Testing Get Current User...${NC}"
    
    RESPONSE=$(curl -s -X GET "${API_URL}/auth/me" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$RESPONSE" | grep -q "email"; then
        echo -e "${GREEN}✓ User endpoint working${NC}"
        echo "User: $(echo $RESPONSE | grep -o '"email":"[^"]*' | cut -d'"' -f4)"
    else
        echo -e "${RED}✗ User endpoint failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Función para listar workspaces
list_workspaces() {
    echo -e "${YELLOW}3. Testing List Workspaces...${NC}"
    
    RESPONSE=$(curl -s -X GET "${API_URL}/workspaces" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$RESPONSE" | grep -q -E '\[|\]'; then
        COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${GREEN}✓ Workspaces endpoint working${NC}"
        echo "Workspaces found: $COUNT"
        
        # Extraer primer workspace ID si existe
        WORKSPACE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        if [ ! -z "$WORKSPACE_ID" ]; then
            echo "First workspace ID: $WORKSPACE_ID"
        fi
    else
        echo -e "${RED}✗ Workspaces endpoint failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Función para crear workspace
create_workspace() {
    echo -e "${YELLOW}4. Testing Create Workspace...${NC}"
    
    WORKSPACE_NAME="Test Workspace $(date +%s)"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/workspaces" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${WORKSPACE_NAME}\",\"description\":\"Test workspace for endpoint validation\",\"instructions\":\"Test instructions\"}")
    
    if echo "$RESPONSE" | grep -q "id"; then
        echo -e "${GREEN}✓ Create workspace successful${NC}"
        NEW_WORKSPACE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        echo "New workspace ID: $NEW_WORKSPACE_ID"
        echo "Name: $WORKSPACE_NAME"
        
        # Guardar para uso posterior
        WORKSPACE_ID=$NEW_WORKSPACE_ID
    else
        echo -e "${RED}✗ Create workspace failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Función para obtener conversaciones de un workspace
get_conversations() {
    if [ -z "$WORKSPACE_ID" ]; then
        echo -e "${YELLOW}5. Skipping Get Conversations (no workspace ID)${NC}"
        echo ""
        return
    fi
    
    echo -e "${YELLOW}5. Testing Get Conversations...${NC}"
    
    RESPONSE=$(curl -s -X GET "${API_URL}/workspaces/${WORKSPACE_ID}/conversations" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$RESPONSE" | grep -q -E '\[|\]'; then
        COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${GREEN}✓ Conversations endpoint working${NC}"
        echo "Conversations found: $COUNT"
    else
        echo -e "${RED}✗ Conversations endpoint failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Función para verificar health check
health_check() {
    echo -e "${YELLOW}6. Testing Health Check...${NC}"
    
    RESPONSE=$(curl -s -X GET "${API_URL}/health")
    
    if echo "$RESPONSE" | grep -q "status"; then
        echo -e "${GREEN}✓ Health check working${NC}"
        echo "Status: $(echo $RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"
    else
        echo -e "${RED}✗ Health check failed${NC}"
        echo "Response: $RESPONSE"
    fi
    echo ""
}

# Ejecutar pruebas
get_token
check_user
list_workspaces
create_workspace
get_conversations
health_check

echo "==================================="
echo "Testing Complete"
echo "==================================="
