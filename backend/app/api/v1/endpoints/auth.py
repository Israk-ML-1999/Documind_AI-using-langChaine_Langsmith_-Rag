from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from datetime import timedelta, datetime
import uuid

from app.core.database import get_session
from app.models.sql_models import User
from app.models.schemas import UserCreate, UserLogin, UserUpdate, UserResponse, Token
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings
from app.api.v1.endpoints.deps import get_current_user, get_token
from app.core.redis_client import blacklist_token

router = APIRouter()

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=15)
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": str(uuid.uuid4())
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, session: AsyncSession = Depends(get_session)):
    # 1. Validate full_name
    if not user.full_name or not user.full_name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")

    # 2. Validate minimum 8 characters for password
    if not user.password or len(user.password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long."
        )

    # 3. Check existing email
    statement = select(User).where(User.email == user.email)
    results = await session.exec(statement)
    if results.first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    hashed_password = get_password_hash(user.password)
    new_user = User(
        full_name=user.full_name.strip(),
        email=user.email,
        password_hash=hashed_password
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(user: UserLogin, session: AsyncSession = Depends(get_session)):
    statement = select(User).where(User.email == user.email)
    results = await session.exec(statement)
    db_user = results.first()
    
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "id": str(db_user.id)}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=db_user.id,
        full_name=db_user.full_name,
        email=db_user.email,
        created_at=db_user.created_at
    )

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if update_data.full_name is not None:
        name = update_data.full_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty.")
        current_user.full_name = name
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)
    return current_user

@router.post("/logout")
async def logout(
    token: str = Depends(get_token),
    current_user: User = Depends(get_current_user)
):
    await blacklist_token(token)
    return {"message": "Logged out successfully. Token invalidated in Redis."}

