from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import SQLModel
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        # Import models here to ensure they are registered with SQLModel
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;"))
        await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;"))
        await conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'ready';"))
        await conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message TEXT;"))

async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
