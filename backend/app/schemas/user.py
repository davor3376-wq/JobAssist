import re
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    fingerprint: Optional[str] = None  # browser fingerprint for abuse prevention

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    is_verified: bool = False
    created_at: datetime
    currency: str = "USD"
    location: str = "United States"
    language: str = "en"

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserPreferencesUpdate(BaseModel):
    currency: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}", value):
            raise ValueError("Währung muss ein 3-stelliger ISO-Code wie EUR oder USD sein")
        return value

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip()
        if not value:
            raise ValueError("Standort darf nicht leer sein")
        if len(value) > 120:
            raise ValueError("Standort darf maximal 120 Zeichen lang sein")
        return value

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip().lower()
        if value not in {"de", "en"}:
            raise ValueError("Sprache muss 'de' oder 'en' sein")
        return value

    model_config = {"from_attributes": True}
