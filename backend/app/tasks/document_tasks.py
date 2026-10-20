import asyncio
import traceback
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.pdf_service import extract_text_from_pdf, get_text_chunks
from app.services.vector_service import vector_service

async def _update_db_status(doc_id: str, status: str, err: str = None):
    # Use NullPool with a fresh async engine to prevent connection pool locking across event loops
    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with task_engine.begin() as conn:
            await conn.execute(
                text("UPDATE documents SET status = :status, error_message = :err WHERE id = :id"),
                {"status": status, "err": err, "id": doc_id}
            )
    finally:
        await task_engine.dispose()

@celery_app.task(name="process_pdf_document", bind=True, max_retries=2)
def process_pdf_document(self, doc_id: str, file_path: str, user_id: str):
    print(f"[*] [Celery Worker] Starting async PDF processing for Document: {doc_id} (Path: {file_path})...", flush=True)
    try:
        # 1. Extract text from PDF
        print(f"[*] [Celery Worker] Extracting text from {file_path}...", flush=True)
        text_content = extract_text_from_pdf(file_path)
        print(f"[*] [Celery Worker] Extracted {len(text_content)} characters.", flush=True)
        
        # 2. Split text into chunks
        print(f"[*] [Celery Worker] Splitting text into chunks...", flush=True)
        chunks = get_text_chunks(text_content, user_id, doc_id)
        print(f"[*] [Celery Worker] Generated {len(chunks)} chunks.", flush=True)
        
        # 3. Upsert chunks into ChromaDB
        print(f"[*] [Celery Worker] Upserting chunks into ChromaDB...", flush=True)
        vector_service.upsert_chunks(chunks)
        print(f"[*] [Celery Worker] Chunks successfully saved to ChromaDB.", flush=True)
        
        # 4. Mark status as 'ready' in PostgreSQL
        print(f"[*] [Celery Worker] Updating DB document status to 'ready'...", flush=True)
        asyncio.run(_update_db_status(doc_id, "ready"))
        print(f"[✓] [Celery Worker] Document {doc_id} successfully vectorized and ready!", flush=True)
        return {"status": "ready", "doc_id": doc_id}
    except Exception as exc:
        err_msg = f"{type(exc).__name__}: {str(exc)}"
        print(f"[✗] [Celery Worker] Error processing document {doc_id}: {err_msg}", flush=True)
        traceback.print_exc()
        try:
            asyncio.run(_update_db_status(doc_id, "failed", err_msg))
        except Exception as db_err:
            print(f"[✗] [Celery Worker] Failed to update error status in DB: {db_err}", flush=True)
        raise exc

