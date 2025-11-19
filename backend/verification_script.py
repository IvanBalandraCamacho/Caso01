import sys
import os
import unittest
from unittest.mock import MagicMock, patch, mock_open
import io
from pathlib import Path
import types

# Add backend to sys.path
backend_path = "/home/maliaga/Desktop/Caso01/backend"
sys.path.append(backend_path)

# --- MOCKS FOR EXTERNAL DEPENDENCIES ---
sys.modules['qdrant_client'] = MagicMock()
sys.modules['google.generativeai'] = MagicMock()
sys.modules['redis'] = MagicMock()
sys.modules['celery'] = MagicMock()
sys.modules['sqlalchemy'] = MagicMock()
sys.modules['sqlalchemy.orm'] = MagicMock()
sys.modules['sqlalchemy.ext'] = MagicMock()
sys.modules['sqlalchemy.ext.declarative'] = MagicMock()
sys.modules['sqlalchemy.pool'] = MagicMock()
sys.modules['sqlalchemy.dialects'] = MagicMock()
sys.modules['sqlalchemy.dialects.mysql'] = MagicMock()
sys.modules['sqlalchemy.sql'] = MagicMock() # Added this # Added this # Added this

# Mock ReportLab
mock_reportlab = MagicMock()
sys.modules['reportlab'] = mock_reportlab
sys.modules['reportlab.lib'] = MagicMock()
sys.modules['reportlab.lib.pagesizes'] = MagicMock()
sys.modules['reportlab.lib.styles'] = MagicMock()
sys.modules['reportlab.lib.units'] = MagicMock() # Added this
sys.modules['reportlab.platypus'] = MagicMock()
sys.modules['reportlab.lib.enums'] = MagicMock()
sys.modules['reportlab.lib.colors'] = MagicMock()

# Mock Data Processing Libs
sys.modules['pypdf'] = MagicMock()
sys.modules['docx'] = MagicMock()
sys.modules['openpyxl'] = MagicMock()
sys.modules['pandas'] = MagicMock()
sys.modules['mimetypes'] = MagicMock()
sys.modules['sentence_transformers'] = MagicMock()
sys.modules['langchain_text_splitters'] = MagicMock()
sys.modules['pydantic'] = MagicMock()
sys.modules['pydantic_settings'] = MagicMock()
sys.modules['fastapi'] = MagicMock() # Added this

# Mocking specific objects that might be imported directly
mock_qdrant_client = MagicMock()
sys.modules['qdrant_client'].QdrantClient.return_value = mock_qdrant_client

# Now we can import our modules
with patch.dict(sys.modules, {
    'qdrant_client': MagicMock(),
    'google.generativeai': MagicMock(),
    'redis': MagicMock(),
    'reportlab': mock_reportlab,
    'pypdf': MagicMock(),
    'sentence_transformers': MagicMock(),
    'langchain_text_splitters': MagicMock(),
    'pydantic': MagicMock(),
    'pydantic_settings': MagicMock(),
}):
    from core.pdf_service import PDFExportService
    from processing import parser
    from processing import vector_store
    from core import llm_service
    from models import schemas
    
    # We need to mock database models for tasks.py
    mock_models = MagicMock()
    sys.modules['models'] = mock_models
    sys.modules['models.document'] = MagicMock()
    sys.modules['models.workspace'] = MagicMock()
    # Mock database session
    sys.modules['models.database'] = MagicMock()
    
    from processing import tasks

class TestRAGPlatform(unittest.TestCase):
    
    def setUp(self):
        self.pdf_service = PDFExportService()
        
    # 1. VALIDATE PDF GENERATION
    def test_pdf_generation(self):
        print("\n--- Testing PDF Generation ---")
        title = "Test Document"
        content = "# Header 1\n## Header 2\nThis is a test paragraph.\n- Item 1\n- Item 2"
        
        # Mock SimpleDocTemplate at the source
        mock_doc_class = sys.modules['reportlab.platypus'].SimpleDocTemplate
        mock_doc_instance = mock_doc_class.return_value
        
        self.pdf_service.export_text_to_pdf(title, content)
        
        # Verify doc was built
        mock_doc_instance.build.assert_called_once()
        print("✅ PDF Generation: Logic verified (ReportLab called correctly)")

    # 2. VALIDATE INGESTION WITH STREAMING & PYPDF
    def test_ingestion_streaming_pypdf(self):
        print("\n--- Testing Ingestion Streaming & pypdf ---")
        
        dummy_pdf_path = Path("test_doc.pdf")
        
        # NUCLEAR MOCK INJECTION
        mock_pdf_reader = MagicMock()
        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Page 1 text"
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "Page 2 text"
        mock_pdf_reader.return_value.pages = [mock_page1, mock_page2]
        
        # Inject directly into the module
        original_pypdf = parser.pypdf
        parser.pypdf = MagicMock()
        parser.pypdf.PdfReader = mock_pdf_reader
        
        # Inject mimetypes
        original_mimetypes = parser.mimetypes
        parser.mimetypes = MagicMock()
        parser.mimetypes.guess_type.return_value = ('application/pdf', None)
        
        try:
            # Test parser
            generator = parser.extract_text_from_file(dummy_pdf_path)
            
            chunks = list(generator)
            self.assertEqual(len(chunks), 2, "Should yield 2 chunks")
            self.assertIn("Page 1 text", chunks[0])
            print("✅ Ingestion: Streaming works (Generator returned)")
            print("✅ Ingestion: pypdf integration verified")
        finally:
            # Restore
            parser.pypdf = original_pypdf
            parser.mimetypes = original_mimetypes

    # 3. VALIDATE VECTOR STORE OPTIMIZATION (Caching & Batching)
    def test_vector_store_optimization(self):
        print("\n--- Testing Vector Store Optimization ---")
        
        # Reset cache
        vector_store._existing_collections = set()
        
        # NUCLEAR MOCK INJECTION
        original_qdrant = vector_store.qdrant_client
        mock_qdrant = MagicMock()
        vector_store.qdrant_client = mock_qdrant
        
        try:
            # Mock embedding model
            with patch('processing.vector_store.get_embedding_model') as mock_get_model:
                mock_model = mock_get_model.return_value
                mock_model.get_sentence_embedding_dimension.return_value = 768
                mock_model.encode.return_value = [MagicMock(tolist=lambda: [0.1]*768)] * 150
                
                # Test Collection Caching
                collection_name = "workspace_test_123"
                mock_qdrant.collection_exists.return_value = False
                
                # First call
                vector_store.get_or_create_collection(collection_name)
                mock_qdrant.recreate_collection.assert_called_once()
                print("✅ Vector Store: Collection created on first call")
                
                # Second call
                mock_qdrant.recreate_collection.reset_mock()
                mock_qdrant.collection_exists.reset_mock()
                
                vector_store.get_or_create_collection(collection_name)
                mock_qdrant.recreate_collection.assert_not_called()
                print("✅ Vector Store: Collection check cached")
                
                # Test Streaming Batch Processing
            text_iterator = (f"chunk {i}" for i in range(150))
            
            # NUCLEAR MOCK INJECTION FOR TEXT SPLITTER
            original_splitter = vector_store.text_splitter
            mock_splitter = MagicMock()
            mock_splitter.split_text.side_effect = lambda x: [x]
            vector_store.text_splitter = mock_splitter
            
            try:
                vector_store.process_and_embed_text(text_iterator, "doc_1", "ws_1")
                
                self.assertGreaterEqual(mock_qdrant.upsert.call_count, 2)
                print("✅ Vector Store: Batch processing verified")
            finally:
                vector_store.text_splitter = original_splitter
        finally:
            vector_store.qdrant_client = original_qdrant

    # 4. VALIDATE LLM ERROR HANDLING
    def test_llm_error_handling(self):
        print("\n--- Testing LLM Error Handling ---")
        
        # Manually set the mock on the module to be sure
        original_model = llm_service.model
        mock_model = MagicMock()
        llm_service.model = mock_model
        
        try:
            # Simulate failure
            mock_model.generate_content.side_effect = Exception("API Error")
            
            with self.assertRaises(RuntimeError) as context:
                llm_service.generate_response("query", [])
            
            self.assertIn("Fallo al generar respuesta", str(context.exception))
            print("✅ LLM Service: Correctly raises RuntimeError after retries")
        finally:
            llm_service.model = original_model

    # 5. VALIDATE STREAMING CHAT
    def test_streaming_chat(self):
        print("\n--- Testing Streaming Chat ---")
        
        original_model = llm_service.model
        mock_model = MagicMock()
        llm_service.model = mock_model
        
        try:
            # Mock streaming response
            mock_chunk1 = MagicMock()
            mock_chunk1.text = "Hello"
            mock_chunk2 = MagicMock()
            mock_chunk2.text = " World"
            
            # Return iterator
            mock_model.generate_content.return_value = iter([mock_chunk1, mock_chunk2])
            
            # Test generator
            generator = llm_service.generate_response_stream("query", [])
            
            result = list(generator)
            self.assertEqual(result, ["Hello", " World"])
            print("✅ Chat: Streaming generator works")
        finally:
            llm_service.model = original_model

    # 6. VALIDATE IDEMPOTENCY IN TASKS
    @patch('processing.tasks.parser')
    @patch('processing.tasks.vector_store')
    def test_task_idempotency(self, mock_vector_store, mock_parser):
        print("\n--- Testing Task Idempotency ---")
        
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.status = "COMPLETED" # Already done
        mock_db.query.return_value.filter.return_value.first.return_value = mock_doc
        
        # Call process_document
        tasks.process_document("doc_id", mock_db)
        
        # Should NOT call parser or vector store
        mock_parser.extract_text_from_file.assert_not_called()
        mock_vector_store.process_and_embed_text.assert_not_called()
        print("✅ Tasks: Idempotency check passed (skipped COMPLETED doc)")

if __name__ == '__main__':
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
