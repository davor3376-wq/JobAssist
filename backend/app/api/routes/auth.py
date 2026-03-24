from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.email_validation import is_allowed_email
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    get_current_user,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.main import limiter
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserLogin, UserOut
from app.services.email_service import send_password_reset_email, send_verification_email

logger = logging.getLogger(__name__)

router = APIRouter()


def _create_email_token(user_id: int, purpose: str, expires_minutes: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    return jwt.encode(
        {"sub": str(user_id), "purpose": purpose, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _decode_email_token(token: str, expected_purpose: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != expected_purpose:
            raise HTTPException(status_code=400, detail="Ungueltiger Token")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=400, detail="Ungueltiger Token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=400, detail="Token ist ungueltig oder abgelaufen")


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    payload: UserCreate,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if not is_allowed_email(payload.email):
        raise HTTPException(
            status_code=400,
            detail="Bitte verwende eine gueltige E-Mail-Adresse (z.B. Gmail, Outlook, iCloud)",
        )

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

    token = _create_email_token(user.id, "verify", expires_minutes=1440)
    bg.add_task(send_verification_email, user.email, token)

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


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungueltige E-Mail-Adresse oder Passwort",
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
@limiter.limit("20/minute")
async def refresh(request: Request, payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
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
@limiter.limit("10/minute")
async def logout(request: Request, payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await db.commit()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/verify-email", status_code=200)
@limiter.limit("10/minute")
async def verify_email(request: Request, payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    user_id = _decode_email_token(payload.token, "verify")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    user.is_verified = True
    await db.commit()
    return {"message": "E-Mail erfolgreich bestaetigt"}


@router.post("/resend-verification", status_code=200)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    bg: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    if current_user.is_verified:
        return {"message": "E-Mail bereits bestaetigt"}
    token = _create_email_token(current_user.id, "verify", expires_minutes=1440)
    bg.add_task(send_verification_email, current_user.email, token)
    return {"message": "Bestaetigungs-E-Mail gesendet"}


@router.post("/resend-verification-public", status_code=200)
@limiter.limit("3/minute")
async def resend_verification_public(
    request: Request,
    payload: ForgotPasswordRequest,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user and not user.is_verified:
        token = _create_email_token(user.id, "verify", expires_minutes=1440)
        bg.add_task(send_verification_email, user.email, token)
    return {
        "message": "Falls ein unverifiziertes Konto mit dieser E-Mail existiert, wurde eine Bestaetigungs-E-Mail gesendet"
    }


@router.post("/forgot-password", status_code=200)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user:
        token = _create_email_token(user.id, "reset", expires_minutes=60)
        bg.add_task(send_password_reset_email, user.email, token)
    return {"message": "Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet"}


@router.post("/reset-password", status_code=200)
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user_id = _decode_email_token(payload.token, "reset")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    user.hashed_password = hash_password(payload.new_password)
    await db.execute(sa_delete(RefreshToken).where(RefreshToken.user_id == user.id))
    await db.commit()
    return {"message": "Passwort erfolgreich zurueckgesetzt"}


class DeleteAccountRequest(BaseModel):
    password: str


@router.post("/delete-account", status_code=200)
@limiter.limit("3/minute")
async def delete_account(
    request: Request,
    payload: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Passwort ist nicht korrekt")

    await db.execute(sa_delete(RefreshToken).where(RefreshToken.user_id == current_user.id))
    await db.delete(current_user)
    await db.commit()
    return {"message": "Konto und alle Daten wurden geloescht"}
