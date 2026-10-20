# 🧠 DocuMind AI

> **Intelligent Multimodal Document Intelligence & RAG Platform**  
> Chat with complex PDF documents, analyze attached images/diagrams, and get instant, cited answers powered by **FastAPI**, **Next.js 15**, **ChromaDB**, **Redis**, and **Google Gemini**.

---

## 🌟 Key Features

- **📑 RAG (Retrieval-Augmented Generation)**: High-speed vector similarity search using ChromaDB and local `all-MiniLM-L6-v2` embeddings with real-time similarity evaluation.
- **👁️ Multimodal Vision**: Upload diagrams, screenshots, or handwritten notes alongside questions for context-aware visual reasoning.
- **⚙️ Asynchronous Task Queue**: Heavy PDF parsing and vector generation run in the background via **Celery & Redis**, keeping HTTP requests non-blocking.
- **🔒 Enterprise Auth & Security**: JWT-based authentication with **Redis Token Blacklisting** (immediate invalidation on logout) and `HTTPBearer` security.
- **📊 Observability with LangSmith**: Real-time tracking of token usage, latency (P50/P99), cost estimation, and complete RAG retrieval tracing.
- **🎨 Sleek Modern Interface**: Built with Next.js 15 (App Router), Tailwind CSS, Lucide icons, and streaming Markdown code presentation.

---

## 🏗️ Architecture

```text
       ┌────────────────────────┐
       │   Frontend (Next.js)   │  ◄── Port 3000
       └───────────┬────────────┘
                   │ HTTP / Streaming SSE
                   ▼
       ┌────────────────────────┐
       │   Backend (FastAPI)    │  ◄── Port 8000
       └─────┬────────────┬─────┘
             │            │
  ┌──────────▼───┐   ┌────▼──────────┐   ┌────────────────────────┐
  │  PostgreSQL  │   │  Redis Queue  │──►│ Celery Async Worker    │
  │ (Users/Chat) │   │ (Tasks/Auth)  │   │ (PDF & Embeddings)     │
  └──────────────┘   └───────────────┘   └───────────┬────────────┘
                                                     │ Vectors
                                                     ▼
                                         ┌────────────────────────┐
                                         │   ChromaDB Vector DB   │
                                         └────────────────────────┘
```

---

## 🚀 Quick Start (Recommended with Docker)

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose installed
- A free [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/documind.git
cd documind
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and insert your **Google API Key**:
```env
GOOGLE_API_KEY=your_actual_google_gemini_api_key
SECRET_KEY=any_random_32_character_string
```
*(Optional: Add `LANGCHAIN_API_KEY` if you want LangSmith tracing).*

### 3. Build & Run
```bash
docker compose up --build -d
```

### 4. Access the Application
| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Main UI (Sign up, upload documents, chat) |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI |
| **PgAdmin (Optional)** | [http://localhost:5050](http://localhost:5050) | PostgreSQL UI (`admin@documind.com` / `admin`) |

---

## 💻 Local Development (Without Docker)

<details>
<summary>Click to view manual local setup instructions</summary>

### Backend Setup
1. Open a terminal in `./backend`:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Make sure PostgreSQL and Redis are running locally.
3. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. In another terminal, start the Celery worker:
   ```bash
   celery -A app.core.celery_app worker --loglevel=info --pool=threads --concurrency=2
   ```

### Frontend Setup
1. Open a terminal in `./frontend`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Visit [http://localhost:3000](http://localhost:3000).

</details>

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | **Yes** | — | Google Gemini API key for chat & vision |
| `SECRET_KEY` | **Yes** | — | Secret key for JWT token hashing |
| `DATABASE_URL` | No | `postgresql+asyncpg://...` | Async PostgreSQL connection string |
| `REDIS_URL` | No | `redis://redis:6379/0` | Redis instance for Celery & auth blacklist |
| `LANGCHAIN_TRACING_V2` | No | `true` | Enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | No | — | LangSmith API Key for observability |
| `LANGCHAIN_PROJECT` | No | `documind` | LangSmith project name |

---

## 🛡️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Lucide React, Radix UI
- **Backend**: FastAPI, SQLModel / SQLAlchemy (Async), Pydantic v2
- **AI & RAG**: Google Gemini (`gemini-1.5-flash`), LangChain, ChromaDB, Sentence-Transformers
- **Task Queue & Caching**: Celery, Redis
- **Database**: PostgreSQL 15
- **Observability**: LangSmith

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
