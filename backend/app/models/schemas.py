from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class UserCreate(BaseModel):
    full_name: Optional[str] = None
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: EmailStr
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class DocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    file_size_bytes: int
    status: str = "ready"
    error_message: Optional[str] = None
    created_at: datetime

class ChatMessageCreate(BaseModel):
    content: str
    document_id: UUID
    image_data: Optional[str] = None
    images: Optional[List[str]] = None

class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    created_at: datetime

class NoteCreate(BaseModel):
    document_id: Optional[UUID] = None
    document_title: Optional[str] = None
    title: Optional[str] = None
    content: str

class NoteResponse(BaseModel):
    id: UUID
    user_id: UUID
    document_id: Optional[UUID] = None
    document_title: Optional[str] = None
    title: Optional[str] = None
    content: str
    created_at: datetime
