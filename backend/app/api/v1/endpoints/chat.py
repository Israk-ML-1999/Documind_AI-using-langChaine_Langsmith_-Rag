import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.models.sql_models import User, Document, ChatMessage
from app.models.schemas import ChatMessageCreate, ChatMessageResponse
from app.api.v1.endpoints.deps import get_current_user
from app.services.llm_service import generate_chat_response, parse_stored_images

router = APIRouter()

@router.get("/{document_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verify doc ownership
    statement = select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    doc = (await session.exec(statement)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    statement = select(ChatMessage).where(ChatMessage.document_id == document_id).order_by(ChatMessage.created_at)
    results = await session.exec(statement)
    raw_messages = results.all()

    # Format messages and parse multi-image URLs if stored
    formatted_messages: List[ChatMessageResponse] = []
    for msg in raw_messages:
        imgs = parse_stored_images(msg.image_url)
        formatted_messages.append(
            ChatMessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                image_url=imgs[0] if imgs else None,
                image_urls=imgs,
                created_at=msg.created_at,
            )
        )
    return formatted_messages

@router.post("/stream")
async def stream_chat(
    msg: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Verify doc ownership
    statement = select(Document).where(Document.id == msg.document_id, Document.user_id == current_user.id)
    doc = (await session.exec(statement)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if getattr(doc, "status", "ready") == "processing":
        raise HTTPException(
            status_code=400, 
            detail="Document is currently being processed in background. Please wait a moment until it is ready."
        )
        
    # Get chat history
    statement = select(ChatMessage).where(ChatMessage.document_id == msg.document_id).order_by(ChatMessage.created_at)
    history = (await session.exec(statement)).all()
    
    # Consolidate attached images (up to 3)
    incoming_images = []
    if msg.images:
        incoming_images.extend([img for img in msg.images if isinstance(img, str) and img.strip()])
    if msg.image_data and msg.image_data.strip() and msg.image_data not in incoming_images:
        incoming_images.append(msg.image_data.strip())
    
    # Restrict to maximum 3 images
    incoming_images = incoming_images[:3]
    
    # Format stored image string (JSON array if multiple or single string)
    stored_image_val = None
    if len(incoming_images) > 1:
        stored_image_val = json.dumps(incoming_images)
    elif len(incoming_images) == 1:
        stored_image_val = incoming_images[0]

    # Save user message (with optional multi-image string)
    user_msg = ChatMessage(
        user_id=current_user.id,
        document_id=msg.document_id,
        role="user",
        content=msg.content or "",
        image_url=stored_image_val
    )
    session.add(user_msg)
    await session.commit()
    
    async def event_generator():
        full_response = ""
        async for chunk in generate_chat_response(
            msg.content or "", 
            str(current_user.id), 
            str(msg.document_id), 
            history,
            images=incoming_images
        ):
            full_response += chunk
            yield {"data": json.dumps({"text": chunk})}
            
        # Save assistant message
        assistant_msg = ChatMessage(
            user_id=current_user.id,
            document_id=msg.document_id,
            role="assistant",
            content=full_response
        )
        session.add(assistant_msg)
        await session.commit()
        
    return EventSourceResponse(event_generator())
