# Document Summary Endpoint

This document describes the `POST /api/v1/documents/summary` endpoint implemented in the backend.

**Purpose**
- Generate a concise, structured summary for a proposal/commercial document following the project's instructions file (`summary_instructions.md`).
- Accept either a saved (previously processed) document by `document_id`, or a file upload for ad-hoc summarization.

---

**Endpoint**

- URL: `/api/v1/documents/summary`
- Method: `POST`
- Content type: `multipart/form-data`

**Request fields (multipart form-data)**
- `document_id` (optional): The ID of a `Document` previously uploaded and processed (indexed into Qdrant). If provided, the endpoint will reconstruct text from vector store chunks and summarize it.
- `workspace_id` (optional): Used to find the Qdrant collection if necessary (the code will default to the document's stored workspace id when omitted).
- `file` (optional): Upload a file (PDF/DOCX/XLSX/TXT/CSV). When `file` is provided it takes precedence over `document_id` and the file is summarized immediately (no DB persistence).

Note: You must provide either `file` or `document_id`. If both are provided, `file` is used.

**Behavior & rules**
- The endpoint first attempts to load `summary_instructions.md` from the repository root (or a likely parent path) and uses its contents as the instruction template for the LLM. If that file is not found, the built-in instruction template is used.
- Summaries are NOT persisted to the database.
- The call is synchronous: the server calls the LLM and returns the summary in the response. For very large documents this can be slow; consider adding an async job flow for heavy workloads.
- When summarizing by `document_id`, the document must have been processed and indexed (Qdrant chunks available). Check `status == "COMPLETED"` and `chunk_count > 0` for the Document record before requesting a summary.

**Response**
- HTTP 200: Success. Returns JSON with the structure:

```json
{
  "document_id": "<id or null if uploaded file>",
  "summary": {
    "administrativo": "...",
    "posibles_competidores": "...",
    "tecnico": "...",
    "viabilidad_del_alcance": "..."
  }
}
```

- HTTP 400: Bad request (neither `file` nor `document_id` provided).
- HTTP 404: Document not found or no chunks found for `document_id`.
- HTTP 500: LLM or internal error (includes error details in `detail`).

**PowerShell examples (Windows)**

1) Summarize a previously saved document by ID:

```powershell
curl -X POST "http://localhost:8000/api/v1/documents/summary" `
  -F "document_id=YOUR_DOCUMENT_ID"
```

2) Upload a file and summarize it ad-hoc:

```powershell
curl -X POST "http://localhost:8000/api/v1/documents/summary" `
  -F "file=@C:\path\to\proposal.pdf"
```

**Tips & troubleshooting**
- If you receive `404` with message "No se encontraron chunks para este documento", verify that the document was processed by the Celery worker and indexed in Qdrant. You can check the document list for a workspace:
  - `GET /api/v1/workspaces/{workspace_id}/documents` — check `status` and `chunk_count`.
- If the LLM output structure looks inconsistent, consider switching to a JSON-enforced prompt (the service can be updated to require the model to return a JSON object for deterministic parsing).
- For long-running or large documents, implement an async task (Celery) and a job status endpoint to avoid blocking client requests.

**Implementation notes**
- Route: `backend/api/routes/document_summary.py`
- LLM helper: `backend/core/llm_service.py` -> `generate_summary_from_text(text, instructions_text=None)`
- Vector store helper (to rebuild document text): `backend/processing/vector_store.py` -> `get_document_chunks(document_id, workspace_id)`
- Instructions file: `summary_instructions.md` (repo root) — used verbatim when present.

**Next improvements (optional)**
- Add asynchronous summarization (enqueue task, return job id, expose job status endpoint).
- Require LLM to return JSON to make parsing deterministic.
- Add caching for repeated summaries (same document + same instructions) to reduce cost.
- Add automated tests for the endpoint and the LLM parsing logic.

---

File created by the codebase maintainers to document the implemented summary endpoint.
