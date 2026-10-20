from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "DocuMind"
    DATABASE_URL: str = "postgresql+asyncpg://documind:documindpassword@localhost:5432/documind"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GOOGLE_API_KEY: Optional[str] = None
    REDIS_URL: str = "redis://redis:6379/0"
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/uploaded_files")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
