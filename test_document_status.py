#!/usr/bin/env python3
"""
Script de prueba para los nuevos endpoints de estado de documentos.
Demuestra cómo el frontend puede usarlos para hacer polling.
"""
import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "test_status@example.com"
PASSWORD = "TestPass123!"

def login():
    """Login y obtener token"""
    # Registrar usuario
    try:
        reg_res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": EMAIL,
            "password": PASSWORD,
            "full_name": "Test Status User"
        })
        if reg_res.status_code not in [200, 201, 400]:
            print(f"❌ Error en registro: {reg_res.status_code} - {reg_res.text}")
    except Exception as e:
        print(f"⚠️  Registro falló (probablemente ya existe): {e}")
    
    # Login con form data
    res = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": EMAIL, "password": PASSWORD}  # Form data para OAuth2
    )
    
    if res.status_code != 200:
        print(f"❌ Error en login: {res.status_code} - {res.text}")
        sys.exit(1)
    
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_document_status_endpoints():
    """Test de los endpoints de estado"""
    print("=" * 60)
    print("TEST: Endpoints de Estado de Documentos")
    print("=" * 60)
    
    headers = login()
    print("✅ Autenticado correctamente\n")
    
    # 1. Crear workspace
    print("📁 Creando workspace...")
    res = requests.post(f"{BASE_URL}/workspaces", headers=headers, json={
        "name": "Test Status Workspace",
        "description": "Workspace para probar polling de documentos"
    })
    ws_id = res.json()["id"]
    print(f"✅ Workspace creado: {ws_id}\n")
    
    # 2. Subir documento
    print("📤 Subiendo documento de prueba...")
    content = "Este es un documento de prueba para validar el endpoint de estado. " * 50
    files = {"file": ("test_status.txt", content, "text/plain")}
    res = requests.post(
        f"{BASE_URL}/workspaces/{ws_id}/upload",
        headers=headers,
        files=files
    )
    
    if res.status_code not in [200, 201, 202]:
        print(f"❌ Error subiendo documento: {res.status_code}")
        print(res.text)
        sys.exit(1)
    
    doc = res.json()
    doc_id = doc["id"]
    print(f"✅ Documento subido: {doc_id}")
    print(f"   Estado inicial: {doc['status']}\n")
    
    # 3. POLLING - Consultar estado cada 2 segundos
    print("⏳ Iniciando polling (consultando estado cada 2s)...")
    print("-" * 60)
    
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        attempt += 1
        
        # Consultar estado individual
        res = requests.get(
            f"{BASE_URL}/documents/{doc_id}/status",
            headers=headers
        )
        
        if res.status_code != 200:
            print(f"❌ Error consultando estado: {res.status_code}")
            break
        
        doc_status = res.json()
        status = doc_status["status"]
        chunks = doc_status.get("chunk_count", 0)
        
        print(f"[Intento {attempt:2d}] Estado: {status:12s} | Chunks: {chunks}")
        
        if status == "COMPLETED":
            print("\n" + "=" * 60)
            print("✅ DOCUMENTO PROCESADO EXITOSAMENTE")
            print("=" * 60)
            print(f"📊 Chunks generados: {chunks}")
            print(f"📝 Sugerencia corta: {doc_status.get('suggestion_short', 'N/A')[:80]}...")
            break
        
        elif status == "FAILED":
            print("\n❌ ERROR: El documento falló durante el procesamiento")
            break
        
        time.sleep(2)
    
    if attempt >= max_attempts:
        print(f"\n⚠️  Timeout: El documento sigue en estado {status} después de {max_attempts * 2}s")
    
    # 4. Probar endpoint de documentos pendientes
    print("\n" + "=" * 60)
    print("TEST: Endpoint de Documentos Pendientes")
    print("=" * 60)
    
    res = requests.get(
        f"{BASE_URL}/workspaces/{ws_id}/documents/pending",
        headers=headers
    )
    
    pending = res.json()
    print(f"📋 Documentos pendientes/procesando: {len(pending)}")
    
    for doc in pending:
        print(f"   - {doc['file_name']:30s} [{doc['status']}]")
    
    # 5. Cleanup
    print("\n🧹 Limpiando recursos de prueba...")
    requests.delete(f"{BASE_URL}/workspaces/{ws_id}", headers=headers)
    print("✅ Workspace eliminado\n")

if __name__ == "__main__":
    test_document_status_endpoints()
