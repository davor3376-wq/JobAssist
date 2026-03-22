from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    get_current_user, oauth2_scheme,
    generate_refresh_token, hash_refresh_token,
)
from app.core.config import settings
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.main import limiter

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Diese E-Mail-Adresse ist bereits registriert")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige E-Mail-Adresse oder Passwort",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Konto ist deaktiviert")

    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh, refresh_hash = generate_refresh_token()

    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()

    return Token(access_token=access_token, refresh_token=raw_refresh)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
        )
    )
    rt = result.scalar_one_or_none()

    if not rt or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Rotate: revoke old, issue new
    rt.revoked = True
    raw_new, hash_new = generate_refresh_token()
    new_rt = RefreshToken(
        user_id=rt.user_id,
        token_hash=hash_new,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    await db.commit()

    access_token = create_access_token({"sub": str(rt.user_id)})
    return Token(access_token=access_token, refresh_token=raw_new)


@router.post("/logout", status_code=204)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await db.commit()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
