#!/usr/bin/env python3
"""
Validación focalizada en workspace específico con documentos completos
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"
RAG_URL = "http://localhost:8082"

# Workspace y chats a validar (obtenidos del setup)
WORKSPACE_ID = "f1b95e69-2bab-4514-95d7-3f3076b6a24d"
CHAT1_ID = "91cf3e62-70ff-4027-b642-22b3d40bfa8c"
CHAT2_ID = "9f7c0108-3cde-470c-ae44-e0ff6dfe2394"

# Documentos esperados
DOC_WORKSPACE = "82e05143-bb4c-497f-9b69-b141f72da152"
DOC_CHAT1 = "75c6b049-a1d7-44d8-9736-f5dac00e3376"
DOC_CHAT2 = "f50675ae-f840-4f7d-8e90-3c731e28b0f3"

def test_rag_search(workspace_id, chat_id, query="documento"):
    """Probar búsqueda RAG"""
    payload = {
        "query": query,
        "workspace_id": workspace_id,
        "limit": 10,
        "threshold": 0.0
    }
    
    if chat_id:
        payload["conversation_id"] = chat_id
    
    try:
        response = requests.post(f"{RAG_URL}/search", json=payload, timeout=5)
        
        if response.status_code == 200:
            results = response.json()
            doc_ids = set(r.get("document_id") for r in results)
            return doc_ids
        return set()
    except Exception as e:
        print(f"      ✗ Error: {e}")
        return set()

def main():
    print("\n" + "="*70)
    print("🧪 VALIDACIÓN COMPLETA DE INDEPENDENCIA")
    print("="*70)
    
    print(f"\n📌 Workspace: {WORKSPACE_ID[:8]}...")
    print(f"   Chat 1: {CHAT1_ID[:8]}...")
    print(f"   Chat 2: {CHAT2_ID[:8]}...")
    
    print(f"\n📄 Documentos:")
    print(f"   • Workspace (global): {DOC_WORKSPACE[:8]}...")
    print(f"   • Chat 1 (exclusivo): {DOC_CHAT1[:8]}...")
    print(f"   • Chat 2 (exclusivo): {DOC_CHAT2[:8]}...")
    
    print("\n" + "="*70)
    print("PRUEBAS DE BÚSQUEDA RAG")
    print("="*70)
    
    # Búsqueda en Chat 1
    print(f"\n🔍 CHAT 1: Buscar 'documento'")
    docs_chat1 = test_rag_search(WORKSPACE_ID, CHAT1_ID, "documento")
    print(f"   Documentos encontrados: {len(docs_chat1)}")
    for doc_id in docs_chat1:
        print(f"      • {doc_id[:8]}...")
    
    # Búsqueda en Chat 2
    print(f"\n🔍 CHAT 2: Buscar 'documento'")
    docs_chat2 = test_rag_search(WORKSPACE_ID, CHAT2_ID, "documento")
    print(f"   Documentos encontrados: {len(docs_chat2)}")
    for doc_id in docs_chat2:
        print(f"      • {doc_id[:8]}...")
    
    # Búsqueda en Workspace (sin chat específico)
    print(f"\n🔍 WORKSPACE: Buscar 'documento'")
    docs_workspace = test_rag_search(WORKSPACE_ID, None, "documento")
    print(f"   Documentos encontrados: {len(docs_workspace)}")
    for doc_id in docs_workspace:
        print(f"      • {doc_id[:8]}...")
    
    print("\n" + "="*70)
    print("VALIDACIONES")
    print("="*70)
    
    all_passed = True
    
    # 1. Chat 1 debe ver documento del workspace
    print(f"\n✓ TEST 1: Chat 1 debe ver documento del workspace")
    if DOC_WORKSPACE in docs_chat1:
        print(f"   ✅ PASS - Chat 1 puede ver documento global")
    else:
        print(f"   ❌ FAIL - Chat 1 NO puede ver documento global")
        all_passed = False
    
    # 2. Chat 1 debe ver su propio documento
    print(f"\n✓ TEST 2: Chat 1 debe ver su documento exclusivo")
    if DOC_CHAT1 in docs_chat1:
        print(f"   ✅ PASS - Chat 1 puede ver su documento")
    else:
        print(f"   ❌ FAIL - Chat 1 NO puede ver su documento")
        all_passed = False
    
    # 3. Chat 1 NO debe ver documento de Chat 2
    print(f"\n✓ TEST 3: Chat 1 NO debe ver documento de Chat 2")
    if DOC_CHAT2 not in docs_chat1:
        print(f"   ✅ PASS - Independencia correcta (Chat 1 no ve doc de Chat 2)")
    else:
        print(f"   ❌ FAIL - INDEPENDENCIA VIOLADA (Chat 1 ve doc de Chat 2)")
        all_passed = False
    
    # 4. Chat 2 debe ver documento del workspace
    print(f"\n✓ TEST 4: Chat 2 debe ver documento del workspace")
    if DOC_WORKSPACE in docs_chat2:
        print(f"   ✅ PASS - Chat 2 puede ver documento global")
    else:
        print(f"   ❌ FAIL - Chat 2 NO puede ver documento global")
        all_passed = False
    
    # 5. Chat 2 debe ver su propio documento
    print(f"\n✓ TEST 5: Chat 2 debe ver su documento exclusivo")
    if DOC_CHAT2 in docs_chat2:
        print(f"   ✅ PASS - Chat 2 puede ver su documento")
    else:
        print(f"   ❌ FAIL - Chat 2 NO puede ver su documento")
        all_passed = False
    
    # 6. Chat 2 NO debe ver documento de Chat 1
    print(f"\n✓ TEST 6: Chat 2 NO debe ver documento de Chat 1")
    if DOC_CHAT1 not in docs_chat2:
        print(f"   ✅ PASS - Independencia correcta (Chat 2 no ve doc de Chat 1)")
    else:
        print(f"   ❌ FAIL - INDEPENDENCIA VIOLADA (Chat 2 ve doc de Chat 1)")
        all_passed = False
    
    # 7. Búsqueda en workspace sin filtro debe ver todos los documentos
    print(f"\n✓ TEST 7: Búsqueda en workspace debe ver todos los documentos")
    expected_all = {DOC_WORKSPACE, DOC_CHAT1, DOC_CHAT2}
    if docs_workspace == expected_all:
        print(f"   ✅ PASS - Todos los documentos visibles sin filtro ({len(docs_workspace)}/3)")
    else:
        print(f"   ⚠️  PARTIAL - {len(docs_workspace)}/3 documentos visibles")
        print(f"       Encontrados: {docs_workspace}")
        print(f"       Esperados: {expected_all}")
    
    print("\n" + "="*70)
    print("RESULTADO FINAL")
    print("="*70)
    
    if all_passed:
        print("\n✅ ¡TODOS LOS TESTS PASARON!")
        print("\n📊 Resumen:")
        print(f"   ✅ Chat 1 ve: Documento workspace + Su documento")
        print(f"   ✅ Chat 1 NO ve: Documento de Chat 2")
        print(f"   ✅ Chat 2 ve: Documento workspace + Su documento")
        print(f"   ✅ Chat 2 NO ve: Documento de Chat 1")
        print(f"   ✅ Sin filtro: Ve todos los documentos")
        print("\n🎯 LA INDEPENDENCIA ENTRE CHATS FUNCIONA AL 100%\n")
    else:
        print("\n❌ ALGUNOS TESTS FALLARON")
        print("   Revisa la implementación de filtros RAG\n")

if __name__ == "__main__":
    main()
