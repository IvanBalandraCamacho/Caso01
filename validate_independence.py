#!/usr/bin/env python3
"""
Script de validación de independencia entre chats y workspaces.

Prueba que:
1. Los documentos del workspace (conversation_id = NULL) sean visibles en todos los chats
2. Los documentos de un chat específico solo sean visibles en ese chat
3. Los documentos de un chat NO sean visibles en otro chat
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"
RAG_URL = "http://localhost:8082"

# Credenciales de usuario existente
USER_EMAIL = "validacion@test.com"
USER_PASSWORD = "test12345"

def print_section(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def login():
    """Autenticar usuario"""
    print_section("1. AUTENTICACIÓN")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": USER_EMAIL,
            "password": USER_PASSWORD
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Error en login: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    token = response.json()["access_token"]
    print(f"✅ Login exitoso")
    return token

def get_headers(token):
    """Headers con autenticación"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_workspaces(token):
    """Obtener workspaces"""
    print_section("2. OBTENER WORKSPACES")
    
    response = requests.get(
        f"{BASE_URL}/workspaces/",
        headers=get_headers(token)
    )
    
    workspaces = response.json()
    print(f"✅ Workspaces encontrados: {len(workspaces)}")
    
    if len(workspaces) == 0:
        print("❌ No hay workspaces. Crea uno primero.")
        sys.exit(1)
    
    workspace = workspaces[0]
    print(f"   - ID: {workspace['id']}")
    print(f"   - Nombre: {workspace['name']}")
    
    return workspace["id"]

def get_or_create_chats(token, workspace_id):
    """Obtener o crear 2 chats diferentes"""
    print_section("3. OBTENER/CREAR CHATS")
    
    # Listar chats existentes
    response = requests.get(
        f"{BASE_URL}/workspaces/{workspace_id}/conversations",
        headers=get_headers(token)
    )
    
    existing_chats = response.json()
    print(f"   Chats existentes: {len(existing_chats)}")
    
    chat_ids = []
    
    # Obtener o crear Chat 1
    if len(existing_chats) >= 1:
        chat_ids.append(existing_chats[0]["id"])
        print(f"✅ Chat 1 (existente): {existing_chats[0]['id']}")
    else:
        # Crear chat 1 enviando un mensaje
        response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/chat",
            headers=get_headers(token),
            json={"query": "Hola, este es el chat 1"}
        )
        if response.status_code == 200:
            data = response.json()
            chat_ids.append(data["conversation_id"])
            print(f"✅ Chat 1 (creado): {data['conversation_id']}")
    
    # Obtener o crear Chat 2
    if len(existing_chats) >= 2:
        chat_ids.append(existing_chats[1]["id"])
        print(f"✅ Chat 2 (existente): {existing_chats[1]['id']}")
    else:
        # Crear chat 2 con conversation_id vacío para forzar nuevo chat
        response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/chat",
            headers=get_headers(token),
            json={"query": "Hola, este es el chat 2", "conversation_id": None}
        )
        if response.status_code == 200:
            data = response.json()
            chat_ids.append(data["conversation_id"])
            print(f"✅ Chat 2 (creado): {data['conversation_id']}")
    
    if len(chat_ids) < 2:
        print("❌ No se pudieron obtener 2 chats diferentes")
        sys.exit(1)
    
    return chat_ids[0], chat_ids[1]

def check_documents_in_db(workspace_id):
    """Verificar documentos en la BD usando MySQL"""
    print_section("4. VERIFICAR DOCUMENTOS EN BASE DE DATOS")
    
    import subprocess
    
    cmd = f"""docker exec ia_mysql mysql -uadmin -psupersecret ia_db -e "SELECT id, file_name, conversation_id FROM documents WHERE workspace_id='{workspace_id}';" 2>/dev/null | tail -n +2"""
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("❌ Error al consultar BD")
        return []
    
    lines = result.stdout.strip().split("\n")
    documents = []
    
    for line in lines:
        if line.strip():
            parts = line.split("\t")
            if len(parts) >= 3:
                doc_id = parts[0]
                file_name = parts[1]
                conv_id = parts[2] if parts[2] != "NULL" else None
                documents.append({
                    "id": doc_id,
                    "file_name": file_name,
                    "conversation_id": conv_id
                })
    
    print(f"   Total documentos: {len(documents)}")
    
    workspace_docs = [d for d in documents if d["conversation_id"] is None]
    chat_docs = [d for d in documents if d["conversation_id"] is not None]
    
    print(f"   - Documentos del workspace (conversation_id = NULL): {len(workspace_docs)}")
    for doc in workspace_docs:
        print(f"     • {doc['file_name']}")
    
    print(f"   - Documentos de chats específicos: {len(chat_docs)}")
    for doc in chat_docs:
        print(f"     • {doc['file_name']} (chat: {doc['conversation_id'][:8]}...)")
    
    return documents

def test_rag_search(workspace_id, chat_id, query="documento"):
    """Probar búsqueda RAG con filtros"""
    print(f"\n   🔍 Búsqueda RAG: workspace={workspace_id[:8]}..., chat={chat_id[:8] if chat_id else 'None'}...")
    
    payload = {
        "query": query,
        "workspace_id": workspace_id,
        "limit": 10,
        "threshold": 0.0
    }
    
    if chat_id:
        payload["conversation_id"] = chat_id
    
    try:
        response = requests.post(
            f"{RAG_URL}/search",
            json=payload,
            timeout=5
        )
        
        if response.status_code == 200:
            results = response.json()
            print(f"      ✓ Resultados encontrados: {len(results)}")
            
            # Agrupar por document_id
            doc_ids = set()
            for r in results:
                doc_ids.add(r.get("document_id"))
            
            print(f"      ✓ Documentos únicos: {len(doc_ids)}")
            
            return results
        else:
            print(f"      ✗ Error: {response.status_code}")
            return []
    except Exception as e:
        print(f"      ✗ Excepción: {e}")
        return []

def validate_independence(workspace_id, chat1_id, chat2_id, documents):
    """Validar la independencia entre chats"""
    print_section("5. VALIDAR INDEPENDENCIA ENTRE CHATS")
    
    workspace_docs = [d for d in documents if d["conversation_id"] is None]
    chat1_docs = [d for d in documents if d["conversation_id"] == chat1_id]
    chat2_docs = [d for d in documents if d["conversation_id"] == chat2_id]
    
    print(f"\n📊 Distribución de documentos:")
    print(f"   - Workspace (global): {len(workspace_docs)} docs")
    print(f"   - Chat 1: {len(chat1_docs)} docs")
    print(f"   - Chat 2: {len(chat2_docs)} docs")
    
    # Prueba 1: Chat 1 debe ver documentos del workspace
    print(f"\n✓ PRUEBA 1: Chat 1 debe ver documentos del workspace")
    results_chat1 = test_rag_search(workspace_id, chat1_id)
    
    # Prueba 2: Chat 2 debe ver documentos del workspace
    print(f"\n✓ PRUEBA 2: Chat 2 debe ver documentos del workspace")
    results_chat2 = test_rag_search(workspace_id, chat2_id)
    
    # Prueba 3: Sin filtro de chat (solo workspace)
    print(f"\n✓ PRUEBA 3: Búsqueda en workspace sin especificar chat")
    results_workspace = test_rag_search(workspace_id, None)
    
    # Análisis
    print_section("6. ANÁLISIS DE RESULTADOS")
    
    doc_ids_chat1 = set(r.get("document_id") for r in results_chat1)
    doc_ids_chat2 = set(r.get("document_id") for r in results_chat2)
    doc_ids_workspace = set(r.get("document_id") for r in results_workspace)
    
    workspace_doc_ids = set(d["id"] for d in workspace_docs)
    chat1_doc_ids = set(d["id"] for d in chat1_docs)
    chat2_doc_ids = set(d["id"] for d in chat2_docs)
    
    print(f"\n📝 Documentos únicos encontrados por búsqueda:")
    print(f"   - Chat 1: {len(doc_ids_chat1)} documentos")
    print(f"   - Chat 2: {len(doc_ids_chat2)} documentos")
    print(f"   - Workspace (sin filtro): {len(doc_ids_workspace)} documentos")
    
    # Validaciones
    print(f"\n🧪 VALIDACIONES:")
    
    all_passed = True
    
    # 1. Chat 1 debe ver documentos del workspace
    if len(workspace_docs) > 0:
        workspace_in_chat1 = workspace_doc_ids & doc_ids_chat1
        if len(workspace_in_chat1) > 0:
            print(f"   ✅ Chat 1 puede ver documentos del workspace ({len(workspace_in_chat1)}/{len(workspace_docs)})")
        else:
            print(f"   ❌ Chat 1 NO puede ver documentos del workspace")
            all_passed = False
    else:
        print(f"   ⚠️  No hay documentos del workspace para probar")
    
    # 2. Chat 2 debe ver documentos del workspace
    if len(workspace_docs) > 0:
        workspace_in_chat2 = workspace_doc_ids & doc_ids_chat2
        if len(workspace_in_chat2) > 0:
            print(f"   ✅ Chat 2 puede ver documentos del workspace ({len(workspace_in_chat2)}/{len(workspace_docs)})")
        else:
            print(f"   ❌ Chat 2 NO puede ver documentos del workspace")
            all_passed = False
    
    # 3. Chat 1 solo debe ver sus propios documentos específicos
    if len(chat1_docs) > 0:
        chat1_in_chat1 = chat1_doc_ids & doc_ids_chat1
        if len(chat1_in_chat1) == len(chat1_docs):
            print(f"   ✅ Chat 1 puede ver sus propios documentos ({len(chat1_in_chat1)}/{len(chat1_docs)})")
        else:
            print(f"   ⚠️  Chat 1 solo ve {len(chat1_in_chat1)}/{len(chat1_docs)} de sus documentos")
    
    # 4. Chat 2 solo debe ver sus propios documentos específicos
    if len(chat2_docs) > 0:
        chat2_in_chat2 = chat2_doc_ids & doc_ids_chat2
        if len(chat2_in_chat2) == len(chat2_docs):
            print(f"   ✅ Chat 2 puede ver sus propios documentos ({len(chat2_in_chat2)}/{len(chat2_docs)})")
        else:
            print(f"   ⚠️  Chat 2 solo ve {len(chat2_in_chat2)}/{len(chat2_docs)} de sus documentos")
    
    # 5. Chat 1 NO debe ver documentos de Chat 2
    if len(chat2_docs) > 0:
        chat2_in_chat1 = chat2_doc_ids & doc_ids_chat1
        if len(chat2_in_chat1) == 0:
            print(f"   ✅ Chat 1 NO puede ver documentos del Chat 2 (independencia correcta)")
        else:
            print(f"   ❌ Chat 1 puede ver {len(chat2_in_chat1)} documentos del Chat 2 (FALLA DE INDEPENDENCIA)")
            all_passed = False
    
    # 6. Chat 2 NO debe ver documentos de Chat 1
    if len(chat1_docs) > 0:
        chat1_in_chat2 = chat1_doc_ids & doc_ids_chat2
        if len(chat1_in_chat2) == 0:
            print(f"   ✅ Chat 2 NO puede ver documentos del Chat 1 (independencia correcta)")
        else:
            print(f"   ❌ Chat 2 puede ver {len(chat1_in_chat2)} documentos del Chat 1 (FALLA DE INDEPENDENCIA)")
            all_passed = False
    
    print_section("RESULTADO FINAL")
    if all_passed:
        print("✅ ¡TODAS LAS VALIDACIONES PASARON! La independencia entre chats funciona correctamente.")
    else:
        print("❌ ALGUNAS VALIDACIONES FALLARON. Revisa la implementación.")
    
    return all_passed

def main():
    """Función principal"""
    print("\n🔬 VALIDACIÓN DE INDEPENDENCIA ENTRE CHATS Y WORKSPACES")
    print("=" * 70)
    
    try:
        # 1. Login
        token = login()
        
        # 2. Obtener workspace
        workspace_id = get_workspaces(token)
        
        # 3. Obtener o crear chats
        chat1_id, chat2_id = get_or_create_chats(token, workspace_id)
        
        # 4. Verificar documentos en BD
        documents = check_documents_in_db(workspace_id)
        
        if len(documents) == 0:
            print("\n⚠️  No hay documentos en el workspace.")
            print("   Sube algunos documentos:")
            print(f"   1. Documento del workspace (nivel global)")
            print(f"   2. Documento en Chat 1")
            print(f"   3. Documento en Chat 2")
            print("\n   Luego vuelve a ejecutar este script.")
            sys.exit(0)
        
        # 5. Validar independencia
        validate_independence(workspace_id, chat1_id, chat2_id, documents)
        
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
