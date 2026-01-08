````markdown
# 🚀 Project Overview

This is a comprehensive, full-stack AI document analysis platform. The system is designed with a microservices-oriented architecture, containerized using Docker for scalability and ease of deployment. It comprises a modern web interface, a powerful backend API, an asynchronous task processing system, and a dedicated Retrieval-Augmented Generation (RAG) service for advanced document interaction.

## 🏛️ System Architecture

The application is composed of the following core services, orchestrated by `docker-compose.yml`:

1.  **Backend API (`backend`)**: A Python-based service providing the core business logic and data management.
2.  **Frontend (`front-v2`)**: A modern, responsive web application for user interaction.
3.  **RAG Service (`rag-service`)**: A specialized Python service for handling document indexing, vectorization, and retrieval.
4.  **Celery Worker (`celery_worker`)**: An asynchronous task queue for offloading long-running processes like document parsing and analysis.
5.  **Databases & Caching**:
    *   **MySQL**: Primary relational database for storing metadata.
    *   **Redis**: In-memory store used as a message broker for Celery and for caching.
    *   **Qdrant**: Vector database used by the RAG service to store and query document embeddings.

---

## 🐍 Backend API (`backend`)

The backend is built with **Python** using the **FastAPI** framework, providing a robust and high-performance RESTful API.

-   **Framework**: FastAPI
-   **Language**: Python
-   **Key Libraries**:
    -   `SQLAlchemy`: ORM for interacting with the MySQL database.
    -   `Celery` & `Redis`: For managing and executing background tasks.
    -   `Pydantic`: For data validation and settings management.
    -   `OpenAI`: For integrating with Large Language Models.
    -   `PyPDF`, `python-docx`: For parsing and processing uploaded documents.
    -   `HTTPX`: For making asynchronous requests to the RAG service.
    -   `Passlib` & `python-jose`: For password hashing and JWT-based authentication.
-   **Functionality**:
    -   User authentication and authorization.
    -   Workspace and document management.
    -   Orchestrates document processing via the Celery worker.
    -   Serves as the main interface between the frontend and the AI services.

## 🖥️ Frontend (`front-v2`)

The frontend is a **Next.js** application written in **TypeScript**, offering a dynamic and user-friendly interface.

-   **Framework**: Next.js (with App Router)
-   **Language**: TypeScript
-   **UI & Styling**:
    -   **React**: Core view library.
    -   **Tailwind CSS**: For utility-first styling.
    -   **Shadcn/ui & Radix UI**: For building accessible and composable UI components.
    -   **Ant Design**: Used for additional UI components and layout structures.
-   **Key Libraries**:
    -   `@tanstack/react-query`: For server state management, caching, and data fetching.
    -   `axios`: For making HTTP requests to the backend API.
    -   `react-hook-form` & `zod`: For robust and type-safe form handling.
    -   `react-markdown`: To render Markdown content in the chat interface.

## 🧠 RAG Service (`rag-service`)

This service is a self-contained **FastAPI** application dedicated to all Retrieval-Augmented Generation tasks.

-   **Framework**: FastAPI
-   **Language**: Python
-   **Key Libraries**:
    -   `qdrant-client`: For connecting to and interacting with the Qdrant vector database.
    -   `sentence-transformers`: For generating vector embeddings from document text.
    -   `langchain-text-splitters`: To efficiently chunk documents for processing.
-   **Functionality**:
    -   Receives documents, splits them into manageable chunks.
    -   Generates vector embeddings for text chunks.
    -   Indexes and stores embeddings in the Qdrant database.
    -   Provides an endpoint for performing semantic search over the indexed documents.

## 🧪 Testing

The project includes several Python scripts in the root directory for testing and validation:
- `comprehensive_test.py`
- `test_document_status.py`
- `validate_fix.py`
````
