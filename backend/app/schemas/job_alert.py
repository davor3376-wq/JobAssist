from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class JobAlertCreate(BaseModel):
    keywords: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    email: str
    frequency: str = "daily"  # daily, weekly


class JobAlertUpdate(BaseModel):
    keywords: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    email: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


class JobAlertOut(BaseModel):
    id: int
    keywords: str
    location: Optional[str]
    job_type: Optional[str]
    email: str
    frequency: str
    is_active: bool
    last_sent_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobAlertListResponse(BaseModel):
    """Wraps the alert list with user-level daily usage so the frontend can
    enforce limits without a second round-trip."""
    alerts: list[JobAlertOut]
    daily_manual_run_count: int
    daily_creation_count: int
    daily_manual_run_limit: int   # -1 = unlimited
    daily_creation_limit: int     # -1 = unlimited
