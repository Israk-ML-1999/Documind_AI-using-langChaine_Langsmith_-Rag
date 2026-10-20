# 🧠 DocuMind AI

> **Enterprise-Grade Multimodal Document Intelligence & RAG Platform**  
> An end-to-end, asynchronous, containerized RAG system powered by **FastAPI**, **Next.js 15**, **ChromaDB**, **Redis**, **Celery**, and **Google Gemini**.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Celery](https://img.shields.io/badge/Celery-5.3+-37814A?style=flat-square&logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-VectorDB-orange?style=flat-square)](https://www.trychroma.com)
[![LangSmith](https://img.shields.io/badge/LangSmith-Observability-blue?style=flat-square)](https://smith.langchain.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)

---

## 📑 Table of Contents
1. [System Overview & Architecture](#-system-overview--architecture)
2. [Deep Dive: Architectural Decisions](#-deep-dive-architectural-decisions)
   - [Why Redis? (Queue & JWT Blacklist)](#1-why-redis-queue--jwt-revocation)
   - [Asynchronous vs. Synchronous Execution](#2-asynchronous-vs-synchronous-execution)
   - [Security & Authentication Architecture](#3-security--authentication-architecture)
   - [Containerization & Fault Isolation](#4-containerization--fault-isolation)
   - [Database Strategy & Schema Evolution](#5-database-strategy--schema-evolution)
   - [Observability & Real-time RAG Evaluation](#6-observability--real-time-rag-evaluation)
3. [Quick Start (Docker Compose)](#-quick-start-docker-compose)
4. [Environment Configuration](#-environment-configuration)
5. [Local Development (Without Docker)](#-local-development-without-docker)
6. [API Endpoints Overview](#-api-endpoints-overview)

---

## 🏛 System Overview & Architecture

DocuMind AI enables users to upload complex PDF documents, automatically index and vectorize their semantic content in the background, and have interactive, context-aware conversations using multimodal vision (supporting diagrams, tables, and screenshots).

```text
                                  ┌───────────────────────────┐
                                  │   Frontend (Next.js 15)   │  Port 3000
                                  └─────────────┬─────────────┘
                                                │ HTTP / SSE Streaming
                                                ▼
                                  ┌───────────────────────────┐
                                  │     Backend (FastAPI)     │  Port 8000
                                  └─────┬───────────────┬─────┘
                                        │               │
                        ┌───────────────▼──┐     ┌──────▼──────────────────┐
                        │  PostgreSQL 15   │     │      Redis 7 Store      │
                        │ (Users, History) │     │ (Celery Queue + Revoke) │
                        └──────────────────┘     └──────────────┬──────────┘
                                                                │ Task Dispatch
                                                 ┌──────────────▼──────────┐
                                                 │   Celery Async Worker   │
                                                 │   (Chunking & MiniLM)   │
                                                 └──────────────┬──────────┘
                                                                │ Vectors
                                                 ┌──────────────▼──────────┐
                                                 │   ChromaDB (Vector DB)  │
                                                 └─────────────────────────┘
```

---

## 🔍 Deep Dive: Architectural Decisions

### 1. Why Redis? (Queue & JWT Revocation)
In this project, **Redis 7** plays two distinct, high-impact roles:

* **Task Queue Message Broker (Celery)**:
  Extracting text from a 100-page PDF and generating dense vector embeddings is CPU-bound and takes 10–30 seconds. Instead of blocking the client's HTTP request, FastAPI offloads the job to Redis as an asynchronous task. The API returns `202 Accepted` immediately, and the client polls or listens for completion.
* **JWT Token Invalidation & Logout Blacklist**:
  Stateless JWT tokens are immutable and remain valid until expiration. To implement secure, immediate logout, DocuMind uses Redis as a high-speed blacklist cache:
  - When a user logs out (`POST /auth/logout`), the token's unique identifier is cached in Redis with a TTL matching the token's remaining lifetime.
  - Every incoming authenticated request checks Redis (`is_token_blacklisted`). If present, it is rejected with `401 Unauthorized` before reaching database or business logic.

---

### 2. Asynchronous vs. Synchronous Execution

| Execution Model | Where It Is Used | Technical Rationale |
|---|---|---|
| **Asynchronous (`async / await`)** | FastAPI API routes, `asyncpg` database queries, SSE streaming chunks | I/O-bound operations. Using async drivers prevents thread starvation, allowing a single backend instance to handle thousands of concurrent requests. |
| **Real-time Streaming (SSE)** | `llm_service.py` via `llm.astream` | Words stream token-by-token directly to the UI, reducing perceived latency to milliseconds. |
| **Background Async Tasks** | Celery Worker (`app.core.celery_app`) | Heavy parsing and sentence-transformer embeddings are dispatched out-of-band to maintain responsive HTTP request-response cycles. |
| **Thread Pooling (`--pool=threads`)** | Celery concurrency config | ChromaDB and ONNX Runtime require thread-based execution to avoid deadlocks in containerized Linux environments. |

---

### 3. Security & Authentication Architecture

1. **Password Hashing**: Passwords are salted and hashed using `bcrypt` before storage. Plaintext passwords never touch the database.
2. **Bearer Token Authentication**: Employs `HTTPBearer` security schemes for industry-standard Authorization headers (`Authorization: Bearer <token>`).
3. **Blacklist Revocation Defense**: Immediate mitigation against stolen or leaked tokens upon user logout.
4. **CORS Hardening**: Configurable allowed origins preventing cross-site scripting vulnerabilities in production.
5. **Secure Container Environment**: Sensitive credentials (`GOOGLE_API_KEY`, `SECRET_KEY`, database passwords) are injected exclusively via environment variables and excluded from version control via `.gitignore`.

---

### 4. Containerization & Fault Isolation

DocuMind is decomposed into isolated Docker services managed via `docker-compose.yml`:
* **`documind_backend`**: Lightweight, fast HTTP API server.
* **`documind_worker`**: Dedicated background processing engine. If an oversized or corrupted PDF causes high memory usage, only the worker restarts—**the web server and user sessions remain 100% online**.
* **`documind_db`**: PostgreSQL container with isolated data persistence.
* **`documind_redis`**: In-memory broker and cache with persistent volume fallback.
* **`documind_frontend`**: Standalone production Next.js node application.
* **`documind_pgadmin`**: Administrative database dashboard.

---

### 5. Database Strategy & Schema Evolution

* **Engine**: PostgreSQL 15 managed with **SQLModel** (combining Pydantic v2 schemas and SQLAlchemy 2.0).
* **Connection Pooling**: Managed via `asyncpg` async connection pools for non-blocking database transactions.
* **Auto-Migration on Startup**: Non-destructive automatic schema alignment scripts run at server launch (e.g. dynamic column additions like `status`, `error_message`, and `image_url` on chat messages).
* **Persistence**: Production state is preserved across container rebuilds via Docker named volumes (`postgres_data`, `redis_data`, `chroma_data`, `uploads_data`).

---

### 6. Observability & Real-time RAG Evaluation

DocuMind integrates **LangSmith** natively with LangChain for full-lifecycle LLM observability:

1. **Cost & Token Tracking**: Exact calculation of prompt tokens, completion tokens, and real-time USD cost per Gemini call.
2. **Latency & Throughput**: Millisecond latency benchmarks (P50, P99) and Time-to-First-Token (TTFT).
3. **Retrieval Evaluation (`@traceable`)**:
   - In `vector_service.py`, ChromaDB vector distances are mapped to a percentage **Similarity Score** ($0\%-100\%$).
   - Calculates **Keyword Overlap** between user query and retrieved document chunks.
   - Categorizes confidence: `HIGH_CONFIDENCE (Exact Match)`, `MODERATE_CONFIDENCE`, or `LOW_CONFIDENCE`.
   - Displays real-time formatted evaluation metrics in the **Terminal** and streams full trace data to the **LangSmith Dashboard**.

---

## 🚀 Quick Start (Docker Compose)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/documind.git
cd documind
```

### 2. Set Up Environment Variables
Create your `.env` file from the provided template:
```bash
cp .env.example .env
```
Open `.env` in any text editor and provide your keys (see [Environment Configuration](#-environment-configuration) below).

### 3. Launch the Platform
```bash
docker compose up --build -d
```

### 4. Verify Services
| Service | URL | Default Credentials |
|---|---|---|
| **Web Application** | [http://localhost:3000](http://localhost:3000) | Register any account |
| **FastAPI Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Use Bearer Token |
| **PgAdmin (DB Console)** | [http://localhost:5050](http://localhost:5050) | `admin@documind.com` / `admin` |

To monitor live container logs:
```bash
docker compose logs -f backend worker
```

---

## ⚙️ Environment Configuration

Here is how each environment variable in `.env` is configured:

```env
# Google Gemini API Key (Obtain free at: https://aistudio.google.com/)
GOOGLE_API_KEY=your_actual_google_api_key_here

# JWT Authentication Secret (Generate on Linux/Mac: openssl rand -hex 32)
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7

# Database Credentials
POSTGRES_USER=documind
POSTGRES_PASSWORD=documindpassword
POSTGRES_DB=documind

# Redis Configuration (Matches service name in docker-compose)
REDIS_URL=redis://redis:6379/0

# Optional LangSmith Tracing (Get free key at: https://smith.langchain.com/)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your_langsmith_key_here
LANGCHAIN_PROJECT=documind
```

---

## 💻 Local Development (Without Docker)

<details>
<summary>Click here for step-by-step local setup instructions</summary>

### Prerequisites
- Python 3.11+
- Node.js 18+
- Running PostgreSQL (port 5432) and Redis (port 6379)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Celery Worker (Separate Terminal)
```bash
cd backend
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

celery -A app.core.celery_app worker --loglevel=info --pool=threads --concurrency=2
```

### 3. Frontend Setup (Separate Terminal)
```bash
cd frontend
npm install
npm run dev
```

</details>

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/v1/auth/register` | Register a new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT access token | No |
| `POST` | `/api/v1/auth/logout` | Invalidate current JWT token in Redis | **Yes** |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | **Yes** |
| `POST` | `/api/v1/documents/upload` | Upload PDF and queue for background ingestion | **Yes** |
| `GET` | `/api/v1/documents/list` | List uploaded user documents and parsing status | **Yes** |
| `DELETE`| `/api/v1/documents/{id}` | Delete document and its ChromaDB vector index | **Yes** |
| `POST` | `/api/v1/chat/stream` | Stream AI response with RAG and vision analysis | **Yes** |
| `GET` | `/api/v1/chat/history` | Retrieve conversational message history | **Yes** |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
