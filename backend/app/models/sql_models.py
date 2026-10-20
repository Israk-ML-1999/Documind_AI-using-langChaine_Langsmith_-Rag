import uuid
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    full_name: Optional[str] = Field(default=None, nullable=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    documents: List["Document"] = Relationship(back_populates="user")
    chat_messages: List["ChatMessage"] = Relationship(back_populates="user")
    notes: List["Note"] = Relationship(back_populates="user", cascade_delete=True)

class Document(SQLModel, table=True):
    __tablename__ = "documents"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    filename: str
    file_path: str
    file_size_bytes: int
    status: str = Field(default="processing")  # "processing", "ready", "failed"
    error_message: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: User = Relationship(back_populates="documents")
    chat_messages: List["ChatMessage"] = Relationship(back_populates="document", cascade_delete=True)

class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    document_id: uuid.UUID = Field(foreign_key="documents.id", index=True)
    role: str # "user" or "assistant"
    content: str
    image_url: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: User = Relationship(back_populates="chat_messages")
    document: Document = Relationship(back_populates="chat_messages")

class Note(SQLModel, table=True):
    __tablename__ = "notes"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    document_id: Optional[uuid.UUID] = Field(default=None, foreign_key="documents.id", index=True, nullable=True)
    document_title: Optional[str] = Field(default=None, nullable=True)
    title: Optional[str] = Field(default=None, nullable=True)
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: User = Relationship(back_populates="notes")
