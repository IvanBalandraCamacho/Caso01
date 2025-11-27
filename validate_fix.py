import requests
import time
import os

BASE_URL = "http://localhost:8000/api/v1"
# Credentials (use the ones from the seed or register a new user)
EMAIL = "admin@example.com"
PASSWORD = "adminpassword"

def login():
    print("Logging in...")
    response = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def create_workspace(token):
    print("Creating workspace...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {"name": "Validation Workspace", "description": "Testing RAG fix"}
    response = requests.post(f"{BASE_URL}/workspaces/", json=data, headers=headers)
    if response.status_code == 200:
        return response.json()["id"]
    else:
        print(f"Create workspace failed: {response.text}")
        return None

def upload_document(token, workspace_id):
    print("Uploading document...")
    headers = {"Authorization": f"Bearer {token}"}
    # Create a dummy text file
    with open("test_doc.txt", "w") as f:
        f.write("This is a test document to validate the RAG pipeline. It contains specific information about the fix.")
    
    files = {"file": ("test_doc.txt", open("test_doc.txt", "rb"), "text/plain")}
    response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/documents", headers=headers, files=files)
    if response.status_code == 200:
        return response.json()["id"]
    else:
        print(f"Upload failed: {response.text}")
        return None

def check_status(token, workspace_id, document_id):
    print(f"Checking status for document {document_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    for _ in range(30):  # Wait up to 30 seconds
        response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/documents", headers=headers)
        if response.status_code == 200:
            docs = response.json()
            for doc in docs:
                if doc["id"] == document_id:
                    print(f"Current status: {doc['status']}")
                    if doc["status"] == "COMPLETED":
                        return True
                    if doc["status"] == "FAILED":
                        print(f"Document processing failed. Error: {doc.get('error_message')}")
                        return False
        time.sleep(1)
    print("Timeout waiting for processing.")
    return False

def test_search(token, workspace_id):
    print("Testing search...")
    headers = {"Authorization": f"Bearer {token}"}
    query = "RAG pipeline"
    response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/search", json={"query": query, "limit": 5}, headers=headers)
    if response.status_code == 200:
        results = response.json()
        print(f"Search results: {len(results)}")
        if len(results) > 0:
            print("RAG Search successful!")
            return True
    else:
        print(f"Search failed: {response.text}")
    return False

def main():
    token = login()
    if not token:
        return

    workspace_id = create_workspace(token)
    if not workspace_id:
        return

    doc_id = upload_document(token, workspace_id)
    if not doc_id:
        return

    if check_status(token, workspace_id, doc_id):
        test_search(token, workspace_id)
    else:
        print("RAG processing failed.")

if __name__ == "__main__":
    main()
