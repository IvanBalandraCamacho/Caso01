#!/usr/bin/env python3
"""
Script para crear un escenario de prueba completo:
- 1 workspace con 1 documento
- 2 chats diferentes
- 1 documento en cada chat
"""

import requests
import json
import io

BASE_URL = "http://localhost:8000/api/v1"
USER_EMAIL = "validacion@test.com"
USER_PASSWORD = "test12345"

def login():
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": USER_EMAIL, "password": USER_PASSWORD}
    )
    return response.json()["access_token"]

def get_headers(token):
    return {"Authorization": f"Bearer {token}"}

def create_workspace(token):
    """Crear workspace"""
    print("📁 Creando workspace...")
    
    response = requests.post(
        f"{BASE_URL}/workspaces/",
        headers=get_headers(token),
        json={"name": "Workspace Test Independencia"}
    )
    
    workspace = response.json()
    print(f"   ✅ Workspace creado: {workspace['id']}")
    return workspace["id"]

def upload_workspace_document(token, workspace_id):
    """Subir documento al workspace (nivel global)"""
    print("\n📄 Subiendo documento al workspace (nivel global)...")
    
    # Crear un archivo de prueba
    file_content = b"Este es un documento del WORKSPACE.\nTodos los chats deben poder verlo.\nContenido compartido globalmente."
    
    files = {
        'file': ('documento_workspace.txt', io.BytesIO(file_content), 'text/plain')
    }
    
    response = requests.post(
        f"{BASE_URL}/workspaces/{workspace_id}/upload",
        headers=get_headers(token),
        files=files
    )
    
    if response.status_code == 200:
        doc = response.json()
        print(f"   ✅ Documento subido: {doc['id']} - {doc['file_name']}")
        return doc["id"]
    else:
        print(f"   ❌ Error: {response.status_code} - {response.text}")
        return None

def create_chat_and_upload_document(token, workspace_id, chat_num):
    """Crear chat y subir documento específico"""
    print(f"\n💬 Creando Chat {chat_num}...")
    
    # Crear chat enviando un mensaje (con stream=False para obtener JSON completo)
    response = requests.post(
        f"{BASE_URL}/workspaces/{workspace_id}/chat",
        headers={**get_headers(token), "Content-Type": "application/json"},
        json={"query": f"Hola, soy el chat {chat_num}", "stream": False}
    )
    
    # El endpoint devuelve streaming por defecto, leer toda la respuesta
    response_text = response.text
    
    # Buscar conversation_id en la respuesta
    import re
    match = re.search(r'"conversation_id":\s*"([^"]+)"', response_text)
    
    if not match:
        print(f"   ❌ No se pudo obtener conversation_id")
        print(f"   Response: {response_text[:200]}")
        return None, None
    
    conversation_id = match.group(1)
    print(f"   ✅ Chat {chat_num} creado: {conversation_id}")
    
    # Subir documento específico del chat
    print(f"   📄 Subiendo documento específico del Chat {chat_num}...")
    
    file_content = f"Este es un documento EXCLUSIVO del Chat {chat_num}.\nSolo debe ser visible en este chat.\nNo debe verse en otros chats.".encode()
    
    files = {
        'file': (f'documento_chat{chat_num}.txt', io.BytesIO(file_content), 'text/plain')
    }
    
    response = requests.post(
        f"{BASE_URL}/workspaces/{workspace_id}/conversations/{conversation_id}/upload",
        headers=get_headers(token),
        files=files
    )
    
    if response.status_code == 200:
        doc = response.json()
        print(f"   ✅ Documento subido: {doc['id']} - {doc['file_name']}")
        return conversation_id, doc["id"]
    else:
        print(f"   ❌ Error: {response.status_code} - {response.text}")
        return conversation_id, None

def wait_for_processing():
    """Esperar a que se procesen los documentos"""
    print("\n⏳ Esperando 10 segundos para que se procesen los documentos...")
    import time
    time.sleep(10)

def main():
    print("🚀 CREANDO ESCENARIO DE PRUEBA\n")
    
    try:
        # Login
        print("🔐 Autenticando...")
        token = login()
        print("   ✅ Autenticado\n")
        
        # Crear workspace
        workspace_id = create_workspace(token)
        
        # Subir documento al workspace
        workspace_doc_id = upload_workspace_document(token, workspace_id)
        
        # Crear Chat 1 y subir documento
        chat1_id, chat1_doc_id = create_chat_and_upload_document(token, workspace_id, 1)
        
        # Crear Chat 2 y subir documento
        chat2_id, chat2_doc_id = create_chat_and_upload_document(token, workspace_id, 2)
        
        # Esperar procesamiento
        wait_for_processing()
        
        print("\n" + "="*70)
        print("✅ ESCENARIO CREADO EXITOSAMENTE")
        print("="*70)
        print(f"\n📊 Resumen:")
        print(f"   • Workspace ID: {workspace_id}")
        print(f"   • Documento Workspace: {workspace_doc_id}")
        print(f"   • Chat 1 ID: {chat1_id}")
        print(f"   • Documento Chat 1: {chat1_doc_id}")
        print(f"   • Chat 2 ID: {chat2_id}")
        print(f"   • Documento Chat 2: {chat2_doc_id}")
        print(f"\n🧪 Ahora ejecuta: python3 validate_independence.py")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
