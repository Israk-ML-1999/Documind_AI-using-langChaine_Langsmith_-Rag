import os
import uuid
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, delete
from typing import List

from app.core.database import get_session
from app.models.sql_models import User, Document, ChatMessage, Note
from app.models.schemas import DocumentResponse
from app.api.v1.endpoints.deps import get_current_user
from app.services.pdf_service import extract_text_from_pdf, get_text_chunks
from app.services.vector_service import vector_service
from app.core.config import settings
from app.tasks.document_tasks import process_pdf_document

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Ensure persistent uploads directory exists
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    doc_id = uuid.uuid4()
    # Unique safe filename on disk
    safe_disk_filename = f"{doc_id}_{file.filename}"
    saved_file_path = os.path.join(upload_dir, safe_disk_filename)
    
    with open(saved_file_path, "wb") as f:
        f.write(content)
        
    try:
        # Create initial Document record with 'processing' status
        new_doc = Document(
            id=doc_id,
            user_id=current_user.id,
            filename=file.filename,
            file_path=saved_file_path,
            file_size_bytes=file_size,
            status="processing"
        )
        session.add(new_doc)
        await session.commit()
        await session.refresh(new_doc)
        
        # Offload heavy text extraction & vectorization to Redis Celery Worker!
        try:
            process_pdf_document.delay(str(doc_id), saved_file_path, str(current_user.id))
        except Exception as queue_err:
            print(f"Warning: Celery queueing error: {queue_err}. Running sync fallback.")
            # Fallback inline processing if Celery broker is temporarily unreachable
            from app.tasks.document_tasks import process_pdf_document as sync_task
            sync_task(str(doc_id), saved_file_path, str(current_user.id))
            await session.refresh(new_doc)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return new_doc

@router.get("/{document_id}/status")
async def get_document_status(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    statement = select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    doc = (await session.exec(statement)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": doc.id, "status": doc.status, "error_message": doc.error_message}

@router.get("/list", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    statement = select(Document).where(Document.user_id == current_user.id)
    results = await session.exec(statement)
    documents = results.all()
    return documents

@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    statement = select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    results = await session.exec(statement)
    document = results.first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # 1. Delete vector embeddings from ChromaDB
    try:
        vector_service.delete_document_vectors(str(document_id))
    except Exception as e:
        print(f"Notice: vector cleanup error: {e}")
    
    # 2. Delete associated chat messages to prevent foreign key constraint violations
    await session.execute(delete(ChatMessage).where(ChatMessage.document_id == document_id))

    # 3. Delete associated session notes
    await session.execute(delete(Note).where(Note.document_id == document_id))
    
    # 4. Delete document record from postgres
    await session.delete(document)
    await session.commit()
    
    # 5. Delete physical file from disk if present
    if document.file_path and os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except Exception as e:
            print(f"Notice: file cleanup error: {e}")
        
    return {"message": "Document and all associated data deleted successfully"}
