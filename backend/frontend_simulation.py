import requests
import json
import sys
import os

BASE_URL = "http://localhost:8000/api/v1"

def test_streaming_chat(workspace_id):
    print(f"\n--- Testing Streaming Chat (Frontend Simulation) ---")
    url = f"{BASE_URL}/workspaces/{workspace_id}/chat"
    payload = {"query": "Hola, ¿cómo estás?", "conversation_id": None}
    
    print(f"POST {url}")
    try:
        with requests.post(url, json=payload, stream=True) as response:
            if response.status_code != 200:
                print(f"❌ Error: {response.status_code} - {response.text}")
                return None
            
            print("✅ Connection established. Reading stream...")
            
            conversation_id = None
            full_text = ""
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    try:
                        data = json.loads(decoded_line)
                        if data['type'] == 'sources':
                            print(f"✅ Received Sources: {len(data['relevant_chunks'])} chunks")
                            if 'conversation_id' in data:
                                conversation_id = data['conversation_id']
                                print(f"✅ Received Conversation ID: {conversation_id}")
                        elif data['type'] == 'content':
                            print(f"✅ Received Content Chunk: '{data['text']}'")
                            full_text += data['text']
                        elif data['type'] == 'error':
                            print(f"❌ Received Error: {data['detail']}")
                    except json.JSONDecodeError:
                        print(f"❌ JSON Decode Error: {decoded_line}")
            
            print(f"✅ Full Response: {full_text}")
            return conversation_id
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def test_pdf_download(workspace_id, conversation_id):
    print(f"\n--- Testing PDF Download (Frontend Simulation) ---")
    url = f"{BASE_URL}/workspaces/{workspace_id}/conversations/{conversation_id}/generate-downloadable"
    payload = {
        "format": "pdf",
        "document_type": "complete",
        "include_metadata": True
    }
    
    print(f"POST {url}")
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return
            
        content_type = response.headers.get('content-type')
        print(f"✅ Content-Type: {content_type}")
        
        if 'application/pdf' in content_type:
            print(f"✅ Success: Response is PDF binary")
            print(f"✅ File Size: {len(response.content)} bytes")
            if len(response.content) > 100: # Arbitrary small size check
                 print("✅ PDF seems valid (size > 100 bytes)")
            else:
                 print("❌ PDF seems too small/empty")
        else:
            print(f"❌ Error: Expected application/pdf, got {content_type}")
            print(f"Response body: {response.text[:200]}...")

    except Exception as e:
        print(f"❌ Exception: {e}")

def main():
    # 1. Create a workspace first (or use existing if we knew one)
    print("--- Setting up Workspace ---")
    ws_res = requests.post(f"{BASE_URL}/workspaces", json={"name": "Frontend Test WS"})
    if ws_res.status_code != 201:
        print("Failed to create workspace")
        sys.exit(1)
    
    workspace_id = ws_res.json()['id']
    print(f"✅ Workspace created: {workspace_id}")
    
    # 2. Test Chat
    conversation_id = test_streaming_chat(workspace_id)
    
    if conversation_id:
        # 3. Test PDF Download
        test_pdf_download(workspace_id, conversation_id)
    else:
        print("❌ Skipping PDF test due to chat failure")

    # Cleanup
    requests.delete(f"{BASE_URL}/workspaces/{workspace_id}")
    print("\n✅ Cleanup done")

if __name__ == "__main__":
    main()
