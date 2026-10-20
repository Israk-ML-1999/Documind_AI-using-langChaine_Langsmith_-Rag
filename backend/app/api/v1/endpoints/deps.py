from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid

from app.core.config import settings
from app.core.database import get_session
from app.models.sql_models import User
from app.core.redis_client import is_token_blacklisted

security = HTTPBearer()

def get_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return credentials.credentials

async def get_current_user(token: str = Depends(get_token), session: AsyncSession = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Check if token is blacklisted in Redis (e.g. user logged out)
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify JWT signature and claims
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("id")
        if email is None or user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # 3. Retrieve user from database
    statement = select(User).where(User.id == uuid.UUID(user_id))
    results = await session.exec(statement)
    user = results.first()
    if user is None:
        raise credentials_exception
    return user
