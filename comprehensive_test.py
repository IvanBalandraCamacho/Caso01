import requests
import json
import time
import sys
import os

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "test_full_flow@workspace.com"
PASSWORD = "TestPass123!"
USERNAME = "testuser_full"

def print_step(step, message):
    print(f"\n{'='*50}")
    print(f"STEP {step}: {message}")
    print(f"{'='*50}")

def check_response(response, expected_code=200, context=""):
    # Allow expected_code to be a single int or a list of ints
    expected_codes = [expected_code] if isinstance(expected_code, int) else expected_code
    
    if response.status_code not in expected_codes:
        print(f"❌ FAILED: {context}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)
    return response.json() if response.content else {}

def wait_for_processing(token, workspace_id, document_id, timeout=60):
    print(f"⏳ Waiting for document {document_id} processing...")
    headers = {"Authorization": f"Bearer {token}"}
    start_time = time.time()
    while time.time() - start_time < timeout:
        res = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/documents", headers=headers)
        if res.status_code == 200:
            docs = res.json()
            for doc in docs:
                if doc["id"] == document_id:
                    if doc["status"] == "COMPLETED":
                        print("✅ Document processed successfully.")
                        return True
                    if doc["status"] == "FAILED":
                        print(f"❌ Document processing failed: {doc.get('error_message')}")
                        return False
        time.sleep(2)
    print("❌ Timeout waiting for document processing.")
    return False

def get_chat_response(response):
    full_text = ""
    for line in response.iter_lines():
        if line:
            try:
                data = json.loads(line)
                if data.get("type") == "content":
                    full_text += data.get("text", "")
                elif data.get("type") == "error":
                    print(f"Error in stream: {data.get('detail')}")
            except json.JSONDecodeError:
                pass
    return full_text

def main():
    # 1. Auth
    print_step("1", "Authentication")
    # Register
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": EMAIL,
        "username": USERNAME,
        "password": PASSWORD
    }) # Ignore error if exists
    
    # Login
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    data = check_response(res, 200, "Login")
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Logged in. Token obtained.")

    # 2. Create Workspace
    print_step("2", "Create Workspace")
    res = requests.post(f"{BASE_URL}/workspaces", headers=headers, json={
        "name": "Proyecto Alpha - Test",
        "description": "Workspace de prueba para validación",
        "instructions": "Eres un asistente especializado."
    })
    ws_data = check_response(res, [200, 201], "Create Workspace")
    ws_id = ws_data["id"]
    print(f"✅ Workspace created: {ws_id}")

    # Verify that a default conversation was created automatically
    res = requests.get(f"{BASE_URL}/workspaces/{ws_id}/conversations", headers=headers)
    convs = check_response(res, 200, "Get Conversations After Workspace Creation")
    if len(convs) < 1:
        print("❌ No default conversation created for workspace")
        sys.exit(1)
    else:
        print(f"✅ {len(convs)} conversation(s) found (default created)")

    # 3. Global Document
    print_step("3", "Global Document Upload")
    manual_content = """Este es un manual de la empresa.
    Políticas de la empresa:
    - Horario: Lunes a Viernes 9:00 - 18:00
    - Vacaciones: 15 días al año
    - Trabajo remoto: Permitido 2 días por semana
    Contacto de soporte: soporte@empresa.com"""
    
    files = {"file": ("manual_empresa.txt", manual_content, "text/plain")}
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/upload", headers=headers, files=files)
    doc_global = check_response(res, [200, 201, 202], "Upload Global Doc")
    print(f"✅ Global document uploaded: {doc_global['id']}")
    
    if not wait_for_processing(token, ws_id, doc_global['id']):
        sys.exit(1)

    # 4. Create Chats
    print_step("4", "Create Chats")
    # Chat A
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/conversations", headers=headers, json={"title": "Chat A - Proyectos"})
    chat_a = check_response(res, [200, 201], "Create Chat A")
    chat_a_id = chat_a["id"]
    print(f"✅ Chat A created: {chat_a_id}")

    # Chat B
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/conversations", headers=headers, json={"title": "Chat B - Marketing"})
    chat_b = check_response(res, [200, 201], "Create Chat B")
    chat_b_id = chat_b["id"]
    print(f"✅ Chat B created: {chat_b_id}")

    # 5. Chat Specific Docs
    print_step("5", "Chat Specific Documents")
    
    # Doc for Chat A
    content_a = """PROYECTO ALPHA - CONFIDENCIAL
    Cliente: TechCorp Inc.
    Presupuesto: $50,000 USD
    Fecha entrega: 2025-12-31
    Equipo asignado:
    - Project Manager: Juan Pérez"""
    
    files = {"file": ("proyecto_chatA.txt", content_a, "text/plain")}
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/conversations/{chat_a_id}/upload", headers=headers, files=files)
    doc_a = check_response(res, [200, 201, 202], "Upload Chat A Doc")
    print(f"✅ Chat A document uploaded: {doc_a['id']}")
    wait_for_processing(token, ws_id, doc_a['id'])

    # Doc for Chat B
    content_b = """CAMPAÑA DE MARKETING - Q4 2025
    Objetivo: Aumentar ventas en 30%
    Presupuesto: $20,000 USD
    KPIs:
    - CTR: 5%
    - Conversión: 2%"""
    
    files = {"file": ("marketing_chatB.txt", content_b, "text/plain")}
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/conversations/{chat_b_id}/upload", headers=headers, files=files)
    doc_b = check_response(res, [200, 201, 202], "Upload Chat B Doc")
    print(f"✅ Chat B document uploaded: {doc_b['id']}")
    wait_for_processing(token, ws_id, doc_b['id'])

    # 6. Verify Isolation
    print_step("6", "Verify Context Isolation")
    
    # Query Chat A
    print("🔹 Querying Chat A (Should know about Project Alpha & Manual)...")
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/chat", headers=headers, json={
        "query": "¿Cuál es el presupuesto del proyecto y el horario de la empresa?",
        "conversation_id": chat_a_id,
        "stream": False
    })
    if res.status_code != 200:
        print(f"❌ Chat A Query Failed: {res.status_code} {res.text}")
        sys.exit(1)
    ans_a = get_chat_response(res)
    print(f"Response A: {ans_a}")
    
    if "50,000" in ans_a and "9:00" in ans_a:
        print("✅ Chat A context correct.")
    else:
        print("❌ Chat A context incorrect.")

    # Query Chat B
    print("🔹 Querying Chat B (Should know about Marketing & Manual)...")
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/chat", headers=headers, json={
        "query": "¿Cuál es el presupuesto de la campaña y los días de vacaciones?",
        "conversation_id": chat_b_id,
        "stream": False
    })
    if res.status_code != 200:
        print(f"❌ Chat B Query Failed: {res.status_code} {res.text}")
        sys.exit(1)
    ans_b = get_chat_response(res)
    print(f"Response B: {ans_b}")

    if "20,000" in ans_b and "15" in ans_b:
        print("✅ Chat B context correct.")
    else:
        print("❌ Chat B context incorrect.")

    # 7. Delete Chat A
    print_step("7", "Delete Chat A")
    res = requests.delete(f"{BASE_URL}/workspaces/{ws_id}/conversations/{chat_a_id}", headers=headers)
    check_response(res, [200, 204], "Delete Chat A")
    print("✅ Chat A deleted.")

    # Verify Doc A is gone
    res = requests.get(f"{BASE_URL}/workspaces/{ws_id}/documents", headers=headers)
    docs = res.json()
    doc_ids = [d["id"] for d in docs]
    if doc_a['id'] not in doc_ids:
        print("✅ Document A removed from workspace list.")
    else:
        print("❌ Document A still exists!")

    # 8. Delete Workspace
    print_step("8", "Delete Workspace")
    res = requests.delete(f"{BASE_URL}/workspaces/{ws_id}", headers=headers)
    check_response(res, [200, 204], "Delete Workspace")
    print("✅ Workspace deleted.")

    # Verify 404
    res = requests.get(f"{BASE_URL}/workspaces/{ws_id}", headers=headers)
    if res.status_code == 404:
        print("✅ Workspace 404 confirmed.")
    else:
        print(f"❌ Workspace still exists or other error: {res.status_code}")

if __name__ == "__main__":
    main()
