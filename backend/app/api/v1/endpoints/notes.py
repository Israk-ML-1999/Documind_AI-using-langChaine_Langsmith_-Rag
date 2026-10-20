import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.models.sql_models import User, Note
from app.models.schemas import NoteCreate, NoteResponse
from app.api.v1.endpoints.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[NoteResponse])
async def get_notes(
    document_id: Optional[uuid.UUID] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Retrieve all notes for the authenticated user, optionally filtered by document."""
    query = select(Note).where(Note.user_id == current_user.id)
    if document_id:
        query = query.where(Note.document_id == document_id)
    query = query.order_by(Note.created_at.desc())
    
    results = await session.exec(query)
    return results.all()

@router.post("", response_model=NoteResponse)
async def create_note(
    note_in: NoteCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Save an AI response or excerpt as a session note."""
    if not note_in.content or not note_in.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty.")

    # Auto generate title if not provided
    title = note_in.title
    if not title or not title.strip():
        first_line = note_in.content.strip().split("\n")[0]
        title = first_line[:60] + ("..." if len(first_line) > 60 else "")

    new_note = Note(
        user_id=current_user.id,
        document_id=note_in.document_id,
        document_title=note_in.document_title,
        title=title,
        content=note_in.content.strip()
    )
    session.add(new_note)
    await session.commit()
    await session.refresh(new_note)
    return new_note

@router.delete("/{note_id}")
async def delete_note(
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a saved note."""
    statement = select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    note = (await session.exec(statement)).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    await session.delete(note)
    await session.commit()
    return {"message": "Note deleted successfully"}
