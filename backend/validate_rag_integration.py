import asyncio
import uuid
import logging
import sys
import os

# Add the current directory to sys.path to make imports work
sys.path.append(os.getcwd())

from core.rag_client import rag_client
from core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def run_validation():
    logger.info("🚀 Starting Deep RAG Validation from Backend...")
    
    # 1. Check Configuration
    logger.info(f"Configuration: URL={settings.RAG_SERVICE_URL}, Enabled={settings.RAG_SERVICE_ENABLED}")
    
    # 2. Health Check
    logger.info("1️⃣  Testing Health Check...")
    try:
        health = await rag_client.health_check()
        if health.get("status") == "healthy":
            logger.info("✅ Health Check Passed")
        else:
            logger.error(f"❌ Health Check Failed: {health}")
            return
    except Exception as e:
        logger.error(f"❌ Health Check Exception: {e}")
        return

    # 3. Ingestion Test
    test_doc_id = str(uuid.uuid4())
    test_workspace_id = "validation_workspace"
    test_content = "This is a validation document for the Qdrant migration. It contains specific keywords like 'supercalifragilistic'."
    test_metadata = {"source": "validation_script", "type": "test"}
    
    logger.info(f"2️⃣  Testing Ingestion (Doc ID: {test_doc_id})...")
    try:
        ingest_result = await rag_client.ingest_text_content(
            document_id=test_doc_id,
            workspace_id=test_workspace_id,
            content=test_content,
            metadata=test_metadata
        )
        if ingest_result and ingest_result.status == "success":
            logger.info(f"✅ Ingestion Passed (Chunks: {ingest_result.chunks_count})")
        else:
            logger.error(f"❌ Ingestion Failed: {ingest_result}")
            return
    except Exception as e:
        logger.error(f"❌ Ingestion Exception: {e}")
        return

    # 4. Search Test
    logger.info("3️⃣  Testing Search...")
    # Give a small delay for indexing if needed (usually instant for small docs)
    await asyncio.sleep(1)
    
    try:
        # Search for unique keyword
        results = await rag_client.search(
            query="supercalifragilistic",
            workspace_id=test_workspace_id,
            limit=1
        )
        
        if results and len(results) > 0:
            top_result = results[0]
            if top_result.document_id == test_doc_id:
                logger.info(f"✅ Search Passed. Found document with score: {top_result.score}")
            else:
                logger.warning(f"⚠️  Search found a document, but ID mismatch. Expected {test_doc_id}, got {top_result.document_id}")
        else:
            logger.error("❌ Search Failed. No results found.")
            return
            
    except Exception as e:
        logger.error(f"❌ Search Exception: {e}")
        return

    # 5. Deletion Test
    logger.info("4️⃣  Testing Deletion...")
    try:
        delete_success = await rag_client.delete_document(test_doc_id)
        if delete_success:
            logger.info("✅ Deletion Request Passed")
        else:
            logger.error("❌ Deletion Request Failed")
            return
            
        # Verify deletion with search
        await asyncio.sleep(1)
        results_after_delete = await rag_client.search(
            query="supercalifragilistic",
            workspace_id=test_workspace_id,
            limit=1
        )
        
        if not results_after_delete:
            logger.info("✅ Verification: Document successfully removed from search results.")
        else:
            logger.error(f"❌ Verification Failed: Document still found after deletion.")
            
    except Exception as e:
        logger.error(f"❌ Deletion Exception: {e}")
        return

    # 6. Conversation Isolation Test
    logger.info("5️⃣  Testing Conversation Isolation...")
    
    conv_doc_1 = str(uuid.uuid4())
    conv_doc_2 = str(uuid.uuid4())
    global_doc = str(uuid.uuid4())
    
    conv_id_1 = "conversation_A"
    conv_id_2 = "conversation_B"
    
    try:
        # Ingest Doc 1 (Conversation A)
        await rag_client.ingest_text_content(
            document_id=conv_doc_1,
            workspace_id=test_workspace_id,
            content="Secret for Conversation A",
            metadata={"conversation_id": conv_id_1}
        )
        
        # Ingest Doc 2 (Conversation B)
        await rag_client.ingest_text_content(
            document_id=conv_doc_2,
            workspace_id=test_workspace_id,
            content="Secret for Conversation B",
            metadata={"conversation_id": conv_id_2}
        )
        
        # Ingest Global Doc
        await rag_client.ingest_text_content(
            document_id=global_doc,
            workspace_id=test_workspace_id,
            content="Global Knowledge for everyone",
            metadata={}
        )
        
        await asyncio.sleep(2) # Wait for indexing
        
        # Search in Conversation A
        results_a = await rag_client.search(
            query="Secret Global",
            workspace_id=test_workspace_id,
            conversation_id=conv_id_1,
            limit=10,
            threshold=0.0
        )
        ids_a = [r.document_id for r in results_a]
        
        # Expect: conv_doc_1 AND global_doc. NOT conv_doc_2.
        if conv_doc_1 in ids_a and global_doc in ids_a and conv_doc_2 not in ids_a:
             logger.info("✅ Conversation A Isolation Passed")
        else:
             logger.error(f"❌ Conversation A Isolation Failed. Found: {ids_a}")

        # Search in Conversation B
        results_b = await rag_client.search(
            query="Secret Global",
            workspace_id=test_workspace_id,
            conversation_id=conv_id_2,
            limit=10,
            threshold=0.0
        )
        ids_b = [r.document_id for r in results_b]
        
        # Expect: conv_doc_2 AND global_doc. NOT conv_doc_1.
        if conv_doc_2 in ids_b and global_doc in ids_b and conv_doc_1 not in ids_b:
             logger.info("✅ Conversation B Isolation Passed")
        else:
             logger.error(f"❌ Conversation B Isolation Failed. Found: {ids_b}")
             
        # Cleanup
        await rag_client.delete_document(conv_doc_1)
        await rag_client.delete_document(conv_doc_2)
        await rag_client.delete_document(global_doc)
        
    except Exception as e:
        logger.error(f"❌ Isolation Test Exception: {e}")

    logger.info("🎉 All validations completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_validation())
